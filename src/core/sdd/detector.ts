// Auto-detect which SDD framework (if any) is already scaffolded in a project.
// Used by `magneto sdd init` to skip the prompt when the answer is obvious.
import * as fs from 'fs';
import * as path from 'path';
import { SddFramework } from './types';
import { listFrameworks, getAdapter } from './framework';

export function detectFrameworks(projectRoot: string): SddFramework[] {
  const found: SddFramework[] = [];
  for (const info of listFrameworks()) {
    const adapter = getAdapter(info.id);
    if (adapter.isScaffolded(projectRoot)) found.push(info.id);
  }
  return found;
}

/**
 * Recommend a framework based on signals from the repo.
 * Heuristic order:
 *   1. If exactly one framework is already scaffolded → use it.
 *   2. If repo looks brownfield (has src/ + tests/ + a non-trivial git history
 *      OR an existing package.json with deps) → openspec.
 *   3. If repo is empty / barely scaffolded → speckit (greenfield default).
 *   4. Tie-break → openspec (matches the article's TL;DR).
 */
export function recommendFramework(projectRoot: string): SddFramework {
  const detected = detectFrameworks(projectRoot);
  if (detected.length === 1) return detected[0];

  const isBrownfield = looksBrownfield(projectRoot);
  if (isBrownfield) return 'openspec';

  const isEmpty = looksGreenfield(projectRoot);
  if (isEmpty) return 'speckit';

  return 'openspec';
}

function looksBrownfield(root: string): boolean {
  const hasSrc = fs.existsSync(path.join(root, 'src'));
  const hasTests = fs.existsSync(path.join(root, 'tests')) || fs.existsSync(path.join(root, 'test'));
  const pkgPath = path.join(root, 'package.json');
  let hasDeps = false;
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const totalDeps =
        Object.keys(pkg.dependencies ?? {}).length +
        Object.keys(pkg.devDependencies ?? {}).length;
      hasDeps = totalDeps >= 5;
    } catch { /* ignore */ }
  }
  const hasGitHistory = fs.existsSync(path.join(root, '.git'));
  // Two of {src/, tests/, deps≥5, .git} → brownfield.
  const score = [hasSrc, hasTests, hasDeps, hasGitHistory].filter(Boolean).length;
  return score >= 2;
}

function looksGreenfield(root: string): boolean {
  const entries = fs.readdirSync(root).filter((e) => !e.startsWith('.'));
  return entries.length <= 3;
}
