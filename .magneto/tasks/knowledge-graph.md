---
name: knowledge-graph
description: Interactive codebase knowledge graph with code structure visualization, dependency mapping, and semantic search
type: feature
priority: high
telepathyLevel: 2
roles:
  - architect
  - backend
  - frontend
security:
  maxTelepathyLevel: 2
  requireApproval: false
---

# Knowledge Graph (Roadmap 1.5)

## Objective

Build an interactive visualization system that maps the codebase structure, showing files, modules, classes, functions, and their relationships. Enable developers to explore code architecture, find dependencies, and understand system topology through an interactive graph interface.

## Background

Understanding large codebases requires visualizing relationships between components. The knowledge graph will extract code entities and their connections, present them visually, and enable interactive exploration.

## Requirements

### 1. Graph Data Model

**File**: `src/core/knowledge-graph.ts`

```typescript
export interface GraphNode {
  id: string;
  label: string;
  type: 'file' | 'module' | 'class' | 'interface' | 'function' | 'method' | 'variable' | 'type' | 'import' | 'export';
  file?: string;
  module?: string;
  metadata: {
    line?: number;
    column?: number;
    signature?: string;
    visibility?: 'public' | 'private' | 'protected' | 'internal';
    isAbstract?: boolean;
    isStatic?: boolean;
    isAsync?: boolean;
    documentation?: string;
    complexity?: number;
    linesOfCode?: number;
  };
  metrics: {
    degree: number;           // Number of connections
    betweenness?: number;     // Graph centrality
    pageRank?: number;        // Importance score
    community?: number;      // Cluster assignment
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'imports' | 'exports' | 'extends' | 'implements' | 'calls' | 'references' | 'contains' | 'depends' | 'relates';
  metadata: {
    line?: number;
    confidence: number;       // 0-1, how sure we are
    isDynamic?: boolean;    // Runtime vs static
    tag?: 'EXTRACTED' | 'INFERRED' | 'MANUAL';
  };
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    projectName: string;
    totalNodes: number;
    totalEdges: number;
    totalCommunities: number;
    density: number;          // edges / max possible
    averageDegree: number;
    generatedAt: string;
    version: string;
  };
  communities: Array<{
    id: number;
    nodes: string[];
    dominantType: string;
    godNode?: string;         // Most connected node
  }>;
}

export interface GraphQuery {
  nodeTypes?: string[];
  edgeTypes?: string[];
  file?: string;
  module?: string;
  symbol?: string;
  community?: number;
  minDegree?: number;
  maxDegree?: number;
  search?: string;
  includeOrphans?: boolean;
}

export interface GraphStats {
  totalFiles: number;
  totalModules: number;
  totalClasses: number;
  totalFunctions: number;
  mostConnected: Array<{ node: GraphNode; degree: number }>;
  largestCommunities: Array<{ id: number; size: number }>;
  orphanNodes: GraphNode[];
  godNodes: GraphNode[];
}
```

### 2. Graph Builder

**File**: `src/core/graph-builder.ts`

```typescript
export interface GraphBuilderConfig {
  includeFiles: boolean;
  includeModules: boolean;
  includeClasses: boolean;
  includeFunctions: boolean;
  includeVariables: boolean;
  includeTypes: boolean;
  includeImports: boolean;
  maxDepth: number;
  filePatterns: string[];
  excludePatterns: string[];
  languageParsers: string[];
}

export class GraphBuilder extends EventEmitter {
  constructor(config: GraphBuilderConfig) {}

  async build(projectRoot: string): Promise<KnowledgeGraph>;
  
  // Incremental updates
  async addFile(filePath: string): Promise<void>;
  async removeFile(filePath: string): Promise<void>;
  async updateFile(filePath: string): Promise<void>;
  
  // Query operations
  async query(query: GraphQuery): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }>;
  async findPath(start: string, end: string): Promise<GraphEdge[]>;
  async findNeighborhood(center: string, depth: number): Promise<KnowledgeGraph>;
  async detectCommunities(): Promise<void>;
  async calculateMetrics(): Promise<void>;
  
  // Analysis
  async findGodNodes(threshold?: number): Promise<GraphNode[]>;
  async findOrphans(): Promise<GraphNode[]>;
  async findCycles(): Promise<GraphEdge[][]>;
  async calculateImpact(nodeId: string): Promise<number>;
}
```

### 3. Language Parsers

**File**: `src/core/graph-parsers.ts`

