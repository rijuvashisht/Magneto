import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';
import { getTemplatesDir, magnetoPath } from '../utils/paths';
import { ensureDir, fileExists, copyDir, writeJson, readJson } from '../utils/fs';

export interface Adapter {
  name: string;
  version: string;
  description: string;
  inputPath: string;
  outputMapping: Record<string, string>;
}

export interface GraphifyAdapter extends Adapter {
  graphPath: string;
  memoryMode: 'internal-first' | 'external-first';
}

export async function loadAdapters(projectRoot: string, adapterName: string): Promise<void> {
  const templatesDir = getTemplatesDir();
  const adapterSourceDir = path.join(templatesDir, 'power-packs', 'adapters', adapterName);

  if (!fileExists(adapterSourceDir)) {
    logger.warn(`Adapter template not found: ${adapterName}`);
    return;
  }

  const destDir = magnetoPath(projectRoot, 'adapters', adapterName);
  ensureDir(destDir);
  copyDir(adapterSourceDir, destDir);

  // Adapter-specific post-install wiring
  if (adapterName === 'openclaw') {
    await wireOpenClawAdapter(projectRoot, adapterSourceDir);
  }

  // Update config
  await updateConfigWithAdapter(projectRoot, adapterName);

  logger.debug(`Loaded adapter: ${adapterName}`);
}

async function wireOpenClawAdapter(projectRoot: string, adapterSourceDir: string): Promise<void> {
  // Write SKILL.md into .openclaw/skills/ — this is where OpenClaw reads agent skills from
  const skillSrc = path.join(adapterSourceDir, 'magneto.SKILL.md');
  const skillDestDir = path.join(projectRoot, '.openclaw', 'skills');
  const skillDest = path.join(skillDestDir, 'magneto.SKILL.md');

  if (fileExists(skillSrc)) {
    ensureDir(skillDestDir);
    fs.copyFileSync(skillSrc, skillDest);
    logger.info(`OpenClaw skill written → .openclaw/skills/magneto.SKILL.md`);
  }

  // Write minimal openclaw adapter config into .openclaw/
  const openclawConfigDir = path.join(projectRoot, '.openclaw');
  ensureDir(openclawConfigDir);
  writeJson(path.join(openclawConfigDir, 'magneto-adapter.json'), {
    magnetoCommand: 'magneto',
    taskDir: 'tasks/',
    skillFile: '.openclaw/skills/magneto.SKILL.md',
    installedAt: new Date().toISOString(),
    docs: 'https://github.com/rijuvashisht/Magneto',
  });

  logger.info('OpenClaw adapter wired. Restart your OpenClaw gateway to load the Magneto skill.');
  logger.info('Docs: https://docs.openclaw.ai/tools/skills');
}

export function loadGraphifyData(projectRoot: string): Record<string, unknown> | null {
  const graphPath = path.join(projectRoot, '.graphify-out', 'graph.json');
  if (!fileExists(graphPath)) {
    logger.debug('No Graphify graph.json found');
    return null;
  }

  try {
    const graph = readJson<Record<string, unknown>>(graphPath);
    logger.debug('Loaded Graphify graph data');
    return mapGraphToMemory(graph);
  } catch {
    logger.warn('Failed to parse Graphify graph.json');
    return null;
  }
}

function mapGraphToMemory(graph: Record<string, unknown>): Record<string, unknown> {
  return {
    source: 'graphify',
    nodes: graph.nodes || [],
    edges: graph.edges || [],
    metadata: graph.metadata || {},
    importedAt: new Date().toISOString(),
  };
}

async function updateConfigWithAdapter(projectRoot: string, adapterName: string): Promise<void> {
  const configPath = magnetoPath(projectRoot, 'magneto.config.json');
  if (!fileExists(configPath)) return;

  try {
    const config = readJson<Record<string, unknown>>(configPath);
    const adapters = (config.adapters as string[]) || [];
    if (!adapters.includes(adapterName)) {
      adapters.push(adapterName);
      config.adapters = adapters;
      writeJson(configPath, config);
    }
  } catch {
    logger.warn('Failed to update config with adapter');
  }
}
