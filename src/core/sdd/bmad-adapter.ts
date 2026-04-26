// BMAD-METHOD adapter — multi-agent pipeline, audit-friendly.
//
// Layout:
//   bmad-core/
//     constitution.md          ← project rules (shared)
//     agents/                  ← persona definitions (Analyst, PM, Architect, SM, Dev, QA)
//     workflows/               ← Scale-Adaptive workflow YAMLs
//   docs/
//     prd/                     ← Product Requirements Documents (PM agent output)
//     architecture/            ← Architecture docs (Architect agent output)
//     stories/                 ← Sprint stories (SM agent output)
//     qa/                      ← QA reports (QA agent output)
//
// Reference: docs.bmad-method.org
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

const PERSONAS = ['analyst', 'pm', 'architect', 'scrum-master', 'developer', 'qa'] as const;

export class BmadAdapter implements SddAdapter {
  readonly info: SddFrameworkInfo = {
    id: 'bmad',
    displayName: 'BMAD-METHOD',
    bestFor: 'regulated',
    tagline: 'Multi-agent (PM/Architect/SM/Dev/QA) pipeline with versioned handoffs. SOC2-friendly.',
    description:
      'BMAD-METHOD v6. 12+ AI personas with versioned artifact handoffs (Analyst → PM → Architect → ' +
      'Scrum Master → Developer → QA). Best for regulated environments where audit trails matter.',
    detectionMarkers: ['bmad-core/constitution.md', 'bmad-core/agents'],
    upstreamInit: { cmd: 'npx', args: ['-y', 'bmad-method', 'install'] },
  };

  isScaffolded(projectRoot: string): boolean {
    return fs.existsSync(path.join(projectRoot, 'bmad-core', 'constitution.md'));
  }

