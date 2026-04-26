// GitHub Spec Kit adapter — greenfield-optimized, branch-per-spec.
//
// Layout:
//   .specify/
//     constitution.md                ← project principles (referenced by every spec)
//     memory/                        ← long-running notes
//   specs/<feature-slug>/
//     spec.md                        ← WHAT + WHY (tech-agnostic)
//     plan.md                        ← HOW (stack, design)
//     tasks.md                       ← implementation breakdown
//
// Reference: github/spec-kit
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

export class SpecKitAdapter implements SddAdapter {
  readonly info: SddFrameworkInfo = {
    id: 'speckit',
    displayName: 'Spec Kit',
    bestFor: 'greenfield',
    tagline: 'Greenfield, branch-per-spec. GitHub-backed, 30+ AI agent integrations.',
    description:
      'GitHub Spec Kit. Each feature is a branch and a /specs/<slug> folder. ' +
      'Constitution is the source of cross-cutting rules. Best when starting fresh; ' +
      'on brownfield, every feature requires reverse-engineering.',
    detectionMarkers: ['.specify/constitution.md', 'specs'],
    upstreamInit: { cmd: 'uvx', args: ['--from', 'git+https://github.com/github/spec-kit.git', 'specify', 'init'] },
  };

  isScaffolded(projectRoot: string): boolean {
    return fs.existsSync(path.join(projectRoot, '.specify', 'constitution.md'));
  }

  async init(opts: SddInitOptions): Promise<SddInitResult> {
    const result: SddInitResult = {
      framework: 'speckit',
      filesCreated: [],
      filesSkipped: [],
      warnings: [],
    };
    const projectName = path.basename(opts.projectRoot);

    const files: Array<[string, string]> = [
      [
        '.specify/constitution.md',
        renderConstitution({ projectName, framework: 'speckit' }),
      ],
      ['.specify/memory/.gitkeep', ''],
      ['specs/.gitkeep', ''],
      [
        '.specify/README.md',
        '# Spec Kit\n\n' +
          '- `constitution.md` — standing rules every spec inherits.\n' +
          '- `memory/` — long-running architectural notes.\n\n' +
          'Use Magneto: `magneto sdd new <name> "<description>"` to scaffold a feature spec.\n' +
          'Or use upstream slash commands inside Claude Code / Copilot:\n' +
          '`/speckit.constitution`, `/speckit.specify`, `/speckit.plan`, `/speckit.tasks`, `/speckit.implement`.\n',
      ],
    ];

    for (const [rel, body] of files) {
      const abs = path.join(opts.projectRoot, rel);
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
    const dir = path.join(opts.projectRoot, 'specs', slug);
    const result: SddNewChangeResult = {
      framework: 'speckit',
      changeDir: dir,
      filesCreated: [],
    };

    const files: Array<[string, string]> = [
      ['spec.md', renderSpec(opts.name, opts.description)],
      ['plan.md', renderPlan(opts.name)],
      ['tasks.md', renderTaskList(opts.name)],
    ];

    for (const [rel, body] of files) {
      const abs = path.join(dir, rel);
      if (!opts.dryRun) {
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, body, 'utf8');
      }
      result.filesCreated.push(abs);
    }
    return result;
  }

  async status(projectRoot: string): Promise<SddStatusReport> {
    const scaffolded = this.isScaffolded(projectRoot);
    const specsDir = path.join(projectRoot, 'specs');
    const activeChanges = scaffolded && fs.existsSync(specsDir)
      ? fs.readdirSync(specsDir).filter((d) => {
          if (d.startsWith('.')) return false;
          return fs.statSync(path.join(specsDir, d)).isDirectory();
        })
      : [];
    return {
      framework: scaffolded ? 'speckit' : null,
      detected: scaffolded ? ['speckit'] : [],
      scaffolded,
      constitutionPath: scaffolded
        ? path.join(projectRoot, '.specify', 'constitution.md')
        : undefined,
      activeChanges,
      frozenSpecs: [],
    };
  }

  async sync(projectRoot: string, dryRun = false): Promise<SddSyncReport> {
    return reconcileSpecs('speckit', projectRoot, dryRun);
  }
}

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function renderSpec(name: string, description: string): string {
  return `# Spec: ${name}

> WHAT and WHY only. Keep technology-agnostic. HOW belongs in plan.md.

## Problem

${description}

## Goals

- TODO

## Non-goals

- TODO
- TODO
- TODO

## User scenarios

<!-- Gherkin or plain narrative. Cover the unhappy path. -->

- TODO

## Acceptance criteria

- [ ] TODO
`;
}

function renderPlan(name: string): string {
  return `# Plan: ${name}

> HOW. Stack, design, file layout. References constitution.

## Architecture

## Components

## Data model

## Dependency choices

- (none)

## Risks

`;
}

function renderTaskList(name: string): string {
  return `# Tasks: ${name}

- [ ] 1. TODO
- [ ] 2. TODO
- [ ] 3. Run \`magneto sdd sync\` before merge
`;
}
