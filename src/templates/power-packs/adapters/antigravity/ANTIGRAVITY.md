# Magneto AI — Google Antigravity Integration

This project uses **Magneto AI**, an AI reasoning framework and agent control plane.

## Quick Commands

| Command | Description |
|---------|-------------|
| `/magneto-analyze` | Analyze codebase and build knowledge graph |
| `/magneto-query <text>` | Query the knowledge graph |
| `/magneto-plan <task>` | Generate execution plan for a task |
| `/magneto-telepathy` | Auto-discover and execute tasks |

## Project Structure

```
.magneto/
├── memory/graph.json       # Queryable knowledge graph
├── memory/modules/         # Analyzed module summaries
├── roles/                  # Agent role definitions
├── tasks/                  # Task definitions
├── cache/                  # Execution artifacts
└── security/               # Security policies
```

## How Magneto Works

1. **Analyze**: `magneto analyze` scans codebase → builds knowledge graph
2. **Query**: `magneto query "auth flow"` finds relevant files using graph
3. **Plan**: `magneto plan tasks/feature.md` generates role-scoped prompts
4. **Execute**: Multi-agent execution with orchestrator, backend, tester agents
5. **Merge**: Combines agent outputs into final deliverable

## Agent Roles

- **orchestrator**: Coordinates multi-agent tasks, makes final decisions
- **backend**: Server-side architecture, APIs, database, security
- **tester**: Test generation, validation, coverage analysis
- **requirements**: Requirements analysis, tracing, validation

## Documentation

https://github.com/rijuvashisht/Magneto
