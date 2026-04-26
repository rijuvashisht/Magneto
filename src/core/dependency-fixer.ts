import * as fs from 'fs';
import * as path from 'path';
import { GroupedVulnerability } from './dependency-scanner';
import { logger } from '../utils/logger';

export interface DependencyFixResult {
  manifestPath: string;
  packageName: string;
  oldRange: string;
  newRange: string;
  cveCount: number;
  applied: boolean;
}

export interface DependencyFixReport {
  manifestsModified: string[];
  fixesApplied: DependencyFixResult[];
  fixesSkipped: DependencyFixResult[];
  transitiveCount: number;        // vulns in transitive deps that need parent upgrade
  unfixableCount: number;          // vulns with no recommended fix version
  npmCommands: string[];           // commands user should run after
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

const DEP_KEYS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const;

function findPackageJsons(rootDir: string): string[] {
  const results: string[] = [];
  const IGNORE = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.magneto', '.turbo', '.cache']);

  const walk = (dir: string, depth: number) => {
    if (depth > 6) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (IGNORE.has(entry.name) || (entry.name.startsWith('.') && entry.name !== '.github')) continue;
        walk(path.join(dir, entry.name), depth + 1);
      } else if (entry.name === 'package.json') {
        results.push(path.join(dir, entry.name));
      }
    }
  };
  walk(rootDir, 0);
  return results;
}

function preserveRangePrefix(oldRange: string, newVersion: string): string {
  // If user had ^x.y.z or ~x.y.z or >=x.y.z, keep the same operator
  const match = oldRange.match(/^([\^~>=<]+)/);
  const prefix = match ? match[1] : '^';
  return `${prefix}${newVersion}`;
}

export async function runDependencyFix(
  rootDir: string,
  groups: GroupedVulnerability[],
  options: { dryRun?: boolean; runNpmInstall?: boolean } = {}
): Promise<DependencyFixReport> {
  const fixesApplied: DependencyFixResult[] = [];
  const fixesSkipped: DependencyFixResult[] = [];
  const manifestsModified = new Set<string>();
  let transitiveCount = 0;
  let unfixableCount = 0;

  // Build name → fix version map (npm only — Python/Java handled differently)
  const fixMap = new Map<string, { fixVersion: string; cveCount: number }>();
  for (const g of groups) {
    if (g.ecosystem !== 'npm') continue;
    if (!g.recommendedFixVersion) {
      unfixableCount++;
      continue;
    }
    // Take the highest recommended fix per package across versions
    const existing = fixMap.get(g.packageName);
    if (!existing || g.cveCount > existing.cveCount) {
      fixMap.set(g.packageName, { fixVersion: g.recommendedFixVersion, cveCount: g.cveCount });
    }
  }

  if (fixMap.size === 0) {
    return {
      manifestsModified: [],
      fixesApplied: [],
      fixesSkipped: [],
      transitiveCount,
      unfixableCount,
      npmCommands: [],
    };
  }

  // Find all package.json files and update declared deps
  const manifests = findPackageJsons(rootDir);

  for (const manifestPath of manifests) {
    let pkg: PackageJson;
    let raw: string;
    try {
      raw = fs.readFileSync(manifestPath, 'utf-8');
      pkg = JSON.parse(raw) as PackageJson;
    } catch {
      continue;
    }

    let modified = false;

    for (const depKey of DEP_KEYS) {
      const deps = pkg[depKey];
      if (!deps) continue;

      for (const [name, oldRange] of Object.entries(deps)) {
        const fix = fixMap.get(name);
        if (!fix) continue;

        const newRange = preserveRangePrefix(oldRange, fix.fixVersion);
        if (newRange === oldRange) continue;

        const result: DependencyFixResult = {
          manifestPath: path.relative(rootDir, manifestPath),
          packageName: name,
          oldRange,
          newRange,
          cveCount: fix.cveCount,
          applied: !options.dryRun,
        };

        if (options.dryRun) {
          fixesApplied.push(result);
        } else {
          deps[name] = newRange;
          fixesApplied.push(result);
          modified = true;
        }
      }
    }

    if (modified) {
      // Detect indentation from original file
      const indentMatch = raw.match(/^([ \t]+)"/m);
      const indent = indentMatch ? indentMatch[1] : '  ';
      const newRaw = JSON.stringify(pkg, null, indent) + (raw.endsWith('\n') ? '\n' : '');
      fs.writeFileSync(manifestPath, newRaw, 'utf-8');
      manifestsModified.add(manifestPath);
      logger.info(`[glasswing] ✓ Updated ${path.relative(rootDir, manifestPath)}`);
    }
  }

  // Anything in fixMap that wasn't applied to any manifest is transitive
  const fixedNames = new Set(fixesApplied.map((f) => f.packageName));
  for (const [name] of fixMap) {
    if (!fixedNames.has(name)) {
      transitiveCount++;
      // Find the original group to record skip reason
      const group = groups.find((g) => g.packageName === name);
      if (group) {
        fixesSkipped.push({
          manifestPath: '(transitive)',
          packageName: name,
          oldRange: group.installedVersion,
          newRange: group.recommendedFixVersion ?? '?',
          cveCount: group.cveCount,
          applied: false,
        });
      }
    }
  }

  // Build npm commands the user should run
  const npmCommands: string[] = [];
  for (const manifestPath of manifestsModified) {
    const dir = path.dirname(path.relative(rootDir, manifestPath)) || '.';
    npmCommands.push(`(cd ${dir} && npm install)`);
  }
  if (transitiveCount > 0) {
    npmCommands.push('npm audit fix              # for transitive deps');
  }

  return {
    manifestsModified: Array.from(manifestsModified).map((p) => path.relative(rootDir, p)),
    fixesApplied,
    fixesSkipped,
    transitiveCount,
    unfixableCount,
    npmCommands,
  };
}

export function renderDependencyFixReport(report: DependencyFixReport): string {
  const lines: string[] = [];
  lines.push('');
  lines.push('[glasswing] Dependency Auto-Fix');
  lines.push('');

  if (report.fixesApplied.length === 0 && report.fixesSkipped.length === 0) {
    lines.push('  ✅ Nothing to fix.');
    return lines.join('\n');
  }

  if (report.fixesApplied.length > 0) {
    lines.push(`  Direct dependency upgrades (${report.fixesApplied.length}):`);
    for (const f of report.fixesApplied) {
      const cveLabel = f.cveCount === 1 ? '1 CVE' : `${f.cveCount} CVEs`;
      const status = f.applied ? '✓' : '○';
      lines.push(`    ${status} ${f.packageName}: ${f.oldRange} → ${f.newRange}  (resolves ${cveLabel})  [${f.manifestPath}]`);
    }
    lines.push('');
  }

  if (report.transitiveCount > 0) {
    lines.push(`  Transitive dependency vulnerabilities (${report.transitiveCount}):`);
    for (const f of report.fixesSkipped) {
      const cveLabel = f.cveCount === 1 ? '1 CVE' : `${f.cveCount} CVEs`;
      lines.push(`    ⊘ ${f.packageName}@${f.oldRange} → needs ${f.newRange}  (${cveLabel}) — transitive, requires parent upgrade or override`);
    }
    lines.push('');
  }

  if (report.unfixableCount > 0) {
    lines.push(`  ⚠  ${report.unfixableCount} CVE(s) without published fix version — manual review required`);
    lines.push('');
  }

  if (report.npmCommands.length > 0) {
    lines.push('  Next steps — run these to apply lockfile updates:');
    for (const cmd of report.npmCommands) {
      lines.push(`    $ ${cmd}`);
    }
  }

  return lines.join('\n');
}
