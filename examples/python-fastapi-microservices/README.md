# Example: Python FastAPI Microservices with PostgreSQL

**Scenario Type:** Backend API Development  
**Framework Stack:** Python + FastAPI + PostgreSQL + Redis + Docker  
**Team Size:** 3 developers (1 senior, 2 mid-level)

---

## Getting Started

This is a **documentation example** showing how Magneto AI would be configured for this stack.

To actually use Magneto with this project:

```bash
# 1. Navigate to your project
cd your-python-project

# 2. Initialize Magneto with the power packs
magneto init --with python fastapi postgresql redis kafka docker aws pytest microservices-saas

# 3. Run analysis
magneto analyze

# 4. Start using magneto commands
magneto query "auth middleware"
```

---

## Project Overview

Multi-tenant SaaS platform with:
- 4 microservices (Auth, Billing, Core API, Notifications)
- Shared PostgreSQL database with schema-per-tenant
- Redis for caching and task queues
- Kafka for event streaming between services

---

## Power Packs Configuration

### `magneto.config.json`

```json
{
  "name": "python-fastapi-microservices",
  "version": "1.0.0",
  "powerPacks": [
    "languages/python",
    "frameworks/fastapi",
    "databases/postgresql",
    "caches/redis",
    "messaging/kafka",
    "containers/docker",
    "clouds/aws",
    "testing/pytest",
    "project-types/microservices-saas"
  ],
  "adapters": ["graphify"],
  "security": {
    "protectedPaths": [
      "**/migrations/**",
      "**/secrets/**",
      "**/*.env*",
      "services/auth/tokens.py",
      "infrastructure/terraform/**"
    ],
    "blockedActions": [
      "delete_database",
      "drop_table",
      "remove_tenant",
      "modify_billing_records"
    ],
    "riskLevels": {
      "low": ["docs/**", "tests/**"],
      "medium": ["services/*/models.py"],
      "high": ["services/auth/**", "infrastructure/**"],
      "critical": ["database/migrations/**"]
    },
    "telepathy": {
      "enabled": true,
      "autoApproveLow": true,
      "requireApprovalFor": ["high", "critical"]
    }
  }
}
```

---

## Role Assignments by Task Type

### 1. Feature: "Add webhook retry logic with exponential backoff"

```yaml
# .magneto/roles/orchestrator.pack.md
orchestrator:
  strategy: "parallel_with_retry"
  subtasks:
    - id: "design-retry-strategy"
      role: "backend"
      scope: ["services/notifications/webhooks.py", "shared/retry/"]
      
    - id: "implement-backoff"
      role: "backend"  
      scope: ["services/notifications/", "shared/utils/"]
      
    - id: "add-monitoring"
      role: "tester"
      scope: ["services/notifications/monitoring/", "tests/integration/webhooks/"]
      
    - id: "load-testing"
      role: "tester"
      scope: ["tests/load/webhooks/", "infrastructure/k6/"]

# Execution order: design → [implement, add-monitoring] → load-testing
```

**Agent Outputs:**
```
.magneto/cache/
├── prompt-backend-design-retry-strategy.md    # Architecture decision
├── prompt-backend-implement-backoff.md       # Implementation
├── prompt-tester-add-monitoring.md           # Metrics & alerts  
├── prompt-tester-load-testing.md             # Performance validation
└── merge-results-webhook-retry.md            # Consolidated report
```

### 2. Bug: "Race condition in tenant isolation during concurrent billing updates"

```yaml
# Security-elevated bug fix
security:
  classification: "data-integrity"
  risk_level: "high"
  approval_required: true
  protected_paths_involved:
    - "services/billing/transactions.py"
    - "database/models/tenant.py"

roles:
  orchestrator:
    - query_graph: "billing tenant isolation"
    - query_graph: "transaction concurrency"
    - security_check: { strict: true }
    
  backend:
    - analyze: "services/billing/"
    - fix: "race condition in tenant isolation"
    - test: "concurrent transaction scenarios"
    
  tester:
    - reproduce: "race condition scenario"
    - verify: "isolation guarantees"
```

**Outputs:**
```
.magneto/cache/
├── security-evaluation-billing-race.json     # Risk assessment
├── prompt-backend-analyze-race-condition.md
├── prompt-backend-fix-tenant-isolation.md
├── prompt-tester-reproduce-race.md
└── merge-results-billing-race-fix.md
```

### 3. E2E: "Complete tenant onboarding flow"

```yaml
roles:
  orchestrator:
    - query_graph: "tenant onboarding"
    - query_graph: "auth signup registration"
    - plan_e2e: [
        "auth-service/signup",
        "core-api/create-tenant", 
        "billing/setup-subscription",
        "notifications/welcome-email"
      ]
      
  requirements:
    - trace: "signup requirements"
    - validate: "acceptance criteria"
    
  backend:
    - implement: "cross-service transaction coordination"
    - scope: ["services/auth/", "services/core-api/", "services/billing/"]
    
  tester:
    - e2e: "tenant onboarding flow"
    - integration: "service-to-service calls"
    - security: "tenant isolation verification"
```

---

## Real-World Commands

```bash
# 1. Initialize with power packs
magneto init --with python fastapi postgresql redis kafka docker aws pytest microservices-saas

# 2. Analyze the entire microservice architecture
magneto analyze --deep

# 3. Query for tenant-related code before planning
magneto query "tenant isolation billing" --budget 800

# 4. Find path from signup to billing
magneto path "signup" "billing" --via "tenant"

# 5. Plan feature with security check
magneto plan tasks/add-webhook-retry.md --strict-security

# 6. Run with role-specific parallel execution
magneto run tasks/add-webhook-retry.md --mode parallel --roles backend,tester

# 7. Merge results from all agents
magneto merge .magneto/cache --format markdown --output report.md
```

---

## Security Guardrails in Action

### Example: Attempting to modify billing records

```python
# Agent suggests this (BLOCKED)
# services/billing/transactions.py

async def adjust_balance(tenant_id: str, amount: Decimal):
    # ❌ SECURITY CHECK BLOCKS THIS
    # "modify_billing_records" is in blockedActions
    pass
```

**Magneto Response:**
```json
{
  "securityRisk": "critical",
  "blocked": true,
  "reason": "Action 'modify_billing_records' is blocked by security policy",
  "approvalRequired": true,
  "escalationPath": "security-team@company.com",
  "suggestedAlternative": "Create adjustment record with audit trail"
}
```

---

## Mix & Match Extensions

### Replace PostgreSQL with MongoDB
```json
{
  "powerPacks": [
    "languages/python",
    "frameworks/fastapi", 
    "databases/mongodb",
    "caches/redis",
    ...
  ]
}
```

### Replace Kafka with RabbitMQ
```json
{
  "powerPacks": [
    ...
    "messaging/rabbitmq",
    ...
  ]
}
```

### Add Frontend (React + Vite)
```json
{
  "powerPacks": [
    ...
    "languages/typescript",
    "frameworks/react",
    "build-tools/vite"
  ]
}
```

### Switch to .NET Core
```json
{
  "powerPacks": [
    "languages/csharp",
    "frameworks/dotnet",
    "databases/postgresql",
    ...
  ]
}
```
