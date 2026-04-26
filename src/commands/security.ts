import * as fs from 'fs';
import * as path from 'path';
import { runSecurityAudit, renderText, renderMarkdown, renderJson, saveReport, AuditOptions } from '../core/security-audit';
import { runDependencyScanner, renderDependencyScanText } from '../core/dependency-scanner';
import { runDependencyFix, renderDependencyFixReport } from '../core/dependency-fixer';
import { evaluateCompliance, renderComplianceText, renderComplianceMarkdown, ComplianceFramework, getAvailableFrameworks } from '../core/compliance-engine';
import { runAutoFix, getFixableRuleIds } from '../core/security-fixer';
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

export async function securityFixCommand(
  options: { dryRun?: boolean; format?: string; deps?: boolean; code?: boolean } = {}
): Promise<void> {
  const rootDir = process.cwd();
  // If neither flag is given, fix both. If only one is given, only do that one.
  const fixCode = options.code !== false && (options.code === true || !options.deps);
  const fixDeps = options.deps !== false && (options.deps === true || !options.code);
  const doBoth = !options.code && !options.deps;
  const runCode = doBoth || options.code;
  const runDeps = doBoth || options.deps;

  if (options.dryRun) logger.info('[glasswing] Dry-run mode — no files will be written');

  // ─── Code fixes (SAST) ───────────────────────────────────────────
  if (runCode) {
    const report = await runSecurityAudit({ rootDir, severity: 'info' });
    if (report.findings.length === 0) {
      logger.info('[glasswing] ✅ No code findings — nothing to fix');
    } else {
      const fixable = getFixableRuleIds();
      const fixableFindings = report.findings.filter((f) => fixable.includes(f.id));
      const unfixable = report.findings.filter((f) => !fixable.includes(f.id));

      logger.info(`[glasswing] Code: ${fixableFindings.length} auto-fixable · ${unfixable.length} require manual remediation`);

      const fixReport = await runAutoFix(rootDir, fixableFindings, { dryRun: options.dryRun ?? false });
      logger.info(`[glasswing] Code fixes: applied ${fixReport.applied} · skipped ${fixReport.skipped}`);

      for (const r of fixReport.results) {
        if (r.applied && r.diff) logger.info(`  ✓ ${r.ruleId} — ${r.file}:${r.line}`);
        else if (!r.applied) logger.info(`  ⊘ ${r.ruleId} — ${r.file}:${r.line} (manual fix needed)`);
      }

      if (unfixable.length > 0) {
        logger.info('');
        logger.info('[glasswing] Code findings requiring manual remediation:');
        for (const f of unfixable) {
          logger.info(`  ✗ ${f.id} — ${f.file}:${f.line} — ${f.remediation ?? 'see docs'}`);
        }
      }
    }
  }

  // ─── Dependency upgrades ───────────────────────────────────────────
  if (runDeps) {
    logger.info('');
    logger.info('[glasswing] Scanning dependencies for vulnerabilities...');
    const scan = await runDependencyScanner(rootDir);

    if (scan.groupedVulnerabilities.length === 0) {
      logger.info('[glasswing] ✅ No vulnerable dependencies found');
      return;
    }

    const fixReport = await runDependencyFix(rootDir, scan.groupedVulnerabilities, {
      dryRun: options.dryRun ?? false,
    });

    console.log(renderDependencyFixReport(fixReport));

    if (fixReport.fixesApplied.length > 0 && !options.dryRun) {
      logger.info(`[glasswing] ✓ Updated ${fixReport.manifestsModified.length} manifest(s).`);
      logger.info('[glasswing] Run the npm install commands above to update lockfiles.');
    }
  }
  
  void fixCode; void fixDeps; // suppress unused
}

export async function securityComplianceCommand(
  frameworks: string[],
  options: { format?: string; output?: string } = {}
): Promise<void> {
  const rootDir = process.cwd();
  const available = getAvailableFrameworks();
  const selected = (frameworks.length > 0 ? frameworks : available) as ComplianceFramework[];
  const invalid = selected.filter((f) => !available.includes(f as ComplianceFramework));
  if (invalid.length > 0) {
    logger.info(`[glasswing] Unknown frameworks: ${invalid.join(', ')}. Available: ${available.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  const [auditReport, depResult] = await Promise.all([
    runSecurityAudit({ rootDir, severity: 'info' }),
    runDependencyScanner(rootDir),
  ]);

  const complianceReport = evaluateCompliance(selected, auditReport.findings, depResult.vulnerabilities);

  const format = options.format ?? 'text';
  if (format === 'json') {
    console.log(JSON.stringify(complianceReport, null, 2));
  } else if (format === 'markdown') {
    const md = renderComplianceMarkdown(complianceReport);
    if (options.output) {
      fs.mkdirSync(path.dirname(options.output), { recursive: true });
      fs.writeFileSync(options.output, md, 'utf-8');
      logger.info(`[glasswing] Compliance report saved → ${options.output}`);
    } else {
      console.log(md);
    }
  } else {
    console.log(renderComplianceText(complianceReport));
  }

  if (!complianceReport.passed) {
    logger.info(`[glasswing] ✗ Compliance FAILED — ${complianceReport.controls.failed} blocking control(s) violated`);
    process.exitCode = 1;
  } else {
    logger.info('[glasswing] ✅ Compliance PASSED');
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
