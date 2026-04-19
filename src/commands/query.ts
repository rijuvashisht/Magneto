/**
 * query.ts — Graph querying commands for Magneto AI.
 *
 * `magneto query <text>`   — BFS subgraph extraction from the knowledge graph
 * `magneto path <a> <b>`   — shortest path between two nodes
 */

import * as path from 'path';
import { logger } from '../utils/logger';
import { resolveProjectRoot, isMagnetoProject, magnetoPath } from '../utils/paths';
import { fileExists, readJson } from '../utils/fs';
import type { KnowledgeGraph, GraphNode, GraphEdge } from '../core/graph-engine';

export interface QueryOptions {
  graph?: string;
  budget?: string;
  dfs?: boolean;
}

export async function queryCommand(queryText: string, options: QueryOptions): Promise<void> {
  const projectRoot = resolveProjectRoot();
  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto AI project. Run "magneto init" first.');
    process.exit(1);
  }

  const graphPath = options.graph || magnetoPath(projectRoot, 'memory', 'graph.json');
  if (!fileExists(graphPath)) {
    logger.error('No knowledge graph found. Run "magneto analyze" first.');
    process.exit(1);
  }

  const graph = readJson<KnowledgeGraph>(graphPath);
  const budget = parseInt(options.budget || '2000', 10);
  const query = queryText.toLowerCase();

  // Find seed nodes matching the query
  const seeds = graph.nodes.filter(
    (n) =>
      n.label.toLowerCase().includes(query) ||
      n.id.toLowerCase().includes(query) ||
      (n.file && n.file.toLowerCase().includes(query)) ||
      (n.module && n.module.toLowerCase().includes(query))
  );

  if (seeds.length === 0) {
    logger.warn(`No nodes matching "${queryText}". Try a broader query.`);
    return;
  }

  logger.info(`Found ${seeds.length} matching nodes. Extracting subgraph...\n`);

  // BFS/DFS from seed nodes
  const visited = new Set<string>();
  const resultEdges: GraphEdge[] = [];
  const queue: string[] = seeds.map((n) => n.id);
  let tokenEstimate = 0;

  // Build adjacency
  const adj = new Map<string, { node: string; edge: GraphEdge }[]>();
  for (const edge of graph.edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    if (!adj.has(edge.target)) adj.set(edge.target, []);
    adj.get(edge.source)!.push({ node: edge.target, edge });
    adj.get(edge.target)!.push({ node: edge.source, edge });
  }

  const traverse = options.dfs ? traverseDFS : traverseBFS;
  traverse(queue, adj, visited, resultEdges, budget, () => tokenEstimate, (t) => { tokenEstimate = t; });

  // Collect result nodes
  const resultNodes = graph.nodes.filter((n) => visited.has(n.id));

  // Render output
  console.log('');
  console.log('## Query Results');
  console.log('');
  console.log(`**Query:** "${queryText}"`);
  console.log(`**Nodes returned:** ${resultNodes.length}`);
  console.log(`**Edges returned:** ${resultEdges.length}`);
  console.log(`**Token estimate:** ~${tokenEstimate}`);
  console.log('');

  // Seed nodes
  console.log('### Matching Nodes');
  console.log('');
  for (const seed of seeds) {
    console.log(`- **\`${seed.label}\`** (${seed.type}, community ${seed.community}, degree ${seed.degree})`);
  }
  console.log('');

  // Edges
  if (resultEdges.length > 0) {
    console.log('### Connections');
    console.log('');
    console.log('| Source | → | Target | Relation | Confidence |');
    console.log('|---|---|---|---|---|');
    for (const edge of resultEdges.slice(0, 50)) {
      const srcLabel = graph.nodes.find((n) => n.id === edge.source)?.label || edge.source;
      const tgtLabel = graph.nodes.find((n) => n.id === edge.target)?.label || edge.target;
      console.log(`| \`${srcLabel}\` | → | \`${tgtLabel}\` | ${edge.relation} | ${edge.tag} ${edge.confidence} |`);
    }
    if (resultEdges.length > 50) {
      console.log(`| ... | | ... | ${resultEdges.length - 50} more edges | |`);
    }
    console.log('');
  }

  // Related communities
  const commIds = new Set(resultNodes.map((n) => n.community));
  const relatedComms = graph.communities.filter((c) => commIds.has(c.id));
  if (relatedComms.length > 0) {
    console.log('### Related Communities');
    console.log('');
    for (const c of relatedComms) {
      console.log(`- **Community ${c.id}** (${c.nodeCount} nodes) — god nodes: ${c.godNodes.map((g) => `\`${g}\``).join(', ')}`);
    }
    console.log('');
  }
}

export async function pathCommand(nodeA: string, nodeB: string, options: QueryOptions): Promise<void> {
  const projectRoot = resolveProjectRoot();
  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto AI project. Run "magneto init" first.');
    process.exit(1);
  }

  const graphPath = options.graph || magnetoPath(projectRoot, 'memory', 'graph.json');
  if (!fileExists(graphPath)) {
    logger.error('No knowledge graph found. Run "magneto analyze" first.');
    process.exit(1);
  }

  const graph = readJson<KnowledgeGraph>(graphPath);

  // Find start and end nodes
  const startNode = findNode(graph, nodeA);
  const endNode = findNode(graph, nodeB);

  if (!startNode) {
    logger.error(`Node not found: "${nodeA}"`);
    return;
  }
  if (!endNode) {
    logger.error(`Node not found: "${nodeB}"`);
    return;
  }

  logger.info(`Finding path: ${startNode.label} → ${endNode.label}\n`);

  // BFS shortest path
  const adj = new Map<string, { node: string; edge: GraphEdge }[]>();
  for (const edge of graph.edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    if (!adj.has(edge.target)) adj.set(edge.target, []);
    adj.get(edge.source)!.push({ node: edge.target, edge });
    adj.get(edge.target)!.push({ node: edge.source, edge });
  }

  const prev = new Map<string, { from: string; edge: GraphEdge }>();
  const visited = new Set<string>([startNode.id]);
  const queue = [startNode.id];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === endNode.id) break;

    for (const { node: neighbor, edge } of adj.get(current) || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        prev.set(neighbor, { from: current, edge });
        queue.push(neighbor);
      }
    }
  }

  if (!prev.has(endNode.id) && startNode.id !== endNode.id) {
    logger.warn(`No path found between "${nodeA}" and "${nodeB}".`);
    return;
  }

  // Reconstruct path
  const pathNodes: string[] = [endNode.id];
  const pathEdges: GraphEdge[] = [];
  let curr = endNode.id;
  while (prev.has(curr)) {
    const { from, edge } = prev.get(curr)!;
    pathEdges.unshift(edge);
    pathNodes.unshift(from);
    curr = from;
  }

  console.log('');
  console.log(`## Shortest Path: \`${startNode.label}\` → \`${endNode.label}\``);
  console.log('');
  console.log(`**Hops:** ${pathEdges.length}`);
  console.log('');

  for (let i = 0; i < pathEdges.length; i++) {
    const fromNode = graph.nodes.find((n) => n.id === pathNodes[i]);
    const toNode = graph.nodes.find((n) => n.id === pathNodes[i + 1]);
    const edge = pathEdges[i];
    console.log(`${i + 1}. **\`${fromNode?.label}\`** —[${edge.relation} (${edge.tag} ${edge.confidence})]→ **\`${toNode?.label}\`**`);
  }
  console.log('');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findNode(graph: KnowledgeGraph, query: string): GraphNode | undefined {
  const q = query.toLowerCase();
  return (
    graph.nodes.find((n) => n.label.toLowerCase() === q) ||
    graph.nodes.find((n) => n.id.toLowerCase() === q) ||
    graph.nodes.find((n) => n.label.toLowerCase().includes(q))
  );
}

function traverseBFS(
  queue: string[],
  adj: Map<string, { node: string; edge: GraphEdge }[]>,
  visited: Set<string>,
  resultEdges: GraphEdge[],
  budget: number,
  getTokens: () => number,
  setTokens: (t: number) => void
): void {
  for (const id of queue) visited.add(id);
  const bfsQueue = [...queue];

  while (bfsQueue.length > 0 && getTokens() < budget) {
    const current = bfsQueue.shift()!;
    for (const { node: neighbor, edge } of adj.get(current) || []) {
      if (getTokens() >= budget) break;
      resultEdges.push(edge);
      setTokens(getTokens() + estimateEdgeTokens(edge));
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        bfsQueue.push(neighbor);
      }
    }
  }
}

function traverseDFS(
  stack: string[],
  adj: Map<string, { node: string; edge: GraphEdge }[]>,
  visited: Set<string>,
  resultEdges: GraphEdge[],
  budget: number,
  getTokens: () => number,
  setTokens: (t: number) => void
): void {
  for (const id of stack) visited.add(id);

  function dfs(current: string): void {
    if (getTokens() >= budget) return;
    for (const { node: neighbor, edge } of adj.get(current) || []) {
      if (getTokens() >= budget) break;
      resultEdges.push(edge);
      setTokens(getTokens() + estimateEdgeTokens(edge));
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        dfs(neighbor);
      }
    }
  }

  for (const id of stack) dfs(id);
}

function estimateEdgeTokens(edge: GraphEdge): number {
  return Math.ceil((edge.source.length + edge.target.length + edge.relation.length) / 4) + 5;
}
