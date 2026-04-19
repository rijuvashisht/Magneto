---
name: magneto
description: Use Magneto AI to analyze codebase, query knowledge graph, plan tasks, and execute multi-agent workflows. Use when you need to understand code structure, implement features, fix bugs, or run automated analysis.
argument-hint: <command> [args]
disable-model-invocation: false
user-invocable: true
allowed-tools: Read Write Bash Grep
---

# Magneto AI Skill

You are Claude Code with access to Magneto AI capabilities.

## When to Use

Use `/magneto` when:
- Starting work on a new task and need to understand codebase
- Implementing features that touch multiple files
- Fixing bugs requiring cross-file analysis
- Need to find relevant code quickly
- Want automated multi-agent execution

## Available Commands

### Core Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `analyze` | Build knowledge graph from codebase | `/magneto analyze` |
| `query <text>` | Search knowledge graph | `/magneto query "auth middleware"` |
| `plan <task>` | Generate execution plan | `/magneto plan tasks/feature.md` |
| `telepathy` | Auto-discover and execute | `/magneto telepathy` |

### Usage Patterns

**Understanding Code:**
```
/magneto query "how does authentication work"
→ Returns: Relevant files, functions, data flow
```

**Planning Implementation:**
```
/magneto plan tasks/add-oauth.md
→ Generates: Role-scoped prompts for orchestrator, backend, tester
```

**Auto-Execution:**
```
/magneto telepathy --auto
→ Discovers tasks from requirements/, auto-classifies, executes
```

## Integration Workflow

1. **Check Status**: Run `/magneto doctor` to verify setup
2. **Analyze**: If no graph exists, run `/magneto analyze`
3. **Query**: Use `/magneto query` to find relevant context
4. **Plan**: For complex tasks, `/magneto plan` generates prompts
5. **Execute**: Use generated prompts or run `/magneto telepathy`

## Best Practices

- Always query graph before planning large changes
- Use `--dry-run` for telepathy to preview actions
- Review generated prompts in `.magneto/cache/`
- Respect security guardrails in `.magneto/security/`

## Knowledge Graph Structure

The graph contains:
- **Nodes**: files, classes, functions, interfaces, types
- **Edges**: imports, exports, defines, co-located
- **Communities**: Louvain-detected module clusters
- **God Nodes**: Highest-degree nodes per community

Query examples:
- `/magneto query "UserService"` → Files related to UserService
- `/magneto query "auth"` → All authentication-related code
- `/magneto path "LoginForm" "auth.ts"` → Shortest path between nodes
