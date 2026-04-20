import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../utils/logger';
import { resolveProjectRoot, isMagnetoProject } from '../utils/paths';
import { writeJson, ensureDir } from '../utils/fs';
import { 
  GraphBuilder, 
  getGlobalGraphBuilder 
} from '../core/graph-builder';
import { 
  KnowledgeGraph, 
  GraphNode, 
  GraphEdge, 
  queryGraph, 
  findNeighborhood, 
  findPath,
  calculateStats,
  NodeType,
  EdgeType
} from '../core/knowledge-graph';
import { JsonFileStorage } from '../core/graph-storage';

export interface GraphBuildOptions {
  watch?: boolean;
  incremental?: boolean;
}

export async function graphBuildCommand(options: GraphBuildOptions = {}): Promise<void> {
  const projectRoot = resolveProjectRoot();

  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto AI project. Run "magneto init" first.');
    process.exit(1);
  }

  const builder = getGlobalGraphBuilder();
  const storage = new JsonFileStorage(path.join(projectRoot, '.magneto', 'graph.json'));

  logger.info('Building knowledge graph...');
  logger.info(`Project: ${projectRoot}`);

  // Set up progress listeners
  builder.on('progress', ({ processed, total }) => {
    if (total > 0) {
      const percent = ((processed / total) * 100).toFixed(1);
      process.stdout.write(`\rProgress: ${percent}% (${processed}/${total} files)`);
    }
  });

  builder.on('build-completed', ({ duration, nodes, edges }) => {
    console.log(); // New line after progress
    logger.success(`Graph built in ${(duration / 1000).toFixed(1)}s`);
    logger.info(`  Nodes: ${nodes}`);
    logger.info(`  Edges: ${edges}`);
  });

  try {
    const graph = await builder.build(projectRoot);
    await storage.save(graph);
    
    // Also save a simplified version for viewer
    const viewerDataPath = path.join(projectRoot, '.magneto', 'graph-viewer-data.json');
    const simplified = simplifyForViewer(graph);
    await writeJson(viewerDataPath, simplified);

    logger.success(`Graph saved to .magneto/graph.json`);
    
    // Print stats
    const stats = calculateStats(graph);
    printStats(stats);

  } catch (err: any) {
    logger.error(`Failed to build graph: ${err.message}`);
    process.exit(1);
  }
}

export async function graphQueryCommand(query: string, options: {
  type?: string;
  file?: string;
  limit?: number;
}): Promise<void> {
  const projectRoot = resolveProjectRoot();
  const storage = new JsonFileStorage(path.join(projectRoot, '.magneto', 'graph.json'));
  
  const graph = await storage.load();
  if (!graph) {
    logger.error('No graph found. Run "magneto graph build" first.');
    process.exit(1);
  }

  const graphQuery = {
    search: query,
    nodeTypes: options.type ? options.type.split(',') as NodeType[] : undefined,
    file: options.file,
    limit: options.limit,
  };

  const result = queryGraph(graph, graphQuery);

  if (result.nodes.length === 0) {
    logger.info(`No nodes found matching "${query}"`);
    return;
  }

  logger.info(`Found ${result.nodes.length} nodes:\n`);

  for (const node of result.nodes) {
    console.log(`${node.type.toUpperCase()}: ${node.label}`);
    console.log(`  ID: ${node.id}`);
    if (node.file) console.log(`  File: ${node.file}`);
    if (node.module) console.log(`  Module: ${node.module}`);
    console.log(`  Connections: ${node.metrics.degree}`);
    if (node.metrics.isGodNode) console.log(`  ★ God Node`);
    console.log();
  }
}

