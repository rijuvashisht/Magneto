import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../utils/logger';
import { resolveProjectRoot, isMagnetoProject, magnetoPath } from '../utils/paths';
import { ensureDir, writeText, fileExists } from '../utils/fs';

export interface AnalyzeOptions {
  depth?: string;
  include?: string[];
  exclude?: string[];
}

interface FileInfo {
  relativePath: string;
  extension: string;
  sizeBytes: number;
  lines: number;
  exports: string[];
  imports: string[];
  functions: string[];
  classes: string[];
  interfaces: string[];
  types: string[];
}

interface ModuleSummary {
  directory: string;
  files: FileInfo[];
  totalLines: number;
  totalSize: number;
  mainExports: string[];
  dependencies: string[];
}

const DEFAULT_IGNORE = [
  'node_modules', '.git', 'dist', 'build', '.next', 'out',
  'coverage', '.magneto/cache', '.magneto/output', '__pycache__',
  'target', '.gradle', '.mvn', 'vendor', '.venv', 'env',
];

const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.java', '.kt', '.scala',
  '.py', '.rb', '.go', '.rs', '.cs', '.swift',
  '.vue', '.svelte', '.astro',
  '.css', '.scss', '.less',
  '.html', '.xml',
  '.json', '.yaml', '.yml', '.toml',
  '.sql', '.graphql', '.gql',
  '.sh', '.bash', '.zsh',
  '.md', '.mdx',
  '.proto', '.prisma',
]);

export async function analyzeCommand(options: AnalyzeOptions): Promise<void> {
  const projectRoot = resolveProjectRoot();

  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto AI project. Run "magneto init" first.');
    process.exit(1);
  }

  const maxDepth = parseInt(options.depth || '5', 10);
  const extraExclude = options.exclude || [];
  const includeOnly = options.include || [];

  logger.info('Analyzing codebase...\n');

  const ignorePatterns = [...DEFAULT_IGNORE, ...extraExclude];

  // Scan all code files
  const allFiles = scanFiles(projectRoot, projectRoot, ignorePatterns, includeOnly, maxDepth, 0);
  logger.info(`Found ${allFiles.length} code files`);

  // Parse each file for structure
  const parsedFiles: FileInfo[] = [];
  for (const filePath of allFiles) {
    const info = parseFile(projectRoot, filePath);
    if (info) parsedFiles.push(info);
  }

  // Group by directory
  const modules = groupByModule(parsedFiles);

  // Generate summaries
  const memoryDir = magnetoPath(projectRoot, 'memory');
  const modulesDir = magnetoPath(projectRoot, 'memory', 'modules');
  ensureDir(modulesDir);

  // Write per-module summaries
  let totalFiles = 0;
  let totalLines = 0;
  let totalExports = 0;

  for (const mod of modules) {
    const summaryContent = renderModuleSummary(mod);
    const safeName = mod.directory.replace(/[/\\]/g, '_') || '_root';
    writeText(path.join(modulesDir, `${safeName}.md`), summaryContent);
    totalFiles += mod.files.length;
    totalLines += mod.totalLines;
    totalExports += mod.mainExports.length;
    logger.debug(`  Module: ${mod.directory || '(root)'} — ${mod.files.length} files, ${mod.totalLines} lines`);
  }

  // Write dependency map
  const depMap = buildDependencyMap(parsedFiles);
  writeText(path.join(memoryDir, 'dependencies.md'), depMap);

  // Write file index
  const fileIndex = buildFileIndex(parsedFiles);
  writeText(path.join(memoryDir, 'file-index.md'), fileIndex);

  // Write root summary
  const rootSummary = buildRootSummary(projectRoot, modules, parsedFiles);
  writeText(path.join(memoryDir, 'root-summary.md'), rootSummary);

  // Stats
  console.log('');
  logger.success('Analysis complete!\n');
  logger.info(`  Files analyzed:    ${totalFiles}`);
  logger.info(`  Total lines:       ${totalLines.toLocaleString()}`);
  logger.info(`  Modules:           ${modules.length}`);
  logger.info(`  Exports found:     ${totalExports}`);
  logger.info(`  Memory written to: .magneto/memory/`);
  console.log('');
  logger.info('Generated files:');
  logger.info('  .magneto/memory/root-summary.md       — Project overview');
  logger.info('  .magneto/memory/file-index.md         — All files with signatures');
  logger.info('  .magneto/memory/dependencies.md       — Import/dependency map');
  logger.info(`  .magneto/memory/modules/*.md          — ${modules.length} module summaries`);
  console.log('');
  logger.info('Use "magneto generate <task.json>" to create prompts that include this context.');
  logger.info('This reduces context window size by ~60-80% vs loading raw files.');
}

