import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { KnowledgeGraph, GraphNode, GraphEdge, NodeType, EdgeType, GraphQuery, GraphStats, GraphDelta, queryGraph, findNeighborhood, findPath, calculateStats, detectCommunities, calculateMetrics } from './knowledge-graph';
import { logger } from '../utils/logger';

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

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
  maxFileSize: number;
}

export interface ParsedImport {
  source: string;
  symbols: string[];
  isDefault?: boolean;
  isNamespace?: boolean;
  line: number;
}

export interface ParsedExport {
  name: string;
  type: string;
  line: number;
}

export interface ParsedDeclaration {
  name: string;
  type: 'class' | 'interface' | 'function' | 'method' | 'variable' | 'type';
  line: number;
  column: number;
  signature?: string;
  visibility?: string;
  isAbstract?: boolean;
  isStatic?: boolean;
  isAsync?: boolean;
  parent?: string;
}

export interface ParsedFile {
  path: string;
  module?: string;
  imports: ParsedImport[];
  exports: ParsedExport[];
  declarations: ParsedDeclaration[];
}

export class GraphBuilder extends EventEmitter {
  private config: GraphBuilderConfig;
  private graph: KnowledgeGraph;
  private fileCache: Map<string, string> = new Map();

  constructor(config: Partial<GraphBuilderConfig> = {}) {
    super();
    this.config = {
      includeFiles: true,
      includeModules: true,
      includeClasses: true,
      includeFunctions: true,
      includeVariables: false,
      includeTypes: true,
      includeImports: true,
      maxDepth: 5,
      filePatterns: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
      excludePatterns: ['node_modules/**', 'dist/**', '.git/**', '**/*.test.ts', '**/*.spec.ts'],
      maxFileSize: 1048576, // 1MB
      ...config,
    };

    this.graph = this.createEmptyGraph();
  }

  async build(projectRoot: string): Promise<KnowledgeGraph> {
    this.emit('build-started', { projectRoot });
    const startTime = Date.now();

    this.graph = this.createEmptyGraph();
    this.graph.metadata.projectRoot = projectRoot;
    this.graph.metadata.projectName = path.basename(projectRoot);

    // Find all source files
    const files = await this.findSourceFiles(projectRoot);
    this.emit('files-discovered', { count: files.length });

    // Parse each file
    let processed = 0;
    for (const filePath of files) {
      try {
        await this.parseAndAddFile(filePath, projectRoot);
        processed++;
        
        if (processed % 10 === 0) {
          this.emit('progress', { processed, total: files.length });
        }
      } catch (err) {
        logger.warn(`Failed to parse ${filePath}: ${err}`);
      }
    }

    // Build edges from imports and exports
    this.buildEdges();

    // Detect communities
    detectCommunities(this.graph);

    // Calculate metrics
    calculateMetrics(this.graph);

    // Update metadata
    this.graph.metadata.totalNodes = this.graph.nodes.length;
    this.graph.metadata.totalEdges = this.graph.edges.length;
    this.graph.metadata.generatedAt = new Date().toISOString();

    const duration = Date.now() - startTime;
    this.emit('build-completed', { 
      duration, 
      nodes: this.graph.nodes.length,
      edges: this.graph.edges.length,
    });

    return this.graph;
  }

  async addFile(filePath: string, projectRoot: string): Promise<void> {
    await this.parseAndAddFile(filePath, projectRoot);
    this.buildEdges();
    calculateMetrics(this.graph);
  }

  async removeFile(filePath: string): Promise<void> {
    // Remove nodes for this file
    this.graph.nodes = this.graph.nodes.filter(n => n.file !== filePath);
    
    // Remove edges connected to removed nodes
    const nodeIds = new Set(this.graph.nodes.map(n => n.id));
    this.graph.edges = this.graph.edges.filter(e => 
      nodeIds.has(e.source) && nodeIds.has(e.target)
    );

    this.fileCache.delete(filePath);
    calculateMetrics(this.graph);
  }

  async updateFile(filePath: string, projectRoot: string): Promise<void> {
    await this.removeFile(filePath);
    await this.addFile(filePath, projectRoot);
  }

  query(query: GraphQuery): { nodes: GraphNode[]; edges: GraphEdge[] } {
    return queryGraph(this.graph, query);
  }

  findNeighborhood(centerId: string, depth: number = 1): { nodes: GraphNode[]; edges: GraphEdge[] } {
    return findNeighborhood(this.graph, centerId, depth);
  }

  findPath(startId: string, endId: string): GraphEdge[] | null {
    return findPath(this.graph, startId, endId);
  }

  getStats(): GraphStats {
    return calculateStats(this.graph);
  }

  getGraph(): KnowledgeGraph {
    return this.graph;
  }

  private createEmptyGraph(): KnowledgeGraph {
    return {
      nodes: [],
      edges: [],
      metadata: {
        projectName: '',
        projectRoot: '',
        totalNodes: 0,
        totalEdges: 0,
        totalCommunities: 0,
        density: 0,
        averageDegree: 0,
        generatedAt: '',
        version: '1.0.0',
      },
      communities: [],
    };
  }

