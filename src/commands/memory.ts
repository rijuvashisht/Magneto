import * as path from 'path';
import { logger } from '../utils/logger';
import { resolveProjectRoot, isMagnetoProject } from '../utils/paths';
import { readStdin, writeFile } from '../utils/fs';
import { 
  MemoryStore, 
  Memory, 
  MemoryQuery, 
  PruneOptions,
  initGlobalMemoryStore,
  getGlobalMemoryStore 
} from '../core/memory-store';

export async function memoryListCommand(options: {
  task?: string;
  type?: string;
  limit?: number;
}): Promise<void> {
  const projectRoot = resolveProjectRoot();

  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto AI project. Run "magneto init" first.');
    process.exit(1);
  }

  const store = initGlobalMemoryStore(projectRoot);
  await store.connect();

  const query: MemoryQuery = {};
  
  if (options.task) {
    query.taskId = options.task;
  }
  
  if (options.type) {
    query.type = options.type as any;
  }
  
  if (options.limit) {
    query.limit = options.limit;
  }

  const memories = await store.query(query);

  if (memories.length === 0) {
    logger.info('No memories found.');
    return;
  }

  logger.info(`Found ${memories.length} memories:\n`);

  for (const memory of memories) {
    console.log(`ID: ${memory.id}`);
    console.log(`Type: ${memory.type}`);
    console.log(`Content: ${memory.content.substring(0, 100)}${memory.content.length > 100 ? '...' : ''}`);
    console.log(`Tags: ${memory.metadata.tags.join(', ') || 'none'}`);
    console.log(`Importance: ${memory.metadata.importance.toFixed(2)}`);
    console.log(`Created: ${memory.metadata.createdAt}`);
    console.log(`Accessed: ${memory.metadata.accessCount} times`);
    console.log('─'.repeat(60));
  }

  await store.disconnect();
}

export async function memoryShowCommand(id: string): Promise<void> {
  const projectRoot = resolveProjectRoot();

  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto AI project. Run "magneto init" first.');
    process.exit(1);
  }

  const store = initGlobalMemoryStore(projectRoot);
  await store.connect();

  const memory = await store.get(id);

  if (!memory) {
    logger.error(`Memory not found: ${id}`);
    process.exit(1);
  }

  console.log(`ID: ${memory.id}`);
  console.log(`Type: ${memory.type}`);
  console.log(`Task ID: ${memory.metadata.taskId || 'none'}`);
  console.log(`Agent ID: ${memory.metadata.agentId || 'none'}`);
  console.log(`Project ID: ${memory.metadata.projectId || 'none'}`);
  console.log(`Tags: ${memory.metadata.tags.join(', ') || 'none'}`);
  console.log(`Importance: ${memory.metadata.importance.toFixed(2)}`);
  console.log(`Created: ${memory.metadata.createdAt}`);
  console.log(`Last accessed: ${memory.metadata.accessedAt}`);
  console.log(`Access count: ${memory.metadata.accessCount}`);
  console.log(`Related memories: ${memory.relationships.relatedMemories.join(', ') || 'none'}`);
  console.log(`Parent task: ${memory.relationships.parentTask || 'none'}`);
  console.log(`Child tasks: ${memory.relationships.childTasks.join(', ') || 'none'}`);
  console.log('');
  console.log('Content:');
  console.log('─'.repeat(60));
  console.log(memory.content);

  await store.disconnect();
}

export async function memorySearchCommand(query: string, options: {
  limit?: number;
}): Promise<void> {
  const projectRoot = resolveProjectRoot();

  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto AI project. Run "magneto init" first.');
    process.exit(1);
  }

  const store = initGlobalMemoryStore(projectRoot);
  await store.connect();

  const memories = await store.search(query, options.limit);

  if (memories.length === 0) {
    logger.info(`No memories found matching "${query}".`);
    return;
  }

  logger.info(`Found ${memories.length} memories matching "${query}":\n`);

  for (const memory of memories) {
    console.log(`ID: ${memory.id}`);
    console.log(`Type: ${memory.type}`);
    console.log(`Content: ${memory.content.substring(0, 100)}${memory.content.length > 100 ? '...' : ''}`);
    console.log(`Tags: ${memory.metadata.tags.join(', ') || 'none'}`);
    console.log('─'.repeat(60));
  }

  await store.disconnect();
}