// ── File scanning ──────────────────────────────────────────────

function scanFiles(
  projectRoot: string,
  dir: string,
  ignore: string[],
  includeOnly: string[],
  maxDepth: number,
  currentDepth: number,
): string[] {
  if (currentDepth > maxDepth) return [];

  const results: string[] = [];

  let items: fs.Dirent[];
  try {
    items = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relativePath = path.relative(projectRoot, fullPath);

    // Check ignore patterns
    if (ignore.some((ig) => relativePath.startsWith(ig) || item.name === ig)) continue;
    if (item.name.startsWith('.') && item.name !== '.github') continue;

    if (item.isDirectory()) {
      results.push(...scanFiles(projectRoot, fullPath, ignore, includeOnly, maxDepth, currentDepth + 1));
    } else if (item.isFile()) {
      const ext = path.extname(item.name);
      if (!CODE_EXTENSIONS.has(ext)) continue;

      // Apply include filter if specified
      if (includeOnly.length > 0) {
        const matches = includeOnly.some((inc) => relativePath.includes(inc));
        if (!matches) continue;
      }

      results.push(fullPath);
    }
  }

  return results;
}

// ── File parsing ───────────────────────────────────────────────

function parseFile(projectRoot: string, filePath: string): FileInfo | null {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > 200000) return null; // Skip files > 200KB

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const ext = path.extname(filePath);

    const info: FileInfo = {
      relativePath: path.relative(projectRoot, filePath),
      extension: ext,
      sizeBytes: stat.size,
      lines: lines.length,
      exports: [],
      imports: [],
      functions: [],
      classes: [],
      interfaces: [],
      types: [],
    };

    // Language-specific parsing
    if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
      parseJavaScriptLike(content, info);
    } else if (['.java', '.kt'].includes(ext)) {
      parseJavaLike(content, info);
    } else if (ext === '.py') {
      parsePython(content, info);
    } else if (ext === '.go') {
      parseGo(content, info);
    }

    return info;
  } catch {
    return null;
  }
}

