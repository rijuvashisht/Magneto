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
  return `# ⚡ Magneto Framework

Welcome to your Magneto-powered project!

## Quick Start

1. Run \`magneto doctor\` to validate setup
2. Create a task in \`.magneto/tasks/\`
3. Run \`magneto plan task.json\`
4. Run \`magneto run task.json\`

## Directory Structure

- \`roles/\` — Agent role definitions
- \`skills/\` — Skill configurations
- \`memory/\` — Persistent memory store
- \`tasks/\` — Task definitions and plans
- \`cache/\` — Execution cache and results
- \`security/\` — Security policies and audit logs
- \`scripts/\` — Custom automation scripts
- \`power-packs/\` — Loaded power pack configs
- \`adapters/\` — Adapter configurations

## Documentation

See the project README for full documentation.
`;
}

function getCopilotInstructions(): string {
  return `# Copilot Instructions — Magneto Framework

This project uses the **Magneto AI Reasoning Framework**.

## Rules

1. Always check \`.magneto/magneto.config.json\` for project configuration
2. Respect security policies in \`.magneto/security/\`
3. Use the Magneto MCP tools when available
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
        args: ['node_modules/magneto-framework/dist/mcp/server.js'],
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

# Magneto Orchestrator Agent

You are the **orchestrator agent** in the Magneto framework.

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

# Magneto Backend Agent

You are the **backend specialist agent** in the Magneto framework.

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

# Magneto Tester Agent

You are the **testing specialist agent** in the Magneto framework.

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

# Magneto Requirements Agent

You are the **requirements specialist agent** in the Magneto framework.

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