```typescript
export interface LanguageParser {
  language: string;
  extensions: string[];
  parse(filePath: string, content: string): Promise<ParsedFile>;
}

export interface ParsedFile {
  path: string;
  module?: string;
  imports: Array<{
    source: string;
    symbols: string[];
    isDefault?: boolean;
    isNamespace?: boolean;
    line: number;
  }>;
  exports: Array<{
    name: string;
    type: string;
    line: number;
  }>;
  declarations: Array<{
    name: string;
    type: 'class' | 'interface' | 'function' | 'method' | 'variable' | 'type';
    line: number;
    column: number;
    signature?: string;
    visibility?: string;
    isAbstract?: boolean;
    isStatic?: boolean;
    isAsync?: boolean;
    parent?: string;          // For nested declarations
  }>;
  calls: Array<{
    target: string;
    line: number;
  }>;
  references: Array<{
    symbol: string;
    line: number;
  }>;
}

// Built-in parsers
export class TypeScriptParser implements LanguageParser {
  language = 'typescript';
  extensions = ['.ts', '.tsx', '.mts', '.cts'];
  async parse(filePath: string, content: string): Promise<ParsedFile>;
}

export class JavaScriptParser implements LanguageParser {
  language = 'javascript';
  extensions = ['.js', '.jsx', '.mjs', '.cjs'];
  async parse(filePath: string, content: string): Promise<ParsedFile>;
}

export class PythonParser implements LanguageParser {
  language = 'python';
  extensions = ['.py', '.pyi'];
  async parse(filePath: string, content: string): Promise<ParsedFile>;
}
```

### 4. Graph Storage

**File**: `src/core/graph-storage.ts`

```typescript
export interface GraphStorage {
  async save(graph: KnowledgeGraph): Promise<void>;
  async load(): Promise<KnowledgeGraph | null>;
  async updateDelta(delta: GraphDelta): Promise<void>;
  async getVersion(): Promise<number>;
}

export interface GraphDelta {
  added: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  removed: {
    nodeIds: string[];
    edgeIds: string[];
  };
  modified: {
    nodes: Array<{ id: string; changes: Partial<GraphNode> }>;
    edges: Array<{ id: string; changes: Partial<GraphEdge> }>;
  };
  timestamp: string;
}

export class JsonFileStorage implements GraphStorage {
  constructor(private filePath: string) {}
  async save(graph: KnowledgeGraph): Promise<void>;
  async load(): Promise<KnowledgeGraph | null>;
}
```

### 5. CLI Commands

**Update**: `src/cli.ts`

```bash
# Build knowledge graph
magneto graph build                    # Build from scratch
magneto graph build --watch            # Watch mode, auto-rebuild
magneto graph build --incremental      # Incremental update

# Query graph
magneto graph query "auth"              # Search symbols
magneto graph show src/auth.ts          # Show file dependencies
magneto graph path A B                  # Find path between nodes
magneto graph neighbors src/auth.ts    # Show neighborhood

# Analysis
magneto graph stats                    # Show statistics
magneto graph communities              # Show clusters
magneto graph god-nodes                # Show most connected
magneto graph orphans                  # Show isolated nodes
magneto graph cycles                   # Find circular deps

# Visualization
magneto graph view                     # Open browser viewer
magneto graph export --format json     # Export graph data
magneto graph export --format dot      # Export for GraphViz
magneto graph export --format svg      # Export static SVG
```

### 6. Web Server for Viewer

**File**: `src/mcp/graph-server.ts`

```typescript
export interface GraphServerConfig {
  port: number;
  host: string;
  enableLiveReload: boolean;
}

export class GraphServer {
  constructor(private graph: KnowledgeGraph, config: GraphServerConfig) {}
  
  async start(): Promise<void>;
  async stop(): Promise<void>;
  
  // API endpoints
  async handleGetGraph(): Promise<KnowledgeGraph>;
  async handleQuery(query: GraphQuery): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }>;
  async handleGetNode(id: string): Promise<GraphNode | null>;
  async handleGetPath(from: string, to: string): Promise<GraphEdge[]>;
  async handleGetStats(): Promise<GraphStats>;
}
```

### 7. Configuration

Add to `magneto.config.json`:

```json
{
  "knowledgeGraph": {
    "enabled": true,
    "autoBuild": true,
    "buildOnStartup": false,
    "watch": false,
    "incremental": true,
    "storage": {
      "backend": "json",
      "path": ".magneto/graph.json"
    },
    "parsing": {
      "languages": ["typescript", "javascript", "python"],
      "includeFiles": ["src/**/*"],
      "excludeFiles": ["node_modules/**", "dist/**", "tests/**"],
      "maxFileSize": 1048576,
      "maxDepth": 5
    },
    "analysis": {
      "detectCommunities": true,
      "calculateMetrics": true,
      "findGodNodes": true,
      "minGodNodeDegree": 10
    },
    "viewer": {
      "enabled": true,
      "port": 9999,
      "host": "localhost",
      "openBrowser": true,
      "theme": "dark"
    }
  }
}
```

## Implementation Phases

### Phase 1: Core Graph Model (Week 1)
- [ ] Create `src/core/knowledge-graph.ts` with data types
- [ ] Create `src/core/graph-builder.ts` basic structure
- [ ] Create `src/core/graph-storage.ts` JSON storage
- [ ] Add unit tests

### Phase 2: TypeScript Parser (Week 1)
- [ ] Create `src/core/graph-parsers.ts`
- [ ] Implement TypeScript parser using TypeScript compiler API
- [ ] Extract imports, exports, declarations
- [ ] Build edges from references
- [ ] Add unit tests

### Phase 3: Graph Building (Week 2)
- [ ] Implement graph builder
- [ ] File walking and parsing
- [ ] Node/edge creation
- [ ] Community detection (simple clustering)
- [ ] Metrics calculation (degree, centrality)
- [ ] Integration tests

### Phase 4: CLI Commands (Week 2)
- [ ] Add `graph` subcommand to CLI
- [ ] Implement build command
- [ ] Implement query commands
- [ ] Implement analysis commands
- [ ] Add progress reporting

### Phase 5: Web Server & Viewer (Week 3)
- [ ] Create `src/mcp/graph-server.ts`
- [ ] Serve graph-viewer.html template
- [ ] Add REST API endpoints
- [ ] Implement live reload
- [ ] Add export formats (JSON, DOT, SVG)

### Phase 6: Advanced Features (Week 3)
- [ ] Incremental updates (file watching)
- [ ] Path finding algorithm
- [ ] Impact analysis
- [ ] Cycle detection
- [ ] Performance optimization
- [ ] Documentation

## Acceptance Criteria

- [ ] `magneto graph build` creates knowledge graph from codebase
- [ ] Graph includes files, classes, functions, imports
- [ ] `magneto graph view` opens interactive browser
- [ ] Can search and filter nodes
- [ ] Can navigate between connected nodes
- [ ] God nodes (highly connected) highlighted
- [ ] Communities (clusters) colored differently
- [ ] Export to JSON, DOT, SVG works
- [ ] Incremental updates work (watch mode)
- [ ] Analysis commands show useful insights
- [ ] All tests pass
- [ ] Documentation complete

## Testing Scenarios

1. **Build Graph**
   ```bash
   magneto graph build
   # Should create .magneto/graph.json
   ```

2. **View Graph**
   ```bash
   magneto graph view
   # Should open browser with interactive graph
   ```

3. **Query Graph**
   ```bash
   magneto graph query "auth"
   # Should show auth-related nodes
   ```

4. **Find Path**
   ```bash
   magneto graph path "src/app.ts" "src/utils/auth.ts"
   # Should show dependency path
   ```

5. **Analyze**
   ```bash
   magneto graph stats
   # Should show: files, modules, classes, functions, connections
   ```

## Performance Requirements

- Build graph (1000 files): <30s
- Incremental update (1 file): <1s
- Query response: <100ms
- Viewer load: <2s
- Memory usage: <200MB for 1000 file project

## Visualization Features

### Interactive Viewer
- Drag to pan
- Scroll to zoom
- Click to select
- Hover for tooltip
- Double-click to focus

### Filters
- By type (files, classes, functions)
- By community/cluster
- By connection degree
- Search by name

### Layout Options
- Force-directed (default)
- Hierarchical
- Circular
- Grid

## Future Enhancements

- [ ] Semantic similarity (embeddings)
- [ ] Change impact prediction
- [ ] Architecture violation detection
- [ ] Dead code detection
- [ ] Refactoring suggestions
- [ ] Historical evolution view
- [ ] Multi-repo graph linking

---

**Estimated Effort**: 3 weeks
**Dependencies**: None
**Breaking Changes**: None (additive feature)
**Security Review**: Not required (read-only analysis)
