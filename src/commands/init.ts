import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';
import chalk from 'chalk';
import { logger } from '../utils/logger';
import { resolveProjectRoot, isMagnetoProject } from '../utils/paths';
import { scaffold } from '../core/scaffold';
import { loadPowerPacks } from '../core/power-pack-loader';
import { loadAdapters } from '../core/adapter-loader';
import { detectPacksDetailed, DetectedPack } from '../core/detect-packs';

export interface InitOptions {
  with?: string[];
  adapter?: string[];
  force?: boolean;
  /** Set to false (via --no-suggest) to skip auto-detection prompt */
  suggest?: boolean;
  /** Auto-install all detected packs without prompting (CI mode) */
  autoInstall?: boolean;
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

  // Resolve final pack list — explicit --with takes priority, otherwise auto-detect
  const explicitPacks = options.with || [];
  let packs = [...explicitPacks];

  // Run auto-detection unless user explicitly opted out OR provided explicit packs
  const shouldAutoDetect =
    options.suggest !== false && explicitPacks.length === 0;

  if (shouldAutoDetect) {
    const detected = await detectPacksDetailed(projectRoot);
    const installable = detected.filter((d) => d.available);

    if (installable.length > 0) {
      printDetectionSummary(detected);

      if (options.autoInstall) {
        packs = installable.map((d) => d.name);
        logger.info(
          `Auto-installing detected packs: ${chalk.cyan(packs.join(', '))}`
        );
      } else {
        const confirmed = await promptInstall(installable);
        if (confirmed.length > 0) packs = confirmed;
      }
    }
  }

  // Load power packs
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

function printDetectionSummary(detected: DetectedPack[]): void {
  const installable = detected.filter((d) => d.available);
  const planned = detected.filter((d) => !d.available);

  console.log();
  console.log(chalk.bold('🔍 Auto-detected project stack:'));
  for (const d of installable) {
    const reason = d.reasons[0] ?? '';
    console.log(
      `  ${chalk.green('●')} ${chalk.cyan(d.name.padEnd(16))} ${chalk.gray('(' + d.category + ')')} ${chalk.gray(reason)}`
    );
  }
  if (planned.length > 0) {
    console.log();
    console.log(
      chalk.gray(
        `  ${planned.length} additional pack(s) detected but not yet shipped: ${planned
          .map((d) => d.name)
          .join(', ')}`
      )
    );
  }
  console.log();
}

async function promptInstall(installable: DetectedPack[]): Promise<string[]> {
  if (!process.stdin.isTTY) {
    // Non-interactive shell — default to install everything
    return installable.map((d) => d.name);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer: string = await new Promise((resolve) => {
    rl.question(
      `Install detected packs (${installable.map((d) => d.name).join(', ')})? [Y/n]: `,
      (a) => resolve(a.trim().toLowerCase())
    );
  });
  rl.close();

  if (answer === '' || answer === 'y' || answer === 'yes') {
    return installable.map((d) => d.name);
  }
  if (answer === 'n' || answer === 'no') {
    logger.info('Skipping detected packs. You can install later with `magneto refresh`.');
    return [];
  }

  // Treat anything else as a comma/space-separated subset of pack names
  const requested = answer.split(/[\s,]+/).filter(Boolean);
  const valid = new Set(installable.map((d) => d.name));
  return requested.filter((p) => valid.has(p));
}
