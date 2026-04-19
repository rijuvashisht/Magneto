import * as path from 'path';
import { MCPToolResult } from '../server';
import { logger } from '../../utils/logger';
import { fileExists, readJson } from '../../utils/fs';
import { magnetoPath } from '../../utils/paths';
import type { KnowledgeGraph, GraphNode, GraphEdge } from '../../core/graph-engine';

export async function handleQueryGraph(
  args: Record<string, unknown>
): Promise<MCPToolResult> {
  const query = (args.query as string) || '';
  const projectRoot = (args.projectRoot as string) || process.cwd();
  const graphPath = (args.graphPath as string) || magnetoPath(projectRoot, 'memory', 'graph.json');
  const budget = parseInt((args.budget as string) || '2000', 10);
  const useDFS = (args.dfs as boolean) || false;

  if (!query) {
    return { success: false, data: null, error: 'query is required' };
  }

  if (!fileExists(graphPath)) {
    return {
      success: false,
      data: null,
      error: `No knowledge graph found at ${graphPath}. Run "magneto analyze" first.`,
    };
  }

  try {
    const graph = readJson<KnowledgeGraph>(graphPath);
    const queryLower = query.toLowerCase();

    // Find seed nodes matching the query
    const seeds = graph.nodes.filter(
      (n) =>
        n.label.toLowerCase().includes(queryLower) ||
        n.id.toLowerCase().includes(queryLower) ||
        (n.file && n.file.toLowerCase().includes(queryLower)) ||
        (n.module && n.module.toLowerCase().includes(queryLower))
    );

    if (seeds.length === 0) {
      return {
        success: true,
        data: {
          query,
          message: `No nodes matching "${query}". Try a broader query.`,
          nodes: [],
          edges: [],
          communities: [],
        },
      };
    }

    // Build adjacency
    const adj = new Map<string, { node: string; edge: GraphEdge }[]>();
    for (const edge of graph.edges) {
      if (!adj.has(edge.source)) adj.set(edge.source, []);
      if (!adj.has(edge.target)) adj.set(edge.target, []);
      adj.get(edge.source)!.push({ node: edge.target, edge });
      adj.get(edge.target)!.push({ node: edge.source, edge });
    }

    // Traverse from seeds
    const visited = new Set<string>();
    const resultEdges: GraphEdge[] = [];
    const queue: string[] = seeds.map((n) => n.id);
    let tokenEstimate = 0;

    for (const id of queue) visited.add(id);
    const bfsQueue = [...queue];

    const traverse = useDFS ? traverseDFS : traverseBFS;
    traverse(bfsQueue, adj, visited, resultEdges, budget, () => tokenEstimate, (t) => { tokenEstimate = t; });

    // Collect result nodes
    const resultNodes = graph.nodes.filter((n) => visited.has(n.id));

    // Find related communities
    const commIds = new Set(resultNodes.map((n) => n.community));
    const relatedComms = graph.communities.filter((c) => commIds.has(c.id));

    // Get seed node details
    const seedDetails = seeds.map((n) => ({
      id: n.id,
      label: n.label,
      type: n.type,
      community: n.community,
      degree: n.degree,
      isGodNode: n.isGodNode,
    }));

    // Format edges for output
    const edgeDetails = resultEdges.slice(0, 50).map((e) => ({
      source: graph.nodes.find((n) => n.id === e.source)?.label || e.source,
      target: graph.nodes.find((n) => n.id === e.target)?.label || e.target,
      relation: e.relation,
      tag: e.tag,
      confidence: e.confidence,
    }));

    logger.debug(`Graph query "${query}" returned ${resultNodes.length} nodes, ${resultEdges.length} edges`);

    return {
      success: true,
      data: {
        query,
        summary: {
          nodesReturned: resultNodes.length,
          edgesReturned: resultEdges.length,
          tokenEstimate,
          seedCount: seeds.length,
          communitiesInvolved: relatedComms.length,
        },
        seeds: seedDetails,
        nodes: resultNodes.map((n) => ({
          id: n.id,
          label: n.label,
          type: n.type,
          community: n.community,
          degree: n.degree,
          isGodNode: n.isGodNode,
        })),
        edges: edgeDetails,
        communities: relatedComms.map((c) => ({
          id: c.id,
          nodeCount: c.nodeCount,
          godNodes: c.godNodes,
          topNodes: c.topNodes,
        })),
        suggestedQuestions: generateQuestions(seeds, relatedComms, graph),
      },
    };
  } catch (err: any) {
    return { success: false, data: null, error: err.message };
  }
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

function generateQuestions(
  seeds: GraphNode[],
  communities: import('../../core/graph-engine').GraphCommunity[],
  graph: KnowledgeGraph
): string[] {
  const questions: string[] = [];

  if (seeds.length >= 2) {
    questions.push(`What connects \`${seeds[0].label}\` to \`${seeds[1].label}\`?`);
  }
  if (communities.length >= 2) {
    questions.push(`How do community ${communities[0].id} and community ${communities[1].id} interact?`);
  }

  const godNodes = graph.nodes.filter((n) => n.isGodNode).slice(0, 3);
  if (godNodes.length > 0) {
    questions.push(`Which god nodes are most relevant to "${seeds[0]?.label || 'this query'}"?`);
    questions.push(`What other concepts connect through \`${godNodes[0].label}\`?`);
  }

  questions.push(`Which files in community ${seeds[0]?.community || 0} have the most connections?`);
  questions.push(`What are the EXTRACTED vs INFERRED relationships in this subgraph?`);

  return questions;
}
