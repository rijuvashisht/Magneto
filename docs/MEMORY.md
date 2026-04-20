# Agent Memory Persistence

Magneto's memory system allows agents to retain context, learnings, and state across multiple sessions. Memories persist between runs, enabling agents to build knowledge over time.

## Overview

The memory system supports five types of memories:

| Type | Description | Example |
|------|-------------|---------|
| **Episodic** | Specific task executions | "Refactored auth system on 2024-04-19" |
| **Semantic** | General knowledge/facts | "API keys should never be committed" |
| **Procedural** | How-to knowledge | "Steps to migrate from Express to Fastify" |
| **Contextual** | Current session context | "Working on PR #123, branch feature/auth" |
| **Checkpoint** | Saved progress points | "Auto-save at step 5/10" |

## Quick Start

### Save Results to Memory

```bash
magneto run task.md --save-memory
```

### Use Relevant Memories

```bash
magneto run new-task.md --with-memory
```

### List All Memories

```bash
magneto memory list
```

### Search Memories

```bash
magneto memory search "authentication"
```

## CLI Commands

### `magneto memory list`

List all memories with optional filtering:

```bash
magneto memory list                    # All memories
magneto memory list --task abc123      # Filter by task
magneto memory list --type episodic    # Filter by type
magneto memory list --limit 10         # Limit results
```

### `magneto memory show <id>`

Display detailed information about a memory:

```bash
magneto memory show mem-1713541200000-abc123
```

Output:
```
ID: mem-1713541200000-abc123
Type: episodic
Task ID: task-abc
Tags: auth, refactor, express
Importance: 0.85
Created: 2024-04-19T10:00:00Z
Access count: 5

Content:
────────────────────────────────────────
Refactored authentication middleware from Express to Fastify.
Key changes:
- Moved session handling to Redis
- Added JWT validation
- Implemented rate limiting
```

### `magneto memory search <query>`

Search memories by content or tags:

```bash
magneto memory search "API authentication"
magneto memory search "refactor" --limit 5
```

### `magneto memory delete <id>`

Delete a memory:

```bash
magneto memory delete mem-1713541200000-abc123 --force
```

### `magneto memory prune`

Clean up old or low-importance memories:

```bash
magneto memory prune --strategy age --max-age 30
magneto memory prune --strategy importance --min-importance 0.3
magneto memory prune --strategy hybrid --max-age 90
magneto memory prune --dry-run  # Preview what would be deleted
```

**Pruning Strategies:**

| Strategy | Description |
|----------|-------------|
| `lru` | Delete least recently accessed |
| `importance` | Delete lowest importance scores |
| `age` | Delete oldest memories |
| `hybrid` | Combine importance + age (default) |

### `magneto memory export`

Export memories to JSON:

```bash
magneto memory export                    # To stdout
magneto memory export --output backup.json
magneto memory export --project my-app   # Filter by project
```

### `magneto memory import <file>`

Import memories from JSON:

```bash
magneto memory import backup.json
magneto memory import - < backup.json    # From stdin
magneto memory import backup.json --dry-run
```

### `magneto memory stats`

Display memory statistics:

```bash
magneto memory stats
```

Output:
```
Memory Statistics
════════════════════════════════════════════════════════════
Total memories: 1,247
Total size: 2.3 MB
Average importance: 0.62
Oldest memory: 2024-01-15T08:30:00Z
Newest memory: 2024-04-19T16:45:00Z

By Type:
  episodic     ████████████████████ 523
  semantic     ██████████████ 341
  procedural   ████████ 203
  contextual   █████ 127
  checkpoint   ███ 53
```

## Configuration

Add to `magneto.config.json`:

```json
{
  "memory": {
    "enabled": true,
    "backend": "json",
    "path": ".magneto/memory.json",
    "maxMemories": 10000,
    "embedding": {
      "enabled": true,
      "model": "text-embedding-3-small",
      "dimensions": 1536
    },
    "pruning": {
      "enabled": true,
      "strategy": "hybrid",
      "maxAge": 90,
      "minImportance": 0.1,
      "keepCheckpoints": true
    }
  }
}
```

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `enabled` | Enable memory system | `true` |
| `backend` | Storage backend: json, sqlite, redis | `json` |
| `path` | Path to memory storage | `.magneto/memory.json` |
| `maxMemories` | Maximum memories before auto-pruning | `10000` |
| `embedding.enabled` | Use vector embeddings for search | `true` |
| `embedding.model` | OpenAI embedding model | `text-embedding-3-small` |
| `pruning.strategy` | Default pruning strategy | `hybrid` |
| `pruning.maxAge` | Maximum age in days | `90` |
| `pruning.minImportance` | Minimum importance score | `0.1` |
| `pruning.keepCheckpoints` | Don't prune checkpoints | `true` |

## Memory Importance

Memories are scored 0-1 based on importance:

| Score | Description |
|-------|-------------|
| 0.9-1.0 | Critical architectural decisions, breaking changes |
| 0.7-0.9 | Important patterns, significant refactors |
| 0.4-0.7 | Useful knowledge, minor improvements |
| 0.1-0.4 | Routine tasks, ephemeral context |
| 0.0-0.1 | Auto-generated, low-value data |

**When saving memories:**

```bash
# High importance (explicit)
magneto run task.md --save-memory --importance 0.9

# Default (contextual importance detection)
magneto run task.md --save-memory
```

## Checkpoints

Checkpoints save execution state for resuming:

