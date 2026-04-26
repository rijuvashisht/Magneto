import { VulnerabilityFinding } from './vulnerability-scanner';
import { DependencyVuln } from './dependency-scanner';
import { logger } from '../utils/logger';

export type ComplianceFramework = 'SOC2' | 'HIPAA' | 'GDPR' | 'PCI-DSS' | 'OWASP';

export interface ComplianceControl {
  id: string;
  framework: ComplianceFramework;
  controlRef: string;
  title: string;
  description: string;
  mappedRuleIds: string[];        // vulnerability-scanner rule IDs that map here
  mappedCategories: string[];     // fallback: any finding in these categories
  severity: 'blocking' | 'advisory';
}

export interface ComplianceViolation {
  control: ComplianceControl;
  findings: VulnerabilityFinding[];
  depVulns: DependencyVuln[];
  status: 'FAIL' | 'WARN' | 'PASS';
}

export interface ComplianceReport {
  timestamp: string;
  frameworks: ComplianceFramework[];
  controls: {
    total: number;
    passed: number;
    failed: number;
    warned: number;
  };
  violations: ComplianceViolation[];
  passed: boolean;
  attestation: string;
}

// ─── Control definitions ─────────────────────────────────────────────────────

const CONTROLS: ComplianceControl[] = [
  // SOC2 — Trust Services Criteria (Security)
  {
    id: 'soc2-cc6.1',
    framework: 'SOC2',
    controlRef: 'CC6.1',
    title: 'Logical and Physical Access Controls',
    description: 'Restrict logical access to assets — no hardcoded credentials, no wildcard IAM policies.',
    mappedRuleIds: ['sec-hardcoded-aws-key', 'sec-hardcoded-generic-secret', 'sec-hardcoded-credentials-url', 'sec-hardcoded-jwt-secret', 'sec-github-pat', 'sec-private-key-pem'],
    mappedCategories: ['secrets'],
    severity: 'blocking',
  },
  {
    id: 'soc2-cc6.6',
    framework: 'SOC2',
    controlRef: 'CC6.6',
    title: 'Logical Access Security Measures — Network',
    description: 'Prevent unauthorized access via injection or path traversal.',
    mappedRuleIds: ['sec-sql-concat-ts', 'sec-nosql-injection', 'sec-eval-usage', 'sec-shell-injection-node', 'sec-path-traversal', 'sec-ssrf-user-url'],
    mappedCategories: ['injection', 'ssrf'],
    severity: 'blocking',
  },
  {
    id: 'soc2-cc7.1',
    framework: 'SOC2',
    controlRef: 'CC7.1',
    title: 'System Vulnerability Management',
    description: 'Detect and remediate known vulnerable components and weak cryptography.',
    mappedRuleIds: ['sec-md5-sha1', 'sec-math-random-crypto'],
    mappedCategories: ['cryptography'],
    severity: 'blocking',
  },
  {
    id: 'soc2-cc9.2',
    framework: 'SOC2',
    controlRef: 'CC9.2',
    title: 'Risk Mitigation — Third-Party Dependencies',
    description: 'Assess and remediate vulnerabilities in third-party packages.',
    mappedRuleIds: [],
    mappedCategories: [],
    severity: 'blocking',
  },

  // HIPAA — Security Rule safeguards
  {
    id: 'hipaa-164.312a',
    framework: 'HIPAA',
    controlRef: '164.312(a)(1)',
    title: 'Access Control — Unique User Identification',
    description: 'ePHI systems must not use hardcoded credentials or shared secrets.',
    mappedRuleIds: ['sec-hardcoded-aws-key', 'sec-hardcoded-generic-secret', 'sec-hardcoded-credentials-url', 'sec-hardcoded-jwt-secret'],
    mappedCategories: ['secrets'],
    severity: 'blocking',
  },
  {
    id: 'hipaa-164.312b',
    framework: 'HIPAA',
    controlRef: '164.312(b)',
    title: 'Audit Controls',
    description: 'Implement hardware, software, and procedural audit controls — no sensitive data in logs.',
    mappedRuleIds: ['sec-console-log-sensitive'],
    mappedCategories: ['logging'],
    severity: 'advisory',
  },
  {
    id: 'hipaa-164.312e',
    framework: 'HIPAA',
    controlRef: '164.312(e)(1)',
    title: 'Transmission Security — Encryption',
    description: 'Protect ePHI in transit using strong encryption — no weak hash algorithms.',
    mappedRuleIds: ['sec-md5-sha1', 'sec-math-random-crypto'],
    mappedCategories: ['cryptography'],
    severity: 'blocking',
  },

  // GDPR — Technical measures
  {
    id: 'gdpr-art25',
    framework: 'GDPR',
    controlRef: 'Article 25',
    title: 'Data Protection by Design and by Default',
    description: 'Minimise data exposure — no sensitive values in logs, no debug mode in production.',
    mappedRuleIds: ['sec-console-log-sensitive', 'sec-debug-production'],
    mappedCategories: ['logging', 'misconfiguration'],
    severity: 'advisory',
  },
  {
    id: 'gdpr-art32',
    framework: 'GDPR',
    controlRef: 'Article 32',
    title: 'Security of Processing',
    description: 'Ensure confidentiality and integrity — no hardcoded secrets, no weak crypto, no injection vectors.',
    mappedRuleIds: ['sec-hardcoded-generic-secret', 'sec-md5-sha1', 'sec-sql-concat-ts', 'sec-eval-usage'],
    mappedCategories: ['secrets', 'cryptography', 'injection'],
    severity: 'blocking',
  },

  // PCI-DSS
  {
    id: 'pci-req2.2',
    framework: 'PCI-DSS',
    controlRef: 'Req 2.2',
    title: 'Secure System Configuration',
    description: 'No default or hardcoded credentials. No unnecessary debug services enabled.',
    mappedRuleIds: ['sec-hardcoded-credentials-url', 'sec-hardcoded-generic-secret', 'sec-debug-production'],
    mappedCategories: ['secrets', 'misconfiguration'],
    severity: 'blocking',
  },
  {
    id: 'pci-req6.3',
    framework: 'PCI-DSS',
    controlRef: 'Req 6.3',
    title: 'Protect Web-Facing Applications',
    description: 'Address OWASP Top 10 — injection, broken auth, SSRF.',
    mappedRuleIds: ['sec-sql-concat-ts', 'sec-nosql-injection', 'sec-ssrf-user-url', 'sec-eval-usage', 'sec-shell-injection-node'],
    mappedCategories: ['injection', 'ssrf'],
    severity: 'blocking',
  },
  {
    id: 'pci-req6.4',
    framework: 'PCI-DSS',
    controlRef: 'Req 6.4',
    title: 'Known Vulnerability Management',
    description: 'Protect systems from known vulnerabilities in third-party software.',
    mappedRuleIds: [],
    mappedCategories: [],
    severity: 'blocking',
  },
];

