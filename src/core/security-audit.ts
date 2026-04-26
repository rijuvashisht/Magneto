import * as fs from 'fs';
import * as path from 'path';
import { runVulnerabilityScanner, VulnerabilityFinding, FindingSeverity } from './vulnerability-scanner';
import { logger } from '../utils/logger';

export interface AuditOptions {
  rootDir?: string;
  outputFormat?: 'json' | 'markdown' | 'text';
  outputFile?: string;
  severity?: FindingSeverity;
  fix?: boolean;
  categories?: string[];
  excludePatterns?: string[];
}

export interface AuditReport {
  timestamp: string;
  rootDir: string;
  scannedFiles: number;
  durationMs: number;
  summary: {
    critical: number;
    error: number;
    warning: number;
    info: number;
    total: number;
  };
  findings: VulnerabilityFinding[];
  ruleSetVersion: string;
  passed: boolean;
}

const SEVERITY_ORDER: Record<FindingSeverity, number> = {
  critical: 0,
  error: 1,
  warning: 2,
  info: 3,
};

function severityIcon(s: FindingSeverity): string {
  return { critical: '🔴', error: '🟠', warning: '🟡', info: '🔵' }[s];
}

function severityColor(s: FindingSeverity): string {
  return { critical: '\x1b[31m', error: '\x1b[33m', warning: '\x1b[33m', info: '\x1b[36m' }[s];
}

const RESET = '\x1b[0m';

export async function runSecurityAudit(options: AuditOptions = {}): Promise<AuditReport> {
  const rootDir = options.rootDir ?? process.cwd();
  const minSeverityLevel = SEVERITY_ORDER[options.severity ?? 'info'];

  logger.info(`[glasswing] Starting security audit in ${rootDir}`);
  logger.info('[glasswing] Running SAST + secrets scanner...');

  const result = await runVulnerabilityScanner(rootDir, {
    excludePatterns: options.excludePatterns,
  });

  const filtered = result.findings
    .filter((f) => {
      if (SEVERITY_ORDER[f.severity] > minSeverityLevel) return false;
      if (options.categories && !options.categories.includes(f.category)) return false;
      return true;
    })
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  const summary = {
    critical: filtered.filter((f) => f.severity === 'critical').length,
    error: filtered.filter((f) => f.severity === 'error').length,
    warning: filtered.filter((f) => f.severity === 'warning').length,
    info: filtered.filter((f) => f.severity === 'info').length,
    total: filtered.length,
  };

  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    rootDir,
    scannedFiles: result.scannedFiles,
    durationMs: result.durationMs,
    summary,
    findings: filtered,
    ruleSetVersion: result.ruleSetVersion,
    passed: summary.critical === 0 && summary.error === 0,
  };

  return report;
}

export function renderText(report: AuditReport): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('[glasswing] Security Audit Results');
  lines.push(`  Scanned: ${report.scannedFiles} files in ${report.durationMs}ms`);
  lines.push('');

  if (report.findings.length === 0) {
    lines.push('  ✅ No findings — clean audit');
    return lines.join('\n');
  }

  for (const f of report.findings) {
    const col = severityColor(f.severity);
    const icon = severityIcon(f.severity);
    lines.push(`${col}${icon} [${f.severity.toUpperCase()}] ${f.id}${RESET}`);
    lines.push(`   ${f.title}`);
    lines.push(`   ${f.file}:${f.line}:${f.column}`);
    lines.push(`   ${f.description}`);
    if (f.snippet) lines.push(`   → ${f.snippet}`);
    if (f.cwe) lines.push(`   CWE: ${f.cwe}${f.owasp ? `  OWASP: ${f.owasp}` : ''}`);
    if (f.remediation) lines.push(`   Fix: ${f.remediation}`);
    lines.push('');
  }

  lines.push('─'.repeat(60));
  lines.push(`  Summary: ${report.summary.critical} critical · ${report.summary.error} error · ${report.summary.warning} warning · ${report.summary.info} info`);
  lines.push(report.passed ? '  ✅ Passed — no blocking issues' : '  ❌ Failed — critical or error findings must be resolved');

  return lines.join('\n');
}

export function renderMarkdown(report: AuditReport): string {
  const lines: string[] = [];
  lines.push('# Magneto Security Audit Report');
  lines.push('');
  lines.push(`**Date:** ${report.timestamp}  `);
  lines.push(`**Root:** \`${report.rootDir}\`  `);
  lines.push(`**Files scanned:** ${report.scannedFiles}  `);
  lines.push(`**Duration:** ${report.durationMs}ms  `);
  lines.push(`**Result:** ${report.passed ? '✅ Passed' : '❌ Failed'}  `);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Severity | Count |');
  lines.push('|---|---|');
  lines.push(`| 🔴 Critical | ${report.summary.critical} |`);
  lines.push(`| 🟠 Error | ${report.summary.error} |`);
  lines.push(`| 🟡 Warning | ${report.summary.warning} |`);
  lines.push(`| 🔵 Info | ${report.summary.info} |`);
  lines.push(`| **Total** | **${report.summary.total}** |`);

  if (report.findings.length === 0) {
    lines.push('');
    lines.push('## Findings');
    lines.push('');
    lines.push('No findings detected. Clean audit. ✅');
    return lines.join('\n');
  }

  lines.push('');
  lines.push('## Findings');

  const byCategory = report.findings.reduce<Record<string, VulnerabilityFinding[]>>((acc, f) => {
    (acc[f.category] ??= []).push(f);
    return acc;
  }, {});

  for (const [cat, findings] of Object.entries(byCategory)) {
    lines.push('');
    lines.push(`### ${cat.charAt(0).toUpperCase() + cat.slice(1)}`);
    lines.push('');
    for (const f of findings) {
      lines.push(`#### ${severityIcon(f.severity)} \`${f.id}\` — ${f.title}`);
      lines.push('');
      lines.push(`**Severity:** ${f.severity}  `);
      lines.push(`**File:** \`${f.file}:${f.line}\`  `);
      if (f.cwe) lines.push(`**CWE:** ${f.cwe}  `);
      if (f.owasp) lines.push(`**OWASP:** ${f.owasp}  `);
      lines.push('');
      lines.push(f.description);
      if (f.snippet) {
        lines.push('');
        lines.push('```');
        lines.push(f.snippet);
        lines.push('```');
      }
      if (f.remediation) {
        lines.push('');
        lines.push(`**Remediation:** ${f.remediation}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function renderJson(report: AuditReport): string {
  return JSON.stringify(report, null, 2);
}

export function saveReport(report: AuditReport, format: 'json' | 'markdown' | 'text', outputFile: string): void {
  const content =
    format === 'json' ? renderJson(report) :
    format === 'markdown' ? renderMarkdown(report) :
    renderText(report);
  const dir = path.dirname(outputFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputFile, content, 'utf-8');
  logger.info(`[glasswing] Report saved → ${outputFile}`);
}
