import { EventEmitter } from 'events';
import { TaskComponent, SubAgentTemplate, DecompositionResult } from './decomposition-engine';
import { getGlobalMemoryStore } from './memory-store';

export interface SubAgent {
  id: string;
  parentId: string;
  component: TaskComponent;
  template: SubAgentTemplate;
  context: SubAgentContext;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'blocked';
  result?: SubAgentResult;
  checkpoint?: string;
  depth: number;
  startTime?: string;
  endTime?: string;
  retryCount: number;
}

export interface SubAgentContext {
  files: string[];
  symbols: string[];
  parentContext: any;
  sharedState: Record<string, any>;
  memoryIds: string[];
  constraints: string[];
}

export interface SubAgentResult {
  success: boolean;
  output: string;
  artifacts: {
    files: Array<{ path: string; content: string }>;
    patches: string[];
    documentation: string;
  };
  metadata: {
    tokensUsed: number;
    executionTime: number;
    complexity: number;
  };
}

export interface OrchestrationConfig {
  maxConcurrency: number;
  timeout: number;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
  };
  coordinationMode: 'manager' | 'sequential' | 'parallel' | 'pipeline';
  autoRetryFailed: boolean;
  inheritParentMemory: boolean;
  maxDepth: number;
}

export interface SubAgentStatusReport {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  blocked: number;
  progress: number;
}

export class SubAgentOrchestrator extends EventEmitter {
  private config: OrchestrationConfig;
  private agents: Map<string, SubAgent> = new Map();
  private runningAgents: Set<string> = new Set();
  private completedResults: Map<string, SubAgentResult> = new Map();

  constructor(config: Partial<OrchestrationConfig> = {}) {
    super();
    this.config = {
      maxConcurrency: 3,
      timeout: 300000, // 5 minutes
      retryPolicy: {
        maxRetries: 2,
        backoffMultiplier: 1.5,
      },
      coordinationMode: 'manager',
      autoRetryFailed: true,
      inheritParentMemory: true,
      maxDepth: 3,
      ...config,
    };
  }