export async function graphShowCommand(filePath: string): Promise<void> {
  const projectRoot = resolveProjectRoot();
  const storage = new JsonFileStorage(path.join(projectRoot, '.magneto', 'graph.json'));
  
  const graph = await storage.load();
  if (!graph) {
    logger.error('No graph found. Run "magneto graph build" first.');
    process.exit(1);
  }

  const relativePath = path.relative(projectRoot, path.resolve(projectRoot, filePath));
  
  const result = queryGraph(graph, { 
    file: relativePath,
    includeOrphans: true 
  });

  if (result.nodes.length === 0) {
    logger.info(`No nodes found for file: ${filePath}`);
    return;
  }

  logger.info(`Dependencies for ${filePath}:\n`);

  // Group by type
  const byType = new Map<string, GraphNode[]>();
  for (const node of result.nodes) {
    const list = byType.get(node.type) || [];
    list.push(node);
    byType.set(node.type, list);
  }

  for (const [type, nodes] of byType) {
    console.log(`${type.toUpperCase()} (${nodes.length}):`);
    for (const node of nodes) {
      console.log(`  - ${node.label}`);
    }
    console.log();
  }

  // Show imports/exports
  const fileEdges = graph.edges.filter(e => 
    result.nodes.some(n => n.id === e.source || n.id === e.target)
  );

  if (fileEdges.length > 0) {
    console.log('Relationships:');
    for (const edge of fileEdges.slice(0, 20)) {
      const source = graph.nodes.find(n => n.id === edge.source);
      const target = graph.nodes.find(n => n.id === edge.target);
      if (source && target) {
        console.log(`  ${source.label} ${edge.type} ${target.label}`);
      }
    }
    if (fileEdges.length > 20) {
      console.log(`  ... and ${fileEdges.length - 20} more`);
    }
  }
}

export async function graphPathCommand(from: string, to: string): Promise<void> {
  const projectRoot = resolveProjectRoot();
  const storage = new JsonFileStorage(path.join(projectRoot, '.magneto', 'graph.json'));
  
  const graph = await storage.load();
  if (!graph) {
    logger.error('No graph found. Run "magneto graph build" first.');
    process.exit(1);
  }

  // Find nodes matching the queries
  const fromNodes = queryGraph(graph, { search: from }).nodes;
  const toNodes = queryGraph(graph, { search: to }).nodes;

  if (fromNodes.length === 0) {
    logger.error(`No nodes found matching "${from}"`);
    process.exit(1);
  }

  if (toNodes.length === 0) {
    logger.error(`No nodes found matching "${to}"`);
    process.exit(1);
  }

  // Try to find path
  let foundPath: GraphEdge[] | null = null;
  let startNode: GraphNode | null = null;
  let endNode: GraphNode | null = null;

  for (const start of fromNodes) {
    for (const end of toNodes) {
      foundPath = findPath(graph, start.id, end.id);
      if (foundPath) {
        startNode = start;
        endNode = end;
        break;
      }
    }
    if (foundPath) break;
  }

  if (!foundPath || foundPath.length === 0) {
    logger.info(`No path found from "${from}" to "${to}"`);
    return;
  }

  logger.info(`Path from ${startNode!.label} to ${endNode!.label}:\n`);

  console.log(`Start: ${startNode!.label} (${startNode!.type})`);
  for (const edge of foundPath) {
    const target = graph.nodes.find(n => n.id === edge.target);
    if (target) {
      console.log(`  ${edge.type} → ${target.label} (${target.type})`);
    }
  }
  console.log(`End: ${endNode!.label}`);
}

export async function graphNeighborsCommand(nodeId: string, options: {
  depth?: number;
}): Promise<void> {
  const projectRoot = resolveProjectRoot();
  const storage = new JsonFileStorage(path.join(projectRoot, '.magneto', 'graph.json'));
  
  const graph = await storage.load();
  if (!graph) {
    logger.error('No graph found. Run "magneto graph build" first.');
    process.exit(1);
  }

  // Find the node
  const node = graph.nodes.find(n => 
    n.id === nodeId || n.label === nodeId || n.id.includes(nodeId)
  );

  if (!node) {
    logger.error(`Node not found: ${nodeId}`);
    process.exit(1);
  }

  const depth = options.depth || 1;
  const neighborhood = findNeighborhood(graph, node.id, depth);

  logger.info(`Neighborhood of ${node.label} (depth ${depth}):\n`);
  console.log(`Center: ${node.label} (${node.type})`);
  console.log(`Total nodes: ${neighborhood.nodes.length}`);
  console.log(`Total edges: ${neighborhood.edges.length}`);
  console.log();

  // Group by type
  const byType = new Map<string, GraphNode[]>();
  for (const n of neighborhood.nodes) {
    if (n.id !== node.id) {
      const list = byType.get(n.type) || [];
      list.push(n);
      byType.set(n.type, list);
    }
  }

  for (const [type, nodes] of byType) {
    console.log(`${type.toUpperCase()}:`);
    for (const n of nodes.slice(0, 10)) {
      console.log(`  - ${n.label}`);
    }
    if (nodes.length > 10) {
      console.log(`  ... and ${nodes.length - 10} more`);
    }
    console.log();
  }
}

