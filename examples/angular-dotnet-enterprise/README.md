# Example: Angular + .NET Enterprise Application

**Scenario Type:** Full-Stack Enterprise Line-of-Business App  
**Framework Stack:** Angular 17 + .NET 8 + SQL Server + Azure AD + SignalR  
**Team Size:** 8 developers (2 frontend leads, 3 backend, 2 full-stack, 1 QA lead)

---

## Project Overview

Enterprise HR Management System (HRMS) with:
- Angular SPA frontend with lazy-loaded modules
- .NET 8 Web API with Clean Architecture / CQRS
- SQL Server with Entity Framework Core
- Azure AD authentication with role-based access
- SignalR real-time notifications
- Azure DevOps CI/CD with multi-environment deployment

---

## Power Packs Configuration

### `magneto.config.json`

```json
{
  "name": "angular-dotnet-enterprise-hrms",
  "version": "1.0.0",
  "powerPacks": [
    "languages/typescript",
    "frameworks/angular",
    "state-management/ngrx",
    "ui/angular-material",
    "languages/csharp",
    "frameworks/dotnet",
    "architecture/cqrs",
    "architecture/clean-architecture",
    "databases/sql-server",
    "orm/entity-framework",
    "auth/azure-ad",
    "realtime/signalr",
    "clouds/azure",
    "cicd/azure-devops",
    "testing/xunit",
    "testing/jest",
    "testing/playwright",
    "project-types/enterprise-lob"
  ],
  "adapters": ["graphify"],
  "security": {
    "protectedPaths": [
      "**/Migrations/**",
      "**/Infrastructure/Identity/**",
      "**/Domain/Entities/Employee.cs",
      "**/appsettings.Production.json",
      "frontend/src/environments/environment.prod.ts",
      "**/Pipeline/Variables/**"
    ],
    "blockedActions": [
      "modify_salary_directly",
      "bypass_approval_workflow",
      "delete_employee_record",
      "modify_audit_trail",
      "disable_mfa"
    ],
    "riskLevels": {
      "low": ["frontend/src/app/shared/**", "tests/**"],
      "medium": ["frontend/src/app/features/*/components/**"],
      "high": [
        "backend/src/Domain/**",
        "backend/src/Application/Commands/**",
        "frontend/src/app/features/payroll/**"
      ],
      "critical": [
        "backend/src/Infrastructure/Identity/**",
        "**/Migrations/**",
        "**/Pipeline/Production/**"
      ]
    },
    "telepathy": {
      "enabled": true,
      "autoApproveLow": true,
      "autoApproveMedium": true,
      "requireApprovalFor": ["high", "critical"]
    }
  }
}
```

---

## Role Assignments by Scenario

### 1. Feature: "Add real-time payroll approval workflow"

```yaml
orchestrator:
  strategy: "frontend_first_with_api_contract"
  steps:
    - phase: "requirements"
      role: "requirements"
      tasks:
        - trace: "payroll approval requirements"
        - validate: "compliance rules"
      
    - phase: "design_contract"
      parallel:
        - role: "frontend_lead"
          scope: ["frontend/src/app/features/payroll/approval/"]
          tasks:
            - design: "Angular material stepper UI"
            - output: "API contract requirements"
            
        - role: "backend_lead"  
          scope: ["backend/src/Application/Payroll/", "backend/src/Domain/Payroll/"]
          tasks:
            - design: "CQRS command structure"
            - output: "DTO contracts"
      merge: "api-contract-definition.md"
      
    - phase: "implementation"
      parallel:
        - role: "fullstack-dev-1"
          scope: ["frontend/src/app/features/payroll/approval/"]
          tasks:
            - implement: "Angular stepper component"
            - integrate: "SignalR real-time updates"
            
        - role: "fullstack-dev-2"
          scope: [
            "backend/src/Application/Payroll/Commands/",
            "backend/src/Infrastructure/SignalR/"
          ]
          tasks:
            - implement: "SubmitForApprovalCommand"
            - implement: "ApprovalWorkflowHandler"
            - setup: "SignalR hub notifications"
            
    - phase: "integration_security"
      role: "backend_lead"
      security_check: { strict: true }
      tasks:
        - verify: "approval audit trail"
        - validate: "manager delegation rules"
        
    - phase: "testing"
      parallel:
        - role: "qa_lead"
          scope: ["tests/e2e/payroll/", "tests/integration/payroll/"]
          tasks:
            - e2e: "approval workflow with Playwright"
            - integration: "command handler tests"
            
        - role: "frontend_lead"
          scope: ["frontend/src/app/features/payroll/approval/"]
          tasks:
            - unit: "component tests"
            - a11y: "accessibility validation"
```

### 2. Bug: "Race condition in concurrent leave requests"

```yaml
security:
  classification: "data-integrity"
  risk_level: "critical"
  reason: "Concurrent modification of approval state"
  protected_paths_affected:
    - "backend/src/Domain/Leave/LeaveRequest.cs"
    - "backend/src/Application/Leave/Commands/ApproveLeaveCommand.cs"

orchestrator:
  - query_graph: "leave request approval state"
  - query_graph: "concurrent command handling"
  - security_check: { level: "strict", audit: true }
  
  backend_lead:
    - analyze: "CQRS command concurrency"
    - identify: "optimistic locking strategy"
    - fix: "Add RowVersion concurrency token"
    - fix: "Implement idempotency key"
    - test: "Concurrent approval scenario"
    
  qa_lead:
    - reproduce: "race condition with parallel requests"
    - verify: "single approval guarantee"
    - regression: "other approval workflows"
```

---

## Security & Compliance

### GDPR Right to Erasure

```csharp
// Agent attempts to implement deletion:
public async Task DeleteEmployee(int id)
{
    // ❌ BLOCKED by Magneto security
    // "delete_employee_record" is blocked action
    
    // ✅ APPROVED alternative generated:
    await _employeeRepo.SoftDeleteAsync(id);
    await _gdprService.AnonymizePersonalData(id);
    await _auditService.LogGdprDeletion(id, UserContext.Current);
}
```

### Azure DevOps Production Deployment

```yaml
# Pipeline definition
- stage: Production
  jobs:
  - deployment: DeployProd
    environment: 'HRMS-Production'
    steps:
    - script: |
        magneto security-check \
          --environment production \
          --migration pending \
          --risk-threshold high
```

---

## Graph Query Patterns

### Find all Angular components affected by API change

```bash
magneto query "EmployeeDto" --budget 600
# → Shows all frontend components consuming the DTO
```

### Trace feature across all layers

```bash
magneto path "EmployeeController" "EmployeeEntity" --via "CQRS"
# → Shows: Controller → Query → Repository → Entity
```

---

## Mix & Match Variations

### Replace Angular with React + Vite
```json
{
  "powerPacks": [
    ...
    "frameworks/react",
    "build-tools/vite",
    "state-management/redux",
    "ui/mui",
    ...
  ]
}
```

### Replace .NET with Node.js/NestJS
```json
{
  "powerPacks": [
    ...
    "languages/typescript",
    "frameworks/nestjs",
    "orm/prisma",
    ...
  ]
}
```

### On-Premises Deployment
```json
{
  "powerPacks": [
    ...
    "clouds/on-prem",
    "infrastructure/kubernetes",
    "auth/keycloak"
  ]
}
```