  async spawn(
    component: TaskComponent,
    parent: { id: string; depth?: number },
    sharedState: Record<string, any> = {}
  ): Promise<SubAgent> {
    if ((parent.depth || 0) >= this.config.maxDepth) {
      throw new Error(`Maximum agent depth (${this.config.maxDepth}) reached`);
    }

    const agentId = `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Prepare isolated context
    const context = await this.prepareContext(component, parent, sharedState);

    const agent: SubAgent = {
      id: agentId,
      parentId: parent.id,
      component,
      template: component.template,
      context,
      status: 'pending',
      depth: (parent.depth || 0) + 1,
      retryCount: 0,
    };

    this.agents.set(agentId, agent);
    this.emit('spawned', agent);

    return agent;
  }

  async coordinate(agents: SubAgent[]): Promise<SubAgentResult[]> {
    if (agents.length === 0) {
      return [];
    }

    switch (this.config.coordinationMode) {
      case 'sequential':
        return this.executeSequential(agents);
      case 'parallel':
        return this.executeParallel(agents);
      case 'pipeline':
        return this.executePipeline(agents);
      case 'manager':
      default:
        return this.executeHybrid(agents);
    }
  }

  async executeSequential(agents: SubAgent[]): Promise<SubAgentResult[]> {
    const results: SubAgentResult[] = [];

    for (const agent of agents) {
      const result = await this.executeAgent(agent);
      results.push(result);

      if (!result.success && !this.config.autoRetryFailed) {
        break; // Stop on failure if not retrying
      }
    }

    return results;
  }

  async executeParallel(agents: SubAgent[]): Promise<SubAgentResult[]> {
    // Execute all agents concurrently with concurrency limit
    const executing: Promise<SubAgentResult>[] = [];
    const results: SubAgentResult[] = [];

    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      
      // Wait if at max concurrency
      while (this.runningAgents.size >= this.config.maxConcurrency) {
        await this.waitForAnyCompletion();
      }

      const promise = this.executeAgent(agent).then(result => {
        results[i] = result;
        return result;
      });

      executing.push(promise);
    }

    await Promise.all(executing);
    return results;
  }

  async executeHybrid(agents: SubAgent[]): Promise<SubAgentResult[]> {
    // Sort by dependencies (topological sort)
    const sorted = this.topologicalSort(agents);
    
    const results: SubAgentResult[] = [];
    const resultMap = new Map<string, SubAgentResult>();

    // Execute in waves - agents with no pending dependencies can run in parallel
    let remaining = [...sorted];
    
    while (remaining.length > 0) {
      // Find agents whose dependencies are all satisfied
      const ready = remaining.filter(agent => 
        agent.component.dependencies.every(depId => 
          resultMap.has(depId) && resultMap.get(depId)!.success
        )
      );

      if (ready.length === 0 && remaining.length > 0) {
        // Deadlock or failed dependency
        const blocked = remaining.filter(agent =>
          agent.component.dependencies.some(depId =>
            resultMap.has(depId) && !resultMap.get(depId)!.success
          )
        );
        
        for (const agent of blocked) {
          agent.status = 'blocked';
          this.emit('blocked', agent);
        }
        break;
      }

      // Execute ready agents in parallel (up to max concurrency)
      const batch = ready.slice(0, this.config.maxConcurrency);
      const batchResults = await this.executeParallel(batch);

      // Store results
      for (let i = 0; i < batch.length; i++) {
        const agent = batch[i];
        const result = batchResults[i];
        results.push(result);
        resultMap.set(agent.component.id, result);
        
        // Share results with dependent agents
        for (const remainingAgent of remaining) {
          if (remainingAgent.component.dependencies.includes(agent.component.id)) {
            remainingAgent.context.sharedState = {
              ...remainingAgent.context.sharedState,
              [agent.component.id]: result,
            };
          }
        }
      }

      // Remove completed from remaining
      remaining = remaining.filter(agent => !batch.includes(agent));
    }

    return results;
  }

  async executePipeline(agents: SubAgent[]): Promise<SubAgentResult[]> {
    // Chain agents - output of one is input to next
    const results: SubAgentResult[] = [];
    let previousResult: SubAgentResult | undefined;

    for (const agent of agents) {
      // Pass previous result as context
      if (previousResult) {
        agent.context.sharedState = {
          ...agent.context.sharedState,
          previousOutput: previousResult.output,
          previousArtifacts: previousResult.artifacts,
        };
      }

      const result = await this.executeAgent(agent);
      results.push(result);
      previousResult = result;

      if (!result.success && !this.config.autoRetryFailed) {
        break;
      }
    }

    return results;
  }

  private async executeAgent(agent: SubAgent): Promise<SubAgentResult> {
    agent.status = 'running';
    agent.startTime = new Date().toISOString();
    this.runningAgents.add(agent.id);
    this.emit('started', agent);

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Agent timeout')), this.config.timeout);
      });

      // Execute agent (simulated for now)
      const executionPromise = this.simulateAgentExecution(agent);

      // Race against timeout
      const result = await Promise.race([executionPromise, timeoutPromise]);

      agent.status = 'completed';
      agent.endTime = new Date().toISOString();
      agent.result = result;
      this.runningAgents.delete(agent.id);
      this.completedResults.set(agent.id, result);

      this.emit('completed', agent, result);

      return result;

    } catch (error) {
      agent.status = 'failed';
      agent.endTime = new Date().toISOString();
      this.runningAgents.delete(agent.id);

      // Retry if configured
      if (this.config.autoRetryFailed && agent.retryCount < this.config.retryPolicy.maxRetries) {
        agent.retryCount++;
        const backoff = Math.pow(this.config.retryPolicy.backoffMultiplier, agent.retryCount) * 1000;
        
        this.emit('retrying', agent, backoff);
        await this.delay(backoff);
        
        return this.executeAgent(agent);
      }

      const failureResult: SubAgentResult = {
        success: false,
        output: error instanceof Error ? error.message : String(error),
        artifacts: { files: [], patches: [], documentation: '' },
        metadata: { tokensUsed: 0, executionTime: 0, complexity: 0 },
      };

      this.emit('failed', agent, error);
      return failureResult;
    }
  }

  private async simulateAgentExecution(agent: SubAgent): Promise<SubAgentResult> {
    // In real implementation, this would:
    // 1. Create a runner with isolated context
    // 2. Execute the component task
    // 3. Capture results
    
    // Simulate work
    const delay = 100 + Math.random() * 500;
    await this.delay(delay);

    return {
      success: true,
      output: `Completed ${agent.component.name}`,
      artifacts: {
        files: [],
        patches: [],
        documentation: '',
      },
      metadata: {
        tokensUsed: Math.floor(Math.random() * 1000) + 500,
        executionTime: delay,
        complexity: agent.component.complexity,
      },
    };
  }

  private async prepareContext(
    component: TaskComponent,
    parent: { id: string; depth?: number },
    sharedState: Record<string, any>
  ): Promise<SubAgentContext> {
    let memoryIds: string[] = [];

    // Load relevant memories if enabled
    if (this.config.inheritParentMemory) {
      try {
        const memoryStore = getGlobalMemoryStore();
        const relevantMemories = await memoryStore.query({
          tags: component.contextScope.patterns,
          limit: 5,
        });
        memoryIds = relevantMemories.map(m => m.id);
      } catch {
        // Memory store might not be initialized
      }
    }

    return {
      files: component.contextScope.files,
      symbols: component.contextScope.symbols,
      parentContext: {},
      sharedState,
      memoryIds,
      constraints: component.template.constraints,
    };
  }

  async mergeResults(results: SubAgentResult[]): Promise<SubAgentResult> {
    // Merge all sub-agent results into a single result
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    const allFiles = results.flatMap(r => r.artifacts.files);
    const allPatches = results.flatMap(r => r.artifacts.patches);
    const allDocs = results.map(r => r.artifacts.documentation).join('\n\n');

    const totalTokens = results.reduce((sum, r) => sum + r.metadata.tokensUsed, 0);
    const totalTime = results.reduce((sum, r) => sum + r.metadata.executionTime, 0);

    return {
      success: failed.length === 0,
      output: `Completed ${successful.length}/${results.length} sub-tasks. ${failed.length} failed.`,
      artifacts: {
        files: allFiles,
        patches: allPatches,
        documentation: allDocs,
      },
      metadata: {
        tokensUsed: totalTokens,
        executionTime: totalTime,
        complexity: Math.max(...results.map(r => r.metadata.complexity), 0),
      },
    };
  }

  getStatus(): SubAgentStatusReport {
    const agents = Array.from(this.agents.values());
    
    return {
      total: agents.length,
      pending: agents.filter(a => a.status === 'pending').length,
      running: agents.filter(a => a.status === 'running').length,
      completed: agents.filter(a => a.status === 'completed').length,
      failed: agents.filter(a => a.status === 'failed').length,
      blocked: agents.filter(a => a.status === 'blocked').length,
      progress: agents.length > 0 
        ? (agents.filter(a => a.status === 'completed').length / agents.length) * 100 
        : 0,
    };
  }

  getAgents(): SubAgent[] {
    return Array.from(this.agents.values());
  }

  getAgent(id: string): SubAgent | undefined {
    return this.agents.get(id);
  }

  reset(): void {
    this.agents.clear();
    this.runningAgents.clear();
    this.completedResults.clear();
  }

  private topologicalSort(agents: SubAgent[]): SubAgent[] {
    const sorted: SubAgent[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();

    const visit = (agent: SubAgent) => {
      if (temp.has(agent.id)) {
        throw new Error('Circular dependency detected');
      }
      if (visited.has(agent.id)) {
        return;
      }

      temp.add(agent.id);

      // Visit dependencies first
      for (const depId of agent.component.dependencies) {
        const dep = this.agents.get(depId);
        if (dep) {
          visit(dep);
        }
      }

      temp.delete(agent.id);
      visited.add(agent.id);
      sorted.push(agent);
    };

    for (const agent of agents) {
      if (!visited.has(agent.id)) {
        visit(agent);
      }
    }

    return sorted;
  }

  private async waitForAnyCompletion(): Promise<void> {
    return new Promise(resolve => {
      const check = () => {
        if (this.runningAgents.size < this.config.maxConcurrency) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton
let globalOrchestrator: SubAgentOrchestrator | null = null;

export function getGlobalSubAgentOrchestrator(): SubAgentOrchestrator {
  if (!globalOrchestrator) {
    globalOrchestrator = new SubAgentOrchestrator();
  }
  return globalOrchestrator;
}

export function setGlobalSubAgentOrchestrator(orchestrator: SubAgentOrchestrator): void {
  globalOrchestrator = orchestrator;
}