function parseJavaScriptLike(content: string, info: FileInfo): void {
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Imports
    const importMatch = trimmed.match(/^import\s+.*from\s+['"]([^'"]+)['"]/);
    if (importMatch) {
      info.imports.push(importMatch[1]);
      continue;
    }
    const requireMatch = trimmed.match(/require\(['"]([^'"]+)['"]\)/);
    if (requireMatch) {
      info.imports.push(requireMatch[1]);
    }

    // Exports
    if (trimmed.startsWith('export default ')) {
      const name = trimmed.replace('export default ', '').replace(/[{(;].*/g, '').trim();
      if (name) info.exports.push(`default: ${name}`);
    } else if (trimmed.startsWith('export ')) {
      // export function/class/const/interface/type
      const exportMatch = trimmed.match(/^export\s+(?:async\s+)?(?:function|class|const|let|var|interface|type|enum)\s+(\w+)/);
      if (exportMatch) info.exports.push(exportMatch[1]);
    }

    // Functions
    const funcMatch = trimmed.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*[\(<]/);
    if (funcMatch) {
      info.functions.push(funcMatch[1]);
      continue;
    }
    // Arrow functions assigned to const
    const arrowMatch = trimmed.match(/^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(/);
    if (arrowMatch) {
      info.functions.push(arrowMatch[1]);
    }

    // Classes
    const classMatch = trimmed.match(/^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/);
    if (classMatch) info.classes.push(classMatch[1]);

    // Interfaces
    const interfaceMatch = trimmed.match(/^(?:export\s+)?interface\s+(\w+)/);
    if (interfaceMatch) info.interfaces.push(interfaceMatch[1]);

    // Types
    const typeMatch = trimmed.match(/^(?:export\s+)?type\s+(\w+)\s*=/);
    if (typeMatch) info.types.push(typeMatch[1]);
  }
}

function parseJavaLike(content: string, info: FileInfo): void {
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Imports
    const importMatch = trimmed.match(/^import\s+(.+);/);
    if (importMatch) {
      info.imports.push(importMatch[1]);
      continue;
    }

    // Classes
    const classMatch = trimmed.match(/(?:public|private|protected)?\s*(?:abstract|final)?\s*class\s+(\w+)/);
    if (classMatch) info.classes.push(classMatch[1]);

    // Interfaces
    const ifaceMatch = trimmed.match(/(?:public)?\s*interface\s+(\w+)/);
    if (ifaceMatch) info.interfaces.push(ifaceMatch[1]);

    // Methods (public/protected)
    const methodMatch = trimmed.match(/(?:public|protected)\s+(?:static\s+)?(?:abstract\s+)?[\w<>\[\],\s]+\s+(\w+)\s*\(/);
    if (methodMatch && !['if', 'for', 'while', 'switch', 'catch', 'class', 'new'].includes(methodMatch[1])) {
      info.functions.push(methodMatch[1]);
    }

    // Annotations as exports
    const annotationMatch = trimmed.match(/^@(\w+)/);
    if (annotationMatch && ['RestController', 'Controller', 'Service', 'Repository', 'Component', 'Entity'].includes(annotationMatch[1])) {
      info.exports.push(`@${annotationMatch[1]}`);
    }
  }
}

function parsePython(content: string, info: FileInfo): void {
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Imports
    const importMatch = trimmed.match(/^(?:from\s+(\S+)\s+)?import\s+(.+)/);
    if (importMatch) {
      info.imports.push(importMatch[1] || importMatch[2]);
      continue;
    }

    // Functions
    const funcMatch = trimmed.match(/^(?:async\s+)?def\s+(\w+)\s*\(/);
    if (funcMatch) {
      info.functions.push(funcMatch[1]);
      if (!funcMatch[1].startsWith('_')) info.exports.push(funcMatch[1]);
    }

    // Classes
    const classMatch = trimmed.match(/^class\s+(\w+)/);
    if (classMatch) {
      info.classes.push(classMatch[1]);
      info.exports.push(classMatch[1]);
    }
  }
}

function parseGo(content: string, info: FileInfo): void {
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Imports
    const importMatch = trimmed.match(/^import\s+"([^"]+)"/);
    if (importMatch) info.imports.push(importMatch[1]);
    const importGroupMatch = trimmed.match(/^\s*"([^"]+)"/);
    if (importGroupMatch) info.imports.push(importGroupMatch[1]);

    // Functions (exported = capitalized)
    const funcMatch = trimmed.match(/^func\s+(?:\(.*?\)\s+)?(\w+)\s*\(/);
    if (funcMatch) {
      info.functions.push(funcMatch[1]);
      if (funcMatch[1][0] === funcMatch[1][0].toUpperCase()) {
        info.exports.push(funcMatch[1]);
      }
    }

    // Types/structs
    const typeMatch = trimmed.match(/^type\s+(\w+)\s+(?:struct|interface)/);
    if (typeMatch) {
      info.types.push(typeMatch[1]);
      if (typeMatch[1][0] === typeMatch[1][0].toUpperCase()) {
        info.exports.push(typeMatch[1]);
      }
    }
  }
}

// ── Grouping ───────────────────────────────────────────────────

function groupByModule(files: FileInfo[]): ModuleSummary[] {
  const groups = new Map<string, FileInfo[]>();

  for (const f of files) {
    const dir = path.dirname(f.relativePath);
    const group = groups.get(dir) || [];
    group.push(f);
    groups.set(dir, group);
  }

  const modules: ModuleSummary[] = [];
  for (const [dir, files] of groups) {
    const allExports: string[] = [];
    const allDeps: string[] = [];
    let totalLines = 0;
    let totalSize = 0;

    for (const f of files) {
      allExports.push(...f.exports);
      allDeps.push(...f.imports);
      totalLines += f.lines;
      totalSize += f.sizeBytes;
    }

    modules.push({
      directory: dir,
      files,
      totalLines,
      totalSize,
      mainExports: [...new Set(allExports)],
      dependencies: [...new Set(allDeps)],
    });
  }

  return modules.sort((a, b) => a.directory.localeCompare(b.directory));
}

// ── Rendering ──────────────────────────────────────────────────

