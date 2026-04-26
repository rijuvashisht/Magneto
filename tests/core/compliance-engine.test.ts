import { evaluateCompliance, getAvailableFrameworks, getControlsForFramework, renderComplianceText, renderComplianceMarkdown } from '../../src/core/compliance-engine';
import { VulnerabilityFinding } from '../../src/core/vulnerability-scanner';
import { DependencyVuln } from '../../src/core/dependency-scanner';

const mockSecret: VulnerabilityFinding = {
  id: 'sec-hardcoded-generic-secret',
  severity: 'error',
  title: 'Hardcoded Secret',
  description: 'test',
  file: 'config.ts',
  line: 5,
  column: 1,
  snippet: 'const API_KEY = "abc123"',
  category: 'secrets',
  cwe: 'CWE-798',
};

const mockInjection: VulnerabilityFinding = {
  id: 'sec-sql-concat-ts',
  severity: 'error',
  title: 'SQL Injection',
  description: 'test',
  file: 'db.ts',
  line: 10,
  column: 1,
  snippet: 'db.query(`SELECT * FROM users WHERE id = ${id}`)',
  category: 'injection',
};

const mockDepVuln: DependencyVuln = {
  packageName: 'lodash',
  installedVersion: '4.17.15',
  ecosystem: 'npm',
  vulnId: 'GHSA-xxxx-yyyy-zzzz',
  severity: 'HIGH',
  summary: 'Prototype pollution',
  aliases: ['CVE-2020-28500'],
  fixedIn: ['4.17.21'],
  referenceUrl: 'https://osv.dev/vulnerability/GHSA-xxxx-yyyy-zzzz',
};

describe('compliance-engine', () => {
  it('lists available frameworks', () => {
    const fw = getAvailableFrameworks();
    expect(fw).toContain('SOC2');
    expect(fw).toContain('HIPAA');
    expect(fw).toContain('GDPR');
    expect(fw).toContain('PCI-DSS');
  });

  it('returns controls for each framework', () => {
    for (const fw of getAvailableFrameworks()) {
      const controls = getControlsForFramework(fw);
      expect(controls.length).toBeGreaterThan(0);
    }
  });

  it('passes when no findings', () => {
    const report = evaluateCompliance(['SOC2'], [], []);
    expect(report.passed).toBe(true);
    expect(report.controls.failed).toBe(0);
  });

  it('fails SOC2 on hardcoded secret', () => {
    const report = evaluateCompliance(['SOC2'], [mockSecret], []);
    expect(report.passed).toBe(false);
    const cc61 = report.violations.find((v) => v.control.id === 'soc2-cc6.1');
    expect(cc61?.status).toBe('FAIL');
    expect(cc61?.findings.length).toBeGreaterThan(0);
  });

  it('fails SOC2 on SQL injection', () => {
    const report = evaluateCompliance(['SOC2'], [mockInjection], []);
    const cc66 = report.violations.find((v) => v.control.id === 'soc2-cc6.6');
    expect(cc66?.status).toBe('FAIL');
  });

  it('fails HIPAA on hardcoded secret', () => {
    const report = evaluateCompliance(['HIPAA'], [mockSecret], []);
    expect(report.passed).toBe(false);
    const ctrl = report.violations.find((v) => v.control.id === 'hipaa-164.312a');
    expect(ctrl?.status).toBe('FAIL');
  });

  it('fails GDPR on injection finding', () => {
    const report = evaluateCompliance(['GDPR'], [mockInjection], []);
    const art32 = report.violations.find((v) => v.control.id === 'gdpr-art32');
    expect(art32?.status).toBe('FAIL');
  });

  it('fails PCI-DSS on injection finding', () => {
    const report = evaluateCompliance(['PCI-DSS'], [mockInjection], []);
    const req63 = report.violations.find((v) => v.control.id === 'pci-req6.3');
    expect(req63?.status).toBe('FAIL');
  });

  it('reflects dep vulns in violation count', () => {
    const report = evaluateCompliance(['SOC2'], [], [mockDepVuln]);
    const cc92 = report.violations.find((v) => v.control.id === 'soc2-cc9.2');
    expect(cc92?.depVulns.length).toBeGreaterThan(0);
    expect(cc92?.status).toBe('FAIL');
  });

  it('evaluates multiple frameworks together', () => {
    const report = evaluateCompliance(['SOC2', 'HIPAA', 'GDPR'], [mockSecret, mockInjection], []);
    expect(report.frameworks).toHaveLength(3);
    expect(report.controls.total).toBeGreaterThan(6);
    expect(report.passed).toBe(false);
  });

  it('renders text output without throwing', () => {
    const report = evaluateCompliance(['SOC2'], [mockSecret], []);
    const text = renderComplianceText(report);
    expect(text).toContain('SOC2');
    expect(text).toContain('CC6.1');
  });

  it('renders markdown output without throwing', () => {
    const report = evaluateCompliance(['GDPR'], [mockSecret], []);
    const md = renderComplianceMarkdown(report);
    expect(md).toContain('# Magneto Compliance Report');
    expect(md).toContain('GDPR');
  });

  it('produces attestation string', () => {
    const pass = evaluateCompliance(['SOC2'], [], []);
    expect(pass.attestation).toMatch(/PASS/);

    const fail = evaluateCompliance(['SOC2'], [mockSecret], []);
    expect(fail.attestation).toMatch(/FAIL/);
  });
});
