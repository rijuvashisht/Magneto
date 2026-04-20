/**
 * Magneto AI — AI Reasoning & Agent Control Plane
 * Copyright (c) 2024 Riju Vashisht
 * MIT License
 */

// Core
export { buildContext } from './core/context';
export { evaluateSecurity, type SecurityEvaluation, type SecurityConfig, type SecurityRisk } from './core/security-engine';
export { detectPacks } from './core/detect-packs';
export { mergeResults } from './core/merge-results';
export { scaffold } from './core/scaffold';

// Knowledge Graph
export { GraphBuilder, getGlobalGraphBuilder } from './core/graph-builder';
export {
  type KnowledgeGraph,
  type GraphNode,
  type GraphEdge,
  type GraphQuery,
  type GraphStats,
  type NodeType,
  type EdgeType,
  queryGraph,
  findNeighborhood,
  findPath,
  calculateStats,
  detectCommunities,
  calculateMetrics,
} from './core/knowledge-graph';
export { JsonFileStorage, InMemoryStorage, type GraphStorage } from './core/graph-storage';

// Memory & Checkpoints
export { MemoryStore, getGlobalMemoryStore } from './core/memory-store';
export { CheckpointManager, getGlobalCheckpointManager } from './core/checkpoint-manager';

// Streaming
export { StreamingRunner } from './core/streaming-runner';

// Sub-Agents
export { DecompositionEngine, getGlobalDecompositionEngine } from './core/decomposition-engine';
export { SubAgentOrchestrator, getGlobalSubAgentOrchestrator } from './core/sub-agent-orchestrator';
export { ContextBoundaryManager } from './core/context-boundary';

// Interactive Workflow
export { InteractiveWorkflow } from './core/interactive-workflow';

// Runners
export { type RunnerInput, type RunnerOutput } from './runners/types';

// Utils
export { logger } from './utils/logger';
export { resolveProjectRoot, magnetoPath, isMagnetoProject } from './utils/paths';
export { readJson, writeJson, readText, fileExists, ensureDir, listFiles } from './utils/fs';
export { ProgressRenderer } from './utils/progress-renderer';
