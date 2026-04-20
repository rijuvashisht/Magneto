---
name: agent-memory-persistence
description: Persistent memory for agents across sessions with context retention, checkpoint saving, and memory pruning
type: feature
priority: high
telepathyLevel: 2
roles:
  - architect
  - backend
security:
  maxTelepathyLevel: 2
  requireApproval: false
---

# Agent Memory Persistence (Roadmap 1.3)

## Objective

Implement persistent memory system that allows agents to retain context, learnings, and state across multiple sessions. Enable checkpoint saving, memory retrieval, and intelligent memory pruning.

## Background

Currently, each `magneto run` starts fresh with no memory of previous runs. Agents should remember:
- Previous task outcomes and lessons learned
- Code patterns and architectural decisions
- User preferences and project conventions
- Partial results from interrupted runs

## Requirements

### 1. Memory Types

**File**: `src/core/memory-store.ts`

```typescript
export type MemoryType = 
  | 'episodic'      // Specific task executions
  | 'semantic'      // General knowledge/facts
  | 'procedural'    // How-to knowledge
  | 'contextual'    // Current session context
  | 'checkpoint';   // Saved progress points

export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  metadata: {
    taskId?: string;
    agentId?: string;
    projectId?: string;
    tags: string[];
    importance: number;        // 0-1, for pruning
    createdAt: string;
    accessedAt: string;
    accessCount: number;
    embedding?: number[];    // For similarity search
  };
  relationships: {
    relatedMemories: string[]; // Memory IDs
    parentTask?: string;
    childTasks: string[];
  };
}

export interface MemoryQuery {
  type?: MemoryType | MemoryType[];
  tags?: string[];
  projectId?: string;
  taskId?: string;
  agentId?: string;
  timeRange?: {
    start: string;
    end: string;
  };
  similarity?: {
    embedding: number[];
    threshold: number;
  };
  limit?: number;
}

export interface MemoryStore {
  // Core operations
  async save(memory: Omit<Memory, 'id'>): Promise<Memory>;
  async get(id: string): Promise<Memory | null>;
  async update(id: string, updates: Partial<Memory>): Promise<Memory>;
  async delete(id: string): Promise<boolean>;
  
  // Query operations
  async query(query: MemoryQuery): Promise<Memory[]>;
  async search(text: string, limit?: number): Promise<Memory[]>;
  async similar(embedding: number[], threshold?: number): Promise<Memory[]>;
  
  // Memory management
  async prune(options: PruneOptions): Promise<number>; // Returns deleted count
  async export(projectId?: string): Promise<Memory[]>;
  async import(memories: Memory[]): Promise<number>;
  async stats(): MemoryStats;
}

export interface PruneOptions {
  strategy: 'lru' | 'importance' | 'age' | 'hybrid';
  maxMemories?: number;
  maxAge?: number;           // Days
  minImportance?: number;    // 0-1
  keepCheckpoints?: boolean;
}

export interface MemoryStats {
  totalMemories: number;
  byType: Record<MemoryType, number>;
  totalSize: number;         // Bytes
  oldestMemory: string;
  newestMemory: string;
  averageImportance: number;
}
```

### 2. Storage Backends

**File**: `src/core/memory-backends.ts`

```typescript
export interface MemoryBackend {
  async connect(): Promise<void>;
  async disconnect(): Promise<void>;
  async save(memory: Memory): Promise<void>;
  async get(id: string): Promise<Memory | null>;
  async update(id: string, memory: Partial<Memory>): Promise<void>;
  async delete(id: string): Promise<void>;
  async query(query: MemoryQuery): Promise<Memory[]>;
  async search(text: string): Promise<Memory[]>;
  async clear(): Promise<void>;
}

// Local JSON file backend (default)
export class JsonFileBackend implements MemoryBackend {
  constructor(private filePath: string) {}
  // Implementation...
}

// SQLite backend (for larger projects)
export class SqliteBackend implements MemoryBackend {
  constructor(private dbPath: string) {}
  // Implementation with fts5 for search
}

// Redis backend (for distributed/cloud)
export class RedisBackend implements MemoryBackend {
  constructor(private redisUrl: string) {}
  // Implementation...
}
```

### 3. Checkpoint System

**File**: `src/core/checkpoint-manager.ts`

