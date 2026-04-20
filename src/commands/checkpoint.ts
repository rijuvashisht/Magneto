import * as path from 'path';
import { logger } from '../utils/logger';
import { resolveProjectRoot, isMagnetoProject } from '../utils/paths';
import { 
  CheckpointManager,
  initGlobalCheckpointManager,
  getGlobalCheckpointManager 
} from '../core/checkpoint-manager';

export async function checkpointListCommand(options: {
  task?: string;
}): Promise<void> {
  const projectRoot = resolveProjectRoot();

  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto AI project. Run "magneto init" first.');
    process.exit(1);
  }

  const manager = initGlobalCheckpointManager(projectRoot);
  await manager.init();

  const checkpoints = await manager.list(options.task);

  if (checkpoints.length === 0) {
    logger.info('No checkpoints found.');
    return;
  }

  logger.info(`Found ${checkpoints.length} checkpoints:\n`);

  for (const checkpoint of checkpoints) {
    const auto = checkpoint.metadata.automatic ? '[AUTO]' : '[MANUAL]';
    console.log(`${auto} ${checkpoint.id}`);
    console.log(`  Task: ${checkpoint.taskId}`);
    console.log(`  Step: ${checkpoint.stepIndex}/${checkpoint.totalSteps}`);
    console.log(`  Description: ${checkpoint.metadata.description}`);
    console.log(`  Created: ${checkpoint.metadata.createdAt}`);
    console.log(`  Tags: ${checkpoint.metadata.tags.join(', ') || 'none'}`);
    console.log('─'.repeat(60));
  }
}

export async function checkpointShowCommand(id: string): Promise<void> {
  const projectRoot = resolveProjectRoot();

  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto AI project. Run "magneto init" first.');
    process.exit(1);
  }

  const manager = initGlobalCheckpointManager(projectRoot);
  await manager.init();

  const checkpoint = await manager.load(id);

  console.log(`ID: ${checkpoint.id}`);
  console.log(`Task ID: ${checkpoint.taskId}`);
  console.log(`Step: ${checkpoint.stepIndex}/${checkpoint.totalSteps}`);
  console.log(`Description: ${checkpoint.metadata.description}`);
  console.log(`Automatic: ${checkpoint.metadata.automatic}`);
  console.log(`Created: ${checkpoint.metadata.createdAt}`);
  console.log(`Tags: ${checkpoint.metadata.tags.join(', ') || 'none'}`);
  console.log('');
  console.log('State:');
  console.log('─'.repeat(60));
  console.log(JSON.stringify(checkpoint.state, null, 2));
}

export async function checkpointDeleteCommand(id: string, options: {
  force?: boolean;
}): Promise<void> {
  const projectRoot = resolveProjectRoot();

  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto AI project. Run "magneto init" first.');
    process.exit(1);
  }

  const manager = initGlobalCheckpointManager(projectRoot);
  await manager.init();

  if (!options.force) {
    console.log(`About to delete checkpoint: ${id}`);
    console.log('Use --force to confirm deletion.');
    process.exit(1);
  }

  await manager.delete(id);
  logger.success(`Checkpoint ${id} deleted.`);
}

export async function checkpointClearCommand(options: {
  task?: string;
  force?: boolean;
}): Promise<void> {
  const projectRoot = resolveProjectRoot();

  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto AI project. Run "magneto init" first.');
    process.exit(1);
  }

  const manager = initGlobalCheckpointManager(projectRoot);
  await manager.init();

  if (!options.force) {
    if (options.task) {
      console.log(`About to delete all checkpoints for task: ${options.task}`);
    } else {
      console.log('About to delete ALL checkpoints');
    }
    console.log('Use --force to confirm deletion.');
    process.exit(1);
  }

  const deletedCount = await manager.clear(options.task);
  logger.success(`Deleted ${deletedCount} checkpoints.`);
}

export async function checkpointStatsCommand(): Promise<void> {
  const projectRoot = resolveProjectRoot();

  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto AI project. Run "magneto init" first.');
    process.exit(1);
  }

  const manager = initGlobalCheckpointManager(projectRoot);
  await manager.init();

  const stats = await manager.stats();

  console.log('Checkpoint Statistics');
  console.log('═'.repeat(60));
  console.log(`Total checkpoints: ${stats.totalCheckpoints}`);
  console.log(`Auto checkpoints: ${stats.autoCheckpoints}`);
  console.log(`Manual checkpoints: ${stats.manualCheckpoints}`);
  console.log('');
  console.log('By Task:');
  for (const [taskId, count] of Object.entries(stats.byTask)) {
    const bar = '█'.repeat(Math.min(count, 20));
    console.log(`  ${taskId.substring(0, 30).padEnd(32)} ${bar} ${count}`);
  }
}
