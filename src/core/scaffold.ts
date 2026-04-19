import * as path from 'path';
import { logger } from '../utils/logger';
import {
  magnetoPath,
  githubPath,
  vscodePath,
  MAGNETO_SUBDIRS,
  getTemplatesDir,
  COPILOT_INSTRUCTIONS,
  AGENTS_DIR,
} from '../utils/paths';
import { ensureDir, writeJson, writeText, fileExists, copyDir } from '../utils/fs';

export interface ScaffoldOptions {
  preserveConfig?: boolean;
}

export async function scaffold(projectRoot: string, options?: ScaffoldOptions): Promise<void> {
  const preserveConfig = options?.preserveConfig ?? false;
  const templatesDir = getTemplatesDir();
  const baseTemplatesDir = path.join(templatesDir, 'base');

  // Create .magneto subdirectories
  for (const sub of MAGNETO_SUBDIRS) {
    ensureDir(magnetoPath(projectRoot, sub));
  }

  // Write magneto.config.json
  const configPath = magnetoPath(projectRoot, 'magneto.config.json');
  if (!preserveConfig || !fileExists(configPath)) {
    writeJson(configPath, getDefaultConfig());
  }

  // Write magneto.min.json
  const minConfigPath = magnetoPath(projectRoot, 'magneto.min.json');
  if (!preserveConfig || !fileExists(minConfigPath)) {
    writeJson(minConfigPath, getMinConfig());
  }

  // Write START.md
  const startPath = magnetoPath(projectRoot, 'START.md');
  writeText(startPath, getStartMd());

  // Write role pack files
  writeRolePacks(projectRoot);

  // Write skill files
  writeSkillFiles(projectRoot);

  // Write memory root summary
  writeMemoryFiles(projectRoot);

  // Write task schemas
  writeTaskSchemas(projectRoot);

  // Write scripts
  writeScripts(projectRoot);

  // Create .github/copilot-instructions.md
  const copilotPath = path.join(projectRoot, COPILOT_INSTRUCTIONS);
  ensureDir(path.dirname(copilotPath));
  writeText(copilotPath, getCopilotInstructions());

  // Create .github/agents/
  const agentsDir = path.join(projectRoot, AGENTS_DIR);
  ensureDir(agentsDir);
  writeAgentFiles(agentsDir);

  // Create .vscode/mcp.json
  const mcpJsonPath = vscodePath(projectRoot, 'mcp.json');
  ensureDir(path.dirname(mcpJsonPath));
  writeJson(mcpJsonPath, getMcpConfig());

  logger.debug('Scaffold complete');
}

function getDefaultConfig(): object {
  return {
    version: '0.1.0',
    projectName: '',
    executionMode: 'assist',
    security: {
      protectedPaths: ['*.env', '*.pem', '*.key', 'secrets/**'],
      blockedActions: ['delete-database', 'drop-table', 'rm -rf'],
      approvalRequired: ['deploy', 'migrate', 'auth-change'],
      maxTelepathyLevel: 2,
    },
    powerPacks: [],
    adapters: [],
    runners: {
      default: 'openai',
      available: ['openai', 'copilot-local', 'copilot-cloud'],
    },
    memoryMode: 'internal-first',
    roles: ['orchestrator', 'backend', 'tester', 'requirements'],
  };
}

function getMinConfig(): object {
  return {
    version: '0.1.0',
    mode: 'assist',
    runner: 'openai',
  };
}