```typescript
export interface Checkpoint {
  id: string;
  taskId: string;
  stepIndex: number;
  totalSteps: number;
  state: {
    context: any;
    results: any[];
    variables: Record<string, any>;
  };
  metadata: {
    createdAt: string;
    description: string;
    automatic: boolean;        // true if auto-created
    tags: string[];
  };
}

export interface CheckpointManager {
  async save(checkpoint: Omit<Checkpoint, 'id'>): Promise<Checkpoint>;
  async load(checkpointId: string): Promise<Checkpoint>;
  async list(taskId?: string): Promise<Checkpoint[]>;
  async delete(checkpointId: string): Promise<boolean>;
  async autoSave(taskId: string, state: any): Promise<Checkpoint>;
  async resumeFrom(checkpointId: string): Promise<{
    checkpoint: Checkpoint;
    canResume: boolean;
  }>;
}

// Auto-checkpoint configuration
export interface AutoCheckpointConfig {
  enabled: boolean;
  interval: number;          // Steps between auto-save
  onError: boolean;           // Save on error
  maxCheckpoints: number;     // Auto-delete old ones
}
```

### 4. Context Builder with Memory

**Update**: `src/core/context.ts`

```typescript
export interface ContextConfig {
  includeMemory?: boolean;
  memoryQuery?: MemoryQuery;
  maxMemories?: number;
  memoryContextWindow?: number; // Tokens
}

export async function buildContext(
  task: Task,
  config: ContextConfig = {}
): Promise<Context> {
  const baseContext = await buildBaseContext(task);
  
  if (config.includeMemory) {
    const memoryStore = getGlobalMemoryStore();
    const relevantMemories = await memoryStore.query({
      ...config.memoryQuery,
      similarity: {
        embedding: await generateEmbedding(task.content),
        threshold: 0.7,
      },
      limit: config.maxMemories || 10,
    });
    
    baseContext.memories = relevantMemories;
    baseContext.memorySummary = await summarizeMemories(relevantMemories);
  }
  
  return baseContext;
}
```

### 5. Memory-Aware Runner

**Update**: `src/runners/types.ts`

```typescript
export interface RunnerInput {
  task: Task;
  context: Context;
  security: SecurityContext;
  mode: ExecutionMode;
  projectRoot: string;
  memory?: {
    loadPrevious: boolean;
    saveResults: boolean;
    autoCheckpoint: boolean;
  };
}

export interface RunnerOutput {
  result: any;
  memories?: Memory[];       // Memories created during run
  checkpoints?: Checkpoint[];  // Checkpoints saved
  context?: any;             // Updated context
}
```

### 6. CLI Commands

**Update**: `src/cli.ts`

```bash
# Memory management commands
magneto memory list                    # List all memories
magneto memory list --task <taskId>    # Filter by task
magneto memory search <query>          # Search memories
magneto memory show <id>               # Show memory details
magneto memory delete <id>               # Delete memory
magneto memory prune                   # Prune old memories
magneto memory export > backup.json    # Export memories
magneto memory import < backup.json     # Import memories

# Checkpoint commands
magneto checkpoint list                # List checkpoints
magneto checkpoint show <id>             # Show checkpoint
magneto checkpoint delete <id>         # Delete checkpoint
magneto run <task> --resume <checkpointId>  # Resume from checkpoint

# Run with memory options
magneto run task.md --with-memory      # Load relevant memories
magneto run task.md --save-memory      # Save results to memory
magneto run task.md --checkpoint-auto  # Enable auto-checkpoints
```

### 7. Configuration

Add to `magneto.config.json`:

```json
{
  "memory": {
    "enabled": true,
    "backend": "json",         // json | sqlite | redis
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
      "maxAge": 90,            // Days
      "minImportance": 0.1,
      "keepCheckpoints": true
    },
    "checkpoints": {
      "enabled": true,
      "autoSave": {
        "enabled": true,
        "interval": 5,         // Steps
        "onError": true,
        "maxCheckpoints": 10
      }
    },
    "context": {
      "includeInRuns": true,
      "maxMemories": 10,
      "contextWindow": 2000     // Tokens
    }
  }
}
```

### 8. Memory Embedding & Search

**File**: `src/core/memory-embedding.ts`

