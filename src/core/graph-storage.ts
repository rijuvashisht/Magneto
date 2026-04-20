import { KnowledgeGraph, GraphDelta } from './knowledge-graph';
import { readJson, writeJson, ensureDir } from '../utils/fs';
import * as path from 'path';

export interface GraphStorage {
  save(graph: KnowledgeGraph): Promise<void>;
  load(): Promise<KnowledgeGraph | null>;
  updateDelta(delta: GraphDelta): Promise<void>;
  exists(): Promise<boolean>;
}

export class JsonFileStorage implements GraphStorage {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async save(graph: KnowledgeGraph): Promise<void> {
    await ensureDir(path.dirname(this.filePath));
    await writeJson(this.filePath, graph);
  }

  async load(): Promise<KnowledgeGraph | null> {
    try {
      return await readJson<KnowledgeGraph>(this.filePath);
    } catch {
      return null;
    }
  }

  async updateDelta(delta: GraphDelta): Promise<void> {
    const graph = await this.load();
    if (!graph) {
      throw new Error('No graph to update');
    }

    // Add new nodes and edges
    graph.nodes.push(...delta.added.nodes);
    graph.edges.push(...delta.added.edges);

    // Remove nodes and edges
    graph.nodes = graph.nodes.filter(n => !delta.removed.nodeIds.includes(n.id));
    graph.edges = graph.edges.filter(e => !delta.removed.edgeIds.includes(e.id));

    // Update modified nodes
    for (const { id, changes } of delta.modified.nodes) {
      const node = graph.nodes.find(n => n.id === id);
      if (node) {
        Object.assign(node, changes);
      }
    }

    // Update modified edges
    for (const { id, changes } of delta.modified.edges) {
      const edge = graph.edges.find(e => e.id === id);
      if (edge) {
        Object.assign(edge, changes);
      }
    }

    // Update metadata
    graph.metadata.totalNodes = graph.nodes.length;
    graph.metadata.totalEdges = graph.edges.length;
    graph.metadata.generatedAt = delta.timestamp;

    await this.save(graph);
  }

  async exists(): Promise<boolean> {
    try {
      await readJson(this.filePath);
      return true;
    } catch {
      return false;
    }
  }
}

// In-memory storage for testing
export class InMemoryStorage implements GraphStorage {
  private graph: KnowledgeGraph | null = null;

  async save(graph: KnowledgeGraph): Promise<void> {
    this.graph = JSON.parse(JSON.stringify(graph)); // Deep clone
  }

  async load(): Promise<KnowledgeGraph | null> {
    return this.graph ? JSON.parse(JSON.stringify(this.graph)) : null;
  }

  async updateDelta(delta: GraphDelta): Promise<void> {
    if (!this.graph) {
      throw new Error('No graph to update');
    }

    // Same logic as JsonFileStorage
    this.graph.nodes.push(...delta.added.nodes);
    this.graph.edges.push(...delta.added.edges);

    this.graph.nodes = this.graph.nodes.filter(n => !delta.removed.nodeIds.includes(n.id));
    this.graph.edges = this.graph.edges.filter(e => !delta.removed.edgeIds.includes(e.id));

    for (const { id, changes } of delta.modified.nodes) {
      const node = this.graph.nodes.find(n => n.id === id);
      if (node) {
        Object.assign(node, changes);
      }
    }

    for (const { id, changes } of delta.modified.edges) {
      const edge = this.graph.edges.find(e => e.id === id);
      if (edge) {
        Object.assign(edge, changes);
      }
    }

    this.graph.metadata.totalNodes = this.graph.nodes.length;
    this.graph.metadata.totalEdges = this.graph.edges.length;
    this.graph.metadata.generatedAt = delta.timestamp;
  }

  async exists(): Promise<boolean> {
    return this.graph !== null;
  }
}
