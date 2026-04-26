// CLI handlers for `magneto sdd <subcommand>`.
import * as readline from 'readline';
import chalk from 'chalk';
import { logger } from '../utils/logger';
import { resolveProjectRoot } from '../utils/paths';
import { SddFramework } from '../core/sdd/types';
import { getAdapter, listFrameworks, defaultFramework } from '../core/sdd/framework';
import { detectFrameworks, recommendFramework } from '../core/sdd/detector';

export interface SddInitOptions {
  framework?: string;
  force?: boolean;
  dryRun?: boolean;
  /** When true, never prompt — pick the recommended framework. */
  yes?: boolean;
}

export async function sddInitCommand(options: SddInitOptions): Promise<void> {
  const projectRoot = resolveProjectRoot();

  let framework: SddFramework;
  if (options.framework) {
    framework = parseFramework(options.framework);
  } else {
    framework = await pickFramework(projectRoot, options.yes ?? false);
  }

  const adapter = getAdapter(framework);
  logger.info(`Initializing SDD with ${chalk.cyan(adapter.info.displayName)} (${adapter.info.bestFor})`);

  const result = await adapter.init({
    projectRoot,
    framework,
    dryRun: options.dryRun,
    force: options.force,
  });

  if (result.filesCreated.length > 0) {
    logger.success(`Created ${result.filesCreated.length} file(s)`);
    for (const f of result.filesCreated) console.log(`  + ${f}`);
  }
  if (result.filesSkipped.length > 0) {
    logger.warn(`Skipped ${result.filesSkipped.length} existing file(s) (use --force to overwrite)`);
  }
  for (const w of result.warnings) logger.warn(w);

  if (!options.dryRun) {
    console.log();
    console.log(chalk.bold('Next steps:'));
    console.log(`  1. Edit the constitution to add project-specific rules`);
    console.log(`  2. Run ${chalk.cyan('magneto sdd new <name> "<description>"')} to start a change`);
    console.log(`  3. Implement task-by-task, then ${chalk.cyan('magneto sdd sync')} before merge`);
  }
}

export interface SddNewOptions {
  dryRun?: boolean;
}

export async function sddNewCommand(
  name: string,
  description: string,
  options: SddNewOptions
): Promise<void> {
  const projectRoot = resolveProjectRoot();
  const detected = detectFrameworks(projectRoot);
  if (detected.length === 0) {
    logger.error('No SDD framework initialized. Run `magneto sdd init` first.');
    process.exitCode = 1;
    return;
  }
  const framework = detected[0];
  const adapter = getAdapter(framework);
  const result = await adapter.newChange({
    projectRoot,
    name,
    description,
    dryRun: options.dryRun,
  });
  logger.success(`Created change "${name}" using ${adapter.info.displayName}`);
  console.log(`  ${chalk.gray(result.changeDir)}`);
  for (const f of result.filesCreated) console.log(`  + ${f}`);
}

export async function sddStatusCommand(): Promise<void> {
  const projectRoot = resolveProjectRoot();
  const detected = detectFrameworks(projectRoot);

  if (detected.length === 0) {
    console.log(chalk.yellow('No SDD framework initialized.'));
    console.log(`Run ${chalk.cyan('magneto sdd init')} to set one up.`);
    console.log();
    console.log(chalk.bold('Available frameworks:'));
    for (const info of listFrameworks()) {
      console.log(`  - ${chalk.cyan(info.displayName.padEnd(14))} ${chalk.gray('(' + info.bestFor + ')')} ${info.tagline}`);
    }
    return;
  }

  for (const fw of detected) {
    const adapter = getAdapter(fw);
    const status = await adapter.status(projectRoot);
    console.log(chalk.bold(`SDD framework: ${chalk.cyan(adapter.info.displayName)} (${adapter.info.bestFor})`));
    if (status.constitutionPath) {
      console.log(`  Constitution: ${chalk.gray(status.constitutionPath)}`);
    }
    console.log(`  Active changes: ${status.activeChanges.length}`);
    for (const c of status.activeChanges) console.log(`    - ${c}`);
    if (status.frozenSpecs.length > 0) {
      console.log(`  Frozen specs: ${status.frozenSpecs.length}`);
    }
    console.log();
  }
}

export interface SddSyncOptions {
  dryRun?: boolean;
}

export async function sddSyncCommand(options: SddSyncOptions): Promise<void> {
  const projectRoot = resolveProjectRoot();
  const detected = detectFrameworks(projectRoot);
  if (detected.length === 0) {
    logger.error('No SDD framework initialized. Run `magneto sdd init` first.');
    process.exitCode = 1;
    return;
  }
  const framework = detected[0];
  const adapter = getAdapter(framework);
  const report = await adapter.sync(projectRoot, options.dryRun);

  if (report.drifts.length === 0) {
    logger.success(`No drift detected — spec ↔ code in sync (${adapter.info.displayName}).`);
    return;
  }

  logger.warn(`${report.drifts.length} drift(s) detected:`);
  for (const d of report.drifts) {
    console.log(`  ${chalk.yellow('●')} [${d.kind}] ${d.summary}`);
    console.log(`      spec: ${chalk.gray(d.specPath)}  code: ${chalk.gray(d.codePath)}`);
  }
  if (report.updatedFiles.length > 0) {
    console.log();
    console.log(chalk.bold('Wrote drift report:'));
    for (const f of report.updatedFiles) console.log(`  + ${f}`);
  }
  if (report.drifts.length > 0) process.exitCode = 1;
}

// ─── helpers ─────────────────────────────────────────────────────────────

function parseFramework(s: string): SddFramework {
  const norm = s.toLowerCase().replace(/[^a-z]/g, '');
  if (norm === 'openspec' || norm === 'os') return 'openspec';
  if (norm === 'speckit' || norm === 'specify' || norm === 'sk') return 'speckit';
  if (norm === 'bmad' || norm === 'bmadmethod') return 'bmad';
  throw new Error(`Unknown framework "${s}". Choose: openspec, speckit, bmad.`);
}

async function pickFramework(projectRoot: string, autoYes: boolean): Promise<SddFramework> {
  const recommended = recommendFramework(projectRoot);
  if (autoYes || !process.stdin.isTTY) {
    logger.info(`Auto-selected framework: ${chalk.cyan(recommended)} (use --framework to override)`);
    return recommended;
  }

  console.log();
  console.log(chalk.bold('Choose a spec-driven development framework:'));
  const frameworks = listFrameworks();
  frameworks.forEach((info, i) => {
    const marker = info.id === recommended ? chalk.green('●') : ' ';
    const star = info.id === recommended ? chalk.green(' (recommended)') : '';
    console.log(`  ${marker} ${i + 1}) ${chalk.cyan(info.displayName.padEnd(14))} ${chalk.gray('(' + info.bestFor + ')')} ${info.tagline}${star}`);
  });
  console.log(`    ${frameworks.length + 1}) Skip — no SDD scaffolding`);
  console.log();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer: string = await new Promise((resolve) => {
    rl.question(`Selection [1-${frameworks.length + 1}, default ${recommended}]: `, (a) => resolve(a.trim()));
  });
  rl.close();

  if (answer === '') return recommended;
  const n = parseInt(answer, 10);
  if (Number.isFinite(n) && n >= 1 && n <= frameworks.length) {
    return frameworks[n - 1].id;
  }
  if (Number.isFinite(n) && n === frameworks.length + 1) {
    throw new Error('SDD initialization skipped by user.');
  }
  // Allow typing the name directly.
  return parseFramework(answer || defaultFramework());
}
