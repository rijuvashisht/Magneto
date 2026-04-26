// OpenSpec adapter — brownfield-first, delta-based.
//
// Layout:
//   openspec/
//     project.md                     ← project context (constitution-equivalent)
//     AGENTS.md                      ← README-for-robots
//     specs/                         ← current system behavior (frozen, append-only)
//     changes/<change-name>/
//       proposal.md                  ← what's changing and why
//       design.md                    ← technical approach
//       tasks.md                     ← checklist of PR-sized units
//       specs/                       ← deltas: ADDED / MODIFIED / REMOVED
//
// Reference: openspec.dev / @fission-ai/openspec on npm
import * as fs from 'fs';
import * as path from 'path';
import {
  SddAdapter,
  SddFrameworkInfo,
  SddInitOptions,
  SddInitResult,
  SddNewChangeOptions,
  SddNewChangeResult,
  SddStatusReport,
  SddSyncReport,
} from './types';
import { renderConstitution } from './constitution';
import { reconcileSpecs } from './reconciler';

export class OpenSpecAdapter implements SddAdapter {
  readonly info: SddFrameworkInfo = {
    id: 'openspec',
    displayName: 'OpenSpec',
    bestFor: 'brownfield',
    tagline: 'Brownfield-first, delta-based (ADDED/MODIFIED/REMOVED). Recommended default.',
    description:
      'Lightweight, change-centric SDD. Each change is a folder with proposal/design/tasks ' +
      'plus delta specs. Frozen specs in /specs/ describe the current system and compound ' +
      'over time. Best for existing codebases.',
    detectionMarkers: ['openspec/project.md', 'openspec/specs', 'openspec/changes'],
    upstreamInit: { cmd: 'npx', args: ['-y', '@fission-ai/openspec', 'init'] },
  };

  isScaffolded(projectRoot: string): boolean {
    return fs.existsSync(path.join(projectRoot, 'openspec', 'project.md'));
  }

  async init(opts: SddInitOptions): Promise<SddInitResult> {
    const root = path.join(opts.projectRoot, 'openspec');
    const result: SddInitResult = {
      framework: 'openspec',
      filesCreated: [],
      filesSkipped: [],
      warnings: [],
    };

    const projectName = path.basename(opts.projectRoot);

    const files: Array<[string, string]> = [
      ['project.md', renderConstitution({ projectName, framework: 'openspec' })],
      ['AGENTS.md', renderAgentsMd(projectName)],
      ['specs/.gitkeep', ''],
      ['changes/.gitkeep', ''],
      [
        'README.md',
        '# OpenSpec\n\nThis directory holds the project\'s spec-driven development artifacts.\n\n' +
          '- `project.md` — constitution / standing rules\n' +
          '- `specs/` — frozen specs describing current system behavior\n' +
          '- `changes/<name>/` — in-flight changes with delta specs (ADDED/MODIFIED/REMOVED)\n\n' +
          'Run `magneto sdd new <name> "<description>"` to start a new change.\n' +
          'Run `magneto sdd sync` to reconcile specs after implementation.\n',
      ],
    ];

    for (const [rel, body] of files) {
      const abs = path.join(root, rel);
      if (fs.existsSync(abs) && !opts.force) {
        result.filesSkipped.push(abs);
        continue;
      }
      if (!opts.dryRun) {
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, body, 'utf8');
      }
      result.filesCreated.push(abs);
    }
    return result;
  }

  async newChange(opts: SddNewChangeOptions): Promise<SddNewChangeResult> {
    const slug = slugify(opts.name);
    const changeDir = path.join(opts.projectRoot, 'openspec', 'changes', slug);
    const result: SddNewChangeResult = {
      framework: 'openspec',
      changeDir,
      filesCreated: [],
    };

    const files: Array<[string, string]> = [
      ['proposal.md', renderProposal(opts.name, opts.description)],
      ['design.md', renderDesign(opts.name)],
      ['tasks.md', renderTasks(opts.name)],
      ['specs/.gitkeep', ''],
    ];

    for (const [rel, body] of files) {
      const abs = path.join(changeDir, rel);
      if (!opts.dryRun) {
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, body, 'utf8');
      }
      result.filesCreated.push(abs);
    }
    return result;
  }

  async status(projectRoot: string): Promise<SddStatusReport> {
    const root = path.join(projectRoot, 'openspec');
    const scaffolded = this.isScaffolded(projectRoot);
    const changesDir = path.join(root, 'changes');
    const specsDir = path.join(root, 'specs');

    const activeChanges = scaffolded && fs.existsSync(changesDir)
      ? fs.readdirSync(changesDir).filter((d) => {
          if (d.startsWith('.')) return false;
          return fs.statSync(path.join(changesDir, d)).isDirectory();
        })
      : [];

    const frozenSpecs = scaffolded && fs.existsSync(specsDir)
      ? walkMd(specsDir).map((f) => path.relative(projectRoot, f))
      : [];

    return {
      framework: scaffolded ? 'openspec' : null,
      detected: scaffolded ? ['openspec'] : [],
      scaffolded,
      constitutionPath: scaffolded ? path.join(root, 'project.md') : undefined,
      activeChanges,
      frozenSpecs,
    };
  }

  async sync(projectRoot: string, dryRun = false): Promise<SddSyncReport> {
    return reconcileSpecs('openspec', projectRoot, dryRun);
  }
}