  private async findSourceFiles(projectRoot: string): Promise<string[]> {
    const files: string[] = [];

    async function walk(dir: string, builder: GraphBuilder) {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(projectRoot, fullPath);

        if (entry.isDirectory()) {
          // Check exclude patterns
          if (builder.shouldExclude(relativePath)) continue;
          await walk(fullPath, builder);
        } else if (entry.isFile()) {
          // Check if matches patterns
          if (builder.shouldInclude(relativePath)) {
            // Check file size
            try {
              const stats = await stat(fullPath);
              if (stats.size <= builder.config.maxFileSize) {
                files.push(fullPath);
              }
            } catch {
              // Skip files we can't stat
            }
          }
        }
      }
    }

    await walk(projectRoot, this);
    return files;
  }

  private shouldInclude(relativePath: string): boolean {
    // Simple glob matching
    for (const pattern of this.config.filePatterns) {
      const regex = this.globToRegex(pattern);
      if (regex.test(relativePath)) {
        return true;
      }
    }
    return false;
  }

  private shouldExclude(relativePath: string): boolean {
    for (const pattern of this.config.excludePatterns) {
      const regex = this.globToRegex(pattern);
      if (regex.test(relativePath)) {
        return true;
      }
    }
    return false;
  }

  private globToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/\*\*/g, '{{GLOBSTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.')
      .replace(/\//g, '\\/')
      .replace(/{{GLOBSTAR}}/g, '.*');
    return new RegExp(`^${escaped}$`);
  }

  private async parseAndAddFile(filePath: string, projectRoot: string): Promise<void> {
    const content = await readFile(filePath, 'utf-8');
    this.fileCache.set(filePath, content);

    const relativePath = path.relative(projectRoot, filePath);
    const extension = path.extname(filePath);

    // Create file node
    if (this.config.includeFiles) {
      const fileNode: GraphNode = {
        id: `file:${relativePath}`,
        label: path.basename(filePath),
        type: 'file',
        file: relativePath,
        metadata: {
          linesOfCode: content.split('\n').length,
        },
        metrics: { degree: 0 },
      };
      this.graph.nodes.push(fileNode);
    }

    // Parse based on language
    let parsed: ParsedFile | null = null;

    if (['.ts', '.tsx', '.mts', '.cts'].includes(extension)) {
      parsed = this.parseTypeScript(filePath, relativePath, content);
    } else if (['.js', '.jsx', '.mjs', '.cjs'].includes(extension)) {
      parsed = this.parseJavaScript(filePath, relativePath, content);
    }

    if (parsed) {
      // Add module node
      if (this.config.includeModules && parsed.module) {
        const moduleNode: GraphNode = {
          id: `module:${parsed.module}`,
          label: parsed.module,
          type: 'module',
          file: relativePath,
          metadata: {},
          metrics: { degree: 0 },
        };
        
        if (!this.graph.nodes.find(n => n.id === moduleNode.id)) {
          this.graph.nodes.push(moduleNode);
        }

        // Add contains edge
        this.graph.edges.push({
          id: `contains:${relativePath}:${parsed.module}`,
          source: `file:${relativePath}`,
          target: `module:${parsed.module}`,
          type: 'contains',
          metadata: { confidence: 1.0, tag: 'EXTRACTED' },
        });
      }

      // Add import nodes and edges
      if (this.config.includeImports) {
        for (const imp of parsed.imports) {
          const importId = `import:${relativePath}:${imp.source}`;
          
          const importNode: GraphNode = {
            id: importId,
            label: imp.source,
            type: 'import',
            file: relativePath,
            metadata: { line: imp.line },
            metrics: { degree: 0 },
          };
          this.graph.nodes.push(importNode);

          // Add import edge
          this.graph.edges.push({
            id: `imports:${relativePath}:${imp.source}`,
            source: `file:${relativePath}`,
            target: importId,
            type: 'imports',
            metadata: { confidence: 1.0, line: imp.line, tag: 'EXTRACTED' },
          });
        }
      }

      // Add declaration nodes
      for (const decl of parsed.declarations) {
        let nodeType: NodeType = 'function';
        if (decl.type === 'class') nodeType = 'class';
        else if (decl.type === 'interface') nodeType = 'interface';
        else if (decl.type === 'method') nodeType = 'method';
        else if (decl.type === 'variable') nodeType = 'variable';
        else if (decl.type === 'type') nodeType = 'type';

        // Check if we should include this type
        if (!this.shouldIncludeType(nodeType)) continue;

        const declId = `${nodeType}:${relativePath}:${decl.name}`;
        
        const declNode: GraphNode = {
          id: declId,
          label: decl.name,
          type: nodeType,
          file: relativePath,
          module: parsed.module,
          metadata: {
            line: decl.line,
            column: decl.column,
            signature: decl.signature,
            visibility: decl.visibility as any,
            isAbstract: decl.isAbstract,
            isStatic: decl.isStatic,
            isAsync: decl.isAsync,
          },
          metrics: { degree: 0 },
        };
        this.graph.nodes.push(declNode);

        // Add contains edge
        this.graph.edges.push({
          id: `contains:${relativePath}:${decl.name}`,
          source: `file:${relativePath}`,
          target: declId,
          type: 'contains',
          metadata: { confidence: 1.0, line: decl.line, tag: 'EXTRACTED' },
        });
      }
    }
  }

  private shouldIncludeType(type: NodeType): boolean {
    switch (type) {
      case 'class': return this.config.includeClasses;
      case 'interface': return this.config.includeTypes;
      case 'function': return this.config.includeFunctions;
      case 'method': return this.config.includeFunctions;
      case 'variable': return this.config.includeVariables;
      case 'type': return this.config.includeTypes;
      default: return true;
    }
  }

  private parseTypeScript(filePath: string, relativePath: string, content: string): ParsedFile {
    // Simple regex-based parsing (in production, use TypeScript compiler API)
    const parsed: ParsedFile = {
      path: relativePath,
      imports: [],
      exports: [],
      declarations: [],
    };

    // Extract module name from package or directory
    const dirName = path.dirname(relativePath);
    parsed.module = dirName === '.' ? 'root' : dirName.replace(/\\/g, '/');

    // Parse imports
    const importRegex = /import\s+(?:(\*\s+as\s+(\w+))|(\{[^}]*\})|(\w+))\s+from\s+['"]([^'"]+)['"];?/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      const namespaceImport = match[2];
      const namedImports = match[3];
      const defaultImport = match[4];
      const source = match[5];

      const symbols: string[] = [];
      if (namespaceImport) symbols.push(namespaceImport);
      if (defaultImport) symbols.push(defaultImport);
      if (namedImports) {
        // Extract names from { a, b, c }
        const names = namedImports.replace(/[{}\s]/g, '').split(',').filter(Boolean);
        symbols.push(...names);
      }

      parsed.imports.push({
        source,
        symbols,
        isDefault: !!defaultImport,
        isNamespace: !!namespaceImport,
        line,
      });
    }

    // Parse class declarations
    const classRegex = /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/g;
    while ((match = classRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      const isAbstract = match[0].includes('abstract');
      
      parsed.declarations.push({
        name: match[1],
        type: 'class',
        line,
        column: 0,
        isAbstract,
        visibility: match[0].includes('export') ? 'public' : 'internal',
      });
    }

    // Parse interface declarations
    const interfaceRegex = /(?:export\s+)?interface\s+(\w+)(?:\s+extends\s+([^{]+))?/g;
    while ((match = interfaceRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      
      parsed.declarations.push({
        name: match[1],
        type: 'interface',
        line,
        column: 0,
        visibility: match[0].includes('export') ? 'public' : 'internal',
      });
    }

    // Parse function declarations
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
    while ((match = functionRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      const isAsync = match[0].includes('async');
      
      parsed.declarations.push({
        name: match[1],
        type: 'function',
        line,
        column: 0,
        isAsync,
        visibility: match[0].includes('export') ? 'public' : 'internal',
      });
    }

    // Parse exports
    const exportRegex = /export\s+(?:default\s+)?(?:class|interface|function|const|let|var|type)\s+(\w+)/g;
    while ((match = exportRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      
      parsed.exports.push({
        name: match[1],
        type: 'declaration',
        line,
      });
    }

    return parsed;
  }

  private parseJavaScript(filePath: string, relativePath: string, content: string): ParsedFile {
    // Similar to TypeScript but simpler
    const parsed = this.parseTypeScript(filePath, relativePath, content);
    parsed.module = path.dirname(relativePath) === '.' ? 'root' : path.dirname(relativePath).replace(/\\/g, '/');
    return parsed;
  }

  private buildEdges(): void {
    // Build edges from imports to exports
    const exportsByName = new Map<string, GraphNode>();
    
    for (const node of this.graph.nodes) {
      if (node.type === 'class' || node.type === 'interface' || node.type === 'function') {
        // Map by name (simplified - in production, use proper module resolution)
        exportsByName.set(node.label, node);
        exportsByName.set(`${node.file}:${node.label}`, node);
      }
    }

    // Connect imports to their targets
    for (const node of this.graph.nodes) {
      if (node.type === 'import') {
        // Try to find matching export
        const target = exportsByName.get(node.label);
        if (target) {
          this.graph.edges.push({
            id: `depends:${node.id}:${target.id}`,
            source: node.id,
            target: target.id,
            type: 'depends',
            metadata: { confidence: 0.8, tag: 'INFERRED' },
          });
        }
      }
    }

    // Remove duplicate edges
    const seen = new Set<string>();
    this.graph.edges = this.graph.edges.filter(edge => {
      const key = `${edge.source}-${edge.target}-${edge.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

// Singleton
let globalBuilder: GraphBuilder | null = null;

export function getGlobalGraphBuilder(): GraphBuilder {
  if (!globalBuilder) {
    globalBuilder = new GraphBuilder();
  }
  return globalBuilder;
}

export function setGlobalGraphBuilder(builder: GraphBuilder): void {
  globalBuilder = builder;
}
