import * as path from 'path';
import { runSecurityAudit, renderText, renderMarkdown, renderJson, saveReport, AuditOptions } from '../core/security-audit';
import { runDependencyScanner, renderDependencyScanText } from '../core/dependency-scanner';
import { logger } from '../utils/logger';
import { FindingSeverity } from '../core/vulnerability-scanner';

export interface SecurityAuditCommandOptions {
  format?: 'text' | 'json' | 'markdown';
  output?: string;
  severity?: string;
  category?: string[];
  exclude?: string[];
  fix?: boolean;
  failOn?: string;
}

export async function securityAuditCommand(options: SecurityAuditCommandOptions = {}): Promise<void> {
  const rootDir = process.cwd();
  const format = options.format ?? 'text';
  const severity = (options.severity ?? 'info') as FindingSeverity;

  const auditOptions: AuditOptions = {
    rootDir,
    outputFormat: format,
    outputFile: options.output,
    severity,
    categories: options.category,
    excludePatterns: options.exclude,
    fix: options.fix ?? false,
  };

  const report = await runSecurityAudit(auditOptions);

  if (format === 'json') {
    console.log(renderJson(report));
  } else if (format === 'markdown') {
    const md = renderMarkdown(report);
    if (options.output) {
      saveReport(report, 'markdown', options.output);
    } else {
      console.log(md);
    }
  } else {
    console.log(renderText(report));
  }

  if (options.output && format !== 'markdown') {
    saveReport(report, format, options.output);
  }

  if (!options.output && format === 'text') {
    const defaultOut = path.join(rootDir, '.magneto', 'reports', `security-audit-${Date.now()}.md`);
    saveReport(report, 'markdown', defaultOut);
  }

  const failOn = (options.failOn ?? 'error') as FindingSeverity;
  const failSeverities: FindingSeverity[] = ['critical', 'error', 'warning', 'info'];
  const failIdx = failSeverities.indexOf(failOn);
  const blockingCount = report.findings.filter((f) => {
    return failSeverities.indexOf(f.severity) <= failIdx;
  }).length;

  if (blockingCount > 0) {
    logger.info(`[glasswing] ✗ ${blockingCount} blocking findings at severity ≥ ${failOn}`);
    process.exitCode = 1;
  } else {
    logger.info('[glasswing] ✅ Audit passed — no blocking findings');
  }
}

export async function securityReportCommand(options: { format?: string; output?: string } = {}): Promise<void> {
  const format = (options.format ?? 'markdown') as 'json' | 'markdown' | 'text';
  const output = options.output ?? path.join(process.cwd(), '.magneto', 'reports', `security-report-${Date.now()}.${format === 'json' ? 'json' : 'md'}`);

  const report = await runSecurityAudit({ rootDir: process.cwd(), severity: 'info' });
  saveReport(report, format, output);

  logger.info(`[glasswing] Report written → ${output}`);
  logger.info(`[glasswing]   ${report.summary.critical} critical · ${report.summary.error} error · ${report.summary.warning} warning · ${report.summary.info} info`);
}

export async function securityScanCommand(options: { format?: string; output?: string } = {}): Promise<void> {
  const rootDir = process.cwd();
  const result = await runDependencyScanner(rootDir);
  const text = renderDependencyScanText(result);

  if (options.format === 'json') {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(text);
  }

  if (options.output) {
    const fs = await import('fs');
    fs.mkdirSync(path.dirname(options.output), { recursive: true });
    fs.writeFileSync(options.output, options.format === 'json' ? JSON.stringify(result, null, 2) : text, 'utf-8');
    logger.info(`[glasswing] Dependency scan saved → ${options.output}`);
  }

  const critical = result.vulnerabilities.filter((v) => v.severity === 'CRITICAL' || v.severity === 'HIGH').length;
  if (critical > 0) {
    logger.info(`[glasswing] ✗ ${critical} CRITICAL/HIGH vulnerable dependencies found`);
    process.exitCode = 1;
  } else {
    logger.info('[glasswing] ✅ No critical/high dependency vulnerabilities');
  }
}

export async function securityCheckCommand(taskFile: string, options: { strict?: boolean } = {}): Promise<boolean> {
  logger.info(`[glasswing] Pre-execution security check for task: ${taskFile}`);
  const report = await runSecurityAudit({ rootDir: process.cwd(), severity: 'error' });

  const blocking = report.summary.critical + report.summary.error;
  if (blocking > 0) {
    logger.info(`[glasswing] ✗ ${blocking} unresolved security issues found — task execution blocked`);
    logger.info('[glasswing] Run `magneto security audit` to see full details');
    if (options.strict) process.exitCode = 1;
    return false;
  }

  logger.info('[glasswing] ✅ Security check passed — proceeding with task execution');
  return true;
}
