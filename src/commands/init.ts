import * as path from 'path';
import * as fs from 'fs';
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

  // Add LICENSE file
  await addLicenseFile(projectRoot);

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

async function addLicenseFile(projectRoot: string): Promise<void> {
  const licensePath = path.join(projectRoot, 'LICENSE');
  
  // Don't overwrite existing LICENSE
  if (fs.existsSync(licensePath)) {
    return;
  }

  const licenseContent = `MIT License

Copyright (c) 2024 Riju Vashisht

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

This project uses Magneto AI framework
Copyright (c) 2024 Riju Vashisht
https://github.com/rijuvashisht/Magneto
`;

  fs.writeFileSync(licensePath, licenseContent);
  logger.info('LICENSE file created');
}
