---
name: interactive-plan-approval-workflow
description: Implement interactive approval steps during plan execution with step-by-step review, diff view, and rollback on rejection
type: feature
priority: high
telepathyLevel: 2
roles:
  - orchestrator
  - backend
  - tester
security:
  maxTelepathyLevel: 2
  requireApproval: true
---

# Interactive Plan Approval Workflow

## Objective

Implement interactive approval steps during plan execution that allow users to review each step before execution, with the ability to approve, reject, or skip steps. Include diff view for changes and rollback capability on rejection.

## Background

Currently, the `magneto run` command executes all steps in a plan automatically. For high-risk operations or sensitive environments, users need the ability to review and approve each step before it executes.

## Requirements

### 1. CLI Options

Add new options to existing commands:

```bash
magneto plan task.md --interactive          # Review plan steps interactively
magneto run task.md --interactive           # Execute with interactive approval
magneto run task.md --approve-each          # Pause for approval at each stage
magneto run task.md --diff                  # Show diff before each step
magneto run task.md --rollback-on-fail      # Auto-rollback on step failure
```

### 2. Interactive Flow

```typescript
interface InteractiveSession {
  plan: ExecutionPlan;
  currentStep: number;
  decisions: StepDecision[];
  startTime: string;
  auditLog: AuditEntry[];
}

interface StepDecision {
  stepIndex: number;
  action: 'approve' | 'reject' | 'skip' | 'modify';
  reason?: string;
  timestamp: string;
  user: string;
  diffViewed: boolean;
}

class InteractiveWorkflow {
  async startInteractiveSession(
    plan: ExecutionPlan, 
    options: InteractiveOptions
  ): Promise<InteractiveSession>;
  
  async promptForStepApproval(
    step: PlanStep,
    context: StepContext
  ): Promise<StepDecision>;
  
  async showDiff(
    before: string,
    after: string
  ): Promise<void>;
  
  async rollbackToStep(
    session: InteractiveSession,
    stepIndex: number
  ): Promise<void>;
  
  async captureAuditLog(
    session: InteractiveSession
  ): Promise<void>;
}
```

### 3. Interactive UI

```
Step 3/5: Update database schema
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Action: Modify src/models/user.ts
Impact: Database migration required
Risk Level: HIGH

Changes:
  + Added column: email_verified (boolean)
  + Added index: idx_email_verified
  ~ Modified: users table schema

[View Diff] [Approve] [Reject] [Skip] [Modify]

> Approve
✓ Step 3 approved - executing...
✓ Step 3 completed successfully

Proceeding to Step 4/5...
```

### 4. Files to Modify

**Core Implementation:**
- `src/core/interactive-workflow.ts` - New file for interactive workflow engine
- `src/commands/run.ts` - Add --interactive, --approve-each, --diff, --rollback-on-fail options
- `src/commands/plan.ts` - Add --interactive option for plan review

**UI/Display:**
- `src/utils/interactive-ui.ts` - Interactive prompts and display utilities
- `src/utils/diff-renderer.ts` - Diff visualization

**Audit & Logging:**
- `src/core/audit-log.ts` - Capture all decisions for compliance

### 5. Configuration

Add to `magneto.config.json`:

```json
{
  "interactive": {
    "enabled": true,
    "defaultMode": "approve-each",
    "autoApproveLowRisk": false,
    "requireDiffView": true,
    "auditLogPath": ".magneto/audit/interactive-sessions.json",
    "rollback": {
      "enabled": true,
      "maxRollbackSteps": 5
    }
  }
}
```

### 6. Safety Features

- **Timeout**: Auto-reject after 5 minutes of inactivity
- **Checkpoint**: Save state before each step for rollback
- **Backup**: Create `.magneto/backup/` before destructive operations
- **Confirmation**: Double-confirmation for critical steps (deletions, schema changes)
- **Audit Trail**: Immutable log of all decisions with timestamps

## Implementation Phases

### Phase 1: Core Engine (Week 1)
- [ ] Create `src/core/interactive-workflow.ts`
- [ ] Implement `InteractiveWorkflow` class
- [ ] Add step-by-step prompt logic
- [ ] Add diff generation and display

### Phase 2: CLI Integration (Week 1)
- [ ] Update `src/commands/run.ts` with new flags
- [ ] Update `src/commands/plan.ts` with --interactive
- [ ] Add configuration handling

### Phase 3: UI/UX (Week 2)
- [ ] Create `src/utils/interactive-ui.ts`
- [ ] Implement rich terminal UI with progress bars
- [ ] Add diff syntax highlighting
- [ ] Add keyboard shortcuts (y/n/s/m for approve/reject/skip/modify)

### Phase 4: Rollback & Audit (Week 2)
- [ ] Implement checkpoint/restore system
- [ ] Create audit logging
- [ ] Add rollback functionality

### Phase 5: Testing & Documentation (Week 3)
- [ ] Unit tests for interactive workflow
- [ ] Integration tests
- [ ] Documentation

## Acceptance Criteria

- [ ] `magneto run task.md --interactive` pauses at each step
- [ ] User can approve, reject, skip, or modify each step
- [ ] Diff view shows before/after for file changes
- [ ] Rollback works correctly when a step is rejected
- [ ] Audit log captures all decisions with timestamps
- [ ] Timeout auto-rejects after inactivity
- [ ] Works with all existing `magneto run` functionality
- [ ] Configuration in `magneto.config.json` works
- [ ] Documentation complete with examples

## Testing Scenarios

1. **Basic Approval Flow**
   ```bash
   magneto run task.md --interactive
   # User approves each step sequentially
   ```

2. **Reject and Rollback**
   ```bash
   magneto run task.md --interactive
   # Step 1: Approve
   # Step 2: Reject → auto-rollback step 1
   ```

3. **Skip Step**
   ```bash
   magneto run task.md --interactive
   # Step 1: Skip
   # Step 2: Approve
   ```

4. **Timeout**
   ```bash
   magneto run task.md --interactive
   # Don't respond for 5 minutes → auto-reject
   ```

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| User confusion in interactive mode | Clear UI with instructions, help text |
| Accidental approvals | Double-confirmation for high-risk steps |
| Long-running sessions | Timeout, session persistence |
| Terminal compatibility | Fallback to simple prompts |

## Documentation Requirements

- [ ] `docs/INTERACTIVE-WORKFLOW.md` - User guide
- [ ] `docs/INTERACTIVE-CONFIG.md` - Configuration reference
- [ ] Inline help for all interactive options
- [ ] Example workflows in `examples/`

---

**Estimated Effort**: 3 weeks
**Breaking Changes**: None (additive feature)
**Dependencies**: None
**Security Review**: Not required (no security impact)

