# Context-Aware Sub-Agents

Magneto's sub-agent system automatically decomposes complex tasks into manageable components, spawning specialized agents that work in coordination to achieve the overall goal.

## Overview

When a task is too complex for a single agent (e.g., refactoring a large codebase, implementing a multi-layer API), Magneto can:

1. **Analyze complexity** - Score the task (0-1) based on scope, dependencies, and effort
2. **Choose a strategy** - Match decomposition approach to task type
3. **Extract components** - Break the task into independent work units
4. **Spawn sub-agents** - Create isolated agents with focused context
5. **Coordinate execution** - Run agents in sequence, parallel, or hybrid mode
6. **Merge results** - Combine all sub-agent outputs into final result

## Quick Start

### Auto-Decomposition (Default)

Complex tasks automatically decompose:

```bash
magneto run refactor-auth-system.md
# If complexity > 0.6, auto-decomposition triggers
```

### Force Decomposition

```bash
magneto run task.md --decompose
```

### Disable Decomposition

```bash
magneto run simple-task.md --no-decompose
```

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--decompose` | Force task decomposition | `false` |
| `--no-decompose` | Disable auto-decomposition | `false` |
| `--max-sub-agents <n>` | Limit sub-agents spawned | No limit |
| `--coordination <mode>` | Execution mode: sequential, parallel, hybrid | `hybrid` |
| `--watch-sub-agents` | Monitor sub-agent progress | `false` |

## Decomposition Strategies

### File-Based Strategy

**Triggers:** `refactor`, `organize`, `split module`, `restructure`

Breaks tasks by file groups:

```bash
magneto run "Refactor auth middleware" --decompose
```

Components created:
- Group 1: `auth.middleware.ts`, `auth.guard.ts`
- Group 2: `login.controller.ts`, `logout.controller.ts`
- Group 3: `session.store.ts`, `token.service.ts`

### Layer-Based Strategy

**Triggers:** `implement API`, `add endpoint`, `create service`, `REST API`

Decomposes by architectural layers:

```bash
magneto run "Implement user REST API" --decompose
```

Components created:
- Controller layer: Route handlers, request validation
- Service layer: Business logic, workflows
- Repository layer: Data access, queries
- Model layer: Entities, schemas

### Feature-Based Strategy

**Triggers:** `implement feature`, `add support`, `enable functionality`

Breaks down by deliverable features:

```bash
magneto run "Add payment system" --decompose
```

Components created:
- Payment method: Credit card processing
- Payment method: PayPal integration
- Payment method: Bank transfer
- Checkout flow: UI components
- Checkout flow: Validation logic

### Domain-Based Strategy

**Triggers:** `implement domain`, `model entities`, `DDD`, `domain-driven`

Organizes by business domains:

```bash
magneto run "Implement order management domain" --decompose
```

Components created:
- Order aggregate: Entities, value objects
- Order repository: Persistence logic
- Order domain events: Event definitions
- Order services: Domain operations

## Coordination Modes

### Sequential

Execute one sub-agent at a time, in dependency order:

```bash
magneto run task.md --decompose --coordination sequential
```

Use when:
- Strong dependencies between components
- Each component builds on previous
- Risk of conflicts is high

### Parallel

Execute all sub-agents simultaneously (up to max concurrency):

```bash
magneto run task.md --decompose --coordination parallel
```

Use when:
- Components are independent
- Maximum speed is needed
- Resources are available

### Hybrid (Default)

Execute in waves - independent components in parallel, dependent ones in sequence:

```bash
magneto run task.md --decompose --coordination hybrid
```

Use when:
- Mixed dependency graph
- Optimal balance of speed and safety
- Most real-world scenarios

### Pipeline

Chain sub-agents - output of one is input to next:

```bash
magneto run task.md --decompose --coordination pipeline
```

Use when:
- Data flows through transformations
- Each step enriches data
- Linear processing pipeline

## Configuration

Add to `magneto.config.json`:

```json
{
  "subAgents": {
    "enabled": true,
    "decomposition": {
      "enabled": true,
      "minComplexityScore": 0.6,
      "maxDepth": 3,
      "strategies": [
        "file-based",
        "layer-based",
        "feature-based",
        "domain-based"
      ]
    },
    "orchestration": {
      "maxConcurrency": 3,
      "timeout": 300000,
      "retryPolicy": {
        "maxRetries": 2,
        "backoffMultiplier": 1.5
      },
      "coordinationMode": "hybrid",
      "autoRetryFailed": true
    },
    "context": {
      "maxTokensPerAgent": 8000,
      "maxFilesPerAgent": 20,
      "inheritParentMemory": true,
      "shareCheckpointState": true
    }
  }
}
```

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `minComplexityScore` | Threshold for auto-decomposition | `0.6` |
| `maxDepth` | Max nesting of sub-agents | `3` |
| `maxConcurrency` | Parallel agent limit | `3` |
| `timeout` | Per-agent timeout (ms) | `300000` |
| `maxRetries` | Retry attempts for failures | `2` |
| `maxTokensPerAgent` | Context token limit | `8000` |
| `maxFilesPerAgent` | Files per agent limit | `20` |

## Complexity Analysis

Tasks are scored 0-1 based on:

| Factor | Weight | Indicators |
|--------|--------|------------|
| **Files** | 30% | Mentions of files, modules, components |
| **Scopes** | 30% | Distinct areas (auth, API, UI, DB) |
| **Dependencies** | 20% | References to "depends", "requires", "uses" |
| **Lines** | 20% | Task description length |

**Example Scoring:**

```
"Fix typo in README" → Score: 0.1 (No decomposition)
"Add auth middleware" → Score: 0.5 (No decomposition)
"Refactor auth system with OAuth, JWT, sessions" → Score: 0.75 (Decomposes)
"Build e-commerce platform" → Score: 0.95 (Decomposes heavily)
```

## Context Boundaries

Each sub-agent receives an isolated context:

```typescript
interface SubAgentContext {
  files: string[];           // Only assigned files
  symbols: string[];         // Only relevant symbols
  parentContext: any;        // Selective parent info
  sharedState: any;          // Cross-agent data
  memoryIds: string[];       // Relevant memories
  constraints: string[];     // Agent constraints
}
```

### Boundary Enforcement

The system enforces:
- **File access**: Only read assigned files
- **Token limits**: Context truncated at limit
- **Operation restrictions**: No network/external commands by default
- **Read-only mode**: Optionally prevent writes
- **Forbidden patterns**: Block sensitive data access

## Monitoring Sub-Agents

### Real-time Status

```bash
magneto run task.md --decompose --watch-sub-agents
```

Output:
```
[10:30:01] Sub-agent spawned: agent-1713541200000-abc (Auth Controller)
[10:30:02] Sub-agent spawned: agent-1713541200001-def (Auth Service)
[10:30:03] Sub-agent spawned: agent-1713541200002-ghi (Auth Repository)
[10:30:15] Sub-agent completed: agent-1713541200002-ghi
[10:30:18] Sub-agent completed: agent-1713541200000-abc
[10:30:22] Sub-agent completed: agent-1713541200001-def
[10:30:23] All sub-agents completed. Merging results...
```

### Status Report

```bash
magneto run task.md --decompose
# Final output shows:
```

```
Sub-agent execution complete:
  Completed: 5/6
  Failed: 1
  Progress: 83.3%

