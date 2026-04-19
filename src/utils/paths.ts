import * as path from 'path';
import * as fs from 'fs';

export const MAGNETO_DIR = '.magneto';
export const GITHUB_DIR = '.github';
export const VSCODE_DIR = '.vscode';
export const AGENTS_DIR = path.join(GITHUB_DIR, 'agents');
export const COPILOT_INSTRUCTIONS = path.join(GITHUB_DIR, 'copilot-instructions.md');

export const MAGNETO_CONFIG = path.join(MAGNETO_DIR, 'magneto.config.json');
export const MAGNETO_MIN_CONFIG = path.join(MAGNETO_DIR, 'magneto.min.json');
export const MAGNETO_START = path.join(MAGNETO_DIR, 'START.md');

export const MAGNETO_SUBDIRS = [
  'roles',
  'skills',
  'memory',
  'memory/modules',
  'memory/requirements',
  'memory/tests',
  'tasks',
  'cache',
  'security',
  'scripts',
  'output',
  'power-packs',
  'adapters',
];

export function resolveProjectRoot(cwd?: string): string {
  return cwd || process.cwd();
}

export function magnetoPath(projectRoot: string, ...segments: string[]): string {
  return path.join(projectRoot, MAGNETO_DIR, ...segments);
}

export function githubPath(projectRoot: string, ...segments: string[]): string {
  return path.join(projectRoot, GITHUB_DIR, ...segments);
}

export function vscodePath(projectRoot: string, ...segments: string[]): string {
  return path.join(projectRoot, VSCODE_DIR, ...segments);
}

export function getTemplatesDir(): string {
  // When running from dist/, check dist/../src/templates (dev) and dist/../templates (npm)
  const fromDist = path.resolve(__dirname, '..', 'templates');
  if (fs.existsSync(fromDist)) return fromDist;
  const fromSrc = path.resolve(__dirname, '..', '..', 'src', 'templates');
  if (fs.existsSync(fromSrc)) return fromSrc;
  return fromDist;
}

export function isMagnetoProject(projectRoot: string): boolean {
  return fs.existsSync(path.join(projectRoot, MAGNETO_DIR, 'magneto.config.json'));
}
