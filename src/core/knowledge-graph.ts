// Knowledge Graph Types and Data Model

export type NodeType = 
  | 'file' 
  | 'module' 
  | 'class' 
  | 'interface' 
  | 'function' 
  | 'method' 
  | 'variable' 
  | 'type' 
  | 'import' 
  | 'export';

export type EdgeType = 
  | 'imports' 
  | 'exports' 
  | 'extends' 
  | 'implements' 
  | 'calls' 
  | 'references' 
  | 'contains' 
  | 'depends' 
  | 'relates';

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
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
    degree: number;
    betweenness?: number;
    pageRank?: number;
    community?: number;
    isGodNode?: boolean;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  metadata: {
    line?: number;
    confidence: number;
    isDynamic?: boolean;
    tag?: 'EXTRACTED' | 'INFERRED' | 'MANUAL';
  };
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    projectName: string;
    projectRoot: string;
    totalNodes: number;
    totalEdges: number;
    totalCommunities: number;
    density: number;
    averageDegree: number;
    generatedAt: string;
    version: string;
  };
  communities: Array<{
    id: number;
    nodes: string[];
    dominantType: string;
    godNode?: string;
  }>;
}

export interface GraphQuery {
  nodeTypes?: NodeType[];
  edgeTypes?: EdgeType[];
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
  totalInterfaces: number;
  totalFunctions: number;
  totalMethods: number;
  mostConnected: Array<{ node: GraphNode; degree: number }>;
  largestCommunities: Array<{ id: number; size: number; dominantType: string }>;
  orphanNodes: GraphNode[];
  godNodes: GraphNode[];
  circularDependencies: string[][];
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

// Utility functions
export function createNode(
  id: string,
  label: string,
  type: NodeType,
  options: Partial<GraphNode> = {}
): GraphNode {
  return {
    id,
    label,
    type,
    file: options.file,
    module: options.module,
    metadata: {
      ...options.metadata,
    },
    metrics: {
      degree: 0,
      ...options.metrics,
    },
  };
}

export function createEdge(
  source: string,
  target: string,
  type: EdgeType,
  options: Partial<GraphEdge> = {}
): GraphEdge {
  return {
    id: `edge-${source}-${target}-${type}-${Date.now()}`,
    source,
    target,
    type,
    metadata: {
      confidence: 1.0,
      tag: 'EXTRACTED',
      ...options.metadata,
    },
  };
}

export function queryGraph(graph: KnowledgeGraph, query: GraphQuery): { nodes: GraphNode[]; edges: GraphEdge[] } {
  let nodes = [...graph.nodes];
  let edges = [...graph.edges];

  // Filter by node types
  if (query.nodeTypes && query.nodeTypes.length > 0) {
    nodes = nodes.filter(n => query.nodeTypes!.includes(n.type));
  }

  // Filter by file
  if (query.file) {
    nodes = nodes.filter(n => n.file === query.file);
  }

  // Filter by module
  if (query.module) {
    nodes = nodes.filter(n => n.module === query.module);
  }

  // Filter by community
  if (query.community !== undefined) {
    nodes = nodes.filter(n => n.metrics.community === query.community);
  }

  // Filter by degree
  if (query.minDegree !== undefined) {
    nodes = nodes.filter(n => n.metrics.degree >= query.minDegree!);
  }
  if (query.maxDegree !== undefined) {
    nodes = nodes.filter(n => n.metrics.degree <= query.maxDegree!);
  }

  // Search by name
  if (query.search) {
    const search = query.search.toLowerCase();
    nodes = nodes.filter(n => 
      n.label.toLowerCase().includes(search) ||
      n.id.toLowerCase().includes(search)
    );
  }

  // Exclude orphans
  if (!query.includeOrphans) {
    nodes = nodes.filter(n => n.metrics.degree > 0);
  }

  // Get node IDs for edge filtering
  const nodeIds = new Set(nodes.map(n => n.id));

  // Filter edges
  edges = edges.filter(e => 
    nodeIds.has(e.source) && nodeIds.has(e.target)
  );

  // Filter by edge types
  if (query.edgeTypes && query.edgeTypes.length > 0) {
    edges = edges.filter(e => query.edgeTypes!.includes(e.type));
  }

  return { nodes, edges };
}

export function findNeighborhood(
  graph: KnowledgeGraph, 
  centerId: string, 
  depth: number = 1
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const visited = new Set<string>([centerId]);
  const frontier = new Set<string>([centerId]);
  const resultEdges: GraphEdge[] = [];

  for (let i = 0; i < depth; i++) {
    const newFrontier = new Set<string>();
    
    for (const nodeId of frontier) {
      // Find edges from this node
      const outgoing = graph.edges.filter(e => e.source === nodeId);
      const incoming = graph.edges.filter(e => e.target === nodeId);
      
      resultEdges.push(...outgoing, ...incoming);
      
      // Add connected nodes to new frontier
      for (const edge of outgoing) {
        if (!visited.has(edge.target)) {
          newFrontier.add(edge.target);
          visited.add(edge.target);
        }
      }
      for (const edge of incoming) {
        if (!visited.has(edge.source)) {
          newFrontier.add(edge.source);
          visited.add(edge.source);
        }
      }
    }

    frontier.clear();
    newFrontier.forEach(id => frontier.add(id));
  }

  const resultNodes = graph.nodes.filter(n => visited.has(n.id));
  
  return { nodes: resultNodes, edges: resultEdges };
}

export function findPath(
  graph: KnowledgeGraph,
  startId: string,
  endId: string
): GraphEdge[] | null {
  // BFS to find shortest path
  const queue: Array<{ nodeId: string; path: GraphEdge[] }> = [
    { nodeId: startId, path: [] }
  ];
  const visited = new Set<string>([startId]);

  while (queue.length > 0) {
    const { nodeId, path } = queue.shift()!;

    if (nodeId === endId) {
      return path;
    }

    // Find outgoing edges
    const outgoing = graph.edges.filter(e => e.source === nodeId);

    for (const edge of outgoing) {
      if (!visited.has(edge.target)) {
        visited.add(edge.target);
        queue.push({
          nodeId: edge.target,
          path: [...path, edge]
        });
      }
    }
  }

  return null; // No path found
}

export function calculateStats(graph: KnowledgeGraph): GraphStats {
  const byType = new Map<NodeType, number>();
  
  for (const node of graph.nodes) {
    byType.set(node.type, (byType.get(node.type) || 0) + 1);
  }

  // Find most connected nodes
  const mostConnected = [...graph.nodes]
    .sort((a, b) => b.metrics.degree - a.metrics.degree)
    .slice(0, 10)
    .map(n => ({ node: n, degree: n.metrics.degree }));

  // Find orphan nodes
  const orphanNodes = graph.nodes.filter(n => n.metrics.degree === 0);

  // Find god nodes (highly connected)
  const avgDegree = graph.metadata.averageDegree;
  const godNodes = graph.nodes.filter(n => n.metrics.degree > avgDegree * 3);

  // Calculate community stats
  const communityStats = new Map<number, { size: number; types: Map<string, number> }>();
  
  for (const node of graph.nodes) {
    const communityId = node.metrics.community ?? -1;
    if (communityId >= 0) {
      const stats = communityStats.get(communityId) || { size: 0, types: new Map() };
      stats.size++;
      stats.types.set(node.type, (stats.types.get(node.type) || 0) + 1);
      communityStats.set(communityId, stats);
    }
  }

  const largestCommunities = [...communityStats.entries()]
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 5)
    .map(([id, stats]) => ({
      id,
      size: stats.size,
      dominantType: [...stats.types.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown'
    }));

  return {
    totalFiles: byType.get('file') || 0,
    totalModules: byType.get('module') || 0,
    totalClasses: byType.get('class') || 0,
    totalInterfaces: byType.get('interface') || 0,
    totalFunctions: byType.get('function') || 0,
    totalMethods: byType.get('method') || 0,
    mostConnected,
    largestCommunities,
    orphanNodes,
    godNodes,
    circularDependencies: [], // Would need cycle detection algorithm
  };
}

// Simple community detection using label propagation
export function detectCommunities(graph: KnowledgeGraph): KnowledgeGraph {
  const nodeCommunities = new Map<string, number>();
  
  // Initialize each node with its own community
  graph.nodes.forEach((node, index) => {
    nodeCommunities.set(node.id, index);
  });

  // Propagate labels
  let changed = true;
  let iterations = 0;
  const maxIterations = 100;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    for (const node of graph.nodes) {
      // Get neighbor communities
      const neighborCommunities: number[] = [];
      
      for (const edge of graph.edges) {
        if (edge.source === node.id) {
          neighborCommunities.push(nodeCommunities.get(edge.target)!);
        } else if (edge.target === node.id) {
          neighborCommunities.push(nodeCommunities.get(edge.source)!);
        }
      }

      if (neighborCommunities.length === 0) continue;

      // Find most common community
      const counts = new Map<number, number>();
      for (const c of neighborCommunities) {
        counts.set(c, (counts.get(c) || 0) + 1);
      }

      const mostCommon = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      if (mostCommon && mostCommon[0] !== nodeCommunities.get(node.id)) {
        nodeCommunities.set(node.id, mostCommon[0]);
        changed = true;
      }
    }
  }