// ─── Engine ──────────────────────────────────────────────────────────────────

export function evaluateCompliance(
  frameworks: ComplianceFramework[],
  findings: VulnerabilityFinding[],
  depVulns: DependencyVuln[]
): ComplianceReport {
  logger.debug(`[glasswing] Evaluating compliance for: ${frameworks.join(', ')}`);

  const relevantControls = CONTROLS.filter((c) => frameworks.includes(c.framework));

  const violations: ComplianceViolation[] = [];

  for (const control of relevantControls) {
    const matchedFindings = findings.filter((f) =>
      control.mappedRuleIds.includes(f.id) ||
      control.mappedCategories.includes(f.category)
    );

    const matchedDeps = depVulns.filter(() =>
      control.id.endsWith('-cc9.2') || control.id.endsWith('-req6.4') || control.id.endsWith('-req2.2')
    );

    let status: ComplianceViolation['status'] = 'PASS';
    if (matchedFindings.length > 0 || matchedDeps.length > 0) {
      status = control.severity === 'blocking' ? 'FAIL' : 'WARN';
    }

    violations.push({ control, findings: matchedFindings, depVulns: matchedDeps, status });
  }

  const passed = violations.filter((v) => v.status === 'PASS').length;
  const failed = violations.filter((v) => v.status === 'FAIL').length;
  const warned = violations.filter((v) => v.status === 'WARN').length;

  const overallPass = failed === 0;

  return {
    timestamp: new Date().toISOString(),
    frameworks,
    controls: { total: relevantControls.length, passed, failed, warned },
    violations,
    passed: overallPass,
    attestation: overallPass
      ? `PASS — all ${relevantControls.length} controls satisfied for ${frameworks.join(', ')}`
      : `FAIL — ${failed} blocking control(s) violated for ${frameworks.join(', ')}`,
  };
}