Failed sub-agents:
  - agent-1713541200003-jkl: Timeout
```

## Retry Logic

Failed sub-agents are automatically retried:

```
Attempt 1: Failed (network error)
→ Backoff 1.5s
Attempt 2: Failed (timeout)
→ Backoff 2.25s
Attempt 3: Success
```

Configuration:

```json
{
  "subAgents": {
    "orchestration": {
      "autoRetryFailed": true,
      "retryPolicy": {
        "maxRetries": 2,
        "backoffMultiplier": 1.5
      }
    }
  }
}
```

## Dependency Resolution

Sub-agents declare dependencies:

```typescript
interface TaskComponent {
  id: "comp-1",
  dependencies: ["comp-2", "comp-3"],  // Must complete first
  // ...
}
```

Execution order:
1. **comp-2** and **comp-3** run in parallel (no deps)
2. **comp-1** runs after both complete
3. If **comp-2** fails, **comp-1** becomes blocked

## Memory Integration

Sub-agents inherit parent context:

```typescript
// Parent task memories automatically shared
const relevantMemories = await memoryStore.query({
  tags: component.contextScope.patterns,
  limit: 5,
});
```

Each sub-agent:
- Can access relevant parent memories
- Creates its own episodic memories
- Shares learnings back to parent
- Updates shared state with results

## Security Considerations

### Context Isolation

```
┌─────────────────────────────────────┐
│         Parent Task                 │
│  ┌──────────────────────────────┐  │
│  │     Sub-Agent A               │  │
│  │  (can only see files A, B)   │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │     Sub-Agent B               │  │
│  │  (can only see files C, D)   │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Violation Tracking

