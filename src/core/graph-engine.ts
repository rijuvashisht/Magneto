/**
 * graph-engine.ts — Native knowledge graph builder for Magneto AI.
 *
 * Transforms FileInfo / ModuleSummary data from `magneto analyze` into a
 * JSON knowledge graph with:
 *   - Typed nodes (file, module, class, function, interface, type, export)
 *   - Weighted edges (imports, exports_from, defines, co_located)
 *   - Confidence scores: EXTRACTED (1.0) | INFERRED (0.6–0.9)
 *   - Louvain community detection (pure TS, no deps)
 *   - God-node identification (highest degree per community)
 *
 * Output format is compatible with Graphify's graph.json.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  label: string;
  type: 'file' | 'module' | 'class' | 'function' | 'interface' | 'type' | 'export' | 'package';
  file?: string;
  module?: string;
  community?: number;
  degree?: number;
  isGodNode?: boolean;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  tag: 'EXTRACTED' | 'INFERRED';
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface GraphCommunity {
  id: number;
  nodeCount: number;
  godNodes: string[];
  topNodes: string[];
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  communities: GraphCommunity[];
  metadata: {
    generatedAt: string;
    generator: string;
    totalNodes: number;
    totalEdges: number;
    totalCommunities: number;
    godNodes: string[];
  };
}

export interface FileInfo {
  relativePath: string;
  extension: string;
  sizeBytes: number;
  lines: number;
  exports: string[];
  imports: string[];
  functions: string[];
  classes: string[];
  interfaces: string[];
  types: string[];
}

export interface ModuleSummary {
  directory: string;
  files: FileInfo[];
  totalLines: number;
  totalSize: number;
  mainExports: string[];
  dependencies: string[];
}

// ─── Graph Builder ────────────────────────────────────────────────────────────

export function buildKnowledgeGraph(
  files: FileInfo[],
  modules: ModuleSummary[]
): KnowledgeGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeIds = new Set<string>();

  function addNode(node: GraphNode): void {
    if (!nodeIds.has(node.id)) {
      nodeIds.add(node.id);
      nodes.push(node);
    }
  }

  function addEdge(edge: GraphEdge): void {
    edges.push(edge);
  }

  // 1. Create module nodes
  for (const mod of modules) {
    const modId = `mod:${mod.directory || '_root'}`;
    addNode({
      id: modId,
      label: mod.directory || '(root)',
      type: 'module',
      metadata: {
        files: mod.files.length,
        lines: mod.totalLines,
        size: mod.totalSize,
      },
    });
  }

  // 2. Create file nodes + symbol nodes
  for (const file of files) {
    const fileId = `file:${file.relativePath}`;
    const modDir = file.relativePath.includes('/')
      ? file.relativePath.substring(0, file.relativePath.lastIndexOf('/'))
      : '_root';
    const modId = `mod:${modDir}`;

    addNode({
      id: fileId,
      label: file.relativePath,
      type: 'file',
      module: modDir,
      metadata: {
        extension: file.extension,
        lines: file.lines,
        size: file.sizeBytes,
      },
    });

    // File → Module edge
    if (nodeIds.has(modId)) {
      addEdge({
        source: fileId,
        target: modId,
        relation: 'belongs_to',
        tag: 'EXTRACTED',
        confidence: 1.0,
      });
    }

    // Classes
    for (const cls of file.classes) {
      const clsId = `class:${file.relativePath}:${cls}`;
      addNode({
        id: clsId,
        label: cls,
        type: 'class',
        file: file.relativePath,
        module: modDir,
      });
      addEdge({
        source: fileId,
        target: clsId,
        relation: 'defines',
        tag: 'EXTRACTED',
        confidence: 1.0,
      });
    }

    // Functions
    for (const fn of file.functions) {
      const fnId = `fn:${file.relativePath}:${fn}`;
      addNode({
        id: fnId,
        label: fn,
        type: 'function',
        file: file.relativePath,
        module: modDir,
      });
      addEdge({
        source: fileId,
        target: fnId,
        relation: 'defines',
        tag: 'EXTRACTED',
        confidence: 1.0,
      });
    }

    // Interfaces
    for (const iface of file.interfaces) {
      const ifaceId = `iface:${file.relativePath}:${iface}`;
      addNode({
        id: ifaceId,
        label: iface,
        type: 'interface',
        file: file.relativePath,
        module: modDir,
      });
      addEdge({
        source: fileId,
        target: ifaceId,
        relation: 'defines',
        tag: 'EXTRACTED',
        confidence: 1.0,
      });
    }

    // Types
    for (const typ of file.types) {
      const typId = `type:${file.relativePath}:${typ}`;
      addNode({
        id: typId,
        label: typ,
        type: 'type',
        file: file.relativePath,
        module: modDir,
      });
      addEdge({
        source: fileId,
        target: typId,
        relation: 'defines',
        tag: 'EXTRACTED',
        confidence: 1.0,
      });
    }

    // Exports
    for (const exp of file.exports) {
      const expId = `export:${file.relativePath}:${exp}`;
      addNode({
        id: expId,
        label: exp,
        type: 'export',
        file: file.relativePath,
        module: modDir,
      });
      addEdge({
        source: fileId,
        target: expId,
        relation: 'exports',
        tag: 'EXTRACTED',
        confidence: 1.0,
      });
    }

    // Import edges
    for (const imp of file.imports) {
      if (imp.startsWith('.') || imp.startsWith('/')) {
        // Internal import — try to resolve target file
        const targetFileId = resolveImportTarget(file.relativePath, imp, files);
        if (targetFileId) {
          addEdge({
            source: fileId,
            target: `file:${targetFileId}`,
            relation: 'imports',
            tag: 'EXTRACTED',
            confidence: 1.0,
          });
        }
      } else {
        // External package import
        const pkgName = imp.split('/').slice(0, imp.startsWith('@') ? 2 : 1).join('/');
        const pkgId = `pkg:${pkgName}`;
        addNode({
          id: pkgId,
          label: pkgName,
          type: 'package',
        });
        addEdge({
          source: fileId,
          target: pkgId,
          relation: 'imports',
          tag: 'EXTRACTED',
          confidence: 1.0,
        });
      }
    }
  }

  // 3. Inferred co-location edges — files in same module with similar names
  for (const mod of modules) {
    const modFiles = mod.files;
    for (let i = 0; i < modFiles.length; i++) {
      for (let j = i + 1; j < modFiles.length; j++) {
        const a = modFiles[i];
        const b = modFiles[j];
        const similarity = nameSimilarity(baseName(a.relativePath), baseName(b.relativePath));
        if (similarity > 0.5) {
          addEdge({
            source: `file:${a.relativePath}`,
            target: `file:${b.relativePath}`,
            relation: 'co_located',
            tag: 'INFERRED',
            confidence: Math.round(similarity * 100) / 100,
          });
        }
      }
    }
  }

  // 4. Community detection (Louvain)
  const communityMap = louvainCommunities(nodes, edges);
  for (const node of nodes) {
    node.community = communityMap.get(node.id) ?? 0;
  }

  // 5. Compute degree + god nodes
  const degreeMap = new Map<string, number>();
  for (const edge of edges) {
    degreeMap.set(edge.source, (degreeMap.get(edge.source) || 0) + 1);
    degreeMap.set(edge.target, (degreeMap.get(edge.target) || 0) + 1);
  }
  for (const node of nodes) {
    node.degree = degreeMap.get(node.id) || 0;
  }

  // Group by community, find god nodes
  const communityGroups = new Map<number, GraphNode[]>();
  for (const node of nodes) {
    const c = node.community!;
    const group = communityGroups.get(c) || [];
    group.push(node);
    communityGroups.set(c, group);
  }

  const communities: GraphCommunity[] = [];
  const allGodNodes: string[] = [];

  for (const [cid, group] of communityGroups) {
    const sorted = [...group].sort((a, b) => (b.degree || 0) - (a.degree || 0));
    const godNodes = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.1)));
    for (const gn of godNodes) {
      gn.isGodNode = true;
      allGodNodes.push(gn.label);
    }

    communities.push({
      id: cid,
      nodeCount: group.length,
      godNodes: godNodes.map((n) => n.label),
      topNodes: sorted.slice(0, 5).map((n) => n.label),
    });
  }

  return {
    nodes,
    edges,
    communities,
    metadata: {
      generatedAt: new Date().toISOString(),
      generator: 'magneto-ai',
      totalNodes: nodes.length,
      totalEdges: edges.length,
      totalCommunities: communities.length,
      godNodes: allGodNodes,
    },
  };
}

// ─── Louvain Community Detection ──────────────────────────────────────────────
// Pure TypeScript implementation — modularity-based greedy optimization.

function louvainCommunities(
  nodes: GraphNode[],
  edges: GraphEdge[]
): Map<string, number> {
  const nodeIndex = new Map<string, number>();
  nodes.forEach((n, i) => nodeIndex.set(n.id, i));

  const n = nodes.length;
  if (n === 0) return new Map();

  // Adjacency with weights
  const adj: Map<number, Map<number, number>> = new Map();
  for (let i = 0; i < n; i++) adj.set(i, new Map());

  let totalWeight = 0;
  for (const edge of edges) {
    const si = nodeIndex.get(edge.source);
    const ti = nodeIndex.get(edge.target);
    if (si === undefined || ti === undefined) continue;
    const w = edge.confidence;
    adj.get(si)!.set(ti, (adj.get(si)!.get(ti) || 0) + w);
    adj.get(ti)!.set(si, (adj.get(ti)!.get(si) || 0) + w);
    totalWeight += w;
  }

  if (totalWeight === 0) {
    // No edges — each node in its own community
    const result = new Map<string, number>();
    nodes.forEach((node, i) => result.set(node.id, i));
    return result;
  }

  const m2 = totalWeight * 2;

  // Degree of each node (weighted)
  const degree = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (const w of adj.get(i)!.values()) {
      degree[i] += w;
    }
  }

  // Community assignment
  const community = new Array(n);
  for (let i = 0; i < n; i++) community[i] = i;

  // Sum of weights inside each community
  const sigmaTot = new Map<number, number>();
  for (let i = 0; i < n; i++) sigmaTot.set(i, degree[i]);

  const sigmaIn = new Map<number, number>();
  for (let i = 0; i < n; i++) sigmaIn.set(i, 0);

  // Iterate
  let improved = true;
  let iterations = 0;
  const maxIterations = 20;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < n; i++) {
      const currentComm = community[i];
      const ki = degree[i];

      // Compute weights to neighboring communities
      const neighborComms = new Map<number, number>();
      for (const [j, w] of adj.get(i)!) {
        const cj = community[j];
        neighborComms.set(cj, (neighborComms.get(cj) || 0) + w);
      }

      // Remove i from its community
      const kiIn = neighborComms.get(currentComm) || 0;
      sigmaTot.set(currentComm, (sigmaTot.get(currentComm) || 0) - ki);
      sigmaIn.set(currentComm, (sigmaIn.get(currentComm) || 0) - kiIn);

      // Find best community
      let bestComm = currentComm;
      let bestGain = 0;

      for (const [c, wc] of neighborComms) {
        const st = sigmaTot.get(c) || 0;
        const gain = wc - (st * ki) / m2;
        if (gain > bestGain) {
          bestGain = gain;
          bestComm = c;
        }
      }

      // Move i to best community
      community[i] = bestComm;
      const bestKiIn = neighborComms.get(bestComm) || 0;
      sigmaTot.set(bestComm, (sigmaTot.get(bestComm) || 0) + ki);
      sigmaIn.set(bestComm, (sigmaIn.get(bestComm) || 0) + bestKiIn);

      if (bestComm !== currentComm) improved = true;
    }
  }

  // Renumber communities to be contiguous 0, 1, 2, ...
  const commMap = new Map<number, number>();
  let nextId = 0;
  for (let i = 0; i < n; i++) {
    if (!commMap.has(community[i])) {
      commMap.set(community[i], nextId++);
    }
  }

  const result = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    result.set(nodes[i].id, commMap.get(community[i])!);
  }
  return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveImportTarget(
  sourcePath: string,
  importPath: string,
  allFiles: FileInfo[]
): string | null {
  const sourceDir = sourcePath.includes('/')
    ? sourcePath.substring(0, sourcePath.lastIndexOf('/'))
    : '';

  // Resolve relative path
  const segments = (sourceDir ? sourceDir + '/' + importPath : importPath)
    .split('/')
    .filter(Boolean);
  const resolved: string[] = [];
  for (const seg of segments) {
    if (seg === '..') resolved.pop();
    else if (seg !== '.') resolved.push(seg);
  }
  const base = resolved.join('/');

  // Try common extensions
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    `${base}/index.js`,
    `${base}/index.jsx`,
  ];

  for (const candidate of candidates) {
    const found = allFiles.find((f) => f.relativePath === candidate);
    if (found) return found.relativePath;
  }
  return null;
}

function baseName(filePath: string): string {
  const name = filePath.includes('/') ? filePath.substring(filePath.lastIndexOf('/') + 1) : filePath;
  const dotIdx = name.lastIndexOf('.');
  return dotIdx > 0 ? name.substring(0, dotIdx) : name;
}

function nameSimilarity(a: string, b: string): number {
  // Simple Jaccard on character trigrams
  if (a.length < 3 || b.length < 3) return 0;
  const trigramsA = new Set<string>();
  const trigramsB = new Set<string>();
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  for (let i = 0; i <= al.length - 3; i++) trigramsA.add(al.substring(i, i + 3));
  for (let i = 0; i <= bl.length - 3; i++) trigramsB.add(bl.substring(i, i + 3));
  let intersection = 0;
  for (const t of trigramsA) if (trigramsB.has(t)) intersection++;
  const union = trigramsA.size + trigramsB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

// ─── Graph Report Generator ───────────────────────────────────────────────────

export function generateGraphReport(graph: KnowledgeGraph): string {
  const lines: string[] = [];

  lines.push('# Knowledge Graph Report');
  lines.push('');
  lines.push(`*Generated by Magneto AI on ${graph.metadata.generatedAt}*`);
  lines.push('');
  lines.push('## Overview');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push('|---|---|');
  lines.push(`| Nodes | ${graph.metadata.totalNodes} |`);
  lines.push(`| Edges | ${graph.metadata.totalEdges} |`);
  lines.push(`| Communities | ${graph.metadata.totalCommunities} |`);
  lines.push(`| God nodes | ${graph.metadata.godNodes.length} |`);
  lines.push('');

  // God nodes
  if (graph.metadata.godNodes.length > 0) {
    lines.push('## God Nodes');
    lines.push('');
    lines.push('Highest-degree concepts — what everything connects through:');
    lines.push('');
    const godNodeDetails = graph.nodes
      .filter((n) => n.isGodNode)
      .sort((a, b) => (b.degree || 0) - (a.degree || 0));
    for (const gn of godNodeDetails) {
      lines.push(`- **\`${gn.label}\`** (${gn.type}, community ${gn.community}, degree ${gn.degree})`);
    }
    lines.push('');
  }

  // Communities
  if (graph.communities.length > 0) {
    lines.push('## Communities');
    lines.push('');
    const sorted = [...graph.communities].sort((a, b) => b.nodeCount - a.nodeCount);
    for (const comm of sorted) {
      lines.push(`### Community ${comm.id} (${comm.nodeCount} nodes)`);
      lines.push('');
      lines.push(`- **God nodes:** ${comm.godNodes.map((n) => `\`${n}\``).join(', ') || 'none'}`);
      lines.push(`- **Top nodes:** ${comm.topNodes.map((n) => `\`${n}\``).join(', ')}`);
      lines.push('');
    }
  }

  // Edge type distribution
  const edgeTypes = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  for (const edge of graph.edges) {
    edgeTypes.set(edge.relation, (edgeTypes.get(edge.relation) || 0) + 1);
    tagCounts.set(edge.tag, (tagCounts.get(edge.tag) || 0) + 1);
  }

  lines.push('## Edge Distribution');
  lines.push('');
  lines.push('| Relation | Count |');
  lines.push('|---|---|');
  for (const [rel, count] of [...edgeTypes.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`| \`${rel}\` | ${count} |`);
  }
  lines.push('');
  lines.push('| Confidence Tag | Count |');
  lines.push('|---|---|');
  for (const [tag, count] of tagCounts) {
    lines.push(`| ${tag} | ${count} |`);
  }
  lines.push('');

  // Suggested questions
  lines.push('## Suggested Questions');
  lines.push('');
  lines.push('The graph is positioned to answer these questions:');
  lines.push('');
  if (graph.metadata.godNodes.length >= 2) {
    lines.push(`1. What connects \`${graph.metadata.godNodes[0]}\` to \`${graph.metadata.godNodes[1]}\`?`);
  }
  if (graph.communities.length >= 2) {
    lines.push(`2. How do community ${graph.communities[0].id} and community ${graph.communities[1].id} interact?`);
  }
  lines.push('3. Which modules have the most cross-module dependencies?');
  lines.push('4. What are the most imported packages?');
  lines.push('5. Which files are the most connected (highest degree)?');
  lines.push('');

  return lines.join('\n');
}