function renderModuleSummary(mod: ModuleSummary): string {
  const lines: string[] = [];

  lines.push(`# Module: ${mod.directory || '(root)'}`);
  lines.push('');
  lines.push(`- **Files:** ${mod.files.length}`);
  lines.push(`- **Total lines:** ${mod.totalLines.toLocaleString()}`);
  lines.push(`- **Total size:** ${formatBytes(mod.totalSize)}`);
  lines.push('');

  // Exports
  if (mod.mainExports.length > 0) {
    lines.push('## Exports');
    lines.push('');
    for (const exp of mod.mainExports) {
      lines.push(`- \`${exp}\``);
    }
    lines.push('');
  }

  // Dependencies
  if (mod.dependencies.length > 0) {
    lines.push('## Dependencies');
    lines.push('');
    const external = mod.dependencies.filter((d) => !d.startsWith('.') && !d.startsWith('/'));
    const internal = mod.dependencies.filter((d) => d.startsWith('.') || d.startsWith('/'));

    if (external.length > 0) {
      lines.push('### External');
      for (const d of external) lines.push(`- \`${d}\``);
      lines.push('');
    }
    if (internal.length > 0) {
      lines.push('### Internal');
      for (const d of internal) lines.push(`- \`${d}\``);
      lines.push('');
    }
  }

  // Files detail
  lines.push('## Files');
  lines.push('');

  for (const f of mod.files) {
    const fileName = path.basename(f.relativePath);
    lines.push(`### \`${fileName}\``);
    lines.push('');
    lines.push(`- **Path:** \`${f.relativePath}\``);
    lines.push(`- **Lines:** ${f.lines} | **Size:** ${formatBytes(f.sizeBytes)}`);

    if (f.classes.length > 0) {
      lines.push(`- **Classes:** ${f.classes.map((c) => `\`${c}\``).join(', ')}`);
    }
    if (f.interfaces.length > 0) {
      lines.push(`- **Interfaces:** ${f.interfaces.map((i) => `\`${i}\``).join(', ')}`);
    }
    if (f.types.length > 0) {
      lines.push(`- **Types:** ${f.types.map((t) => `\`${t}\``).join(', ')}`);
    }
    if (f.functions.length > 0) {
      lines.push(`- **Functions:** ${f.functions.map((fn) => `\`${fn}\``).join(', ')}`);
    }
    if (f.exports.length > 0) {
      lines.push(`- **Exports:** ${f.exports.map((e) => `\`${e}\``).join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function buildDependencyMap(files: FileInfo[]): string {
  const lines: string[] = [];

  lines.push('# Dependency Map');
  lines.push('');
  lines.push('*Auto-generated by `magneto analyze`. Shows import relationships between files.*');
  lines.push('');

  // External dependencies
  const externalDeps = new Map<string, string[]>();
  for (const f of files) {
    for (const imp of f.imports) {
      if (!imp.startsWith('.') && !imp.startsWith('/')) {
        const pkg = imp.split('/').slice(0, imp.startsWith('@') ? 2 : 1).join('/');
        const users = externalDeps.get(pkg) || [];
        users.push(f.relativePath);
        externalDeps.set(pkg, users);
      }
    }
  }

  if (externalDeps.size > 0) {
    lines.push('## External Dependencies');
    lines.push('');
    lines.push('| Package | Used By (files) |');
    lines.push('|---|---|');
    const sorted = [...externalDeps.entries()].sort((a, b) => b[1].length - a[1].length);
    for (const [pkg, users] of sorted) {
      const uniqueUsers = [...new Set(users)];
      lines.push(`| \`${pkg}\` | ${uniqueUsers.length} files |`);
    }
    lines.push('');
  }

  // Internal dependency graph
  lines.push('## Internal Import Graph');
  lines.push('');
  lines.push('| File | Imports From |');
  lines.push('|---|---|');

  for (const f of files) {
    const internalImports = f.imports.filter((i) => i.startsWith('.') || i.startsWith('/'));
    if (internalImports.length > 0) {
      lines.push(`| \`${f.relativePath}\` | ${internalImports.map((i) => `\`${i}\``).join(', ')} |`);
    }
  }
  lines.push('');

  return lines.join('\n');
}

function buildFileIndex(files: FileInfo[]): string {
  const lines: string[] = [];

  lines.push('# File Index');
  lines.push('');
  lines.push(`*Auto-generated by \`magneto analyze\`. ${files.length} files indexed.*`);
  lines.push('');
  lines.push('| File | Lines | Exports | Functions | Classes |');
  lines.push('|---|---|---|---|---|');

  for (const f of files) {
    lines.push(
      `| \`${f.relativePath}\` | ${f.lines} | ${f.exports.length} | ${f.functions.length} | ${f.classes.length} |`
    );
  }
  lines.push('');

  // Summary by extension
  const byExt = new Map<string, { count: number; lines: number }>();
  for (const f of files) {
    const ext = f.extension || '(none)';
    const entry = byExt.get(ext) || { count: 0, lines: 0 };
    entry.count++;
    entry.lines += f.lines;
    byExt.set(ext, entry);
  }

  lines.push('## By Extension');
  lines.push('');
  lines.push('| Extension | Files | Lines |');
  lines.push('|---|---|---|');
  const sortedExt = [...byExt.entries()].sort((a, b) => b[1].lines - a[1].lines);
  for (const [ext, { count, lines: lineCount }] of sortedExt) {
    lines.push(`| \`${ext}\` | ${count} | ${lineCount.toLocaleString()} |`);
  }
  lines.push('');

  return lines.join('\n');
}

function buildRootSummary(projectRoot: string, modules: ModuleSummary[], files: FileInfo[]): string {
  const lines: string[] = [];
  const projectName = path.basename(projectRoot);

  const totalLines = files.reduce((sum, f) => sum + f.lines, 0);
  const totalSize = files.reduce((sum, f) => sum + f.sizeBytes, 0);
  const allExports = files.flatMap((f) => f.exports);
  const allClasses = files.flatMap((f) => f.classes);
  const allFunctions = files.flatMap((f) => f.functions);
  const allInterfaces = files.flatMap((f) => f.interfaces);

  lines.push(`# Project Memory — ${projectName}`);
  lines.push('');
  lines.push(`*Auto-generated by \`magneto analyze\` on ${new Date().toISOString()}*`);
  lines.push('');

  // Overview
  lines.push('## Overview');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push('|---|---|');
  lines.push(`| Total files | ${files.length} |`);
  lines.push(`| Total lines | ${totalLines.toLocaleString()} |`);
  lines.push(`| Total size | ${formatBytes(totalSize)} |`);
  lines.push(`| Modules | ${modules.length} |`);
  lines.push(`| Exports | ${allExports.length} |`);
  lines.push(`| Classes | ${allClasses.length} |`);
  lines.push(`| Functions | ${allFunctions.length} |`);
  lines.push(`| Interfaces | ${allInterfaces.length} |`);
  lines.push('');

  // Token estimate
  const rawTokens = Math.ceil(totalSize / 4);
  const summaryTokens = Math.ceil(lines.join('\n').length / 4);
  lines.push('## Context Window Savings');
  lines.push('');
  lines.push(`| | Tokens |`);
  lines.push('|---|---|');
  lines.push(`| Loading all raw files | ~${rawTokens.toLocaleString()} tokens |`);
  lines.push(`| Loading this summary | ~${summaryTokens.toLocaleString()} tokens |`);
  lines.push(`| **Savings** | **~${Math.round((1 - summaryTokens / rawTokens) * 100)}%** |`);
  lines.push('');

  // Module map
  lines.push('## Module Map');
  lines.push('');
  for (const mod of modules) {
    const fileList = mod.files.map((f) => path.basename(f.relativePath)).join(', ');
    lines.push(`- **\`${mod.directory || '(root)'}\`** — ${mod.files.length} files, ${mod.totalLines} lines`);
    lines.push(`  Files: ${fileList}`);
    if (mod.mainExports.length > 0) {
      lines.push(`  Exports: ${mod.mainExports.slice(0, 10).map((e) => `\`${e}\``).join(', ')}${mod.mainExports.length > 10 ? ` (+${mod.mainExports.length - 10} more)` : ''}`);
    }
  }
  lines.push('');

  // Key classes and interfaces
  if (allClasses.length > 0) {
    lines.push('## Key Classes');
    lines.push('');
    for (const f of files) {
      if (f.classes.length > 0) {
        lines.push(`- ${f.classes.map((c) => `\`${c}\``).join(', ')} — \`${f.relativePath}\``);
      }
    }
    lines.push('');
  }

  if (allInterfaces.length > 0) {
    lines.push('## Key Interfaces / Types');
    lines.push('');
    for (const f of files) {
      const combined = [...f.interfaces, ...f.types];
      if (combined.length > 0) {
        lines.push(`- ${combined.map((i) => `\`${i}\``).join(', ')} — \`${f.relativePath}\``);
      }
    }
    lines.push('');
  }

  // Last updated
  lines.push('## Last Updated');
  lines.push('');
  lines.push(new Date().toISOString());
  lines.push('');

  return lines.join('\n');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