function getStartMd(): string {
  return `# ⚡ Magneto AI

Welcome to your Magneto AI-powered project!

## Quick Start

1. Run \`magneto doctor\` to validate setup
2. Run \`magneto analyze\` to scan and build project memory
3. Copy \`.magneto/tasks/TASK_TEMPLATE.md\` and fill it in
4. Run \`magneto plan your-task.md\`
5. Run \`magneto generate your-task.md\` and paste into Windsurf/Copilot

## Task Files (.md — what you write)

Tasks are Markdown files with YAML frontmatter. Copy TASK_TEMPLATE.md to get started:

\`\`\`
.magneto/tasks/
  TASK_TEMPLATE.md   ← copy this to create a new task
  your-feature.md    ← your task files live here
  schemas/           ← JSON schemas for tooling (ignore these)
\`\`\`

## Directory Structure

- \`roles/\` — Agent role packs (.md — edit these to customize agent behavior)
- \`skills/\` — Skill definitions (.md — edit these)
- \`memory/\` — Project memory, auto-built by \`magneto analyze\`
- \`tasks/\` — Task files (.md) + tooling schemas
- \`cache/\` — Execution cache (auto-generated, do not edit)
- \`security/\` — Security policies
- \`scripts/\` — Automation scripts
- \`power-packs/\` — Power pack configs (managed by magneto)
- \`adapters/\` — Adapter configs (managed by magneto)

## What stays JSON (config only, minimal)

- \`magneto.config.json\` — project config
- \`magneto.min.json\` — minimal runtime config
- \`.vscode/mcp.json\` — VS Code MCP connection

## Documentation

See the project README for full documentation.
`;
}

function getCopilotInstructions(): string {
  return `# Copilot Instructions — Magneto AI

This project uses the **Magneto AI Reasoning Framework**.

## Rules

1. Always check \`.magneto/magneto.config.json\` for project configuration
2. Respect security policies in \`.magneto/security/\`
3. Use the Magneto AI MCP tools when available
4. Follow role-based execution — each agent has a specific domain
5. Never bypass security guardrails
6. Report findings with confidence levels
7. Flag any operations on protected paths

## Available Agents

- **magneto-orchestrator** — Coordinates multi-agent tasks
- **magneto-backend** — Backend analysis and implementation
- **magneto-tester** — Test generation and validation
- **magneto-requirements** — Requirements analysis and tracing

## MCP Tools

- \`plan_task\` — Generate execution plans
- \`load_context\` — Load project context
- \`merge_results\` — Merge agent outputs
- \`security_check\` — Validate security constraints
`;
}

function getMcpConfig(): object {
  return {
    servers: {
      magneto: {
        command: 'node',
        args: ['node_modules/magneto-ai/dist/mcp/server.js'],
        env: {},
      },
    },
  };
}