export async function graphStatsCommand(): Promise<void> {
  const projectRoot = resolveProjectRoot();
  const storage = new JsonFileStorage(path.join(projectRoot, '.magneto', 'graph.json'));
  
  const graph = await storage.load();
  if (!graph) {
    logger.error('No graph found. Run "magneto graph build" first.');
    process.exit(1);
  }

  const stats = calculateStats(graph);
  printStats(stats);
}

export async function graphCommunitiesCommand(): Promise<void> {
  const projectRoot = resolveProjectRoot();
  const storage = new JsonFileStorage(path.join(projectRoot, '.magneto', 'graph.json'));
  
  const graph = await storage.load();
  if (!graph) {
    logger.error('No graph found. Run "magneto graph build" first.');
    process.exit(1);
  }

  logger.info('Communities detected in the graph:\n');

  for (const community of graph.communities.slice(0, 10)) {
    console.log(`Community ${community.id}:`);
    console.log(`  Size: ${community.nodes.length} nodes`);
    console.log(`  Dominant type: ${community.dominantType}`);
    if (community.godNode) {
      const god = graph.nodes.find(n => n.id === community.godNode);
      if (god) {
        console.log(`  God node: ${god.label}`);
      }
    }
    console.log();
  }
}

export async function graphGodNodesCommand(): Promise<void> {
  const projectRoot = resolveProjectRoot();
  const storage = new JsonFileStorage(path.join(projectRoot, '.magneto', 'graph.json'));
  
  const graph = await storage.load();
  if (!graph) {
    logger.error('No graph found. Run "magneto graph build" first.');
    process.exit(1);
  }

  const godNodes = graph.nodes.filter(n => n.metrics.isGodNode);

  if (godNodes.length === 0) {
    logger.info('No god nodes found (highly connected nodes)');
    return;
  }

  logger.info(`Found ${godNodes.length} god nodes:\n`);

  // Sort by degree
  const sorted = godNodes.sort((a, b) => b.metrics.degree - a.metrics.degree);

  for (const node of sorted.slice(0, 20)) {
    console.log(`${node.label} (${node.type})`);
    console.log(`  Connections: ${node.metrics.degree}`);
    if (node.file) console.log(`  File: ${node.file}`);
    if (node.module) console.log(`  Module: ${node.module}`);
    console.log();
  }
}

export async function graphExportCommand(options: {
  format?: string;
  output?: string;
}): Promise<void> {
  const projectRoot = resolveProjectRoot();
  const storage = new JsonFileStorage(path.join(projectRoot, '.magneto', 'graph.json'));
  
  const graph = await storage.load();
  if (!graph) {
    logger.error('No graph found. Run "magneto graph build" first.');
    process.exit(1);
  }

  const format = options.format || 'json';
  const outputPath = options.output || `graph.${format}`;

  let content: string;

  switch (format) {
    case 'json':
      content = JSON.stringify(graph, null, 2);
      break;
    case 'dot':
      content = exportToDot(graph);
      break;
    default:
      logger.error(`Unsupported format: ${format}`);
      process.exit(1);
  }

  fs.writeFileSync(outputPath, content);
  logger.success(`Graph exported to ${outputPath}`);
}

