import * as path from 'path';
import { logger } from '../utils/logger';
import { resolveProjectRoot, MAGNETO_DIR, GITHUB_DIR, VSCODE_DIR, MAGNETO_SUBDIRS } from '../utils/paths';
import { fileExists } from '../utils/fs';

interface DiagnosticResult {
  check: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
}

export async function doctorCommand(): Promise<void> {
  const projectRoot = resolveProjectRoot();
  const results: DiagnosticResult[] = [];

  logger.info('Running diagnostics...\n');

  // Check .magneto directory
  results.push(checkPath(projectRoot, path.join(MAGNETO_DIR, 'magneto.config.json'), 'Magneto config'));
  results.push(checkPath(projectRoot, path.join(MAGNETO_DIR, 'magneto.min.json'), 'Magneto min config'));
  results.push(checkPath(projectRoot, path.join(MAGNETO_DIR, 'START.md'), 'START.md'));

  // Check subdirectories
  for (const sub of MAGNETO_SUBDIRS) {
    results.push(checkPath(projectRoot, path.join(MAGNETO_DIR, sub), `${sub}/ directory`));
  }

  // Check GitHub integration
  results.push(checkPath(projectRoot, path.join(GITHUB_DIR, 'copilot-instructions.md'), 'Copilot instructions'));
  results.push(checkPath(projectRoot, path.join(GITHUB_DIR, 'agents'), 'Agent definitions'));

  // Check VSCode integration
  results.push(checkPath(projectRoot, path.join(VSCODE_DIR, 'mcp.json'), 'MCP config'));

  // Check for package.json
  results.push(checkPath(projectRoot, 'package.json', 'package.json'));

  // Check for Node.js
  results.push({
    check: 'Node.js runtime',
    status: process.version ? 'pass' : 'fail',
    message: process.version ? `Node.js ${process.version}` : 'Node.js not found',
  });

  // Report
  let hasFailures = false;
  for (const r of results) {
    const icon = r.status === 'pass' ? '✓' : r.status === 'warn' ? '⚠' : '✗';
    const colorFn =
      r.status === 'pass'
        ? logger.success
        : r.status === 'warn'
          ? logger.warn
          : logger.error;
    colorFn.call(logger, `${icon} ${r.check}: ${r.message}`);
    if (r.status === 'fail') hasFailures = true;
  }

  console.log('');
  if (hasFailures) {
    logger.error('Some checks failed. Run "magneto init" to fix.');
  } else {
    logger.success('All checks passed! Magneto is ready.');
  }
}

function checkPath(projectRoot: string, relativePath: string, label: string): DiagnosticResult {
  const fullPath = path.join(projectRoot, relativePath);
  if (fileExists(fullPath)) {
    return { check: label, status: 'pass', message: 'Found' };
  }
  return { check: label, status: 'fail', message: 'Missing' };
}
