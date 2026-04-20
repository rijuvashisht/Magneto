# ⚡ Magneto AI

Welcome to your Magneto AI-powered project!

## Quick Start

1. Run `magneto doctor` to validate setup
2. Run `magneto analyze` to scan and build project memory
3. Copy `.magneto/tasks/TASK_TEMPLATE.md` and fill it in
4. Run `magneto plan your-task.md`
5. Run `magneto generate your-task.md` and paste into Windsurf/Copilot

## Task Files (.md — what you write)

Tasks are Markdown files with YAML frontmatter. Copy TASK_TEMPLATE.md to get started:

```
.magneto/tasks/
  TASK_TEMPLATE.md   ← copy this to create a new task
  your-feature.md    ← your task files live here
  schemas/           ← JSON schemas for tooling (ignore these)
```

## Directory Structure

- `roles/` — Agent role packs (.md — edit these to customize agent behavior)
- `skills/` — Skill definitions (.md — edit these)
- `memory/` — Project memory, auto-built by `magneto analyze`
- `tasks/` — Task files (.md) + tooling schemas
- `cache/` — Execution cache (auto-generated, do not edit)
- `security/` — Security policies
- `scripts/` — Automation scripts
- `power-packs/` — Power pack configs (managed by magneto)
- `adapters/` — Adapter configs (managed by magneto)

## What stays JSON (config only, minimal)

- `magneto.config.json` — project config
- `magneto.min.json` — minimal runtime config
- `.vscode/mcp.json` — VS Code MCP connection

## Documentation

See the project README for full documentation.
