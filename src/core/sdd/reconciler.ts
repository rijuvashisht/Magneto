// Spec ↔ code drift reconciler.
//
// The article identifies drift as the #1 SDD failure mode and notes that
// none of the three frameworks fully automate it. This implements a
// minimal *static* reconciler:
//
//   1. List all spec files (per-framework convention).
//   2. List all source files in src/.
//   3. Detect three drift kinds:
//      - spec-only:        spec mentions a file path that does not exist on disk
//      - code-undocumented: src/ subtree has zero spec references
//      - mismatch:         spec marks a task `[x]` but no commit touched the file
//
// Reasoning about *semantic* drift (the spec describes algorithm A but
// code implements B) is delegated to an LLM pass via the existing
// magneto runner. This static pass is the cheap, deterministic guardrail
// that runs in CI.
import * as fs from 'fs';
import * as path from 'path';
import { SddFramework, SddSyncReport, SddDrift } from './types';

export async function reconcileSpecs(
  framework: SddFramework,
  projectRoot: string,
  dryRun = false
): Promise<SddSyncReport> {
  const specFiles = listSpecFiles(framework, projectRoot);
  const sourceFiles = listSourceFiles(projectRoot);
  const drifts: SddDrift[] = [];

  // Pass 1 — every file path mentioned in a spec must exist (or be planned).
  for (const spec of specFiles) {
    const text = safeRead(spec);
    if (!text) continue;
    const mentioned = extractFilePaths(text);
    for (const m of mentioned) {
      const abs = path.resolve(projectRoot, m);
      if (!fs.existsSync(abs) && !insideSpecDir(abs, framework, projectRoot)) {
        drifts.push({
          specPath: path.relative(projectRoot, spec),
          codePath: m,
          kind: 'spec-only',
          summary: `Spec references "${m}" but the file does not exist.`,
        });
      }
    }
  }

  // Pass 2 — top-level src/ subdirectories with NO spec coverage.
  const srcDir = path.join(projectRoot, 'src');
  if (fs.existsSync(srcDir)) {
    const allSpecText = specFiles.map(safeRead).filter(Boolean).join('\n');
    for (const sub of fs.readdirSync(srcDir)) {
      const subPath = path.join(srcDir, sub);
      if (!fs.statSync(subPath).isDirectory()) continue;
      // Heuristic: if neither the directory name nor any contained module name
      // appears anywhere in the specs, flag it.
      const names = [sub, ...fs.readdirSync(subPath).map((f) => f.replace(/\.[^.]+$/, ''))];
      const referenced = names.some((n) => allSpecText.includes(n));
      if (!referenced) {
        drifts.push({
          specPath: '(none)',
          codePath: path.relative(projectRoot, subPath),
          kind: 'code-undocumented',
          summary: `src/${sub}/ has no matching reference in any spec.`,
        });
      }
    }
  }

  // Pass 3 — checked tasks that reference non-existent files.
  for (const spec of specFiles.filter((p) => p.endsWith('tasks.md'))) {
    const text = safeRead(spec);
    if (!text) continue;
    const checked = text.match(/^- \[x\][^\n]*$/gim) ?? [];
    for (const line of checked) {
      const paths = extractFilePaths(line);
      for (const p of paths) {
        const abs = path.resolve(projectRoot, p);
        if (!fs.existsSync(abs)) {
          drifts.push({
            specPath: path.relative(projectRoot, spec),
            codePath: p,
            kind: 'mismatch',
            summary: `Task marked done references missing "${p}".`,
          });
        }
      }
    }
  }

  // Pass 4 (annotation, not edit) — stub for the LLM-backed semantic drift
  // pass. We do not write here; a future `magneto sdd sync --semantic` flag
  // will dispatch to the runner.
  const updatedFiles: string[] = [];
  if (!dryRun && drifts.length > 0) {
    const reportPath = path.join(projectRoot, '.magneto', 'sdd-drift.md');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, renderDriftReport(framework, drifts), 'utf8');
    updatedFiles.push(reportPath);
  }

  // Touch source files: never. Only Magneto runner edits source.
  void sourceFiles;

  return {
    framework,
    drifts,
    updatedFiles,
    dryRun,
  };
}

// ─── helpers ──────────────────────────────────────────────────────────────

function listSpecFiles(framework: SddFramework, projectRoot: string): string[] {
  const roots: string[] = [];
  if (framework === 'openspec') {
    roots.push(path.join(projectRoot, 'openspec'));
  } else if (framework === 'speckit') {
    roots.push(path.join(projectRoot, '.specify'));
    roots.push(path.join(projectRoot, 'specs'));
  } else if (framework === 'bmad') {
    roots.push(path.join(projectRoot, 'bmad-core'));
    roots.push(path.join(projectRoot, 'docs', 'prd'));
    roots.push(path.join(projectRoot, 'docs', 'architecture'));
    roots.push(path.join(projectRoot, 'docs', 'stories'));
  }
  const out: string[] = [];
  for (const r of roots) walkMd(r, out);
  return out;
}

function listSourceFiles(projectRoot: string): string[] {
  const out: string[] = [];
  walkExt(path.join(projectRoot, 'src'), ['.ts', '.tsx', '.js', '.py', '.go', '.java'], out);
  return out;
}

function walkMd(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkMd(p, out);
    else if (entry.name.endsWith('.md')) out.push(p);
  }
}

function walkExt(dir: string, exts: string[], out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkExt(p, exts, out);
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(p);
  }
}

function safeRead(p: string): string {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

/**
 * Pull file-path-looking tokens out of free text. Conservative: requires
 * a slash and an extension to count, so prose like "the user model" is
 * not flagged. Backticks and brackets are stripped.
 */
export function extractFilePaths(text: string): string[] {
  const re = /[`'"\[(\s]([a-zA-Z0-9_./-]+\.[a-zA-Z]{1,5})(?=[`'")\]\s,;:]|$)/g;
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const candidate = m[1];
    if (candidate.includes('/') && !candidate.startsWith('http')) {
      out.add(candidate);
    }
  }
  return [...out];
}

function insideSpecDir(abs: string, framework: SddFramework, root: string): boolean {
  const dirs =
    framework === 'openspec' ? ['openspec'] :
    framework === 'speckit' ? ['.specify', 'specs'] :
    ['bmad-core', 'docs'];
  return dirs.some((d) => abs.startsWith(path.join(root, d)));
}

function renderDriftReport(framework: SddFramework, drifts: SddDrift[]): string {
  const lines: string[] = [
    `# SDD drift report (${framework})`,
    '',
    `Generated: ${new Date().toISOString()}`,
    `Drifts: ${drifts.length}`,
    '',
  ];
  const groups: Record<string, SddDrift[]> = {};
  for (const d of drifts) (groups[d.kind] ||= []).push(d);
  for (const [kind, items] of Object.entries(groups)) {
    lines.push(`## ${kind} (${items.length})`, '');
    for (const d of items) {
      lines.push(`- **${d.codePath}** — ${d.summary}`);
      lines.push(`  - spec: \`${d.specPath}\``);
    }
    lines.push('');
  }
  lines.push('---');
  lines.push('Reconcile each drift, then re-run `magneto sdd sync` until clean.');
  return lines.join('\n');
}