function writeAgentFiles(agentsDir: string): void {
  writeText(
    path.join(agentsDir, 'magneto-orchestrator.agent.md'),
    `---
name: magneto-orchestrator
description: Coordinates multi-agent AI reasoning tasks
model: gpt-4o
tools:
  - plan_task
  - load_context
  - merge_results
  - security_check
---

# Magneto AI Orchestrator Agent

You are the **orchestrator agent** in Magneto AI.

## Responsibilities

- Decompose complex tasks into subtasks
- Assign subtasks to appropriate specialist agents
- Coordinate execution order and dependencies
- Merge and validate results from all agents
- Enforce security guardrails throughout execution

## Behavior

1. Always start by loading the project context via \`load_context\`
2. Run \`security_check\` before executing any task
3. Create a plan via \`plan_task\` before execution
4. Delegate to specialist agents based on task classification
5. Use \`merge_results\` to combine outputs
6. Never execute tasks that fail security checks
7. Report confidence levels for all findings
`
  );

  writeText(
    path.join(agentsDir, 'magneto-backend.agent.md'),
    `---
name: magneto-backend
description: Backend analysis, architecture review, and implementation guidance
model: gpt-4o
tools:
  - load_context
  - security_check
---

# Magneto AI Backend Agent

You are the **backend specialist agent** in Magneto AI.

## Responsibilities

- Analyze backend architecture and code patterns
- Review API designs and data models
- Identify performance bottlenecks
- Suggest implementation improvements
- Validate security of backend operations

## Behavior

1. Focus exclusively on backend concerns
2. Always check security implications of suggestions
3. Consider scalability and maintainability
4. Reference existing codebase patterns
5. Provide confidence ratings for all assessments
`
  );

  writeText(
    path.join(agentsDir, 'magneto-tester.agent.md'),
    `---
name: magneto-tester
description: Test generation, validation, and quality assurance
model: gpt-4o
tools:
  - load_context
  - security_check
---

# Magneto AI Tester Agent

You are the **testing specialist agent** in Magneto AI.

## Responsibilities

- Generate test cases from requirements and code
- Validate existing test coverage
- Identify testing gaps
- Suggest test improvements
- Validate edge cases and error handling

## Behavior

1. Prioritize critical path testing
2. Generate both unit and integration test suggestions
3. Check for security-related test coverage
4. Validate error handling completeness
5. Report coverage confidence levels
`
  );

  writeText(
    path.join(agentsDir, 'magneto-requirements.agent.md'),
    `---
name: magneto-requirements
description: Requirements analysis, tracing, and validation
model: gpt-4o
tools:
  - load_context
  - security_check
---

# Magneto AI Requirements Agent

You are the **requirements specialist agent** in Magneto AI.

## Responsibilities

- Analyze and validate requirements
- Trace requirements to implementation
- Identify requirement conflicts and gaps
- Validate acceptance criteria
- Assess requirement completeness

## Behavior

1. Cross-reference requirements with existing code
2. Identify contradictions and ambiguities
3. Flag unimplemented requirements
4. Assess impact of requirement changes
5. Report traceability confidence levels
`
  );
}

function writeRolePacks(projectRoot: string): void {
  const rolesDir = magnetoPath(projectRoot, 'roles');

  writeText(
    path.join(rolesDir, 'orchestrator.pack.md'),
    `# Orchestrator Role Pack

## Identity
You are the **orchestrator** — the central coordinator of all Magneto AI agents.

## Responsibilities
- Decompose complex tasks into subtasks for specialist agents
- Assign work based on task classification and agent capabilities
- Coordinate execution order and manage dependencies between subtasks
- Collect, validate, and merge results from all agents
- Detect contradictions between agent findings
- Make final decisions when agents disagree
- Enforce security guardrails throughout the pipeline

## Decision Authority
- You have **final merge authority** over all agent outputs
- When agents contradict each other, you resolve by weighing confidence scores and evidence
- You may escalate to human review when confidence is below threshold

## Constraints
- Never bypass security checks
- Never execute tasks that fail security evaluation
- Always report overall confidence and risk levels
`
  );

  writeText(
    path.join(rolesDir, 'backend.pack.md'),
    `# Backend Role Pack

## Identity
You are the **backend specialist** — focused on server-side architecture, APIs, and data.

## Responsibilities
- Analyze backend architecture, code patterns, and data flows
- Review API designs, route handlers, and middleware
- Identify performance bottlenecks and scaling concerns
- Validate database queries and data model integrity
- Check for security vulnerabilities in backend code

## Focus Areas
- Route handling and middleware chains
- Database queries and ORM patterns
- Authentication and authorization logic
- Error handling and logging
- API contracts and response formats

## Constraints
- Stay within backend scope — defer frontend to other agents
- Always flag security implications of code changes
- Report confidence levels for all findings
`
  );

  writeText(
    path.join(rolesDir, 'tester.pack.md'),
    `# Tester Role Pack

## Identity
You are the **testing specialist** — focused on test coverage, quality, and validation.

## Responsibilities
- Evaluate existing test coverage against requirements
- Identify testing gaps and missing edge cases
- Validate that tests match current implementation behavior
- Detect stale tests that no longer reflect system behavior
- Suggest new test cases for uncovered paths

## Focus Areas
- Unit test completeness
- Integration test coverage
- E2E test alignment with requirements
- Edge case and error path testing
- Test drift detection (tests that pass but are wrong)

## Constraints
- Cross-reference tests with both code AND requirements
- Flag tests that contradict requirements as potential stale specs
- Report coverage confidence levels
`
  );

  writeText(
    path.join(rolesDir, 'requirements.pack.md'),
    `# Requirements Role Pack

## Identity
You are the **requirements specialist** — focused on tracing specs to implementation.

## Responsibilities
- Map requirements to their implementation in code
- Detect unimplemented requirements
- Identify stale requirements that no longer match the codebase
- Flag contradictions between requirements and implementation
- Assess impact of requirement changes on the system

## Focus Areas
- Requirement-to-code traceability
- Stale specification detection
- Acceptance criteria validation
- Cross-domain requirement conflicts
- Impact analysis for proposed changes

## Constraints
- Always trace findings back to specific requirements
- Flag stale specs rather than assuming code is wrong
- Report traceability confidence levels
`
  );
}

