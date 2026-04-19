/**
 * Telepathy Command — Automatic Task Discovery & Execution
 * 
 * Usage: magneto telepathy [--dry-run] [--auto]
 * 
 * This command:
 * 1. Discovers tasks from Jira, GitHub Issues, requirements folder
 * 2. Auto-classifies each task (feature, bug, security, etc.)
 * 3. Assigns appropriate roles automatically
 * 4. Determines telepathy level (0-3) based on risk
 * 5. Auto-executes or generates plans based on telepathy level
 */

import { logger } from '../utils/logger';
import { resolveProjectRoot, isMagnetoProject } from '../utils/paths';
import {
  discoverTasks,
  autoClassifyTask,
  executeWithTelepathy,
  ExternalTask,
  AutoTaskConfig,
} from '../core/telepathy';

export interface TelepathyOptions {
  dryRun?: boolean;
  auto?: boolean;
  source?: 'all' | 'jira' | 'github' | 'requirements' | 'tasks';
}

export async function telepathyCommand(options: TelepathyOptions): Promise<void> {
  const projectRoot = resolveProjectRoot();

  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto AI project. Run "magneto init" first.');
    process.exit(1);
  }

  logger.info('🔮 Magneto Telepathy — Automatic Task Discovery');
  logger.info('');

  // Step 1: Discover tasks
  logger.info('Step 1: Discovering tasks...');
  const tasks = await discoverTasks(projectRoot);

  if (tasks.length === 0) {
    logger.info('No tasks found. To use telepathy:');
    logger.info('  - Add requirements to .magneto/memory/requirements/');
    logger.info('  - Create task files in .magneto/tasks/');
    logger.info('  - Configure Jira adapter: magneto adapter install jira');
    logger.info('  - Configure GitHub adapter: magneto adapter install github');
    return;
  }

  logger.success(`Found ${tasks.length} tasks`);
  logger.info('');

  // Step 2: Auto-classify each task
  logger.info('Step 2: Auto-classifying tasks...');
  const classifiedTasks: Array<{ task: ExternalTask; config: AutoTaskConfig }> = [];

  for (const task of tasks) {
    logger.info(`  Analyzing: "${task.title}" (${task.source})`);
    const config = await autoClassifyTask(projectRoot, task);
    classifiedTasks.push({ task, config });
    
    logger.info(`    Type: ${config.type}`);
    logger.info(`    Roles: ${config.roles.join(', ')}`);
    logger.info(`    Complexity: ${config.estimatedComplexity}`);
    logger.info(`    Telepathy Level: ${config.telepathyLevel}`);
    logger.info(`    Auto-approve: ${config.autoApprove ? '✓' : '✗'}`);
    logger.info('');
  }

  // Step 3: Execute based on telepathy level
  if (options.dryRun) {
    logger.info('Step 3: [DRY RUN] Would execute with configs above');
    return;
  }

  logger.info('Step 3: Executing tasks...');
  logger.info('');

  for (const { task, config } of classifiedTasks) {
    logger.info(`Executing: "${task.title}"`);
    
    if (options.auto || config.autoApprove) {
      // Auto-execute
      await executeWithTelepathy(projectRoot, config, false);
      logger.success(`  Completed: ${task.title}`);
    } else {
      // Require approval
      logger.info(`  Requires approval (Level ${config.telepathyLevel})`);
      logger.info(`  Run with --auto to execute, or use magneto plan manually`);
      
      // Generate plan for manual review
      await executeWithTelepathy(projectRoot, config, true); // dry run to show plan
    }
    
    logger.info('');
  }

  logger.success('Telepathy session complete!');
  logger.info('');
  logger.info('Next steps:');
  logger.info('  - Review generated prompts in .magneto/cache/');
  logger.info('  - Run with --auto to auto-approve compatible tasks');
  logger.info('  - Adjust telepathy levels in magneto.config.json');
}
