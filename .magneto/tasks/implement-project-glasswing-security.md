---
name: implement-project-glasswing-security
description: Implement comprehensive AI security auditing system inspired by Anthropic's Project Glasswing for all adapters (Claude, Copilot, Manus, OpenClaw, NeoClaw)
type: security
telepathyLevel: 2
priority: critical
riskLevel: enterprise
roles:
  - orchestrator
  - backend
  - security
  - tester
security:
  maxTelepathyLevel: 2
  requireApproval: true
  protectedPaths:
    - "src/core/security-audit.ts"
    - "src/core/vulnerability-scanner.ts"
    - "src/commands/security.ts"
---

# Implement Project Glasswing Security System (v1.0)

## 🚨 Critical Priority Notice

This is an **ENTERPRISE-GRADE SECURITY FEATURE** implementing pre-execution security scanning for AI-generated code. All changes require security review and must pass rigorous testing.

## Objective

Build a comprehensive security auditing system for Magneto AI that:
1. Scans AI-generated code BEFORE execution (zero-trust model)
2. Detects vulnerabilities across all adapters (Claude, Copilot, Manus, OpenClaw, NeoClaw)
3. Enforces enterprise guardrails with blocking policies
4. Generates compliance reports (SOC2, ISO27001, GDPR, HIPAA)
5. Provides automated remediation suggestions

## Background

