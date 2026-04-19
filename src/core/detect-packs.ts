import * as path from 'path';
import { fileExists, readJson } from '../utils/fs';
import { logger } from '../utils/logger';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const DETECTION_RULES: Record<string, (pkg: PackageJson, projectRoot: string) => boolean> = {
  typescript: (pkg, root) =>
    fileExists(path.join(root, 'tsconfig.json')) ||
    !!(pkg.devDependencies?.typescript || pkg.dependencies?.typescript),

  nextjs: (pkg) =>
    !!(pkg.dependencies?.next || pkg.devDependencies?.next),

  react: (pkg) =>
    !!(pkg.dependencies?.react || pkg.devDependencies?.react),

  'ai-platform': (pkg) =>
    !!(
      pkg.dependencies?.openai ||
      pkg.dependencies?.['@azure/openai'] ||
      pkg.dependencies?.langchain ||
      pkg.dependencies?.['@langchain/core']
    ),

  azure: (_pkg, root) =>
    fileExists(path.join(root, 'azure.yaml')) ||
    fileExists(path.join(root, 'bicep')) ||
    fileExists(path.join(root, 'infra')),

  graphify: (_pkg, root) =>
    fileExists(path.join(root, '.graphify-out', 'graph.json')),

  openclaw: (pkg, root) =>
    fileExists(path.join(root, '.openclaw', 'openclaw.json')) ||
    fileExists(path.join(root, 'openclaw.json')) ||
    !!(pkg.dependencies?.openclaw || pkg.devDependencies?.openclaw),
};

export async function detectPacks(projectRoot: string): Promise<string[]> {
  const detected: string[] = [];

  let pkg: PackageJson = {};
  const pkgPath = path.join(projectRoot, 'package.json');
  if (fileExists(pkgPath)) {
    try {
      pkg = readJson<PackageJson>(pkgPath);
    } catch {
      logger.warn('Could not parse package.json for pack detection');
    }
  }

  for (const [packName, detect] of Object.entries(DETECTION_RULES)) {
    try {
      if (detect(pkg, projectRoot)) {
        detected.push(packName);
        logger.debug(`Detected pack: ${packName}`);
      }
    } catch {
      // skip detection errors
    }
  }

  return detected;
}
