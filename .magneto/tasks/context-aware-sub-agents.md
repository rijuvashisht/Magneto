---
name: context-aware-sub-agents
description: Intelligent task decomposition with context-aware sub-agent spawning and coordination
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

# Context-Aware Sub-Agents (Roadmap 1.4)

## Objective

Implement intelligent task decomposition that automatically spawns specialized sub-agents when tasks are complex. Each sub-agent receives focused context, works on its assigned component, and reports back for coordinated integration.

## Background

Currently, all tasks run through a single execution path. For complex tasks (e.g., "Refactor authentication system"), a single agent tries to handle everything. Context-aware sub-agents will:
- Automatically decompose complex tasks
- Spawn specialized agents for components
- Maintain context boundaries
- Coordinate results

## Requirements

### 1. Task Decomposition Engine

**File**: `src/core/decomposition-engine.ts`

```typescript
export interface DecompositionConfig {
  enabled: boolean;
  maxDepth: number;              // Max sub-agent nesting
  minComplexityScore: number;    // Threshold to decompose (0-1)
  strategies: DecompositionStrategy[];
}

export interface DecompositionStrategy {
  name: string;
  pattern: RegExp;
  extractors: ComponentExtractor[];
  agentTemplate: SubAgentTemplate;
}

export interface ComponentExtractor {
  name: string;
  prompt: string;              // LLM prompt to extract component
  contextWindow: number;       // Tokens allocated to this component
}

export interface SubAgentTemplate {
  role: string;
  expertise: string[];
  constraints: string[];
  deliverables: string[];
}

export interface TaskComponent {
  id: string;
  name: string;
  description: string;
  complexity: number;          // 0-1 score
  dependencies: string[];        // Other component IDs
  contextScope: {
    files: string[];
    symbols: string[];
    patterns: string[];
  };
  estimatedEffort: number;     // Relative effort (1-10)
  risk: 'low' | 'medium' | 'high';
}

export interface DecompositionResult {
  shouldDecompose: boolean;
  complexityScore: number;
  reason: string;
  components: TaskComponent[];
  coordinationStrategy: 'sequential' | 'parallel' | 'hybrid';
}

export class DecompositionEngine {
  constructor(private config: DecompositionConfig) {}

  async analyze(task: Task): Promise<DecompositionResult>;
  async decompose(task: Task, result: DecompositionResult): Promise<TaskComponent[]>;
  
  // Built-in strategies
  static readonly STRATEGIES: {
    FILE_BASED: DecompositionStrategy;      // Split by files/modules
    LAYER_BASED: DecompositionStrategy;    // Split by architectural layers
    FEATURE_BASED: DecompositionStrategy; // Split by features
    DOMAIN_BASED: DecompositionStrategy;  // Split by business domains
  };
}
```

### 2. Sub-Agent Orchestrator

**File**: `src/core/sub-agent-orchestrator.ts`

```typescript
export interface SubAgent {
  id: string;
  parentId: string;              // Parent task/agent
  component: TaskComponent;
  template: SubAgentTemplate;
  context: SubAgentContext;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'blocked';
  result?: SubAgentResult;
  checkpoint?: string;
}

export interface SubAgentContext {
  // Isolated context for this sub-agent
  files: string[];             // Only relevant files
  symbols: string[];           // Only relevant symbols
  parentContext: any;          // Selective parent context
  sharedState: Record<string, any>;  // Cross-agent state
  memoryIds: string[];         // Relevant memories
}

export interface SubAgentResult {
  success: boolean;
  output: string;
  artifacts: {
    files: Array<{ path: string; content: string }>;
    patches: string[];
    documentation: string;
  };
  metadata: {
    tokensUsed: number;
    executionTime: number;
    complexity: number;
  };
}

export interface OrchestrationConfig {
  maxConcurrency: number;        // Max parallel sub-agents
  timeout: number;              // Per sub-agent timeout (ms)
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
  };
  coordinationMode: 'manager' | 'swarm' | 'pipeline';
}

export class SubAgentOrchestrator extends EventEmitter {
  constructor(config: OrchestrationConfig) {}

  // Create and manage sub-agents
  async spawn(component: TaskComponent, parent: Task): Promise<SubAgent>;
  async coordinate(agents: SubAgent[]): Promise<SubAgentResult[]>;
  
  // Execution patterns
  async executeSequential(agents: SubAgent[]): Promise<SubAgentResult[]>;
  async executeParallel(agents: SubAgent[]): Promise<SubAgentResult[]>;
  async executeHybrid(agents: SubAgent[]): Promise<SubAgentResult[]>;
  
  // Context management
  async prepareContext(component: TaskComponent, parent: Task): Promise<SubAgentContext>;
  async mergeResults(results: SubAgentResult[]): Promise<SubAgentResult>;
  
  // Status and monitoring
  getStatus(): SubAgentStatusReport;
  on(event: 'spawned' | 'completed' | 'failed', handler: (agent: SubAgent) => void): void;
}

export interface SubAgentStatusReport {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  blocked: number;
  progress: number;            // 0-100
}
```

