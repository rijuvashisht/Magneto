import * as path from 'path';
import { logger } from '../utils/logger';
import { getTemplatesDir, magnetoPath } from '../utils/paths';
import { ensureDir, fileExists, copyDir, writeJson, readJson } from '../utils/fs';

export interface PowerPack {
  name: string;
  category: 'languages' | 'frameworks' | 'project-types' | 'clouds';
  version: string;
  description: string;
  rules: string[];
  checks: PackCheck[];
}

export interface PackCheck {
  id: string;
  description: string;
  severity: 'info' | 'warning' | 'error';
  pattern?: string;
  scope?: string[];
}

const PACK_CATEGORY_MAP: Record<string, string> = {
  typescript: 'languages/typescript',
  nextjs: 'frameworks/nextjs',
  react: 'frameworks/react',
  'ai-platform': 'project-types/ai-platform',
  azure: 'clouds/azure',
  aws: 'clouds/aws',
};

export async function loadPowerPacks(projectRoot: string, packName: string): Promise<void> {
  const categoryPath = PACK_CATEGORY_MAP[packName];
  if (!categoryPath) {
    logger.warn(`Unknown power pack: ${packName}. Skipping.`);
    return;
  }

  const templatesDir = getTemplatesDir();
  const packSourceDir = path.join(templatesDir, 'power-packs', categoryPath);

  if (!fileExists(packSourceDir)) {
    logger.warn(`Power pack template not found: ${packSourceDir}`);
    return;
  }

  const destDir = magnetoPath(projectRoot, 'power-packs', categoryPath);
  ensureDir(destDir);
  copyDir(packSourceDir, destDir);

  // Update config
  await updateConfigWithPack(projectRoot, packName);

  logger.debug(`Loaded power pack: ${packName}`);
}

async function updateConfigWithPack(projectRoot: string, packName: string): Promise<void> {
  const configPath = magnetoPath(projectRoot, 'magneto.config.json');
  if (!fileExists(configPath)) return;

  try {
    const config = readJson<Record<string, unknown>>(configPath);
    const packs = (config.powerPacks as string[]) || [];
    if (!packs.includes(packName)) {
      packs.push(packName);
      config.powerPacks = packs;
      writeJson(configPath, config);
    }
  } catch {
    logger.warn('Failed to update config with power pack');
  }
}