  // Renumber communities starting from 0
  const communityMap = new Map<number, number>();
  let nextCommunity = 0;

  for (const node of graph.nodes) {
    const oldCommunity = nodeCommunities.get(node.id)!;
    if (!communityMap.has(oldCommunity)) {
      communityMap.set(oldCommunity, nextCommunity++);
    }
    node.metrics.community = communityMap.get(oldCommunity);
  }

  // Build community list
  const communities: KnowledgeGraph['communities'] = [];
  const communityNodes = new Map<number, string[]>();

  for (const [nodeId, communityId] of nodeCommunities) {
    const newId = communityMap.get(communityId)!;
    const nodes = communityNodes.get(newId) || [];
    nodes.push(nodeId);
    communityNodes.set(newId, nodes);
  }

  for (const [id, nodes] of communityNodes) {
    const communityId = communityMap.get(id)!;
    const types = new Map<string, number>();
    
    for (const nodeId of nodes) {
      const node = graph.nodes.find(n => n.id === nodeId);
      if (node) {
        types.set(node.type, (types.get(node.type) || 0) + 1);
      }
    }

    const dominantType = [...types.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
    
    // Find god node
    let godNode: string | undefined;
    let maxDegree = 0;
    
    for (const nodeId of nodes) {
      const node = graph.nodes.find(n => n.id === nodeId);
      if (node && node.metrics.degree > maxDegree) {
        maxDegree = node.metrics.degree;
        godNode = nodeId;
      }
    }

    communities.push({
      id: communityId,
      nodes,
      dominantType,
      godNode,
    });
  }

  graph.communities = communities;
  graph.metadata.totalCommunities = communities.length;

  return graph;
}

// Calculate graph metrics
export function calculateMetrics(graph: KnowledgeGraph): KnowledgeGraph {
  // Calculate degrees
  const degrees = new Map<string, number>();
  
  for (const edge of graph.edges) {
    degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
    degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
  }

  for (const node of graph.nodes) {
    node.metrics.degree = degrees.get(node.id) || 0;
  }

  // Calculate average degree
  const totalDegree = [...degrees.values()].reduce((a, b) => a + b, 0);
  graph.metadata.averageDegree = totalDegree / graph.nodes.length;

  // Mark god nodes (top 5% by degree)
  const sortedByDegree = [...graph.nodes].sort((a, b) => b.metrics.degree - a.metrics.degree);
  const godNodeCount = Math.max(1, Math.floor(graph.nodes.length * 0.05));
  
  for (let i = 0; i < godNodeCount && i < sortedByDegree.length; i++) {
    sortedByDegree[i].metrics.isGodNode = true;
  }

  // Calculate density
  const maxEdges = graph.nodes.length * (graph.nodes.length - 1) / 2;
  graph.metadata.density = graph.edges.length / maxEdges;

  return graph;
}