export async function graphViewCommand(): Promise<void> {
  const projectRoot = resolveProjectRoot();
  const storagePath = path.join(projectRoot, '.magneto', 'graph-viewer-data.json');

  if (!fs.existsSync(storagePath)) {
    logger.error('No graph data found. Run "magneto graph build" first.');
    process.exit(1);
  }

  // Copy viewer template to .magneto
  const templatePath = path.join(__dirname, '..', 'templates', 'graph-viewer.html');
  const viewerPath = path.join(projectRoot, '.magneto', 'graph-viewer.html');
  
  if (fs.existsSync(templatePath)) {
    let template = fs.readFileSync(templatePath, 'utf-8');
    
    // Inject the graph data
    const graphData = fs.readFileSync(storagePath, 'utf-8');
    template = template.replace('__GRAPH_JSON__', graphData);
    
    fs.writeFileSync(viewerPath, template);
    
    logger.success(`Graph viewer created: ${viewerPath}`);
    logger.info('Open this file in a browser to explore the graph');
    
    // Try to open browser
    try {
      const { exec } = require('child_process');
      const command = process.platform === 'darwin' ? 'open' : 
                     process.platform === 'win32' ? 'start' : 'xdg-open';
      exec(`${command} "${viewerPath}"`);
    } catch {
      // Ignore errors from opening browser
    }
  } else {
    logger.error('Graph viewer template not found');
    process.exit(1);
  }
}

// Helper functions
function printStats(stats: ReturnType<typeof calculateStats>): void {
  console.log('');
  console.log('Knowledge Graph Statistics');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Files:        ${stats.totalFiles}`);
  console.log(`Modules:      ${stats.totalModules}`);
  console.log(`Classes:      ${stats.totalClasses}`);
  console.log(`Interfaces:   ${stats.totalInterfaces}`);
  console.log(`Functions:    ${stats.totalFunctions}`);
  console.log(`Methods:      ${stats.totalMethods}`);
  console.log('');
  console.log(`Orphan nodes: ${stats.orphanNodes.length}`);
  console.log(`God nodes:    ${stats.godNodes.length}`);
  console.log('');
  
  if (stats.mostConnected.length > 0) {
    console.log('Most connected nodes:');
    for (const { node, degree } of stats.mostConnected.slice(0, 5)) {
      console.log(`  ${node.label} (${node.type}): ${degree} connections`);
    }
    console.log('');
  }

  if (stats.largestCommunities.length > 0) {
    console.log('Largest communities:');
    for (const { id, size, dominantType } of stats.largestCommunities) {
      console.log(`  Community ${id}: ${size} nodes (${dominantType})`);
    }
  }
}

function simplifyForViewer(graph: KnowledgeGraph): any {
  // Create a simplified version for the web viewer
  return {
    nodes: graph.nodes.map(n => ({
      id: n.id,
      label: n.label,
      type: n.type,
      file: n.file,
      module: n.module,
      community: n.metrics.community,
      degree: n.metrics.degree,
      isGodNode: n.metrics.isGodNode,
    })),
    edges: graph.edges.map(e => ({
      source: e.source,
      target: e.target,
      type: e.type,
      relation: e.type,
      confidence: e.metadata.confidence,
      tag: e.metadata.tag,
    })),
    metadata: {
      totalNodes: graph.metadata.totalNodes,
      totalEdges: graph.metadata.totalEdges,
      totalCommunities: graph.metadata.totalCommunities,
      projectName: graph.metadata.projectName,
    },
  };
}

function exportToDot(graph: KnowledgeGraph): string {
  let dot = 'digraph KnowledgeGraph {\n';
  dot += '  rankdir=TB;\n';
  dot += '  node [shape=box, style=rounded];\n\n';

  // Nodes
  for (const node of graph.nodes) {
    const color = getNodeColor(node.type);
    dot += `  "${node.id}" [label="${node.label}", fillcolor="${color}", style=filled];\n`;
  }

  dot += '\n';

  // Edges
  for (const edge of graph.edges) {
    dot += `  "${edge.source}" -> "${edge.target}" [label="${edge.type}"];\n`;
  }

  dot += '}\n';
  return dot;
}

function getNodeColor(type: string): string {
  const colors: Record<string, string> = {
    file: '#e3f2fd',
    module: '#fff3e0',
    class: '#e8f5e9',
    interface: '#fce4ec',
    function: '#f3e5f5',
    method: '#f3e5f5',
    variable: '#efebe9',
    type: '#e0f2f1',
    import: '#fafafa',
    export: '#fafafa',
  };
  return colors[type] || '#fafafa';
}
