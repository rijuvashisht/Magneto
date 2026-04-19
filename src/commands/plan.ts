import * as path from 'path';
import { logger } from '../utils/logger';
import { resolveProjectRoot, isMagnetoProject } from '../utils/paths';
import { readJson, writeJson } from '../utils/fs';
import { buildContext } from '../core/context';
import { evaluateSecurity } from '../core/security-engine';

export interface PlanOptions {
  dryRun?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: string;
  scope?: string[];
  tags?: string[];
  constraints?: string[];
}

export interface ExecutionPlan {
  taskId: string;
  title: string;
  context: ReturnType<typeof buildContext> extends Promise<infer T> ? T : never;
  security: ReturnType<typeof evaluateSecurity>;
  steps: PlanStep[];
  createdAt: string;
}

export interface PlanStep {
  order: number;
  role: string;
  action: string;
  description: string;
  inputs: string[];
  outputs: string[];
}

export async function planCommand(taskFile: string, options: PlanOptions): Promise<void> {
  const projectRoot = resolveProjectRoot();

  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto AI project. Run "magneto init" first.');
    process.exit(1);
  }

  const taskPath = path.resolve(projectRoot, taskFile);
  logger.info(`Planning task: ${taskPath}`);

  let task: Task;
  try {
    task = readJson<Task>(taskPath);
  } catch {
    logger.error(`Failed to read task file: ${taskPath}`);
    process.exit(1);
  }

  // Build execution context
  const context = await buildContext(projectRoot, task);
  logger.info(`Task classified as: ${context.classification}`);
  logger.info(`Assigned roles: ${context.roles.join(', ')}`);

  // Security evaluation
  const security = evaluateSecurity(task, context);
  logger.info(`Security risk: ${security.securityRisk}`);
  if (security.approvalRequired) {
    logger.warn('⚠ This task requires approval before execution.');
  }

  // Generate execution steps
  const steps = generateSteps(task, context);

  const plan: ExecutionPlan = {
    taskId: task.id,
    title: task.title,
    context,
    security,
    steps,
    createdAt: new Date().toISOString(),
  };

  if (options.dryRun) {
    logger.info('Dry run — plan generated but not saved.');
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  const planPath = path.join(projectRoot, '.magneto', 'tasks', `${task.id}-plan.json`);
  writeJson(planPath, plan);
  logger.success(`Plan saved: ${planPath}`);
}

function generateSteps(task: Task, context: Awaited<ReturnType<typeof buildContext>>): PlanStep[] {
  const steps: PlanStep[] = [];
  let order = 1;

  // Analysis step
  steps.push({
    order: order++,
    role: 'analyst',
    action: 'analyze',
    description: `Analyze task: ${task.title}`,
    inputs: [task.description],
    outputs: ['analysis-report'],
  });

  // Per-role execution steps
  for (const role of context.roles) {
    steps.push({
      order: order++,
      role,
      action: 'execute',
      description: `Execute ${role} responsibilities for: ${task.title}`,
      inputs: ['analysis-report', ...context.relevantFiles],
      outputs: [`${role}-output`],
    });
  }

  // Merge step
  steps.push({
    order: order++,
    role: 'orchestrator',
    action: 'merge',
    description: 'Merge all agent outputs',
    inputs: context.roles.map((r) => `${r}-output`),
    outputs: ['final-report'],
  });

  // Security review step
  steps.push({
    order: order++,
    role: 'security',
    action: 'review',
    description: 'Final security review of merged output',
    inputs: ['final-report'],
    outputs: ['approved-report'],
  });

  return steps;
}