function writeSkillFiles(projectRoot: string): void {
  const skillsDir = magnetoPath(projectRoot, 'skills');

  writeText(
    path.join(skillsDir, 'impact-analysis.md'),
    `# Skill: Impact Analysis

## Purpose
Determine the blast radius of a code change across the system.

## Process
1. Identify all files directly modified by the change
2. Trace dependencies — what imports or calls the modified code
3. Check for affected tests, requirements, and documentation
4. Assess risk level based on the number of affected components
5. Flag cross-domain impacts (e.g., backend change affecting frontend)

## Output
- List of directly affected files
- List of transitively affected components
- Risk assessment (low/medium/high/critical)
- Recommended review scope
`
  );

  writeText(
    path.join(skillsDir, 'parallel-work-allocation.md'),
    `# Skill: Parallel Work Allocation

## Purpose
Split a complex task into independent subtasks that can be executed by multiple agents in parallel.

## Process
1. Analyze the task description and scope
2. Identify independent domains (backend, testing, requirements, infrastructure)
3. Create non-overlapping subtask assignments for each agent role
4. Define clear boundaries — what each agent should and should NOT touch
5. Set up merge criteria for combining results

## Allocation Rules
- Each subtask must be self-contained within its domain
- Overlapping scope must be explicitly noted for contradiction detection
- All subtasks must share the same security constraints
- Orchestrator retains merge and final-decision authority
`
  );

  writeText(
    path.join(skillsDir, 'final-decision-merge.md'),
    `# Skill: Final Decision Merge

## Purpose
Combine findings from all agents into a single coherent decision.

## Process
1. Collect all agent outputs (findings, risks, confidence scores)
2. Deduplicate findings by content — keep higher confidence version
3. Deduplicate risks by description — keep higher severity version
4. Detect contradictions between agents (see contradiction-resolution skill)
5. Calculate weighted confidence (higher-confidence agents weighted more)
6. Determine overall risk level
7. Produce final merged output with decision and recommended actions

## Merge Rules
- Findings from multiple agents on the same topic increase confidence
- Contradicting findings trigger contradiction resolution
- Final risk = highest severity found across all agents
- Overall confidence = weighted average favoring high-confidence agents
`
  );

  writeText(
    path.join(skillsDir, 'contradiction-resolution.md'),
    `# Skill: Contradiction Resolution

## Purpose
Detect and resolve conflicting findings between agents or between code, tests, and requirements.

## Contradiction Types
1. **Code vs Requirement** — implementation doesn't match the spec
2. **Code vs Test** — test expects different behavior than code provides
3. **Requirement vs Test** — test validates against outdated requirement
4. **Agent vs Agent** — two agents disagree on the same finding

## Resolution Process
1. Identify the contradiction (what conflicts with what)
2. Gather evidence from each side (code, tests, requirements, commit history)
3. Determine which side is "stale" — often the requirement or test is outdated
4. Assess whether the deviation was intentional (check recent commits)
5. Produce a resolution decision:
   - Update the stale artifact (requirement, test, or code)
   - Escalate to human review if confidence is low
6. Report the contradiction with full context and recommended action

## Priority Rules
- Recent intentional code changes take priority over old specs
- If a requirement is explicitly documented and recent, code should match
- When in doubt, flag for human review rather than auto-resolving
`
  );
}