// ─── Templates ──────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function renderProposal(name: string, description: string): string {
  return `# Proposal: ${name}

## What

${description}

## Why

<!-- Explain the problem this change solves and the cost of not solving it. -->

## Non-goals

<!-- List 3+ things this change deliberately does NOT do. -->

- TODO
- TODO
- TODO

## Acceptance criteria

<!-- Observable, testable outcomes. Avoid implementation details here. -->

- [ ] TODO
`;
}

function renderDesign(name: string): string {
  return `# Design: ${name}

## Approach

<!-- Architecture decisions, data flow, key tradeoffs. -->

## Dependency choices

<!-- New runtime deps + 1-line justification each. -->

- (none)

## Spec deltas

<!--
List the spec files in ./specs/ that this change adds, modifies, or removes.
Use the markers ADDED / MODIFIED / REMOVED at the top of each delta file.
-->

- (none yet — add files under ./specs/)

## Risks

<!-- What could go wrong. Migration, perf, data loss, security. -->
`;
}

function renderTasks(name: string): string {
  return `# Tasks: ${name}

> Each task is a PR-sized unit. Order matters; later tasks may depend on earlier.

- [ ] 1. TODO
- [ ] 2. TODO
- [ ] 3. Run \`magneto sdd sync\` and reconcile any drift before merge
`;
}

function renderAgentsMd(projectName: string): string {
  return `# AGENTS.md

> A README for robots. Read this before making any change.

This is the **${projectName}** project. It uses **OpenSpec** for spec-driven development.

## Workflow

1. Read \`openspec/project.md\` (the constitution).
2. For a new change, scaffold a folder under \`openspec/changes/<name>/\`.
3. Write \`proposal.md\` (what + why), then \`design.md\` (how), then \`tasks.md\`.
4. Implement task-by-task. Update spec deltas as you go.
5. Before merge, run \`magneto sdd sync\` to reconcile spec ↔ code drift.

## Ground rules

- Spec is the source of truth. Code is the build output.
- When code diverges from spec, update the spec in the same commit.
- Use ADDED / MODIFIED / REMOVED markers in delta specs.
- Never commit secrets. Run \`magneto security audit\` before push.
`;
}

function walkMd(dir: string): string[] {
  const out: string[] = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop()!;
    if (!fs.existsSync(cur)) continue;
    for (const entry of fs.readdirSync(cur, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const p = path.join(cur, entry.name);
      if (entry.isDirectory()) stack.push(p);
      else if (entry.name.endsWith('.md')) out.push(p);
    }
  }
  return out;
}
