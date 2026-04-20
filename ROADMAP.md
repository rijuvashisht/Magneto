# Magneto AI Roadmap

## Current Status (v0.8.0)

### ✅ Completed

- [x] Core CLI commands: init, plan, run, merge, analyze, query, path
- [x] Telepathy: automatic task discovery and execution
- [x] Adapter system: Claude, Antigravity, Manus, OpenClaw, Graphify
- [x] Adapter management: `magneto adapter` command family
- [x] Task management: `magneto task` command family
- [x] Knowledge graph with community detection
- [x] Multi-agent orchestration with roles
- [x] Security engine with guardrails
- [x] Power packs system (languages, frameworks, clouds)

---

## Phase 1: Developer Experience (Next 2-4 weeks)

### 1.0 AI Security Audit & Vulnerability Detection (Project Glasswing) 🚨 CRITICAL PRIORITY
**Status**: Not Started | **Risk Level**: Enterprise/Production

Inspired by Anthropic's Project Glasswing, implement comprehensive security auditing for AI-generated code across all adapters (Claude, GitHub Copilot, Manus, OpenClaw, NVIDIA NeoClaw, etc.).

```bash
magneto security audit                    # Full security audit
magneto security scan --adapter claude    # Scan specific adapter
magneto security check --plan plan.md     # Validate plan before execution
magneto security report --output json     # Generate security report
magneto security fix --auto               # Auto-fix detected vulnerabilities
```

**Features:**
- Pre-execution security scanning of all AI-generated code
- Vulnerability detection (OWASP Top 10, CVEs, CWEs)
- Supply chain security checks (npm, pip, maven dependencies)
- Secrets/credential leak detection
- Infrastructure-as-Code security (Terraform, CloudFormation, k8s)
- Compliance checking (SOC2, ISO27001, GDPR, HIPAA)
- Risk scoring with severity levels (Critical, High, Medium, Low)
- Automatic guardrail enforcement with blocking policies
- Security report generation with remediation steps
- Integration with security advisories (NVD, Snyk, GitHub Security)
- Adapter-specific security patterns (Claude, Copilot, Manus, etc.)
- Enterprise-grade audit logging for compliance

**Enterprise Guardrails:**
- Mandatory security approval for high-risk operations
- Zero-trust execution model for AI-generated code
- Quarantine suspicious code before execution
- Multi-tier approval workflow for critical changes
- Immutable audit trail for all security decisions
- Integration with SIEM/SOAR platforms

**Files:**
- `src/core/security-audit.ts` - Core security auditing engine
- `src/core/vulnerability-scanner.ts` - Vulnerability detection
- `src/core/compliance-engine.ts` - Compliance checking
- `src/commands/security.ts` - Security CLI commands
- `src/templates/security-rules/` - Security rule definitions
- `src/adapters/security/claude-security.ts` - Claude-specific patterns
- `src/adapters/security/copilot-security.ts` - Copilot-specific patterns
- `src/adapters/security/manus-security.ts` - Manus-specific patterns

**Security Domains:**
1. **Code Security**: Injection, XSS, SSRF, path traversal, crypto weaknesses
2. **Dependency Security**: Known vulnerabilities, license compliance
3. **Infrastructure Security**: Misconfigurations, exposed secrets
4. **Data Security**: PII detection, data handling violations
5. **Access Control**: Authentication, authorization flaws
6. **Cryptography**: Weak algorithms, improper key management

---

### 1.1 Interactive Plan Approval Workflow ⭐ HIGH PRIORITY
**Status**: Not Started

Implement interactive approval steps during plan execution:

```bash
magneto plan task.md --interactive    # Review each step before execution
magneto run task.md --approve-each  # Pause for approval at each stage
```

**Features:**
- Step-by-step preview with diff view
- Approve/reject/skip each step
- Rollback on rejection
- Capture approval decisions in audit log

**Files:** `src/core/approval-workflow.ts`, modify `src/commands/run.ts`

---

### 1.2 Streaming Runner Output ⭐ HIGH PRIORITY
**Status**: Not Started

Real-time streaming of agent output during execution:

```bash
magneto run task.md --stream    # Real-time output
magneto run task.md --watch     # Watch mode with live updates
```

**Features:**
- WebSocket/SSE for live updates
- Progress indicators
- Streaming partial results
- Backpressure handling

**Files:** `src/core/streaming-runner.ts`, `src/mcp/server-streaming.ts`

---

### 1.3 Agent Memory Persistence ⭐ HIGH PRIORITY
**Status**: Not Started

Persist agent memory across sessions:

