---
name: implement-task-command
description: Implement the magneto task CLI command family for task management (create, list, validate, delete)
type: feature-implementation
roles:
  - orchestrator
  - backend
  - tester
priority: high
---

# Implement `magneto task` Command Family

## Objective

Create a comprehensive task management CLI that allows users to:
- `magneto task create <type> <title>` — Create tasks from templates (feature, bug, security, performance, test)
- `magneto task list` — List all tasks with filters (by type, status, priority)
- `magneto task validate <taskFile>` — Validate task files against schema
- `magneto task delete <taskFile>` — Delete tasks with confirmation
- `magneto task show <taskFile>` — Display task details

## Context

Currently, users must manually create task files in `.magneto/tasks/`. There's no:
1. Standardized task templates
2. Easy way to list all tasks
3. Validation that tasks are correctly formatted
4. Quick task creation from CLI

## Requirements

### Commands

1. **task create <type> <title>**
   - Types: feature, bug, security, performance, test, refactor, docs
   - Generate task file from template with frontmatter
   - Auto-populate: name (slug), description, type, priority, roles
   - Save to `.magneto/tasks/<slugified-title>.md`
   - Open in editor if --edit flag passed
   - Support --priority, --roles flags

2. **task list**
   - Scan `.magneto/tasks/` for all task files
   - Parse frontmatter to extract metadata
   - Display table: Name | Type | Priority | Roles | Status
   - Filter options: --type, --priority, --role
   - Sort options: --sort-by (name, priority, created)

3. **task validate <taskFile>**
   - Validate YAML frontmatter against schema
   - Check required fields: name, description, type
   - Validate roles are valid (orchestrator, backend, tester, requirements)
   - Validate type is valid (feature, bug, security, etc.)
   - Report errors with line numbers

4. **task delete <taskFile>**
   - Confirm before deletion
   - --force to skip confirmation
   - Also delete associated cache/plan files

5. **task show <taskFile>**
   - Display formatted task details
   - Show frontmatter in table format
   - Preview first 20 lines of body

### Files to Create/Modify

**New command file:**
- `src/commands/task.ts` — Main task command implementation

**Templates:**
- `src/templates/task/feature.md` — Feature task template
- `src/templates/task/bug.md` — Bug fix template
- `src/templates/task/security.md` — Security audit template
- `src/templates/task/performance.md` — Performance optimization template
- `src/templates/task/test.md` — Testing task template

**Modify:**
- `src/cli.ts` — Add `task` command with subcommands

### Task Schema

```yaml
---
name: task-name
description: Brief description of what needs to be done
type: feature | bug | security | performance | test | refactor | docs
priority: high | medium | low
roles:
  - orchestrator
  - backend
  - tester
---

# Task Title

## Objective

What needs to be accomplished.

## Requirements

- [ ] Requirement 1
- [ ] Requirement 2

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
```

## Acceptance Criteria

- [ ] `magneto task create feature "Add OAuth"` creates `.magneto/tasks/add-oauth.md`
- [ ] Generated tasks have valid frontmatter
- [ ] `magneto task list` shows all tasks with formatted output
- [ ] `magneto task validate` reports invalid task files with specific errors
- [ ] `magneto task delete` requires confirmation without --force
- [ ] All commands have proper help text
- [ ] Build passes

## Estimated Effort

- Command implementation: 2-3 hours
- Templates: 30 minutes
- Testing: 1 hour
- **Total: ~4 hours**
