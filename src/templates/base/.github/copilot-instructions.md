# Copilot Instructions — Magneto AI

This project uses the **Magneto AI Reasoning Framework**.

## Rules

1. Always check `.magneto/magneto.config.json` for project configuration
2. Respect security policies in `.magneto/security/`
3. Use the Magneto AI MCP tools when available
4. Follow role-based execution — each agent has a specific domain
5. Never bypass security guardrails
6. Report findings with confidence levels
7. Flag any operations on protected paths

## Available Agents

- **magneto-orchestrator** — Coordinates multi-agent tasks
- **magneto-backend** — Backend analysis and implementation
- **magneto-tester** — Test generation and validation
- **magneto-requirements** — Requirements analysis and tracing

## MCP Tools

- `plan_task` — Generate execution plans
- `load_context` — Load project context
- `merge_results` — Merge agent outputs
- `security_check` — Validate security constraints
- `query_graph` — Query the knowledge graph to find related code, files, and concepts. Use this first to locate relevant files before planning tasks.
