# Interactive Workflow

Magneto's Interactive Workflow allows you to review and approve each step of a task execution before it runs, providing granular control over AI-assisted development.

## Overview

The interactive mode pauses execution at each step, allowing you to:
- **Approve** - Execute the step
- **Reject** - Stop execution (with optional rollback)
- **Skip** - Skip this step and continue
- **Modify** - Change the command before executing
- **View Diff** - See what changes will be made

## Usage

### Basic Interactive Mode

```bash
magneto run task.md --interactive
```

This starts an interactive session where you'll be prompted for each step.

### Approve Each Step

```bash
magneto run task.md --approve-each
```

Same as `--interactive`, pauses at each stage for approval.

### With Diff View

```bash
magneto run task.md --approve-each --diff
```

Shows a diff of changes before each step (if applicable).

### Auto-Approve Low Risk

```bash
magneto run task.md --interactive --auto-approve-low-risk
```

Automatically approves steps marked as "low" risk without prompting.

### Rollback on Failure

```bash
magneto run task.md --interactive --rollback-on-fail
```

Automatically rolls back changes if a step is rejected.

## Interactive Commands

During an interactive session, you can use these commands at each step:

| Command | Shortcut | Description |
|---------|----------|-------------|
| `approve` | `a`, `y` | Approve and execute the step |
| `reject` | `r`, `n` | Reject this step |
| `skip` | `s` | Skip this step and continue |
| `modify` | `m` | Modify the command before executing |
| `help` | `h` | Show help |

## Step Information Display

Each step shows:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 3/5: Update database schema
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Description: Add email_verified column to users table
🎯 Files: src/models/user.ts, migrations/001_add_email_verified.sql
⚡ Risk Level: 🔴 CRITICAL

💻 Command: npm run migrate

[View Diff] [Approve] [Reject] [Skip] [Modify]

> 
```

Risk levels:
- 🟢 **Low** - Safe operation (can be auto-approved)
- 🟡 **Medium** - Standard change
- 🟠 **High** - Significant change
- 🔴 **Critical** - Destructive operation (requires double confirmation)

## Configuration

Add to your `magneto.config.json`:

```json
{
  "interactive": {
    "enabled": true,
    "defaultMode": "approve-each",
    "autoApproveLowRisk": false,
    "requireDiffView": true,
    "timeout": 5,
    "rollback": {
      "enabled": true,
      "maxRollbackSteps": 5
    }
  }
}
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `enabled` | Enable interactive mode globally | `true` |
| `defaultMode` | Default interaction mode | `"approve-each"` |
| `autoApproveLowRisk` | Auto-approve low-risk steps | `false` |
| `requireDiffView` | Require viewing diff before approval | `true` |
| `timeout` | Minutes before auto-reject | `5` |
| `rollback.enabled` | Enable rollback capability | `true` |
| `rollback.maxRollbackSteps` | Maximum steps to rollback | `5` |

## Safety Features

### Checkpoints

Before each step that modifies files, Magneto creates a checkpoint (backup). This allows rollback if needed.

Backups are stored in `.magneto/backup/step-{N}/`

### Double Confirmation

Critical steps (risk level: critical) require double confirmation:

```
⚠️  This is a CRITICAL step. Are you absolutely sure? [y/N]:
```

### Timeout

If you don't respond within the timeout period (default: 5 minutes), the step is automatically rejected.

### Audit Logging

All decisions are logged for compliance:

```json
{
  "timestamp": "2024-04-19T12:00:00Z",
  "event": "step_approved",
  "stepIndex": 2,
  "user": "developer",
  "action": "approve"
}
```

Logs are stored in `.magneto/audit/interactive-sessions.json`

## Rollback

When you reject a step, you're asked if you want to rollback previous changes:

```
🔄 Rolling back to step 2...
  Restored: src/models/user.ts
  Restored: migrations/001_add_email_verified.sql
✓ Rollback to step 2 completed
```

## Examples

### Example 1: Basic Interactive Session