### 3. Context Boundary Manager

**File**: `src/core/context-boundary.ts`

```typescript
export interface ContextBoundary {
  // Define what a sub-agent can access
  allowedFiles: string[];
  allowedSymbols: string[];
  allowedOperations: string[];
  forbiddenPatterns: RegExp[];
  maxTokens: number;
  maxFiles: number;
  maxDepth: number;
}

export interface ContextViolation {
  agentId: string;
  violation: string;
  attempted: string;
  blocked: boolean;
  timestamp: string;
}

export class ContextBoundaryManager {
  async createBoundary(
    component: TaskComponent,
    parentTask: Task
  ): Promise<ContextBoundary>;
  
  async validateAccess(
    agentId: string,
    operation: string,
    target: string,
    boundary: ContextBoundary
  ): Promise<boolean>;
  
  async enforceBoundary(
    context: any,
    boundary: ContextBoundary
  ): Promise<any>;  // Returns filtered context
  
  getViolations(agentId?: string): ContextViolation[];
}
```

### 4. Built-in Decomposition Strategies

**File**: `src/core/decomposition-strategies.ts`

```typescript
export const FileBasedStrategy: DecompositionStrategy = {
  name: 'file-based',
  pattern: /refactor|organize|split.*module/i,
  extractors: [
    {
      name: 'identify-files',
      prompt: 'Identify all files that need to be modified. Return as JSON array of file paths.',
      contextWindow: 1000,
    },
    {
      name: 'group-components',
      prompt: 'Group files into logical components that can be worked on independently.',
      contextWindow: 2000,
    },
  ],
  agentTemplate: {
    role: 'file-refactor-agent',
    expertise: ['file-operations', 'code-structure', 'imports'],
    constraints: ['only modify assigned files', 'preserve exports', 'update imports'],
    deliverables: ['refactored files', 'import map', 'migration guide'],
  },
};

export const LayerBasedStrategy: DecompositionStrategy = {
  name: 'layer-based',
  pattern: /implement.*api|add.*endpoint|create.*service/i,
  extractors: [
    {
      name: 'identify-layers',
      prompt: 'Identify architectural layers: controller, service, repository, model.',
      contextWindow: 1500,
    },
    {
      name: 'layer-dependencies',
      prompt: 'Map dependencies between layers. Return as adjacency list.',
      contextWindow: 1000,
    },
  ],
  agentTemplate: {
    role: 'layer-implementation-agent',
    expertise: ['layered-architecture', 'api-design', 'data-flow'],
    constraints: ['respect layer boundaries', 'no circular dependencies'],
    deliverables: ['layer implementation', 'interface definitions', 'tests'],
  },
};

export const FeatureBasedStrategy: DecompositionStrategy = {
  name: 'feature-based',
  pattern: /implement.*feature|add.*support|enable.*functionality/i,
  extractors: [
    {
      name: 'identify-features',
      prompt: 'Break down into minimal viable sub-features that can be delivered independently.',
      contextWindow: 2000,
    },
    {
      name: 'feature-dependencies',
      prompt: 'Identify which features depend on others. Return dependency graph.',
      contextWindow: 1000,
    },
  ],
  agentTemplate: {
    role: 'feature-agent',
    expertise: ['feature-development', 'user-stories', 'acceptance-criteria'],
    constraints: ['vertical slice', 'deliverable independently'],
    deliverables: ['working feature', 'tests', 'documentation'],
  },
};
```

### 5. CLI Integration

**Update**: `src/cli.ts` and `src/commands/run.ts`

```bash
# Auto-decomposition (default for complex tasks)
magneto run complex-task.md

# Force decomposition
magneto run task.md --decompose

# Disable decomposition
magneto run task.md --no-decompose

# Max sub-agents
magneto run task.md --max-sub-agents 5

# Sequential execution
magneto run task.md --coordination sequential

# Parallel execution
magneto run task.md --coordination parallel

# View sub-agent status
magneto run task.md --decompose --watch-sub-agents
```

### 6. Configuration

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
    },
    "monitoring": {
      "logSubAgentOutput": true,
      "saveIntermediateResults": true,
      "reportProgress": true
    }
  }
}
```

### 7. Progress Reporting

**File**: `src/utils/sub-agent-reporter.ts`

```typescript
export class SubAgentReporter {
  // Real-time progress display
  renderStatus(report: SubAgentStatusReport): void;
  
  // Individual agent progress
  renderAgentProgress(agent: SubAgent): void;
  
  // Dependency graph visualization
  renderDependencyGraph(agents: SubAgent[]): void;
  
