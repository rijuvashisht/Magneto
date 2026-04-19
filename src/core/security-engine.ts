import { logger } from '../utils/logger';

export type SecurityRisk = 'low' | 'medium' | 'high';
export type TelepathyLevel = 0 | 1 | 2 | 3;
export type ExecutionMode = 'observe' | 'assist' | 'execute' | 'restricted';

export interface SecurityEvaluation {
  securityRisk: SecurityRisk;
  approvalRequired: boolean;
  telepathyLevel: TelepathyLevel;
  reasons: string[];
  blockedActions: string[];
  protectedPathsAccessed: string[];
}

export interface SecurityConfig {
  protectedPaths?: string[];
  blockedActions?: string[];
  approvalRequired?: string[];
  maxTelepathyLevel?: number;
}

interface TaskLike {
  id?: string;
  title?: string;
  description?: string;
  type?: string;
  scope?: string[];
  tags?: string[];
  constraints?: string[];
}

interface ContextLike {
  config?: Record<string, unknown>;
  relevantFiles?: string[];
  classification?: string;
}

const DEFAULT_PROTECTED_PATHS = [
  '*.env',
  '*.pem',
  '*.key',
  '*.cert',
  'secrets/**',
  '.ssh/**',
  'credentials/**',
];

const DEFAULT_BLOCKED_ACTIONS = [
  'delete-database',
  'drop-table',
  'rm -rf',
  'format-disk',
  'truncate-table',
  'disable-auth',
  'bypass-security',
];

const DEFAULT_APPROVAL_REQUIRED = [
  'deploy',
  'migrate',
  'auth-change',
  'permission-change',
  'infrastructure-change',
  'production-access',
];

export function evaluateSecurity(task: TaskLike, context?: ContextLike): SecurityEvaluation {
  logger.debug(`Evaluating security for task: ${task.id || 'unknown'}`);

  const securityConfig = extractSecurityConfig(context);
  const reasons: string[] = [];
  const blockedActions: string[] = [];
  const protectedPathsAccessed: string[] = [];

  let riskScore = 0;

  // Check protected paths
  const protectedPaths = securityConfig.protectedPaths || DEFAULT_PROTECTED_PATHS;
  const taskScope = task.scope || context?.relevantFiles || [];
  for (const filePath of taskScope) {
    if (matchesProtectedPath(filePath, protectedPaths)) {
      protectedPathsAccessed.push(filePath);
      riskScore += 3;
      reasons.push(`Accesses protected path: ${filePath}`);
    }
  }

  // Check blocked actions
  const blocked = securityConfig.blockedActions || DEFAULT_BLOCKED_ACTIONS;
  const taskText = `${task.title || ''} ${task.description || ''} ${(task.tags || []).join(' ')}`.toLowerCase();
  for (const action of blocked) {
    if (taskText.includes(action.toLowerCase())) {
      blockedActions.push(action);
      riskScore += 5;
      reasons.push(`Contains blocked action: ${action}`);
    }
  }

  // Check dependency risk
  if (taskText.includes('dependency') || taskText.includes('package') || taskText.includes('install')) {
    riskScore += 1;
    reasons.push('Involves dependency changes');
  }

  // Check auth changes
  if (taskText.includes('auth') || taskText.includes('permission') || taskText.includes('token')) {
    riskScore += 2;
    reasons.push('Involves authentication or authorization changes');
  }

  // Check infrastructure changes
  if (taskText.includes('deploy') || taskText.includes('infrastructure') || taskText.includes('migrate')) {
    riskScore += 2;
    reasons.push('Involves infrastructure or deployment changes');
  }

  // Determine risk level
  const securityRisk: SecurityRisk = riskScore >= 5 ? 'high' : riskScore >= 2 ? 'medium' : 'low';

  // Determine approval requirement
  const approvalTriggers = securityConfig.approvalRequired || DEFAULT_APPROVAL_REQUIRED;
  const approvalRequired =
    securityRisk === 'high' ||
    blockedActions.length > 0 ||
    approvalTriggers.some((trigger) => taskText.includes(trigger.toLowerCase()));

  // Determine telepathy level (power boost)
  const maxTelepathy = (securityConfig.maxTelepathyLevel ?? 2) as TelepathyLevel;
  let telepathyLevel: TelepathyLevel;
  if (securityRisk === 'high') {
    telepathyLevel = 0;
  } else if (securityRisk === 'medium') {
    telepathyLevel = Math.min(1, maxTelepathy) as TelepathyLevel;
  } else {
    telepathyLevel = maxTelepathy;
  }

  return {
    securityRisk,
    approvalRequired,
    telepathyLevel,
    reasons,
    blockedActions,
    protectedPathsAccessed,
  };
}

function extractSecurityConfig(context?: ContextLike): SecurityConfig {
  if (!context?.config) return {};
  const config = context.config;
  if (typeof config.security === 'object' && config.security !== null) {
    return config.security as SecurityConfig;
  }
  return {};
}

function matchesProtectedPath(filePath: string, patterns: string[]): boolean {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  for (const pattern of patterns) {
    const normalizedPattern = pattern.replace(/\\/g, '/').toLowerCase();

    // Simple glob matching
    if (normalizedPattern.includes('**')) {
      const prefix = normalizedPattern.split('**')[0];
      if (normalized.startsWith(prefix)) return true;
    } else if (normalizedPattern.startsWith('*.')) {
      const ext = normalizedPattern.slice(1);
      if (normalized.endsWith(ext)) return true;
    } else if (normalized === normalizedPattern || normalized.endsWith('/' + normalizedPattern)) {
      return true;
    }
  }
  return false;
}