### List Checkpoints

```bash
magneto checkpoint list
magneto checkpoint list --task abc123
```

### Resume from Checkpoint

```bash
magneto run task.md --resume chk-1713541200000-xyz789
```

### Auto-Checkpoints

Enable automatic checkpoints during long-running tasks:

```bash
magneto run long-task.md --checkpoint-auto
```

Auto-checkpoints are created:
- Every N steps (configurable, default: 5)
- On errors (if enabled)

### Checkpoint Configuration

```json
{
  "memory": {
    "checkpoints": {
      "enabled": true,
      "autoSave": {
        "enabled": true,
        "interval": 5,
        "onError": true,
        "maxCheckpoints": 10
      }
    }
  }
}
```

### Checkpoint Commands

```bash
magneto checkpoint show chk-1713541200000-xyz789    # Show details
magneto checkpoint delete chk-1713541200000-xyz789  # Delete
magneto checkpoint clear --task abc123               # Clear task checkpoints
magneto checkpoint stats                             # Show statistics
```

## Memory Relationships

Memories can be linked to form a knowledge graph:

```typescript
{
  id: "mem-123",
  type: "episodic",
  content: "Refactored auth system",
  relationships: {
    relatedMemories: ["mem-456", "mem-789"],
    parentTask: "task-abc",
    childTasks: ["task-def", "task-ghi"]
  }
}
```

This enables:
- Navigating related work
- Understanding context of decisions
- Finding patterns across tasks

## Storage Backends

### JSON File (Default)

Best for small-to-medium projects:

```json
{
  "memory": {
    "backend": "json",
    "path": ".magneto/memory.json"
  }
}
```

**Characteristics:**
- Single JSON file
- Simple backup/restore
- Good for <10k memories
- No dependencies

### SQLite (Coming Soon)

For larger projects:

```json
{
  "memory": {
    "backend": "sqlite",
    "path": ".magneto/memory.db"
  }
}
```

**Characteristics:**
- Fast queries
- Full-text search
- Efficient storage
- Good for 10k+ memories

### Redis (Coming Soon)

For distributed/cloud deployments:

```json
{
  "memory": {
    "backend": "redis",
    "url": "redis://localhost:6379"
  }
}
```

## Privacy and Security

**Local Storage:** By default, all memories are stored locally in your project's `.magneto/` directory.

**No Cloud:** Memories never leave your machine unless you explicitly configure cloud storage.

**Sensitive Data:** Be careful not to save:
- API keys or passwords
- Private user data
- Proprietary code snippets (unless intended)

**Tags for Sensitivity:**

```bash
magneto memory search "API_KEY"  # Find potentially sensitive memories
magneto memory prune --tag sensitive  # Clean up
```

## Performance

| Metric | Target | Notes |
|--------|--------|-------|
| Save memory | <50ms | Local storage |
| Query memory | <100ms | For 10k memories |
| Search | <200ms | Text search |
| Similarity search | <500ms | With embeddings |
| Memory size | ~2-4KB | Average per memory |

**Storage Estimates:**

| Memories | Size |
|----------|------|
| 100 | ~200KB |
| 1,000 | ~2MB |
| 10,000 | ~20MB |

## Best Practices

1. **Tag consistently:** Use standard tags like `auth`, `api`, `refactor`, `bugfix`

2. **Set importance:** Mark critical architectural decisions as high importance

3. **Prune regularly:** Run `magneto memory prune` monthly to prevent bloat

4. **Export backups:** `magneto memory export > backup-$(date +%Y%m%d).json`

5. **Use with-memory:** Always use `--with-memory` for related tasks

6. **Clean up checkpoints:** Auto-checkpoints accumulate, clear periodically

## Troubleshooting

### Memory file too large

```bash
magneto memory prune --strategy age --max-age 30
magneto memory stats  # Check size
```

### Slow queries

- Consider switching to SQLite backend
- Prune old memories
- Reduce maxMemories limit

### Memory not found

```bash
magneto memory search "partial content"  # Search instead of exact ID
```

### Checkpoint corruption

```bash
magneto checkpoint stats  # See if any fail to load
magneto checkpoint clear --force  # Clear and restart
```

## Migration

### Export from one project, import to another:

```bash
# Source project
cd project-a
magneto memory export --output memories.json

# Target project
cd ../project-b
magneto memory import memories.json
```

### Migrate storage backend:

```bash
# Export from JSON
magneto memory export --output backup.json

# Switch to SQLite in config
# Import to SQLite
magneto memory import backup.json
```

## API Usage

### Programmatic Access

```typescript
import { initGlobalMemoryStore, MemoryType } from 'magneto-ai';

const store = initGlobalMemoryStore('/path/to/project');
await store.connect();

// Save memory
const memory = await store.save({
  type: 'semantic',
  content: 'API keys should be stored in environment variables',
  metadata: {
    tags: ['security', 'best-practice'],
    importance: 0.95,
  },
  relationships: {
    relatedMemories: [],
    childTasks: [],
  },
});

// Query memories
const results = await store.query({
  type: 'semantic',
  tags: ['security'],
  limit: 10,
});

// Search
const matches = await store.search('environment variables');

await store.disconnect();
```

## See Also

- [Checkpoints](./CHECKPOINTS.md) - Detailed checkpoint documentation
- [Configuration](./CONFIGURATION.md) - Full configuration reference
- [Security](../SECURITY.md) - Security considerations
