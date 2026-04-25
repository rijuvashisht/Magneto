import chalk from 'chalk';
import { logger } from '../utils/logger';
import { resolveProjectRoot } from '../utils/paths';
import { detectPacksDetailed, DetectedPack, PackCategory } from '../core/detect-packs';

export interface DetectOptions {
  json?: boolean;
  minConfidence?: number;
}

const CATEGORY_ORDER: PackCategory[] = [
  'languages',
  'frameworks',
  'clouds',
  'project-types',
  'integrations',
];

const CATEGORY_LABEL: Record<PackCategory, string> = {
  languages: 'Languages',
  frameworks: 'Frameworks',
  clouds: 'Clouds',
  'project-types': 'Project Types',
  integrations: 'Integrations',
};

export async function detectCommand(options: DetectOptions = {}): Promise<void> {
  const projectRoot = resolveProjectRoot();
  const minConfidence = options.minConfidence ?? 0.5;

  const detected = await detectPacksDetailed(projectRoot, { minConfidence });

  if (options.json) {
    console.log(JSON.stringify({ projectRoot, detected }, null, 2));
    return;
  }

  if (detected.length === 0) {
    logger.warn('No power packs detected for this project.');
    logger.info('Try: magneto init --with typescript nextjs');
    return;
  }

  console.log();
  console.log(chalk.bold(`Detected stack for: ${chalk.cyan(projectRoot)}`));
  console.log();

  // Group by category
  const grouped = new Map<PackCategory, DetectedPack[]>();
  for (const d of detected) {
    if (!grouped.has(d.category)) grouped.set(d.category, []);
    grouped.get(d.category)!.push(d);
  }

  for (const cat of CATEGORY_ORDER) {
    const items = grouped.get(cat);
    if (!items || items.length === 0) continue;
    console.log(chalk.bold.underline(CATEGORY_LABEL[cat]));
    for (const d of items) {
      const confBar = renderConfidence(d.confidence);
      const status = d.available
        ? chalk.green('● available')
        : chalk.gray('○ planned');
      console.log(
        `  ${chalk.cyan(d.name.padEnd(16))} ${confBar} ${status}`
      );
      for (const reason of d.reasons) {
        console.log(`    ${chalk.gray('└─')} ${chalk.gray(reason)}`);
      }
    }
    console.log();
  }

  // Recommendations
  const installable = detected.filter((d) => d.available).map((d) => d.name);
  if (installable.length > 0) {
    console.log(chalk.bold('Recommended install:'));
    console.log(
      `  ${chalk.green('magneto init --with')} ${installable.join(' ')}`
    );
    console.log();
  }

  const planned = detected.filter((d) => !d.available);
  if (planned.length > 0) {
    console.log(
      chalk.gray(
        `${planned.length} planned pack(s) detected — see ROADMAP.md to track progress.`
      )
    );
  }
}

function renderConfidence(confidence: number): string {
  const pct = Math.round(confidence * 100);
  const filled = Math.round(confidence * 10);
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
  const colored =
    confidence >= 0.85
      ? chalk.green(bar)
      : confidence >= 0.6
      ? chalk.yellow(bar)
      : chalk.gray(bar);
  return `${colored} ${String(pct).padStart(3)}%`;
}