```typescript
export interface EmbeddingConfig {
  provider: 'openai' | 'local' | 'none';
  model?: string;
  dimensions?: number;
  batchSize?: number;
}

export class MemoryEmbedder {
  constructor(private config: EmbeddingConfig) {}
  
  async embed(text: string): Promise<number[]>;
  async embedBatch(texts: string[]): Promise<number[][]>;
  
  // Similarity calculation
  cosineSimilarity(a: number[], b: number[]): number;
  
  // Find similar memories
  async findSimilar(
    query: string,
    memories: Memory[],
    threshold?: number
  ): Promise<Array<{ memory: Memory; score: number }>>;
}
```

## Implementation Phases

### Phase 1: Core Memory Store (Week 1)
- [ ] Create `src/core/memory-store.ts` with interfaces
- [ ] Implement `JsonFileBackend`
- [ ] Add CRUD operations (save, get, update, delete)
- [ ] Add query operations (query, search)
- [ ] Unit tests

### Phase 2: Checkpoint System (Week 1)
- [ ] Create `src/core/checkpoint-manager.ts`
- [ ] Implement checkpoint save/load
- [ ] Add auto-checkpoint on intervals
- [ ] Add resume functionality
- [ ] Integration with run command

### Phase 3: CLI Commands (Week 2)
- [ ] Add `memory` subcommand to CLI
- [ ] Add `checkpoint` subcommand to CLI
- [ ] Implement list, search, show, delete operations
- [ ] Add export/import functionality

### Phase 4: Context Integration (Week 2)
- [ ] Update `buildContext()` to include memories
- [ ] Add memory loading in run command
- [ ] Add memory saving after successful runs
- [ ] Memory-aware prompt construction

### Phase 5: Embeddings & Advanced Features (Week 3)
- [ ] Implement `MemoryEmbedder` with OpenAI
- [ ] Add similarity search
- [ ] Implement memory pruning strategies
- [ ] Add SQLite backend option
- [ ] Performance optimization

## Acceptance Criteria

- [ ] `magneto run task.md --with-memory` loads relevant memories
- [ ] `magneto run task.md --save-memory` saves results
- [ ] `magneto memory list` shows all memories
- [ ] `magneto memory search "authentication"` finds relevant memories
- [ ] Auto-checkpoint creates checkpoints every N steps
- [ ] `magneto run task.md --resume <id>` resumes from checkpoint
- [ ] Memory pruning removes old low-importance memories
- [ ] Export/import works for backup/restore
- [ ] All tests pass
- [ ] Documentation complete

## Testing Scenarios

1. **Basic Memory Save/Load**
   ```bash
   magneto run task.md --save-memory
   magneto run similar-task.md --with-memory
   # Should see previous task context
   ```

2. **Checkpoint Resume**
   ```bash
   magneto run long-task.md --checkpoint-auto
   # Interrupt with Ctrl+C
   magneto checkpoint list
   magneto run long-task.md --resume <checkpoint-id>
   # Should continue from interruption point
   ```

3. **Memory Search**
   ```bash
   magneto memory search "API authentication"
   # Should return relevant memories
   ```

4. **Memory Pruning**
   ```bash
   magneto memory prune --strategy age --max-age 30
   # Should delete memories older than 30 days
   ```

## Performance Requirements

- Memory save: <50ms
- Memory query: <100ms for 10k memories
- Checkpoint save: <100ms
- Memory search with embeddings: <500ms
- Pruning 10k memories: <5s

## Storage Estimates

| Memories | JSON Size | SQLite Size |
|----------|-----------|-------------|
| 100      | ~50KB     | ~100KB      |
| 1,000    | ~500KB    | ~1MB        |
| 10,000   | ~5MB      | ~10MB       |

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Memory bloat | Automatic pruning with configurable limits |
| Privacy concerns | Local storage by default, no cloud required |
| Embedding costs | Optional embeddings, text search fallback |
| Checkpoint corruption | Validation on load, backup old checkpoints |
| Performance degradation | SQLite backend for large projects |

## Documentation Requirements

- [ ] `docs/MEMORY.md` - User guide for memory features
- [ ] `docs/CHECKPOINTS.md` - Checkpoint documentation
- [ ] `docs/MEMORY-CONFIG.md` - Configuration reference
- [ ] Inline help for memory commands

---

**Estimated Effort**: 3 weeks
**Dependencies**: None (builds on existing infrastructure)
**Breaking Changes**: None (additive feature)
**Security Review**: Required (data retention, privacy)