export function renderComplianceText(report: ComplianceReport): string {
  const lines: string[] = [];
  lines.push('');
  lines.push('[glasswing] Compliance Evaluation');
  lines.push(`  Frameworks: ${report.frameworks.join(', ')}`);
  lines.push(`  Controls:   ${report.controls.total} total · ${report.controls.passed} passed · ${report.controls.failed} failed · ${report.controls.warned} warned`);
  lines.push('');

  for (const v of report.violations) {
    if (v.status === 'PASS') continue;
    const icon = v.status === 'FAIL' ? '❌' : '⚠️ ';
    lines.push(`${icon} [${v.control.framework}] ${v.control.controlRef} — ${v.control.title}`);
    lines.push(`   ${v.control.description}`);
    if (v.findings.length > 0) {
      lines.push(`   Violations (${v.findings.length}):`);
      for (const f of v.findings.slice(0, 5)) {
        lines.push(`     • ${f.id} — ${f.file}:${f.line}`);
      }
      if (v.findings.length > 5) lines.push(`     … and ${v.findings.length - 5} more`);
    }
    if (v.depVulns.length > 0) {
      lines.push(`   Vulnerable deps (${v.depVulns.length}):`);
      for (const d of v.depVulns.slice(0, 3)) {
        lines.push(`     • ${d.packageName}@${d.installedVersion} — ${d.vulnId} [${d.severity}]`);
      }
    }
    lines.push('');
  }

  lines.push('─'.repeat(60));
  lines.push(`  ${report.attestation}`);
  return lines.join('\n');
}

export function renderComplianceMarkdown(report: ComplianceReport): string {
  const lines: string[] = [];
  lines.push('# Magneto Compliance Report');
  lines.push('');
  lines.push(`**Date:** ${report.timestamp}  `);
  lines.push(`**Frameworks:** ${report.frameworks.join(', ')}  `);
  lines.push(`**Result:** ${report.passed ? '✅ PASS' : '❌ FAIL'}  `);
  lines.push('');
  lines.push('## Control Summary');
  lines.push('');
  lines.push('| Status | Count |');
  lines.push('|---|---|');
  lines.push(`| ✅ Passed | ${report.controls.passed} |`);
  lines.push(`| ❌ Failed | ${report.controls.failed} |`);
  lines.push(`| ⚠️  Warned | ${report.controls.warned} |`);
  lines.push(`| **Total** | **${report.controls.total}** |`);
  lines.push('');
  lines.push('## Violations');
  lines.push('');

  const failing = report.violations.filter((v) => v.status !== 'PASS');
  if (failing.length === 0) {
    lines.push('No violations. All controls satisfied. ✅');
  } else {
    for (const v of failing) {
      lines.push(`### ${v.status === 'FAIL' ? '❌' : '⚠️'} [${v.control.framework}] ${v.control.controlRef} — ${v.control.title}`);
      lines.push('');
      lines.push(v.control.description);
      if (v.findings.length > 0) {
        lines.push('');
        lines.push(`**Code findings (${v.findings.length}):**`);
        lines.push('');
        lines.push('| Rule | File | Line | Severity |');
        lines.push('|---|---|---|---|');
        for (const f of v.findings) {
          lines.push(`| \`${f.id}\` | \`${f.file}\` | ${f.line} | ${f.severity} |`);
        }
      }
      if (v.depVulns.length > 0) {
        lines.push('');
        lines.push(`**Vulnerable dependencies (${v.depVulns.length}):**`);
        lines.push('');
        lines.push('| Package | Version | Vuln ID | Severity |');
        lines.push('|---|---|---|---|');
        for (const d of v.depVulns) {
          lines.push(`| \`${d.packageName}\` | ${d.installedVersion} | ${d.vulnId} | ${d.severity} |`);
        }
      }
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');
  lines.push(`**Attestation:** ${report.attestation}`);
  return lines.join('\n');
}

export function getAvailableFrameworks(): ComplianceFramework[] {
  return ['SOC2', 'HIPAA', 'GDPR', 'PCI-DSS'];
}

export function getControlsForFramework(framework: ComplianceFramework): ComplianceControl[] {
  return CONTROLS.filter((c) => c.framework === framework);
}