function writeMemoryFiles(projectRoot: string): void {
  writeText(
    magnetoPath(projectRoot, 'memory', 'root-summary.md'),
    `# Project Memory — Root Summary

## Overview
This file is auto-generated by Magneto AI to store high-level project context.

## Project Structure
<!-- Auto-populated by magneto:scan -->

## Key Modules
<!-- Auto-populated by magneto:scan -->

## Requirements Summary
<!-- Auto-populated from requirements analysis -->

## Test Coverage Summary
<!-- Auto-populated from test analysis -->

## Known Issues
<!-- Updated after each magneto run -->

## Last Updated
<!-- Timestamp of last memory refresh -->
`
  );
}

function writeTaskSchemas(projectRoot: string): void {
  const tasksDir = magnetoPath(projectRoot, 'tasks');
  const schemasDir = path.join(tasksDir, 'schemas');
  ensureDir(schemasDir);

  // Developer-facing template (.md — this is what developers copy and edit)
  writeText(
    path.join(tasksDir, 'TASK_TEMPLATE.md'),
    `---
id: TASK-001
title: Short descriptive title
type: feature-implementation
scope:
  - src/path/to/relevant/files/
  - src/another/file.ts
tags:
  - tag1
  - tag2
constraints:
  - Must follow existing patterns in the codebase
  - Must include unit tests
  - Must not change public API contracts
---

Describe what needs to be done in plain language. Include the context,
goal, and any relevant background the AI agent needs to understand.

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Tests pass

## Notes

Any extra context: ticket links, design decisions, known edge cases.
`
  );

  // JSON schemas live in schemas/ — these are for tooling only, not for developers to edit
  writeJson(path.join(schemasDir, 'task-schema.json'), {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Magneto AI Task (JSON fallback — prefer .md format)',
    type: 'object',
    required: ['id', 'title', 'description', 'type'],
    properties: {
      id: { type: 'string', description: 'Unique task identifier' },
      title: { type: 'string', description: 'Short task title' },
      description: { type: 'string', description: 'Detailed task description' },
      type: {
        type: 'string',
        enum: [
          'architecture-review', 'bug-fix', 'feature-implementation',
          'security-audit', 'performance-review', 'testing',
          'requirements-analysis', 'code-review', 'general',
        ],
      },
      scope: { type: 'array', items: { type: 'string' }, description: 'Files or directories in scope' },
      tags: { type: 'array', items: { type: 'string' }, description: 'Task tags for classification' },
      constraints: { type: 'array', items: { type: 'string' }, description: 'Execution constraints' },
    },
  });

  writeJson(path.join(schemasDir, 'result-schema.json'), {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Magneto AI Result',
    type: 'object',
    required: ['taskId', 'findings', 'risks', 'confidence'],
    properties: {
      taskId: { type: 'string' },
      agentId: { type: 'string' },
      role: { type: 'string' },
      findings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            source: { type: 'string' },
            content: { type: 'string' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            category: { type: 'string' },
          },
          required: ['source', 'content', 'confidence'],
        },
      },
      risks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            description: { type: 'string' },
            source: { type: 'string' },
            mitigation: { type: 'string' },
          },
          required: ['severity', 'description', 'source'],
        },
      },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
    },
  });

  writeJson(path.join(schemasDir, 'contradiction-schema.json'), {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Magneto AI Contradiction',
    type: 'object',
    required: ['id', 'type', 'sides', 'resolution'],
    properties: {
      id: { type: 'string', description: 'Contradiction identifier' },
      type: {
        type: 'string',
        enum: ['code-vs-requirement', 'code-vs-test', 'requirement-vs-test', 'agent-vs-agent'],
        description: 'Type of contradiction',
      },
      sides: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            source: { type: 'string', description: 'Which agent or artifact' },
            claim: { type: 'string', description: 'What this side asserts' },
            evidence: { type: 'string', description: 'Supporting evidence' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
          },
          required: ['source', 'claim'],
        },
        minItems: 2,
      },
      resolution: {
        type: 'object',
        properties: {
          decision: { type: 'string', description: 'Resolution decision' },
          action: { type: 'array', items: { type: 'string' }, description: 'Recommended actions' },
          staleArtifact: { type: 'string', description: 'Which artifact is stale' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          requiresHumanReview: { type: 'boolean' },
        },
        required: ['decision'],
      },
    },
  });
}

