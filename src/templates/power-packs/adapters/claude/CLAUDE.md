# Magneto AI — Claude Code Integration

This project uses **Magneto AI**, an AI reasoning framework and agent control plane.

## Quick Commands

| Command | Description |
|---------|-------------|
| `/magneto` | Run Magneto telepathy (auto-discover and execute tasks) |
| `/magneto-plan <task>` | Generate execution plan for a task |
| `/magneto-query <text>` | Query the knowledge graph |
| `/magneto-analyze` | Analyze codebase and build knowledge graph |

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

## Key Features

- **Knowledge Graph**: Native JSON graph with community detection
- **Telepathy**: Auto-classify and execute tasks based on risk level
- **Security**: Protected paths, blocked actions, approval workflows
- **Power Packs**: Modular configs for languages, frameworks, databases

## Usage Examples

```bash
# Analyze the codebase
magneto analyze

# Query the knowledge graph
magneto query "payment processing"

# Plan a feature implementation
magneto plan tasks/add-stripe-integration.md

# Run telepathy (auto-discover tasks)
magneto telepathy --auto
```

## Documentation

- Full docs: https://github.com/rijuvashisht/Magneto
- Cache/Adapters/Roles: See docs/CACHE-ADAPTERS-ROLES.md
- Metrics & Savings: See docs/METRICS.md
