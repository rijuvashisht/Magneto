import { logger } from '../utils/logger';
import { resolveProjectRoot, isMagnetoProject } from '../utils/paths';
import { scaffold } from '../core/scaffold';
import { detectPacks } from '../core/detect-packs';
import { loadPowerPacks } from '../core/power-pack-loader';

export async function refreshCommand(): Promise<void> {
  const projectRoot = resolveProjectRoot();

  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto project. Run "magneto init" first.');
    process.exit(1);
  }

  logger.info('Refreshing Magneto configuration...');

  // Re-scaffold base structure (preserves existing config)
  await scaffold(projectRoot, { preserveConfig: true });

  // Detect and refresh power packs
  const detectedPacks = await detectPacks(projectRoot);
  if (detectedPacks.length > 0) {
    logger.info(`Detected packs: ${detectedPacks.join(', ')}`);
    for (const pack of detectedPacks) {
      await loadPowerPacks(projectRoot, pack);
    }
  }

  logger.success('Magneto configuration refreshed.');
}