  // Final report
  renderFinalReport(results: SubAgentResult[]): void;
}
```

### 8. Memory Integration

Sub-agents should:
- Inherit relevant parent memories
- Create their own episodic memories
- Share learnings back to parent
- Update project knowledge base

```typescript
// In SubAgentOrchestrator
async prepareContext(component: TaskComponent, parent: Task): Promise<SubAgentContext> {
  const memoryStore = getGlobalMemoryStore();
  
  // Find relevant memories
  const relevantMemories = await memoryStore.query({
    tags: component.contextScope.patterns,
    limit: 10,
  });
  
  return {
    files: component.contextScope.files,
    symbols: component.contextScope.symbols,
    parentContext: this.selectParentContext(parent),
    sharedState: {},
    memoryIds: relevantMemories.map(m => m.id),
  };
}
```

## Implementation Phases

### Phase 1: Decomposition Engine (Week 1)
- [ ] Create `src/core/decomposition-engine.ts`
- [ ] Implement complexity analysis
- [ ] Create built-in strategies (file, layer, feature)
- [ ] Add strategy pattern matching
- [ ] Unit tests

### Phase 2: Sub-Agent Orchestrator (Week 1-2)
- [ ] Create `src/core/sub-agent-orchestrator.ts`
- [ ] Implement spawn/coordinate lifecycle
- [ ] Add execution patterns (sequential, parallel, hybrid)
- [ ] Implement context preparation
- [ ] Add result merging
- [ ] Integration with existing runner

### Phase 3: Context Boundary (Week 2)
- [ ] Create `src/core/context-boundary.ts`
- [ ] Implement access validation
- [ ] Add context filtering
- [ ] Violation tracking
- [ ] Security review

### Phase 4: CLI & Configuration (Week 2-3)
- [ ] Add decomposition flags to run command
- [ ] Add configuration schema
- [ ] Create `src/utils/sub-agent-reporter.ts`
- [ ] Add progress visualization
- [ ] Documentation

### Phase 5: Integration & Testing (Week 3)
- [ ] Memory integration
- [ ] Checkpoint integration
- [ ] Streaming output from sub-agents
- [ ] End-to-end tests
- [ ] Performance optimization

## Acceptance Criteria

- [ ] Task auto-decomposes when complexity > threshold
- [ ] Sub-agents receive focused, isolated context
- [ ] Multiple sub-agents can run in parallel
- [ ] Dependencies between sub-agents respected
- [ ] Results merged correctly
- [ ] Context boundaries enforced
- [ ] Progress reported for all sub-agents
- [ ] Failed sub-agents can be retried
- [ ] Can disable decomposition with `--no-decompose`
- [ ] All tests pass
- [ ] Documentation complete

## Testing Scenarios

1. **File Refactoring**
   ```bash
   magneto run refactor-auth.md
   # Should spawn sub-agents per file group
   ```

2. **API Implementation**
   ```bash
   magneto run implement-rest-api.md
   # Should decompose by layers (controller, service, repo)
   ```

3. **Complex Feature**
   ```bash
   magneto run add-payment-system.md --decompose
   # Should create sub-agents for different payment methods
   ```

4. **Simple Task (No Decomposition)**
   ```bash
   magneto run fix-typo.md
   # Should not decompose (too simple)
   ```

5. **Parallel Execution**
   ```bash
   magneto run task.md --coordination parallel --max-sub-agents 5
   # Should run up to 5 sub-agents concurrently
   ```

## Performance Requirements

- Decomposition analysis: <2s
- Sub-agent spawn: <500ms
- Context preparation: <1s per agent
- Parallel coordination overhead: <10%
- Max concurrent agents: 5 (configurable)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                  User Task                           │
└──────────────────────┬──────────────────────────────┘
                       │
           ┌───────────▼───────────┐
           │ Decomposition Engine   │
           │ - Analyze complexity   │
           │ - Match strategy       │
           │ - Extract components   │
           └───────────┬───────────┘
                       │
           ┌───────────▼───────────┐
           │ Sub-Agent Orchestrator│
           │ - Spawn agents        │
           │ - Coordinate execution│
           │ - Merge results       │
           └───────────┬───────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
   │ Agent 1 │   │ Agent 2 │   │ Agent 3 │
   │ (Files) │   │ (Layer) │   │(Feature)│
   └────┬────┘   └────┬────┘   └────┬────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
           ┌───────────▼───────────┐
           │ Result Merger         │
           │ - Combine outputs     │
           │ - Resolve conflicts   │
           │ - Create final result │
           └───────────────────────┘
```

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Context leaks | Strict boundary enforcement, violation tracking |
| Infinite recursion | Max depth limit, cycle detection |
| Coordination deadlock | Dependency graph validation, timeout |
| Performance overhead | Parallel execution, context caching |
| Over-decomposition | Complexity threshold, strategy validation |

## Documentation Requirements

- [ ] `docs/SUB-AGENTS.md` - User guide
- [ ] `docs/DECOMPOSITION.md` - Decomposition strategies
- [ ] `docs/COORDINATION.md` - Execution patterns
- [ ] Inline help for decomposition options

---

**Estimated Effort**: 3 weeks
**Dependencies**: 1.3 Agent Memory Persistence (for context sharing)
**Breaking Changes**: None (additive feature)
**Security Review**: Required (context isolation critical)