```bash
$ magneto run tasks/add-feature.md --interactive

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎮 INTERACTIVE MODE ACTIVATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Task: add-feature.md
Total Steps: 5
Options:
  Auto-approve low risk: false
  Timeout: 5 minutes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 1/5: Analyze codebase
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Description: Search for relevant code patterns
🎯 Files: None
⚡ Risk Level: 🟢 LOW

💻 Command: magneto analyze --search "auth"

[Approve/Reject/Skip/Modify] (or h for help): 
> a
✓ Step 1 approved - executing...
✓ Step 1 completed successfully

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 2/5: Implement feature
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Description: Add authentication middleware
🎯 Files: src/middleware/auth.ts
⚡ Risk Level: 🟡 MEDIUM

View diff? [y/N]: y

📊 Diff View:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  + export function authMiddleware(req, res, next) {
  +   const token = req.headers.authorization;
  +   if (!token) {
  +     return res.status(401).json({ error: 'Unauthorized' });
  +   }
  +   // ...
  + }
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Approve/Reject/Skip/Modify] (or h for help): 
> a
✓ Step 2 approved - executing...
✓ Step 2 completed successfully

...

🎉 All steps completed!
```

### Example 2: Reject and Rollback

```bash
$ magneto run tasks/update-schema.md --interactive

Step 1/3: Backup database
✓ Step 1 approved - executing...

Step 2/3: Drop users table
⚡ Risk Level: 🔴 CRITICAL
⚠️  This is a CRITICAL step. Are you absolutely sure? [y/N]: n

✗ Step 2 rejected

Rollback changes from steps 1? [y/N]: y

🔄 Rolling back to step 0...
✓ Rollback completed

❌ Interactive session ended with rejections
```

### Example 3: Auto-Approve Low Risk

```bash
$ magneto run tasks/refactor.md --interactive --auto-approve-low-risk

Step 1/4: Analyze codebase (low risk)
✓ Auto-approved - executing...
✓ Step 1 completed

Step 2/4: Rename variables (low risk)
✓ Auto-approved - executing...
✓ Step 2 completed

Step 3/4: Update database schema (high risk)
⚡ Risk Level: 🟠 HIGH
[Approve/Reject/Skip/Modify]: a
✓ Step 3 approved

Step 4/4: Run tests (medium risk)
⚡ Risk Level: 🟡 MEDIUM
[Approve/Reject/Skip/Modify]: a
✓ Step 4 approved

🎉 All steps completed!
```

## Tips

1. **Use `--dry-run` first**: Test your plan without executing:
   ```bash
   magneto plan task.md --dry-run
   ```

2. **Start with `--auto-approve-low-risk`**: For trusted tasks, auto-approve safe steps:
   ```bash
   magneto run task.md --interactive --auto-approve-low-risk
   ```

3. **Always view diffs for high-risk steps**: Use `--diff` flag to see changes before approving.

4. **Checkpoints are your friend**: If you make a mistake, use the rollback feature.

5. **Review audit logs**: After session completion, review what was done:
   ```bash
   cat .magneto/audit/interactive-sessions.json | tail -50
   ```

## Troubleshooting

### Session times out too quickly

Increase timeout in config:
```json
{
  "interactive": {
    "timeout": 10  // 10 minutes
  }
}
```

### Diff not showing

Ensure `--diff` flag is set and the step involves file changes.

### Rollback failed

Check that backup directory exists:
```bash
ls -la .magneto/backup/
```

## Session Cleanup

Interactive sessions are automatically cleaned up to prevent unbounded file growth. The system keeps only the last 10 session files in `.magneto/cache/`, automatically deleting older sessions when starting a new one.

## Modify Option

When you select "modify" for a step, the system prompts you to choose what to modify:

```
What would you like to modify?
  1. Description
  2. Add command
Enter choice (1 or 2):
```

- **Option 1**: Modify the step description
- **Option 2**: Add a command to the step (if it doesn't have one)
- **Invalid choice**: Skips modification and proceeds with approval

This ensures you always have control over how steps are modified, even for steps without existing commands.

## See Also

- [Security Guardrails](./SECURITY.md)
- [Task Management](./TASKS.md)
- [Configuration](./CONFIGURATION.md)
