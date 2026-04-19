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
  if (adapterName === 'claude') {
    await wireClaudeAdapter(projectRoot, adapterSourceDir);
  }
  if (adapterName === 'antigravity') {
    await wireAntigravityAdapter(projectRoot, adapterSourceDir);
  }
  if (adapterName === 'manus') {
    await wireManusAdapter(projectRoot, adapterSourceDir);
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

async function wireClaudeAdapter(projectRoot: string, adapterSourceDir: string): Promise<void> {
  // Claude Code reads from .claude/ directory
  const claudeDir = path.join(projectRoot, '.claude');
  const claudeSkillsDir = path.join(claudeDir, 'skills', 'magneto');

  // Copy CLAUDE.md to .claude/CLAUDE.md
  const claudeMdSrc = path.join(adapterSourceDir, 'CLAUDE.md');
  const claudeMdDest = path.join(claudeDir, 'CLAUDE.md');

  if (fileExists(claudeMdSrc)) {
    ensureDir(claudeDir);
    fs.copyFileSync(claudeMdSrc, claudeMdDest);
    logger.info(`Claude instructions written → .claude/CLAUDE.md`);
  }

  // Copy SKILL.md to .claude/skills/magneto/SKILL.md
  const skillSrc = path.join(adapterSourceDir, 'skills', 'magneto', 'SKILL.md');
  const skillDest = path.join(claudeSkillsDir, 'SKILL.md');

  if (fileExists(skillSrc)) {
    ensureDir(claudeSkillsDir);
    fs.copyFileSync(skillSrc, skillDest);
    logger.info(`Claude skill written → .claude/skills/magneto/SKILL.md`);
  }

  // Write adapter config
  writeJson(path.join(claudeDir, 'magneto-adapter.json'), {
    magnetoCommand: 'magneto',
    taskDir: 'tasks/',
    skillFile: '.claude/skills/magneto/SKILL.md',
    installedAt: new Date().toISOString(),
    docs: 'https://github.com/rijuvashisht/Magneto',
  });

  logger.info('Claude Code adapter wired.');
  logger.info('Claude will now recognize /magneto commands.');
  logger.info('Try: /magneto analyze');
}

async function wireAntigravityAdapter(projectRoot: string, adapterSourceDir: string): Promise<void> {
  // Google Antigravity reads from .agents/ directory
  const agentsDir = path.join(projectRoot, '.agents');
  const agentsMagnetoDir = path.join(agentsDir, 'magneto');
  const agentsSkillsDir = path.join(agentsDir, 'skills', 'magneto');

  // Copy ANTIGRAVITY.md to .agents/magneto/ANTIGRAVITY.md
  const antigravityMdSrc = path.join(adapterSourceDir, 'ANTIGRAVITY.md');
  const antigravityMdDest = path.join(agentsMagnetoDir, 'ANTIGRAVITY.md');

  if (fileExists(antigravityMdSrc)) {
    ensureDir(agentsMagnetoDir);
    fs.copyFileSync(antigravityMdSrc, antigravityMdDest);
    logger.info(`Antigravity instructions written → .agents/magneto/ANTIGRAVITY.md`);
  }

  // Copy SKILL.md to .agents/skills/magneto/SKILL.md
  const skillSrc = path.join(adapterSourceDir, 'skills', 'magneto', 'SKILL.md');
  const skillDest = path.join(agentsSkillsDir, 'SKILL.md');

  if (fileExists(skillSrc)) {
    ensureDir(agentsSkillsDir);
    fs.copyFileSync(skillSrc, skillDest);
    logger.info(`Antigravity skill written → .agents/skills/magneto/SKILL.md`);
  }

  // Write adapter config
  writeJson(path.join(agentsDir, 'magneto-adapter.json'), {
    magnetoCommand: 'magneto',
    taskDir: 'tasks/',
    skillFile: '.agents/skills/magneto/SKILL.md',
    installedAt: new Date().toISOString(),
    docs: 'https://github.com/rijuvashisht/Magneto',
  });

  logger.info('Antigravity adapter wired.');
  logger.info('Try: /magneto-analyze');
}

async function wireManusAdapter(projectRoot: string, adapterSourceDir: string): Promise<void> {
  // Manus uses API-based integration
  const manusAdapterDir = magnetoPath(projectRoot, 'adapters', 'manus');
  ensureDir(manusAdapterDir);

  // Copy MANUS.md to .magneto/adapters/manus/MANUS.md
  const manusMdSrc = path.join(adapterSourceDir, 'MANUS.md');
  const manusMdDest = path.join(manusAdapterDir, 'MANUS.md');

  if (fileExists(manusMdSrc)) {
    fs.copyFileSync(manusMdSrc, manusMdDest);
    logger.info(`Manus instructions written → .magneto/adapters/manus/MANUS.md`);
  }

  // Copy template config if no config exists
  const configSrc = path.join(adapterSourceDir, 'config.template.json');
  const configDest = path.join(manusAdapterDir, 'config.json');

  if (fileExists(configSrc) && !fileExists(configDest)) {
    const configTemplate = readJson<Record<string, unknown>>(configSrc);
    configTemplate.installedAt = new Date().toISOString();
    writeJson(configDest, configTemplate);
    logger.info(`Manus config template → .magneto/adapters/manus/config.json`);
    logger.warn('IMPORTANT: Edit config.json and add your MANUS_API_KEY');
  }

  logger.info('Manus adapter wired.');
  logger.info('Configure API key in .magneto/adapters/manus/config.json');
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
