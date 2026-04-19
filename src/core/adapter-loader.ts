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

  // Update config
  await updateConfigWithAdapter(projectRoot, adapterName);

  logger.debug(`Loaded adapter: ${adapterName}`);
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