  async init(opts: SddInitOptions): Promise<SddInitResult> {
    const result: SddInitResult = {
      framework: 'bmad',
      filesCreated: [],
      filesSkipped: [],
      warnings: [],
    };
    const projectName = path.basename(opts.projectRoot);

    const files: Array<[string, string]> = [
      [
        'bmad-core/constitution.md',
        renderConstitution({ projectName, framework: 'bmad' }),
      ],
      [
        'bmad-core/README.md',
        '# BMAD Core\n\n' +
          'Multi-agent SDD pipeline. Each persona produces a versioned artifact:\n\n' +
          '| Persona | Output | Lives in |\n' +
          '|---|---|---|\n' +
          '| Analyst | Discovery notes | docs/discovery/ |\n' +
          '| PM | PRD | docs/prd/ |\n' +
          '| Architect | Architecture doc | docs/architecture/ |\n' +
          '| Scrum Master | Stories | docs/stories/ |\n' +
          '| Developer | Code + tests | src/, tests/ |\n' +
          '| QA | QA report | docs/qa/ |\n',
      ],
    ];

    for (const persona of PERSONAS) {
      files.push([
        `bmad-core/agents/${persona}.md`,
        renderPersona(persona, projectName),
      ]);
    }

    for (const dir of ['discovery', 'prd', 'architecture', 'stories', 'qa']) {
      files.push([`docs/${dir}/.gitkeep`, '']);
    }

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
    const result: SddNewChangeResult = {
      framework: 'bmad',
      changeDir: path.join(opts.projectRoot, 'docs'),
      filesCreated: [],
    };

    const files: Array<[string, string]> = [
      [`docs/prd/${slug}.md`, renderPrd(opts.name, opts.description)],
      [`docs/architecture/${slug}.md`, renderArch(opts.name)],
      [`docs/stories/${slug}.md`, renderStories(opts.name)],
    ];

    for (const [rel, body] of files) {
      const abs = path.join(opts.projectRoot, rel);
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
    const prdDir = path.join(projectRoot, 'docs', 'prd');
    const activeChanges = scaffolded && fs.existsSync(prdDir)
      ? fs.readdirSync(prdDir).filter((f) => f.endsWith('.md'))
      : [];
    return {
      framework: scaffolded ? 'bmad' : null,
      detected: scaffolded ? ['bmad'] : [],
      scaffolded,
      constitutionPath: scaffolded
        ? path.join(projectRoot, 'bmad-core', 'constitution.md')
        : undefined,
      activeChanges,
      frozenSpecs: [],
    };
  }

  async sync(projectRoot: string, dryRun = false): Promise<SddSyncReport> {
    return reconcileSpecs('bmad', projectRoot, dryRun);
  }
}

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function renderPersona(persona: string, projectName: string): string {
  const role = personaRole(persona);
  return `# ${capitalize(persona)} Agent — ${projectName}

## Role

${role.summary}

## Inputs

${role.inputs.map((i) => `- ${i}`).join('\n')}

## Outputs

${role.outputs.map((o) => `- ${o}`).join('\n')}

## Handoff

Produces artifacts under \`${role.outputDir}\`. The next persona in the pipeline
(${role.next}) reads from this directory.

## Constitution

Read \`bmad-core/constitution.md\` before producing any artifact.
`;
}

function personaRole(persona: string): {
  summary: string;
  inputs: string[];
  outputs: string[];
  outputDir: string;
  next: string;
} {
  switch (persona) {
    case 'analyst':
      return {
        summary: 'Discovers and documents the problem space. No solutions yet.',
        inputs: ['Stakeholder interviews', 'Existing system docs', 'User feedback'],
        outputs: ['Discovery notes', 'Problem statement'],
        outputDir: 'docs/discovery/',
        next: 'PM',
      };
    case 'pm':
      return {
        summary: 'Translates discovery into a Product Requirements Document.',
        inputs: ['docs/discovery/', 'Constitution'],
        outputs: ['PRD with goals, non-goals, acceptance criteria'],
        outputDir: 'docs/prd/',
        next: 'Architect',
      };
    case 'architect':
      return {
        summary: 'Designs the technical solution to satisfy the PRD.',
        inputs: ['docs/prd/', 'Constitution', 'Existing architecture'],
        outputs: ['Architecture doc, component diagrams, data model'],
        outputDir: 'docs/architecture/',
        next: 'Scrum Master',
      };
    case 'scrum-master':
      return {
        summary: 'Breaks the architecture into PR-sized stories with acceptance criteria.',
        inputs: ['docs/architecture/', 'docs/prd/'],
        outputs: ['Ordered stories with definition-of-done'],
        outputDir: 'docs/stories/',
        next: 'Developer',
      };
    case 'developer':
      return {
        summary: 'Implements stories one at a time. Updates spec on drift.',
        inputs: ['docs/stories/', 'Constitution'],
        outputs: ['Code, tests, updated spec deltas'],
        outputDir: 'src/, tests/',
        next: 'QA',
      };
    case 'qa':
      return {
        summary: 'Validates implementation against PRD and architecture. Audit trail.',
        inputs: ['Implemented code', 'docs/prd/', 'docs/architecture/'],
        outputs: ['QA report with pass/fail per acceptance criterion'],
        outputDir: 'docs/qa/',
        next: '(end of pipeline)',
      };
    default:
      return {
        summary: 'Custom persona.',
        inputs: [],
        outputs: [],
        outputDir: 'docs/',
        next: '',
      };
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
}

function renderPrd(name: string, description: string): string {
  return `# PRD: ${name}

## Problem

${description}

## Goals

- TODO

## Non-goals

- TODO
- TODO
- TODO

## Acceptance criteria

- [ ] TODO

## Success metrics

- TODO
`;
}

function renderArch(name: string): string {
  return `# Architecture: ${name}

## Overview

## Components

## Data model

## Dependency choices

- (none)

## Risks & mitigations

`;
}

function renderStories(name: string): string {
  return `# Stories: ${name}

## Story 1 — TODO

**As a** ...
**I want** ...
**So that** ...

**Acceptance:**
- [ ] TODO

**Definition of done:** tests added, spec updated, \`magneto sdd sync\` clean.
`;
}
