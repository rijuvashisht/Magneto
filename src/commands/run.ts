import * as path from 'path';
import { logger } from '../utils/logger';
import { resolveProjectRoot, isMagnetoProject } from '../utils/paths';
import { writeJson, fileExists } from '../utils/fs';
import { buildContext } from '../core/context';
import { evaluateSecurity, ExecutionMode } from '../core/security-engine';
import { RunnerType, createRunner } from '../runners/types';
import { parseTaskFile } from '../utils/task-parser';

export interface RunOptions {
  runner: string;
  mode: string;
}

export async function runCommand(taskFile: string, options: RunOptions): Promise<void> {
  const projectRoot = resolveProjectRoot();

  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto AI project. Run "magneto init" first.');
    process.exit(1);
  }

  const taskPath = path.resolve(projectRoot, taskFile);
  logger.info(`Running task: ${taskPath}`);

  let task: any;
  try {
    task = parseTaskFile(taskPath);
  } catch {
    logger.error(`Failed to read task file: ${taskPath}`);
    process.exit(1);
  }

  // Security check
  const context = await buildContext(projectRoot, task);
  const security = evaluateSecurity(task, context);

  const mode = options.mode as ExecutionMode;
  if (security.approvalRequired && mode === 'execute') {
    logger.error('Task requires approval. Cannot auto-execute in restricted mode.');
    logger.warn('Use --mode assist or --mode observe instead.');
    process.exit(1);
  }

  if (security.securityRisk === 'high' && mode !== 'restricted') {
    logger.warn('High security risk detected. Switching to restricted mode.');
  }

  // Check for existing plan
  const planPath = path.join(projectRoot, '.magneto', 'tasks', `${task.id}-plan.json`);
  if (!fileExists(planPath)) {
    logger.warn('No execution plan found. Run "magneto plan" first for optimal results.');
  }

  // Create and run the runner
  const runnerType = options.runner as RunnerType;
  const runner = createRunner(runnerType);

  logger.info(`Using runner: ${runnerType}`);
  logger.info(`Execution mode: ${mode}`);

  try {
    const result = await runner.execute({
      task,
      context,
      security,
      mode,
      projectRoot,
    });

    // Save results
    const outputPath = path.join(projectRoot, '.magneto', 'cache', `${task.id}-result.json`);
    writeJson(outputPath, {
      taskId: task.id,
      runner: runnerType,
      mode,
      result,
      completedAt: new Date().toISOString(),
    });

    logger.success(`Task completed. Results saved: ${outputPath}`);
  } catch (err: any) {
    logger.error(`Task execution failed: ${err.message}`);
    process.exit(1);
  }
}
