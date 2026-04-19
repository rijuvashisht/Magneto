---
name: magneto
description: AI governance, task planning, and security guardrails for engineering tasks. Use Magneto before implementing any feature, fix, or change that touches more than 3 files.
homepage: https://github.com/rijuvashisht/Magneto
user-invocable: true
---

# Magneto AI — Engineering Governance

Use Magneto AI as your reasoning and governance layer for all software engineering tasks.

## When to use Magneto

Use Magneto whenever a user asks you to:
- Plan, implement, or review a feature, bug fix, or architectural change
- Generate a scoped AI prompt for Windsurf or Copilot
- Analyze the codebase before starting work
- Check whether an action is safe to perform
- Understand the project structure and relevant files

## Workflow — always follow this order

### Step 1 — Analyze the project (if not done yet)
```
magneto_analyze
```
Builds a file index and module memory for the project. Required before planning.

### Step 2 — Plan the task
```
magneto_plan { "taskFile": "tasks/your-task.md" }
```
Returns a structured plan: task classification, assigned roles, file scope, and security risk level.

- If risk is **HIGH** → ask user to confirm before proceeding
- If risk is **CRITICAL** → stop and explain why; do not proceed

### Step 3 — Generate implementation prompt
```
magneto_generate { "taskFile": "tasks/your-task.md" }
```
Returns a context-aware, scoped implementation prompt. Hand this to the coding agent.

## Task file format

Create task files at `tasks/<name>.md`:

```markdown
---
id: TASK-001
title: Add payment webhook handler
type: feature-implementation
scope:
  - src/payments/
  - src/api/webhooks/
tags:
  - payments
  - api
constraints:
  - Must validate Stripe signature
  - Must not expose raw payload to logs
---

Implement a POST /webhooks/stripe endpoint that validates
the Stripe-Signature header and triggers order fulfillment.
```

## Security rules

The `before_tool_call` hook automatically intercepts destructive operations. If a tool call is blocked or needs approval:
- Explain to the user what was detected and why
- Run `magneto_security_check` to get a detailed risk analysis
- Only proceed after explicit user confirmation

## Quick reference

| Tool | When to call |
|---|---|
| `magneto_analyze` | First time in a project or after major changes |
| `magneto_plan` | Before implementing any task |
| `magneto_generate` | To get a scoped implementation prompt |
| `magneto_security_check` | When unsure if an action is safe |
