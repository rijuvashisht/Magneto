import * as fs from 'fs';
import * as path from 'path';
import { VulnerabilityFinding } from './vulnerability-scanner';
import { logger } from '../utils/logger';

export interface FixResult {
  ruleId: string;
  file: string;
  line: number;
  applied: boolean;
  description: string;
  diff?: string;
}

export interface AutoFixReport {
  totalFindings: number;
  fixable: number;
  applied: number;
  skipped: number;
  results: FixResult[];
}

type Fixer = (content: string, finding: VulnerabilityFinding) => string | null;

// ─── Per-rule fixers ─────────────────────────────────────────────────────────

function fixMd5Sha1(content: string, finding: VulnerabilityFinding): string | null {
  const original = content;
  const fixed = content.replace(
    /createHash\s*\(\s*["'](md5|sha1)["']\)/gi,
    "createHash('sha256')"
  );
  return fixed !== original ? fixed : null;
}

function fixMathRandom(content: string, finding: VulnerabilityFinding): string | null {
  // Only fix if it looks like it's used for a token/id — add a comment pointing to crypto
  const lines = content.split('\n');
  const lineIdx = finding.line - 1;
  const line = lines[lineIdx];
  if (!line) return null;

  // Replace Math.random() with crypto.randomBytes usage pattern
  const fixed = line.replace(
    /Math\.random\(\)\.toString\(36\)\.slice\(\d+\)/g,
    "require('crypto').randomBytes(16).toString('hex')"
  );
  if (fixed === line) return null;

  lines[lineIdx] = fixed;
  return lines.join('\n');
}

function fixDebugProduction(content: string, finding: VulnerabilityFinding): string | null {
  const original = content;
  // Python: DEBUG = True → DEBUG = os.environ.get('DEBUG', 'False') == 'True'
  const fixed = content.replace(
    /^(\s*)DEBUG\s*=\s*True\s*$/m,
    "$1DEBUG = os.environ.get('DEBUG', 'False') == 'True'"
  );
  return fixed !== original ? fixed : null;
}

function fixEvalUsage(content: string, finding: VulnerabilityFinding): string | null {
  // Can't safely auto-fix eval() — too context-dependent. Add a suppression comment.
  const lines = content.split('\n');
  const lineIdx = finding.line - 1;
  if (!lines[lineIdx]) return null;

  // Only fix the obvious JSON.parse pattern: eval('(' + json + ')')
  const fixedLine = lines[lineIdx].replace(
    /eval\s*\(\s*['"`]\s*\(\s*['"`]\s*\+\s*(\w+)\s*\+\s*['"`]\s*\)\s*['"`]\s*\)/,
    'JSON.parse($1)'
  );
  if (fixedLine === lines[lineIdx]) return null;

  lines[lineIdx] = fixedLine;
  return lines.join('\n');
}

function addDotenvComment(content: string, finding: VulnerabilityFinding): string | null {
  // For hardcoded secrets: replace the value with a process.env reference and add TODO
  const lines = content.split('\n');
  const lineIdx = finding.line - 1;
  const line = lines[lineIdx];
  if (!line) return null;

  // Match: const/let/var X = "VALUE" or X = 'VALUE'
  const match = line.match(/^(\s*(?:const|let|var|export\s+const)?\s*\w+\s*[:=]\s*)["'][^"']{8,}["'](.*)/);
  if (!match) return null;

  const varNameMatch = line.match(/\b([A-Z_]{2,})\s*[:=]/);
  const envKey = varNameMatch ? varNameMatch[1] : 'SECRET_KEY';

  lines[lineIdx] = match[1] + `process.env.${envKey}${match[2]} // TODO: set ${envKey} in environment`;
  return lines.join('\n');
}

// ─── Rule → fixer map ────────────────────────────────────────────────────────

const FIXERS: Record<string, { fixer: Fixer; description: string }> = {
  'sec-md5-sha1': {
    fixer: fixMd5Sha1,
    description: "Replace createHash('md5'/'sha1') with createHash('sha256')",
  },
  'sec-math-random-crypto': {
    fixer: fixMathRandom,
    description: "Replace Math.random().toString(36).slice(n) with crypto.randomBytes(16).toString('hex')",
  },
  'sec-debug-production': {
    fixer: fixDebugProduction,
    description: "Replace DEBUG = True with environment-variable guard",
  },
  'sec-eval-usage': {
    fixer: fixEvalUsage,
    description: 'Replace eval JSON pattern with JSON.parse()',
  },
  'sec-hardcoded-generic-secret': {
    fixer: addDotenvComment,
    description: 'Replace inline secret with process.env reference + TODO comment',
  },
  'sec-hardcoded-jwt-secret': {
    fixer: addDotenvComment,
    description: 'Replace inline JWT secret with process.env reference + TODO comment',
  },
};

// ─── Runner ──────────────────────────────────────────────────────────────────

function makeDiff(original: string, fixed: string, file: string): string {
  const origLines = original.split('\n');
  const fixedLines = fixed.split('\n');
  const diff: string[] = [`--- a/${file}`, `+++ b/${file}`];
  for (let i = 0; i < Math.max(origLines.length, fixedLines.length); i++) {
    const o = origLines[i];
    const f = fixedLines[i];
    if (o !== f) {
      if (o !== undefined) diff.push(`-${o}`);
      if (f !== undefined) diff.push(`+${f}`);
    }
  }
  return diff.join('\n');
}

export async function runAutoFix(
  rootDir: string,
  findings: VulnerabilityFinding[],
  options: { dryRun?: boolean } = {}
): Promise<AutoFixReport> {
  const fixable = findings.filter((f) => FIXERS[f.id] !== undefined);
  const results: FixResult[] = [];
  const fileCache = new Map<string, string>();

  // Load file contents
  for (const finding of fixable) {
    const absPath = path.join(rootDir, finding.file);
    if (!fileCache.has(finding.file)) {
      try {
        fileCache.set(finding.file, fs.readFileSync(absPath, 'utf-8'));
      } catch {
        // skip unreadable
      }
    }
  }

  // Apply fixes — deduplicate by file, apply in reverse line order to preserve offsets
  const byFile = new Map<string, VulnerabilityFinding[]>();
  for (const f of fixable) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file)!.push(f);
  }

  for (const [relFile, filefindings] of byFile.entries()) {
    let content = fileCache.get(relFile);
    if (!content) continue;

    const original = content;
    // Sort descending by line so replacements don't shift offsets
    const sorted = [...filefindings].sort((a, b) => b.line - a.line);

    for (const finding of sorted) {
      const entry = FIXERS[finding.id];
      if (!entry) continue;

      const fixed = entry.fixer(content, finding);
      if (fixed && fixed !== content) {
        results.push({
          ruleId: finding.id,
          file: relFile,
          line: finding.line,
          applied: !options.dryRun,
          description: entry.description,
          diff: makeDiff(content, fixed, relFile),
        });
        content = fixed;
      } else {
        results.push({
          ruleId: finding.id,
          file: relFile,
          line: finding.line,
          applied: false,
          description: `${entry.description} (no automatable fix pattern matched)`,
        });
      }
    }

    if (!options.dryRun && content !== original) {
      const absPath = path.join(rootDir, relFile);
      fs.writeFileSync(absPath, content, 'utf-8');
      logger.info(`[glasswing] ✓ Fixed ${relFile}`);
    }
  }

  const applied = results.filter((r) => r.applied).length;
  const skipped = findings.length - applied;

  return {
    totalFindings: findings.length,
    fixable: fixable.length,
    applied,
    skipped,
    results,
  };
}

export function getFixableRuleIds(): string[] {
  return Object.keys(FIXERS);
}
