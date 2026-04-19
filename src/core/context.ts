import * as path from 'path';
import { logger } from '../utils/logger';
import { magnetoPath } from '../utils/paths';
import { readJson, fileExists, listFiles } from '../utils/fs';

export interface TaskInput {
  id: string;
  title: string;
  description: string;
  type: string;
  scope?: string[];
  tags?: string[];
  constraints?: string[];
}

export type TaskClassification =
  | 'architecture-review'
  | 'bug-fix'
  | 'feature-implementation'
  | 'security-audit'
  | 'performance-review'
  | 'testing'
  | 'requirements-analysis'
  | 'code-review'
  | 'general';

export interface ExecutionContext {
  projectRoot: string;
  classification: TaskClassification;
  roles: string[];
  subAgents: SubAgent[];
  relevantFiles: string[];
  memoryContext: Record<string, unknown>;
  config: Record<string, unknown>;
}

export interface SubAgent {
  id: string;
  role: string;
  model: string;
  tools: string[];
  scope: string[];
}

const CLASSIFICATION_KEYWORDS: Record<TaskClassification, string[]> = {
  'architecture-review': ['architecture', 'design', 'structure', 'refactor', 'pattern'],
  'bug-fix': ['bug', 'fix', 'error', 'issue', 'crash', 'broken'],
  'feature-implementation': ['feature', 'implement', 'add', 'create', 'build', 'new'],
  'security-audit': ['security', 'vulnerability', 'auth', 'permission', 'audit', 'cve'],
  'performance-review': ['performance', 'slow', 'optimize', 'latency', 'memory', 'cpu'],
  testing: ['test', 'coverage', 'qa', 'validation', 'assertion'],
  'requirements-analysis': ['requirement', 'spec', 'acceptance', 'criteria', 'trace'],
  'code-review': ['review', 'pr', 'pull request', 'diff', 'code quality'],
  general: [],
};

const ROLE_MAP: Record<TaskClassification, string[]> = {
  'architecture-review': ['orchestrator', 'backend'],
  'bug-fix': ['orchestrator', 'backend', 'tester'],
  'feature-implementation': ['orchestrator', 'backend', 'tester', 'requirements'],
  'security-audit': ['orchestrator', 'backend', 'tester'],
  'performance-review': ['orchestrator', 'backend'],
  testing: ['orchestrator', 'tester'],
  'requirements-analysis': ['orchestrator', 'requirements'],
  'code-review': ['orchestrator', 'backend', 'tester'],
  general: ['orchestrator'],
};

export async function buildContext(
  projectRoot: string,
  task: TaskInput
): Promise<ExecutionContext> {
  logger.debug(`Building context for task: ${task.id}`);

  const classification = classifyTask(task);
  const roles = chooseRoles(classification);
  const subAgents = createSubAgents(roles);
  const relevantFiles = resolveRelevantFiles(projectRoot, task);
  const memoryContext = loadMemory(projectRoot);
  const config = loadConfig(projectRoot);

  return {
    projectRoot,
    classification,
    roles,
    subAgents,
    relevantFiles,
    memoryContext,
    config,
  };
}

function classifyTask(task: TaskInput): TaskClassification {
  const text = `${task.title} ${task.description} ${(task.tags || []).join(' ')}`.toLowerCase();

  let bestMatch: TaskClassification = 'general';
  let bestScore = 0;

  for (const [classification, keywords] of Object.entries(CLASSIFICATION_KEYWORDS)) {
    const score = keywords.filter((kw) => text.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = classification as TaskClassification;
    }
  }

  return bestMatch;
}

function chooseRoles(classification: TaskClassification): string[] {
  return ROLE_MAP[classification] || ROLE_MAP.general;
}

function createSubAgents(roles: string[]): SubAgent[] {
  return roles.map((role) => ({
    id: `agent-${role}`,
    role,
    model: 'gpt-4o',
    tools: getToolsForRole(role),
    scope: getScopeForRole(role),
  }));
}

function getToolsForRole(role: string): string[] {
  const baseTools = ['load_context', 'security_check'];
  switch (role) {
    case 'orchestrator':
      return [...baseTools, 'plan_task', 'merge_results'];
    case 'backend':
      return [...baseTools, 'plan_task'];
    case 'tester':
      return [...baseTools];
    case 'requirements':
      return [...baseTools];
    default:
      return baseTools;
  }
}

function getScopeForRole(role: string): string[] {
  switch (role) {
    case 'backend':
      return ['src/**', 'lib/**', 'api/**'];
    case 'tester':
      return ['test/**', 'tests/**', '__tests__/**', 'spec/**'];
    case 'requirements':
      return ['docs/**', 'requirements/**', '*.md'];
    default:
      return ['**/*'];
  }
}

function resolveRelevantFiles(projectRoot: string, task: TaskInput): string[] {
  const scope = task.scope || [];
  if (scope.length > 0) return scope;

  // Default: list known source directories
  const candidates = ['src', 'lib', 'app', 'pages', 'api', 'test', 'tests'];
  const found: string[] = [];
  for (const dir of candidates) {
    const fullPath = path.join(projectRoot, dir);
    try {
      const files = listFiles(fullPath, /\.(ts|tsx|js|jsx|py|go|rs)$/);
      found.push(...files.map((f) => path.join(dir, f)));
    } catch {
      // directory doesn't exist
    }
  }
  return found.slice(0, 50); // limit to 50 files
}

function loadMemory(projectRoot: string): Record<string, unknown> {
  const memoryPath = magnetoPath(projectRoot, 'memory', 'context.json');
  if (fileExists(memoryPath)) {
    try {
      return readJson<Record<string, unknown>>(memoryPath);
    } catch {
      return {};
    }
  }
  return {};
}

function loadConfig(projectRoot: string): Record<string, unknown> {
  const configPath = magnetoPath(projectRoot, 'magneto.config.json');
  if (fileExists(configPath)) {
    try {
      return readJson<Record<string, unknown>>(configPath);
    } catch {
      return {};
    }
  }
  return {};
}