Inspired by [Anthropic's Project Glasswing](https://www.anthropic.com/glasswing), which provides security auditing for AI systems that represent shared cyberattack surfaces. This feature extends that concept to ALL AI coding assistants integrated with Magneto.

## Requirements

### 1. Core Security Audit Engine

**File**: `src/core/security-audit.ts`

```typescript
export interface SecurityAuditConfig {
  adapters: string[];                    // ['claude', 'copilot', 'manus', ...]
  scanLevel: 'basic' | 'standard' | 'comprehensive';
  complianceFrameworks: string[];        // ['soc2', 'iso27001', 'gdpr', 'hipaa']
  autoBlock: boolean;                    // Block execution on critical findings
  autoFix: boolean;                      // Auto-fix low-risk issues
  customRules: SecurityRule[];          // Enterprise custom rules
}

export interface SecurityFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 
    | 'injection' 
    | 'xss' 
    | 'ssrf' 
    | 'path-traversal'
    | 'crypto'
    | 'auth'
    | 'secrets'
    | 'dependencies'
    | 'iac'
    | 'compliance';
  adapter: string;                       // Source adapter
  file: string;
  line: number;
  column: number;
  ruleId: string;
  description: string;
  remediation: string;
  cwe?: string;                         // CWE ID
  cve?: string;                         // CVE ID if applicable
  references: string[];
}

export interface SecurityReport {
  timestamp: string;
  adapter: string;
  findings: SecurityFinding[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  compliance: {
    framework: string;
    violations: SecurityFinding[];
    status: 'pass' | 'fail';
  }[];
  riskScore: number;                     // 0-100
  blocked: boolean;
}

export class SecurityAuditEngine {
  constructor(config: SecurityAuditConfig);
  
  // Audit code before execution
  async audit(code: string, context: AuditContext): Promise<SecurityReport>;
  
  // Audit entire plan
  async auditPlan(plan: ExecutionPlan): Promise<PlanSecurityReport>;
  
  // Audit specific adapter output
  async auditAdapterOutput(
    adapter: string, 
    output: string, 
    context: AuditContext
  ): Promise<SecurityReport>;
}
```

### 2. Vulnerability Scanner

**File**: `src/core/vulnerability-scanner.ts`

```typescript
export class VulnerabilityScanner {
  // OWASP Top 10 detection
  async detectInjection(code: string): Promise<SecurityFinding[]>;
  async detectXSS(code: string): Promise<SecurityFinding[]>;
  async detectSSRF(code: string): Promise<SecurityFinding[]>;
  async detectPathTraversal(code: string): Promise<SecurityFinding[]>;
  
  // Secrets detection
  async detectSecrets(code: string): Promise<SecurityFinding[]>;
  
  // Dependency scanning
  async scanDependencies(
    dependencies: string[], 
    ecosystem: 'npm' | 'pip' | 'maven' | 'nuget' | 'go'
  ): Promise<SecurityFinding[]>;
  
  // Infrastructure as Code scanning
  async scanIaC(
    code: string, 
    type: 'terraform' | 'cloudformation' | 'kubernetes' | 'docker'
  ): Promise<SecurityFinding[]>;
}
```

### 3. Security CLI Commands

**File**: `src/commands/security.ts`

```bash
magneto security audit [path]                    # Full security audit
magneto security scan --adapter <name> [path]  # Scan specific adapter
magneto security check --plan <plan.md>          # Validate plan before execution
magneto security report [path]                  # Generate security report
magneto security fix --auto [path]             # Auto-fix vulnerabilities
magneto security config                        # Configure security settings
magneto security whitelist --rule <id>        # Whitelist specific rule
magneto security compliance --framework soc2   # Compliance check
```

### 4. Adapter-Specific Security Patterns

**Files**:
- `src/adapters/security/claude-security.ts`
- `src/adapters/security/copilot-security.ts`
- `src/adapters/security/manus-security.ts`
- `src/adapters/security/openclaw-security.ts`
- `src/adapters/security/neoclaw-security.ts`

```typescript
export interface AdapterSecurityProfile {
  adapter: string;
  commonVulnerabilities: string[];       // Known patterns for this adapter
  safePatterns: string[];              // Patterns that indicate safe code
  riskyPatterns: string[];               // Patterns that indicate risk
  recommendedTools: string[];              // Tools for this adapter
}

export const ClaudeSecurityProfile: AdapterSecurityProfile = {
  adapter: 'claude',
  commonVulnerabilities: [
    'claude-injection-v1',               // Known Claude-specific injection
    'claude-auth-bypass-v2',
  ],
  safePatterns: [
    '/rate-limit/i',
    '/sanitize/i',
  ],
  riskyPatterns: [
    '/eval\s*\(/',
    '/innerHTML\s*=/',
  ],
  recommendedTools: ['semgrep', 'bandit', 'eslint-security'],
};
```

### 5. Security Rules Templates

**Directory**: `src/templates/security-rules/`

```yaml
# src/templates/security-rules/owasp-top10.yml
rules:
  - id: owasp-injection-001
    name: SQL Injection
    severity: critical
    category: injection
    pattern: 
      - /SELECT.*FROM.*WHERE.*\$\{/
      - /INSERT.*INTO.*VALUES.*\$\{/
    remediation: "Use parameterized queries or ORM"
    cwe: "CWE-89"
    
  - id: owasp-xss-001
    name: Cross-Site Scripting (XSS)
    severity: high
    category: xss
    pattern:
      - /innerHTML\s*=.*\$/
      - /document\.write\s*\(.*\$/
    remediation: "Use textContent or sanitize input with DOMPurify"
    cwe: "CWE-79"
    
  - id: secrets-001
    name: Hardcoded Secret
    severity: critical
    category: secrets
    pattern:
      - /password\s*=\s*["'][^"']+["']/i
      - /api[_-]?key\s*=\s*["'][^"']+["']/i
      - /secret\s*=\s*["'][^"']+["']/i
      - /aws_access_key_id\s*=\s*["'][^"']+["']/i
    remediation: "Use environment variables or secret management system"
```

### 6. Compliance Engine

**File**: `src/core/compliance-engine.ts`

```typescript
export interface ComplianceFramework {
  name: string;
  version: string;
  rules: ComplianceRule[];
}

export interface ComplianceRule {
  id: string;
  description: string;
  category: string;
  severity: 'critical' | 'high' | 'medium';
  check: (context: AuditContext) => Promise<boolean>;
  violationMessage: string;
}

export class ComplianceEngine {
  async checkSOC2(context: AuditContext): Promise<ComplianceResult>;
  async checkISO27001(context: AuditContext): Promise<ComplianceResult>;
  async checkGDPR(context: AuditContext): Promise<ComplianceResult>;
  async checkHIPAA(context: AuditContext): Promise<ComplianceResult>;
  async checkPCI(context: AuditContext): Promise<ComplianceResult>;
  
  async generateComplianceReport(
    framework: string, 
    findings: SecurityFinding[]
  ): Promise<ComplianceReport>;
}
```

### 7. Enterprise Guardrails

**File**: `src/core/enterprise-guardrails.ts`

```typescript
export interface GuardrailPolicy {
  name: string;
  description: string;
  conditions: GuardrailCondition[];
  action: 'block' | 'warn' | 'require-approval' | 'quarantine';
  notificationChannels: string[];         // Email, Slack, SIEM
}

export interface GuardrailCondition {
  type: 
    | 'risk-score' 
    | 'severity-count' 
    | 'compliance-failure'
    | 'secrets-detected'
    | 'adapter-specific';
  operator: '>' | '>=' | '==' | '<' | '<=';
  value: number | string | boolean;
}

export class EnterpriseGuardrails {
  constructor(policies: GuardrailPolicy[]);
  
  async evaluate(report: SecurityReport): Promise<GuardrailDecision>;
  
  async enforce(report: SecurityReport): Promise<void>;
  
  async notify(report: SecurityReport, decision: GuardrailDecision): Promise<void>;
  
  async logDecision(
    report: SecurityReport, 
    decision: GuardrailDecision
  ): Promise<void>;                       // Immutable audit trail
}

// Pre-defined enterprise policies
export const DefaultEnterprisePolicies: GuardrailPolicy[] = [
  {
    name: 'critical-vulnerability-block',
    description: 'Block execution if critical vulnerabilities found',
    conditions: [{ type: 'severity-count', operator: '>', value: 0, severity: 'critical' }],
    action: 'block',
    notificationChannels: ['security-team', 'audit-log'],
  },
  {
    name: 'secrets-detection-block',
    description: 'Block if secrets/credentials detected',
    conditions: [{ type: 'secrets-detected', operator: '==', value: true }],
    action: 'block',
    notificationChannels: ['security-team', 'audit-log'],
  },
  {
    name: 'compliance-failure-block',
    description: 'Block on SOC2/ISO27001 compliance failures',
    conditions: [{ type: 'compliance-failure', operator: '==', value: true }],
    action: 'block',
    notificationChannels: ['compliance-team', 'audit-log'],
  },
  {
    name: 'high-risk-approval-required',
    description: 'Require approval for high-risk operations',
    conditions: [{ type: 'risk-score', operator: '>=', value: 70 }],
    action: 'require-approval',
    notificationChannels: ['security-team', 'manager'],
  },
];
```

### 8. Integration Points

**Modify existing files**:
- `src/commands/run.ts` - Add pre-execution security check
- `src/commands/plan.ts` - Add plan validation
- `src/core/security-engine.ts` - Extend with new capabilities
- `src/cli.ts` - Register security commands

```typescript
// In src/commands/run.ts
export async function runCommand(taskFile: string, options: RunOptions): Promise<void> {
  // ... existing code ...
  
  // NEW: Pre-execution security audit
  if (!options.skipSecurityCheck) {
    const securityEngine = new SecurityAuditEngine(config.security);
    const auditReport = await securityEngine.auditPlan(plan);
    
    if (auditReport.blocked) {
      logger.error('❌ Security audit failed. Execution blocked.');
      logger.info(`Critical findings: ${auditReport.summary.critical}`);
      logger.info(`Run "magneto security report" for details`);
      process.exit(1);
    }
    
    if (auditReport.summary.high > 0) {
      logger.warn(`⚠️  ${auditReport.summary.high} high-severity findings detected`);
      if (!options.force) {
        const approved = await promptSecurityApproval(auditReport);
        if (!approved) {
          logger.info('Execution cancelled by user');
          process.exit(0);
        }
      }
    }
  }
  
  // Continue with execution...
}
```

## Security Testing Requirements

### Test Coverage
- [ ] 100% coverage for security-audit.ts
- [ ] 100% coverage for vulnerability-scanner.ts
- [ ] Integration tests for each adapter security profile
- [ ] Fuzzing tests for pattern matching
- [ ] Performance tests (scan 10k+ lines in <1s)

### Security Test Cases
```typescript
// Test: SQL Injection Detection
test('detects SQL injection in generated code', async () => {
  const code = `const query = "SELECT * FROM users WHERE id = ${userId}"`;
  const findings = await scanner.detectInjection(code);
  expect(findings).toHaveLength(1);
  expect(findings[0].severity).toBe('critical');
});

// Test: Secrets Detection
test('detects hardcoded API keys', async () => {
  const code = `const apiKey = "sk-1234567890abcdef"`;
  const findings = await scanner.detectSecrets(code);
  expect(findings).toHaveLength(1);
  expect(findings[0].category).toBe('secrets');
});

// Test: Enterprise Guardrails
test('blocks execution on critical findings', async () => {
  const report = createMockReport({ critical: 1 });
  const decision = await guardrails.evaluate(report);
  expect(decision.action).toBe('block');
});
```

## Implementation Phases

### Phase 1: Core Engine (Week 1)
- [ ] Implement `security-audit.ts` with basic scanning
- [ ] Implement `vulnerability-scanner.ts` with OWASP rules
- [ ] Create security rule templates
- [ ] Add unit tests

### Phase 2: CLI & Integration (Week 1-2)
- [ ] Implement `security.ts` command
- [ ] Integrate with `run.ts` and `plan.ts`
- [ ] Add adapter security profiles
- [ ] Add integration tests

### Phase 3: Enterprise Features (Week 2)
- [ ] Implement compliance engine
- [ ] Implement enterprise guardrails
- [ ] Add SIEM integration
- [ ] Add audit logging
- [ ] Add auto-remediation

### Phase 4: Testing & Hardening (Week 3)
- [ ] Security penetration testing
- [ ] Performance optimization
- [ ] Documentation
- [ ] Enterprise customer validation

## Success Criteria

- [ ] Detects 95%+ of OWASP Top 10 vulnerabilities in AI-generated code
- [ ] Sub-second scanning for typical code files (<1000 lines)
- [ ] Zero false negatives for critical vulnerabilities (secrets, injection)
- [ ] Enterprise policies block/quarantine as configured
- [ ] Compliance reports generated for SOC2/ISO27001/GDPR
- [ ] All tests pass with 100% security-critical coverage
- [ ] Security review completed by security team
- [ ] Documentation complete for enterprise customers

## Acceptance Criteria

1. **Security Effectiveness**
   - SQL injection detected in 100% of test cases
   - XSS detected in 100% of test cases
   - Hardcoded secrets detected in 100% of test cases
   - Known CVEs in dependencies detected

2. **Performance**
   - Scanning completes in <1s for 1000-line files
   - Memory usage <100MB for large scans
   - Non-blocking for safe code

3. **Enterprise Features**
   - Policies configurable via magneto.config.json
   - Audit trail immutable and exportable
   - SIEM integration working (Splunk, Datadog, etc.)
   - Compliance reports accepted by auditors

4. **Usability**
   - Clear error messages with remediation steps
   - IDE integration showing security issues inline
   - Documentation with examples

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| False positives blocking legitimate code | Configurable thresholds, whitelist capability |
| Performance impact on execution | Async scanning, caching, parallel processing |
| New vulnerability types not detected | Weekly rule updates, ML-based detection |
| Adapter-specific exploits missed | Continuous monitoring of adapter security advisories |
| Compliance framework changes | Modular compliance engine, rule versioning |

## Documentation Requirements

- [ ] `docs/SECURITY-AUDIT.md` - User guide
- [ ] `docs/SECURITY-CONFIG.md` - Configuration reference
- [ ] `docs/ENTERPRISE-SECURITY.md` - Enterprise deployment guide
- [ ] `docs/COMPLIANCE.md` - Compliance framework details
- [ ] Inline help for all security commands
- [ ] Security rules reference

## Breaking Changes

This feature may introduce:
- New required fields in `magneto.config.json` for security configuration
- New CLI commands that may conflict with user aliases
- Changes to default behavior (security checks enabled by default)

**Migration**: Configuration will auto-migrate on first run. Add `security: { enabled: false }` to disable if needed.

---

**Estimated Effort**: 3 weeks
**Security Review Required**: Yes
**Enterprise Customer Validation**: Required before v1.0 release
**Breaking Changes**: Minimal (auto-migration provided)
