import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { fileExists, readJson, writeJson } from '../utils/fs';

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
    importance: number;
    createdAt: string;
    accessedAt: string;
    accessCount: number;
    embedding?: number[];
  };
  relationships: {
    relatedMemories: string[];
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

export interface PruneOptions {
  strategy: 'lru' | 'importance' | 'age' | 'hybrid';
  maxMemories?: number;
  maxAgeDays?: number;
  minImportance?: number;
  keepCheckpoints?: boolean;
}

export interface MemoryStats {
  totalMemories: number;
  byType: Record<MemoryType, number>;
  totalSize: number;
  oldestMemory: string | null;
  newestMemory: string | null;
  averageImportance: number;
}

export interface MemoryBackend {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  save(memory: Memory): Promise<void>;
  get(id: string): Promise<Memory | null>;
  update(id: string, memory: Partial<Memory>): Promise<void>;
  delete(id: string): Promise<void>;
  query(query: MemoryQuery): Promise<Memory[]>;
  search(text: string): Promise<Memory[]>;
  clear(): Promise<void>;
  getAll(): Promise<Memory[]>;
}

// Local JSON file backend
export class JsonFileBackend implements MemoryBackend {
  private filePath: string;
  private memories: Map<string, Memory> = new Map();
  private connected = false;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async connect(): Promise<void> {
    if (await fileExists(this.filePath)) {
      const data = await readJson<Memory[]>(this.filePath);
      if (Array.isArray(data)) {
        for (const memory of data) {
          this.memories.set(memory.id, memory);
        }
      }
    }
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    await this.persist();
    this.connected = false;
  }

  async save(memory: Memory): Promise<void> {
    this.memories.set(memory.id, memory);
    await this.persist();
  }

  async get(id: string): Promise<Memory | null> {
    const memory = this.memories.get(id);
    if (memory) {
      // Update access stats
      memory.metadata.accessedAt = new Date().toISOString();
      memory.metadata.accessCount++;
    }
    return memory || null;
  }

  async update(id: string, updates: Partial<Memory>): Promise<void> {
    const memory = this.memories.get(id);
    if (!memory) {
      throw new Error(`Memory not found: ${id}`);
    }

    // Deep merge for metadata
    if (updates.metadata) {
      memory.metadata = { ...memory.metadata, ...updates.metadata };
    }

    // Deep merge for relationships
    if (updates.relationships) {
      memory.relationships = { 
        ...memory.relationships, 
        ...updates.relationships,
        relatedMemories: [
          ...(memory.relationships.relatedMemories || []),
          ...(updates.relationships.relatedMemories || []),
        ],
        childTasks: [
          ...(memory.relationships.childTasks || []),
          ...(updates.relationships.childTasks || []),
        ],
      };
    }

    // Simple field updates
    if (updates.content !== undefined) memory.content = updates.content;
    if (updates.type !== undefined) memory.type = updates.type;

    await this.persist();
  }

  async delete(id: string): Promise<void> {
    this.memories.delete(id);
    await this.persist();
  }

  async query(query: MemoryQuery): Promise<Memory[]> {
    let results = Array.from(this.memories.values());

    // Filter by type
    if (query.type) {
      const types = Array.isArray(query.type) ? query.type : [query.type];
      results = results.filter(m => types.includes(m.type));
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      results = results.filter(m => 
        query.tags!.some(tag => m.metadata.tags.includes(tag))
      );
    }

    // Filter by project
    if (query.projectId) {
      results = results.filter(m => m.metadata.projectId === query.projectId);
    }

    // Filter by task
    if (query.taskId) {
      results = results.filter(m => m.metadata.taskId === query.taskId);
    }

    // Filter by agent
    if (query.agentId) {
      results = results.filter(m => m.metadata.agentId === query.agentId);
    }

    // Filter by time range
    if (query.timeRange) {
      const start = new Date(query.timeRange.start).getTime();
      const end = new Date(query.timeRange.end).getTime();
      results = results.filter(m => {
        const created = new Date(m.metadata.createdAt).getTime();
        return created >= start && created <= end;
      });
    }

    // Similarity search (basic implementation)
    if (query.similarity) {
      results = results.filter(m => {
        if (!m.metadata.embedding || !query.similarity) return false;
        const score = cosineSimilarity(m.metadata.embedding, query.similarity.embedding);
        return score >= query.similarity.threshold;
      });

      // Sort by similarity
      results.sort((a, b) => {
        if (!a.metadata.embedding || !b.metadata.embedding || !query.similarity) return 0;
        const scoreA = cosineSimilarity(a.metadata.embedding, query.similarity.embedding);
        const scoreB = cosineSimilarity(b.metadata.embedding, query.similarity.embedding);
        return scoreB - scoreA;
      });
    }

    // Apply limit
    if (query.limit && query.limit > 0) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  async search(text: string): Promise<Memory[]> {
    const lowerText = text.toLowerCase();
    return Array.from(this.memories.values()).filter(m => 
      m.content.toLowerCase().includes(lowerText) ||
      m.metadata.tags.some(tag => tag.toLowerCase().includes(lowerText))
    );
  }

  async clear(): Promise<void> {
    this.memories.clear();
    await this.persist();
  }

  async getAll(): Promise<Memory[]> {
    return Array.from(this.memories.values());
  }

  private async persist(): Promise<void> {
    const data = Array.from(this.memories.values());
    await writeJson(this.filePath, data);
  }
}

// Memory Store class
export class MemoryStore extends EventEmitter {
  private backend: MemoryBackend;

  constructor(backend: MemoryBackend) {
    super();
    this.backend = backend;
  }

  async connect(): Promise<void> {
    await this.backend.connect();
    this.emit('connected');
  }

  async disconnect(): Promise<void> {
    await this.backend.disconnect();
    this.emit('disconnected');
  }

  async save(memory: Omit<Memory, 'id'>): Promise<Memory> {
    const id = `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullMemory: Memory = {
      ...memory,
      id,
      metadata: {
        ...memory.metadata,
        createdAt: new Date().toISOString(),
        accessedAt: new Date().toISOString(),
        accessCount: 0,
      },
    };

    await this.backend.save(fullMemory);
    this.emit('saved', fullMemory);
    return fullMemory;
  }

  async get(id: string): Promise<Memory | null> {
    const memory = await this.backend.get(id);
    if (memory) {
      this.emit('accessed', memory);
    }
    return memory;
  }

  async update(id: string, updates: Partial<Memory>): Promise<Memory> {
    await this.backend.update(id, updates);
    const memory = await this.get(id);
    if (!memory) {
      throw new Error(`Failed to update memory: ${id}`);
    }
    this.emit('updated', memory);
    return memory;
  }

  async delete(id: string): Promise<boolean> {
    await this.backend.delete(id);
    this.emit('deleted', id);
    return true;
  }

  async query(query: MemoryQuery): Promise<Memory[]> {
    return this.backend.query(query);
  }

  async search(text: string, limit?: number): Promise<Memory[]> {
    const results = await this.backend.search(text);
    return limit ? results.slice(0, limit) : results;
  }

  async similar(embedding: number[], threshold = 0.7, limit?: number): Promise<Memory[]> {
    const results = await this.backend.query({
      similarity: { embedding, threshold },
      limit,
    });
    return results;
  }

  async prune(options: PruneOptions): Promise<number> {
    const memories = await this.backend.getAll();
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    let toDelete: Memory[] = [];

    switch (options.strategy) {
      case 'lru':
        // Sort by last access time, delete oldest accessed
        memories.sort((a, b) => 
          new Date(a.metadata.accessedAt).getTime() - new Date(b.metadata.accessedAt).getTime()
        );
        break;

      case 'importance':
        // Sort by importance, delete lowest
        memories.sort((a, b) => a.metadata.importance - b.metadata.importance);
        break;

      case 'age':
        // Sort by creation time, delete oldest
        memories.sort((a, b) => 
          new Date(a.metadata.createdAt).getTime() - new Date(b.metadata.createdAt).getTime()
        );
        break;

      case 'hybrid':
        // Combined score: lower importance + older = more likely to delete
        memories.sort((a, b) => {
          const scoreA = a.metadata.importance * 0.3 + 
            (now - new Date(a.metadata.createdAt).getTime()) / dayMs * 0.7;
          const scoreB = b.metadata.importance * 0.3 + 
            (now - new Date(b.metadata.createdAt).getTime()) / dayMs * 0.7;
          return scoreB - scoreA;
        });
        break;
    }

    // Apply filters
    toDelete = memories.filter(m => {
      // Keep checkpoints if requested
      if (options.keepCheckpoints && m.type === 'checkpoint') {
        return false;
      }

      // Check max age
      if (options.maxAgeDays) {
        const age = (now - new Date(m.metadata.createdAt).getTime()) / dayMs;
        if (age > options.maxAgeDays) {
          return true;
        }
      }

      // Check importance threshold
      if (options.minImportance !== undefined && m.metadata.importance < options.minImportance) {
        return true;
      }

      return false;
    });

    // Apply max memories limit
    if (options.maxMemories && memories.length > options.maxMemories) {
      const excess = memories.length - options.maxMemories;
      const additional = memories
        .filter(m => !toDelete.includes(m))
        .slice(0, excess);
      toDelete = [...toDelete, ...additional];
    }

    // Delete
    let deletedCount = 0;
    for (const memory of toDelete) {
      await this.backend.delete(memory.id);
      deletedCount++;
    }

    this.emit('pruned', { deleted: deletedCount, remaining: memories.length - deletedCount });
    return deletedCount;
  }

  async export(projectId?: string): Promise<Memory[]> {
    if (projectId) {
      return this.backend.query({ projectId });
    }
    return this.backend.getAll();
  }

  async import(memories: Memory[]): Promise<number> {
    for (const memory of memories) {
      // Generate new ID to avoid conflicts
      const newId = `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await this.backend.save({ ...memory, id: newId });
    }
    this.emit('imported', { count: memories.length });
    return memories.length;
  }

  async stats(): Promise<MemoryStats> {
    const memories = await this.backend.getAll();
    
    const byType: Record<MemoryType, number> = {
      episodic: 0,
      semantic: 0,
      procedural: 0,
      contextual: 0,
      checkpoint: 0,
    };

    let totalImportance = 0;
    let oldest: string | null = null;
    let newest: string | null = null;

    for (const memory of memories) {
      byType[memory.type]++;
      totalImportance += memory.metadata.importance;

      if (!oldest || memory.metadata.createdAt < oldest) {
        oldest = memory.metadata.createdAt;
      }
      if (!newest || memory.metadata.createdAt > newest) {
        newest = memory.metadata.createdAt;
      }
    }

    const totalSize = JSON.stringify(memories).length;

    return {
      totalMemories: memories.length,
      byType,
      totalSize,
      oldestMemory: oldest,
      newestMemory: newest,
      averageImportance: memories.length > 0 ? totalImportance / memories.length : 0,
    };
  }

  getBackend(): MemoryBackend {
    return this.backend;
  }
}

// Cosine similarity for embeddings
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embedding dimensions must match');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Factory function
export function createMemoryStore(filePath: string): MemoryStore {
  const backend = new JsonFileBackend(filePath);
  return new MemoryStore(backend);
}

// Singleton instance
let globalStore: MemoryStore | null = null;

export function getGlobalMemoryStore(): MemoryStore {
  if (!globalStore) {
    throw new Error('Memory store not initialized. Call initGlobalMemoryStore() first.');
  }
  return globalStore;
}

export function initGlobalMemoryStore(projectRoot: string): MemoryStore {
  const memoryPath = path.join(projectRoot, '.magneto', 'memory.json');
  globalStore = createMemoryStore(memoryPath);
  return globalStore;
}

export function setGlobalMemoryStore(store: MemoryStore): void {
  globalStore = store;
}