function writeScripts(projectRoot: string): void {
  const scriptsDir = magnetoPath(projectRoot, 'scripts');

  writeText(
    path.join(scriptsDir, 'scan-repo.ts'),
    `/**
 * scan-repo.ts — Scans the repository structure and builds a file index.
 *
 * Usage: npx tsx .magneto/scripts/scan-repo.ts
 *
 * Outputs: .magneto/cache/repo-index.json
 */

import * as fs from 'fs';
import * as path from 'path';

const IGNORE_DIRS = ['node_modules', '.git', 'dist', '.magneto/cache', '.magneto/output'];
const PROJECT_ROOT = path.resolve(__dirname, '../..');

interface FileEntry {
  path: string;
  extension: string;
  sizeBytes: number;
}

function scanDirectory(dir: string, entries: FileEntry[] = []): FileEntry[] {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relativePath = path.relative(PROJECT_ROOT, fullPath);

    if (IGNORE_DIRS.some((ig) => relativePath.startsWith(ig))) continue;

    if (item.isDirectory()) {
      scanDirectory(fullPath, entries);
    } else {
      entries.push({
        path: relativePath,
        extension: path.extname(item.name),
        sizeBytes: fs.statSync(fullPath).size,
      });
    }
  }

  return entries;
}

const entries = scanDirectory(PROJECT_ROOT);
const output = {
  scannedAt: new Date().toISOString(),
  totalFiles: entries.length,
  files: entries,
};

const outPath = path.join(PROJECT_ROOT, '.magneto', 'cache', 'repo-index.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(\`Scanned \${entries.length} files → .magneto/cache/repo-index.json\`);
`
  );

  writeText(
    path.join(scriptsDir, 'build-memory.ts'),
    `/**
 * build-memory.ts — Builds project memory from the repo scan index.
 *
 * Usage: npx tsx .magneto/scripts/build-memory.ts
 *
 * Reads: .magneto/cache/repo-index.json
 * Outputs: .magneto/memory/root-summary.md (updated)
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const indexPath = path.join(PROJECT_ROOT, '.magneto', 'cache', 'repo-index.json');

if (!fs.existsSync(indexPath)) {
  console.error('No repo index found. Run scan-repo.ts first.');
  process.exit(1);
}

const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
const files: { path: string; extension: string }[] = index.files;

// Group by extension
const byExtension: Record<string, number> = {};
for (const f of files) {
  byExtension[f.extension] = (byExtension[f.extension] || 0) + 1;
}

// Group by top-level directory
const byDir: Record<string, number> = {};
for (const f of files) {
  const topDir = f.path.split('/')[0] || f.path.split(path.sep)[0];
  byDir[topDir] = (byDir[topDir] || 0) + 1;
}

const summary = \`# Project Memory — Root Summary

## Overview
Auto-generated by Magneto AI memory builder.

## Project Structure
Total files: \${files.length}

### By Extension
\${Object.entries(byExtension).sort((a, b) => b[1] - a[1]).map(([ext, count]) => \`- \${ext || '(none)'}: \${count}\`).join('\\n')}

### By Directory
\${Object.entries(byDir).sort((a, b) => b[1] - a[1]).map(([dir, count]) => \`- \${dir}: \${count}\`).join('\\n')}

## Last Updated
\${new Date().toISOString()}
\`;

const outPath = path.join(PROJECT_ROOT, '.magneto', 'memory', 'root-summary.md');
fs.writeFileSync(outPath, summary);
console.log('Memory updated → .magneto/memory/root-summary.md');
`
  );

  writeText(
    path.join(scriptsDir, 'run-parallel.ts'),
    `/**
 * run-parallel.ts — Executes multiple Magneto AI agents in parallel.
 *
 * Usage: npx tsx .magneto/scripts/run-parallel.ts <task.md>
 *
 * Reads: task file (.md with YAML frontmatter, .yaml, or .json) + magneto.config.json
 * Outputs: .magneto/output/<agentId>.json per agent
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const taskFile = process.argv[2];

if (!taskFile) {
  console.error('Usage: npx tsx run-parallel.ts <task.md>');
  process.exit(1);
}

// Parse task from .md (YAML frontmatter), .yaml, or .json
const rawContent = fs.readFileSync(taskFile, 'utf-8');
let task: any;
try {
  if (taskFile.endsWith('.json')) {
    task = JSON.parse(rawContent);
  } else {
    // Parse YAML frontmatter from .md or .yaml
    const fmMatch = rawContent.match(/^---\n([\s\S]*?)\n---/);
    const yamlLines = fmMatch ? fmMatch[1] : rawContent;
    const obj: Record<string, any> = {};
    let currentKey = '';
    for (const line of yamlLines.split('\n')) {
      const kv = line.match(/^(\w[\w-]*):\s*(.*)/);
      if (kv) { currentKey = kv[1]; obj[currentKey] = kv[2].trim() || []; }
      else if (line.trim().startsWith('- ') && Array.isArray(obj[currentKey])) {
        obj[currentKey].push(line.trim().slice(2));
      }
    }
    task = obj;
  }
} catch (e) {
  console.error('Failed to parse task file:', e);
  process.exit(1);
}
const configPath = path.join(PROJECT_ROOT, '.magneto', 'magneto.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const roles: string[] = config.roles || ['orchestrator', 'backend', 'tester', 'requirements'];

console.log(\`Task: \${task.title}\`);
console.log(\`Roles: \${roles.join(', ')}\`);
console.log('Starting parallel execution...\\n');

const outputDir = path.join(PROJECT_ROOT, '.magneto', 'output');
fs.mkdirSync(outputDir, { recursive: true });

// Execute agents in parallel (simulated — replace with actual runner calls)
const agentPromises = roles.map(async (role) => {
  console.log(\`[\${role}] Starting analysis...\`);

  // Simulated agent output — replace with actual OpenAI/Copilot runner calls
  const result = {
    agentId: \`agent-\${role}\`,
    role,
    taskId: task.id,
    findings: [],
    risks: [],
    confidence: 0,
    executedAt: new Date().toISOString(),
    status: 'pending-implementation',
    note: \`Replace this with actual \${role} agent execution via Magneto AI runner\`,
  };

  const outPath = path.join(outputDir, \`agent-\${role}.json\`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(\`[\${role}] Output → .magneto/output/agent-\${role}.json\`);

  return result;
});

Promise.all(agentPromises).then((results) => {
  console.log(\`\\nAll \${results.length} agents complete. Run merge-results.ts to combine.\`);
});
`
  );

  writeText(
    path.join(scriptsDir, 'merge-results.ts'),
    `/**
 * merge-results.ts — Merges all agent outputs into a final decision.
 *
 * Usage: npx tsx .magneto/scripts/merge-results.ts
 *
 * Reads: .magneto/output/agent-*.json
 * Outputs: .magneto/output/merged-result.json
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const outputDir = path.join(PROJECT_ROOT, '.magneto', 'output');

if (!fs.existsSync(outputDir)) {
  console.error('No output directory found. Run run-parallel.ts first.');
  process.exit(1);
}

const agentFiles = fs.readdirSync(outputDir).filter((f) => f.startsWith('agent-') && f.endsWith('.json'));

if (agentFiles.length === 0) {
  console.error('No agent output files found.');
  process.exit(1);
}

console.log(\`Merging \${agentFiles.length} agent outputs...\\n\`);

interface Finding { source: string; content: string; confidence: number; }
interface Risk { severity: string; description: string; source: string; }
interface Contradiction { type: string; sides: { source: string; claim: string }[]; }

const allFindings: Finding[] = [];
const allRisks: Risk[] = [];
const contradictions: Contradiction[] = [];
const confidences: number[] = [];
let taskId = '';

for (const file of agentFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(outputDir, file), 'utf-8'));
  console.log(\`  Loading: \${file} (role: \${data.role})\`);

  if (data.taskId && !taskId) taskId = data.taskId;
  if (data.findings) allFindings.push(...data.findings);
  if (data.risks) allRisks.push(...data.risks);
  if (data.confidence) confidences.push(data.confidence);
}

// Deduplicate findings
const uniqueFindings = new Map<string, Finding>();
for (const f of allFindings) {
  const key = f.content.toLowerCase().trim();
  const existing = uniqueFindings.get(key);
  if (!existing || f.confidence > existing.confidence) {
    uniqueFindings.set(key, f);
  }
}

// Deduplicate risks
const severityOrder: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const uniqueRisks = new Map<string, Risk>();
for (const r of allRisks) {
  const key = r.description.toLowerCase().trim();
  const existing = uniqueRisks.get(key);
  if (!existing || (severityOrder[r.severity] || 0) > (severityOrder[existing.severity] || 0)) {
    uniqueRisks.set(key, r);
  }
}

// Detect contradictions (findings from different agents with opposing conclusions)
const findingsByTopic = new Map<string, Finding[]>();
for (const f of allFindings) {
  const words = f.content.toLowerCase().split(/\\s+/).slice(0, 5).join(' ');
  const group = findingsByTopic.get(words) || [];
  group.push(f);
  findingsByTopic.set(words, group);
}

for (const [, group] of findingsByTopic) {
  if (group.length > 1) {
    const sources = new Set(group.map((g) => g.source));
    if (sources.size > 1) {
      contradictions.push({
        type: 'agent-vs-agent',
        sides: group.map((g) => ({ source: g.source, claim: g.content })),
      });
    }
  }
}

// Calculate confidence
const avgConfidence = confidences.length > 0
  ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100) / 100
  : 0;

// Determine overall risk
const risks = Array.from(uniqueRisks.values());
let overallRisk = 'low';
if (risks.some((r) => r.severity === 'critical')) overallRisk = 'critical';
else if (risks.some((r) => r.severity === 'high')) overallRisk = 'high';
else if (risks.some((r) => r.severity === 'medium')) overallRisk = 'medium';

const merged = {
  taskId,
  findings: Array.from(uniqueFindings.values()),
  risks,
  contradictions,
  confidence: avgConfidence,
  overallRisk,
  agentCount: agentFiles.length,
  mergedAt: new Date().toISOString(),
};

const outPath = path.join(outputDir, 'merged-result.json');
fs.writeFileSync(outPath, JSON.stringify(merged, null, 2));
console.log(\`\\nMerged result → .magneto/output/merged-result.json\`);
console.log(\`  Findings: \${merged.findings.length}\`);
console.log(\`  Risks: \${merged.risks.length}\`);
console.log(\`  Contradictions: \${merged.contradictions.length}\`);
console.log(\`  Overall risk: \${merged.overallRisk}\`);
console.log(\`  Confidence: \${merged.confidence}\`);
`
  );
}
