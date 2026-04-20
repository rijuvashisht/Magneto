/**
 * Telepathy Command — Automatic Task Discovery & Execution
 * 
 * Usage: magneto telepathy [--dry-run] [--auto] [--force] [--reset]
 * 
 * This command:
 * 1. Discovers tasks from Jira, GitHub Issues, requirements folder
 * 2. Skips already-completed tasks (unless --force)
 * 3. Auto-classifies each task (feature, bug, security, etc.)
 * 4. Assigns appropriate roles automatically
 * 5. Determines telepathy level (0-3) based on risk
 * 6. Auto-executes or generates plans based on telepathy level
 * 7. Marks tasks as completed after execution
 */

import { logger } from '../utils/logger';
import { resolveProjectRoot, isMagnetoProject } from '../utils/paths';
import {
  discoverTasks,
  autoClassifyTask,
  executeWithTelepathy,
  isTaskCompleted,
  markTaskCompleted,
  loadCompletedTasks,
  resetCompletedTasks,
  ExternalTask,
  AutoTaskConfig,
} from '../core/telepathy';

export interface TelepathyOptions {
  dryRun?: boolean;
  auto?: boolean;
  force?: boolean;
  reset?: boolean;
  source?: 'all' | 'jira' | 'github' | 'requirements' | 'tasks';
}

/** File names to always skip during task discovery */
const SKIP_PATTERNS = [
  'task_template',
  'task-template',
  'template',
  'example',
  'sample',
];

function isTemplateName(title: string): boolean {
  const lower = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  return SKIP_PATTERNS.some(p => lower.includes(p.replace(/[^a-z0-9]/g, '')));
}

export async function telepathyCommand(options: TelepathyOptions): Promise<void> {
  const projectRoot = resolveProjectRoot();

  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto AI project. Run "magneto init" first.');
    process.exit(1);
  }

  // Handle --reset flag
  if (options.reset) {
    resetCompletedTasks(projectRoot);
    logger.success('Completed task history cleared. All tasks will run again.');
    return;
  }

  logger.info('🔮 Magneto Telepathy — Automatic Task Discovery');
  logger.info('');

  // Step 1: Discover tasks
  logger.info('Step 1: Discovering tasks...');
  const allTasks = await discoverTasks(projectRoot);

  if (allTasks.length === 0) {
    logger.info('No tasks found. To use telepathy:');
    logger.info('  - Add requirements to .magneto/memory/requirements/');
    logger.info('  - Create task files in .magneto/tasks/');
    logger.info('  - Configure Jira adapter: magneto adapter install jira');
    logger.info('  - Configure GitHub adapter: magneto adapter install github');
    return;
  }

  logger.info(`Discovered ${allTasks.length} total tasks`);

  // Step 1b: Filter out templates
  const nonTemplateTasks = allTasks.filter(t => {
    if (isTemplateName(t.title)) {
      logger.info(`  ⊘ Skipping template: "${t.title}"`);
      return false;
    }
    return true;
  });

  // Step 1c: Filter out already-completed tasks (unless --force)
  let tasks: ExternalTask[];
  if (options.force) {
    tasks = nonTemplateTasks;
    logger.info('  --force: Re-running all tasks including completed ones');
  } else {
    const completed = loadCompletedTasks(projectRoot);
    tasks = nonTemplateTasks.filter(t => {
      if (isTaskCompleted(projectRoot, t.id)) {
        const entry = completed.find(c => c.id === t.id);
        logger.info(`  ✓ Already completed: "${t.title}" (${entry?.completedAt || 'unknown'})`);
        return false;
      }
      return true;
    });
  }

  if (tasks.length === 0) {
    logger.success('All tasks are already completed!');
    logger.info('');
    logger.info('To re-run tasks:');
    logger.info('  magneto telepathy --force     # Re-run all tasks');
    logger.info('  magneto telepathy --reset     # Clear completion history');
    return;
  }

  logger.success(`${tasks.length} pending task(s) to process`);
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
      markTaskCompleted(projectRoot, task.id, task.title, 'auto');
      logger.success(`  Completed: ${task.title}`);
    } else {
      // Require approval — generate plan for manual review
      logger.info(`  Requires approval (Level ${config.telepathyLevel})`);
      logger.info(`  Run with --auto to execute, or use magneto plan manually`);
      
      await executeWithTelepathy(projectRoot, config, true); // dry run to show plan
      markTaskCompleted(projectRoot, task.id, task.title, 'plan-generated');
      logger.info(`  Marked as processed (prompt generated)`);
    }
    
    logger.info('');
  }

  logger.success('Telepathy session complete!');
  logger.info('');
  logger.info('Next steps:');
  logger.info('  - Review generated prompts in .magneto/cache/');
  logger.info('  - Run with --auto to auto-approve compatible tasks');
  logger.info('  - Use --force to re-run completed tasks');
  logger.info('  - Use --reset to clear completion history');
}
