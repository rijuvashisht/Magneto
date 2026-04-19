import * as path from 'path';
import { logger } from '../utils/logger';
import { resolveProjectRoot, isMagnetoProject } from '../utils/paths';
import { scaffold } from '../core/scaffold';
import { loadPowerPacks } from '../core/power-pack-loader';
import { loadAdapters } from '../core/adapter-loader';

export interface InitOptions {
  with?: string[];
  adapter?: string[];
  force?: boolean;
}

export async function initCommand(options: InitOptions): Promise<void> {
  const projectRoot = resolveProjectRoot();

  if (isMagnetoProject(projectRoot) && !options.force) {
    logger.warn('Magneto is already initialized. Use --force to overwrite.');
    return;
  }

  logger.info('Initializing Magneto AI...');

  // Scaffold base structure
  await scaffold(projectRoot);
  logger.success('Base scaffolding complete');

  // Load power packs
  const packs = options.with || [];
  if (packs.length > 0) {
    logger.info(`Loading power packs: ${packs.join(', ')}`);
    for (const pack of packs) {
      await loadPowerPacks(projectRoot, pack);
    }
    logger.success('Power packs loaded');
  }

  // Load adapters
  const adapters = options.adapter || [];
  if (adapters.length > 0) {
    logger.info(`Loading adapters: ${adapters.join(', ')}`);
    for (const adapter of adapters) {
      await loadAdapters(projectRoot, adapter);
    }
    logger.success('Adapters loaded');
  }

  logger.success('Magneto AI initialized successfully!');
  logger.info(`Project root: ${projectRoot}`);
  logger.info('Run "magneto doctor" to validate your setup.');
}