```bash
magneto run task.md --remember   # Store session state
magneto resume <session-id>      # Resume previous session
```

**Features:**
- Session state storage in `.magneto/sessions/`
- Contextual memory for agents
- Conversation history
- Checkpoint/resume capability

**Files:** `src/core/memory-persistence.ts`, `src/core/session-manager.ts`

---

## Phase 2: Integrations (Next 1-2 months)

### 2.1 Jira Adapter
**Status**: Not Started

```bash
magneto adapter install jira
magneto adapter config jira --host <jira-host> --token <token>
magneto telepathy --source jira   # Import Jira issues as tasks
```

**Features:**
- Sync Jira issues to Magneto tasks
- Push task results back to Jira
- Comment on issues with plan links
- Status synchronization

**Files:** `src/templates/power-packs/adapters/jira/`

---

### 2.2 GitHub Issues Adapter
**Status**: Not Started

```bash
magneto adapter install github
magneto telepathy --source github  # Import GitHub issues as tasks
```

**Features:**
- Import GitHub issues as tasks
- Create PRs from completed tasks
- Link tasks to PRs
- Comment on issues with progress

**Files:** `src/templates/power-packs/adapters/github/`

---

### 2.3 GitHub Actions Integration
**Status**: Not Started

```bash
magneto gh-actions init     # Generate workflow file
magneto gh-actions run      # Trigger workflow with Magneto context
```

**Features:**
- Pre-built GitHub Actions workflow
- Run Magneto in CI/CD
- Post results as PR comments
- Automated code review

**Files:** `.github/workflows/magneto.yml` template

---

## Phase 3: Ecosystem (Next 2-3 months)

### 3.1 VS Code Extension with Agent Panel ⭐ HIGH VISIBILITY
**Status**: Not Started

VS Code extension providing:
- Agent panel with live status
- Task explorer sidebar
- Inline code actions ("Plan this function")
- Graph visualization
- Real-time output streaming

**Files:** `packages/vscode-extension/`

---

### 3.2 Plugin Marketplace
**Status**: Not Started

```bash
magneto marketplace search        # Find plugins
magneto marketplace install <plugin>
magneto publish-plugin            # Publish your own
```

**Features:**
- npm-style registry for plugins
- Power pack sharing
- Adapter sharing
- Version management
- Rating system

**Files:** `src/commands/marketplace.ts`, registry API

---

### 3.3 Custom Power Pack Authoring Guide
**Status**: Not Started

Comprehensive guide for creating custom power packs:

```bash
magneto pack init <name>      # Scaffold new power pack
magneto pack validate          # Validate pack structure
magneto pack publish           # Publish to marketplace
```

**Files:** `docs/POWER-PACK-AUTHORING.md`

---

## Phase 4: Enterprise Features (Future)

### 4.1 Multi-Repo Orchestration
**Status**: Not Started

```bash
magneto workspace init          # Create workspace file
magneto workspace add <repo>    # Add repo to workspace
magneto plan task.md --workspace  # Plan across all repos
```

**Features:**
- Workspace configuration (`.magneto-workspace.json`)
- Cross-repo dependency analysis
- Coordinated changes across repos
- Unified knowledge graph

---

### 4.2 Cost Tracking and Budget Limits
**Status**: Not Started

```bash
magneto config set budget.daily 10.00     # $10/day limit
magneto config set budget.monthly 200.00  # $200/month limit
magneto cost report                        # Show spending breakdown
```

**Features:**
- Token usage tracking per task
- Cost estimation before execution
- Budget alerts and hard stops
- Usage analytics dashboard

**Files:** `src/core/cost-tracker.ts`

---

### 4.3 Audit Logging and Compliance
**Status**: Not Started

```bash
magneto audit log              # Show audit trail
magneto audit export           # Export for compliance
```

**Features:**
- Complete audit trail of all actions
- Who, what, when, why for every change
- Export formats: JSON, CSV, PDF
- Compliance reporting (SOC2, GDPR)

---

## Prioritization

### Must Have (Next Sprint)
1. Interactive plan approval workflow
2. Streaming runner output
3. Agent memory persistence

### Should Have (Next Month)
4. Jira/GitHub adapters
5. VS Code extension MVP
6. GitHub Actions integration

### Nice to Have (Future)
7. Plugin marketplace
8. Multi-repo orchestration
9. Cost tracking
10. Audit logging

---

## Contributing

To pick up a roadmap item:
1. Create a task: `magneto task create feature "Implement X"`
2. Plan it: `magneto plan tasks/implement-x.md`
3. Implement and submit PR

See `CONTRIBUTING.md` for details.