export async function memoryDeleteCommand(id: string, options: {
  force?: boolean;
}): Promise<void> {
  const projectRoot = resolveProjectRoot();

  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto AI project. Run "magneto init" first.');
    process.exit(1);
  }

  const store = initGlobalMemoryStore(projectRoot);
  await store.connect();

  const memory = await store.get(id);

  if (!memory) {
    logger.error(`Memory not found: ${id}`);
    process.exit(1);
  }

  if (!options.force) {
    console.log(`About to delete memory:`);
    console.log(`ID: ${memory.id}`);
    console.log(`Type: ${memory.type}`);
    console.log(`Content: ${memory.content.substring(0, 100)}...`);
    console.log('');
    console.log('Use --force to confirm deletion.');
    process.exit(1);
  }

  await store.delete(id);
  logger.success(`Memory ${id} deleted.`);

  await store.disconnect();
}

export async function memoryPruneCommand(options: {
  strategy?: string;
  maxAge?: number;
  minImportance?: number;
  keepCheckpoints?: boolean;
  dryRun?: boolean;
}): Promise<void> {
  const projectRoot = resolveProjectRoot();

  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto AI project. Run "magneto init" first.');
    process.exit(1);
  }

  const store = initGlobalMemoryStore(projectRoot);
  await store.connect();

  const statsBefore = await store.stats();
  logger.info(`Before pruning: ${statsBefore.totalMemories} memories`);

  const pruneOptions: PruneOptions = {
    strategy: (options.strategy as PruneOptions['strategy']) || 'hybrid',
    maxAgeDays: options.maxAge,
    minImportance: options.minImportance,
    keepCheckpoints: options.keepCheckpoints ?? true,
  };

  if (options.dryRun) {
    logger.info('Dry run mode - no memories will be deleted.');
    logger.info(`Would use strategy: ${pruneOptions.strategy}`);
    if (pruneOptions.maxAgeDays) {
      logger.info(`Would delete memories older than ${pruneOptions.maxAgeDays} days`);
    }
    if (pruneOptions.minImportance !== undefined) {
      logger.info(`Would delete memories with importance < ${pruneOptions.minImportance}`);
    }
  } else {
    const deletedCount = await store.prune(pruneOptions);
    const statsAfter = await store.stats();
    
    logger.success(`Pruned ${deletedCount} memories.`);
    logger.info(`After pruning: ${statsAfter.totalMemories} memories`);
  }

  await store.disconnect();
}

export async function memoryExportCommand(options: {
  output?: string;
  project?: string;
}): Promise<void> {
  const projectRoot = resolveProjectRoot();

  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto AI project. Run "magneto init" first.');
    process.exit(1);
  }

  const store = initGlobalMemoryStore(projectRoot);
  await store.connect();

  const memories = await store.export(options.project);
  const json = JSON.stringify(memories, null, 2);

  if (options.output) {
    await writeFile(options.output, json);
    logger.success(`Exported ${memories.length} memories to ${options.output}`);
  } else {
    console.log(json);
  }

  await store.disconnect();
}

export async function memoryImportCommand(file: string, options: {
  dryRun?: boolean;
}): Promise<void> {
  const projectRoot = resolveProjectRoot();

  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto AI project. Run "magneto init" first.');
    process.exit(1);
  }

  let memories: Memory[];

  if (file === '-') {
    // Read from stdin
    const stdin = await readStdin();
    memories = JSON.parse(stdin);
  } else {
    const fs = await import('fs');
    const data = fs.readFileSync(file, 'utf-8');
    memories = JSON.parse(data);
  }

  if (!Array.isArray(memories)) {
    logger.error('Invalid import file: expected an array of memories');
    process.exit(1);
  }

  if (options.dryRun) {
    logger.info(`Dry run: would import ${memories.length} memories`);
    return;
  }

  const store = initGlobalMemoryStore(projectRoot);
  await store.connect();

  const importedCount = await store.import(memories);
  logger.success(`Imported ${importedCount} memories.`);

  await store.disconnect();
}

export async function memoryStatsCommand(): Promise<void> {
  const projectRoot = resolveProjectRoot();

  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto AI project. Run "magneto init" first.');
    process.exit(1);
  }

  const store = initGlobalMemoryStore(projectRoot);
  await store.connect();

  const stats = await store.stats();

  console.log('Memory Statistics');
  console.log('═'.repeat(60));
  console.log(`Total memories: ${stats.totalMemories}`);
  console.log(`Total size: ${formatBytes(stats.totalSize)}`);
  console.log(`Average importance: ${stats.averageImportance.toFixed(2)}`);
  
  if (stats.oldestMemory) {
    console.log(`Oldest memory: ${stats.oldestMemory}`);
  }
  
  if (stats.newestMemory) {
    console.log(`Newest memory: ${stats.newestMemory}`);
  }

  console.log('');
  console.log('By Type:');
  for (const [type, count] of Object.entries(stats.byType)) {
    if (count > 0) {
      const bar = '█'.repeat(Math.min(count, 20));
      console.log(`  ${type.padEnd(12)} ${bar} ${count}`);
    }
  }

  await store.disconnect();
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