If a sub-agent tries to:
- Access forbidden files → Blocked + logged
- Exceed token limit → Truncated + warning
- Use network when disabled → Blocked + logged

View violations:
```bash
# (Future feature)
magneto security report
```

## Best Practices

1. **Let auto-decomposition work** - Don't force unless needed
2. **Monitor first runs** - Use `--watch-sub-agents` initially
3. **Set appropriate limits** - Match `max-sub-agents` to resources
4. **Use sequential for risky changes** - When order matters
5. **Use parallel for speed** - When components are independent
6. **Check merge results** - Review combined output carefully
7. **Adjust complexity threshold** - Tune `minComplexityScore` for your domain

## Examples

### Refactoring a Large Module

```bash
# Task: "Refactor the authentication system"
magneto run refactor-auth.md --decompose --coordination hybrid

# Output:
# Complexity: 0.78
# Strategy: file-based
# Coordination: hybrid
# Spawning 4 sub-agents...
```

### Building a Multi-Feature API

```bash
# Task: "Implement REST API for e-commerce"
magneto run build-api.md --decompose --max-sub-agents 5

# Output:
# Complexity: 0.85
# Strategy: layer-based
# Spawning 5 sub-agents (limited from 8)
```

### Emergency Fix (No Decomposition)

```bash
# Critical bug - need single focused agent
magneto run fix-bug.md --no-decompose
```

## Troubleshooting

### Too Many Sub-Agents

```bash
# Limit the count
magneto run task.md --decompose --max-sub-agents 3
```

### Sub-Agents Timing Out

```json
{
  "subAgents": {
    "orchestration": {
      "timeout": 600000  // 10 minutes
    }
  }
}
```

### Circular Dependencies

System detects and prevents:
```
Error: Circular dependency detected
Component A depends on B
Component B depends on A
```

Fix by:
1. Breaking the cycle in task definition
2. Using sequential coordination
3. Merging interdependent components

### Memory Issues

If sub-agents exceed context:
```
Warning: Token limit exceeded for agent-123
Context truncated to 8000 tokens
```

Solutions:
- Increase `maxTokensPerAgent`
- Split into more components
- Reduce component scope

## Performance

| Metric | Target |
|--------|--------|
| Complexity analysis | <2s |
| Sub-agent spawn | <500ms |
| Context preparation | <1s |
| Parallel overhead | <10% |
| Result merging | <500ms |

**Scalability:**
- Up to 5 parallel agents: Optimal
- Up to 10 parallel agents: Good (increased overhead)
- Beyond 10 agents: Consider breaking into separate tasks

## Future Enhancements

- [ ] LLM-based component extraction (more accurate)
- [ ] Dynamic strategy selection
- [ ] Inter-agent communication
- [ ] Sub-agent result caching
- [ ] A/B testing sub-agent approaches

## See Also

- [Memory System](./MEMORY.md) - How sub-agents share context
- [Streaming](./STREAMING.md) - Real-time sub-agent monitoring
- [Security](../SECURITY.md) - Context boundary details
