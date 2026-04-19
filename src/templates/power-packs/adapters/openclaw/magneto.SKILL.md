# Skill: Magneto AI Governance

Use Magneto AI as your reasoning, planning, and security layer for all software engineering tasks in this project.

## When to use this skill

Use Magneto whenever a user asks you to:
- Plan a new feature, bug fix, or architectural change
- Generate a scoped AI prompt for Windsurf or Copilot
- Analyze the codebase or refresh memory
- Review security implications of a change
- Understand the project structure before making changes
- Run a task across multiple agent roles in parallel

## How to use Magneto

### 1. Before starting any engineering task — analyze the project

```bash
magneto analyze
```

This builds Magneto's project memory from the codebase. Always run this first if memory files are stale or missing.

### 2. Plan a task before executing it

Create a task file first (copy from `.magneto/tasks/TASK_TEMPLATE.md`), then:

```bash
magneto plan tasks/your-task.md
```

This classifies the task, assigns agent roles, evaluates security, and outputs an execution plan. Read the plan before proceeding — it tells you which files to touch and what constraints apply.

### 3. Generate a scoped prompt for AI-assisted implementation

```bash
magneto generate tasks/your-task.md
```

This builds a context-aware prompt scoped to only the relevant files. Use this to produce the actual implementation prompt.

### 4. Check security before executing anything sensitive

```bash
magneto plan tasks/your-task.md --dry-run
```

The plan output includes a security evaluation. If risk level is HIGH or CRITICAL, ask the user for confirmation before proceeding.

## Task file format

Task files are Markdown with YAML frontmatter. Create them at `tasks/<name>.md`:

```markdown
---
id: TASK-001
title: Implement user authentication
type: feature-implementation
scope:
  - src/auth/
  - src/middleware/
tags:
  - auth
  - security
constraints:
  - Must not break existing sessions
  - Must follow OWASP guidelines
---

Implement JWT-based authentication. Users should be able to sign up,
log in, and have their sessions persisted securely.
```

## Governance rules

- **Always run `magneto analyze` first** if the project memory is empty or outdated
- **Always run `magneto plan`** before implementing any task with scope > 3 files
- **Never skip security evaluation** — check the plan output's risk level
- **Use the assigned roles** — if the plan assigns `backend` and `tester` roles, scope your work accordingly
- **Report the plan to the user** before executing — paste the key findings from `magneto plan`

## Example conversation flow

User: "Add a payment webhook handler"

You:
1. Run `magneto analyze` (if memory stale)
2. Create `tasks/payment-webhook.md` with relevant scope and constraints
3. Run `magneto plan tasks/payment-webhook.md`
4. Report the plan and security level to the user
5. Run `magneto generate tasks/payment-webhook.md`
6. Use the generated prompt to implement with your coding tools

## Useful commands reference

| Command | When to use |
|---|---|
| `magneto analyze` | Before starting — builds project memory |
| `magneto plan task.md` | Before implementing — get plan + security check |
| `magneto plan task.md --dry-run` | Preview plan without saving |
| `magneto generate task.md` | Generate scoped implementation prompt |
| `magneto doctor` | Diagnose Magneto setup issues |
| `magneto init` | Initialize Magneto in a new project |
