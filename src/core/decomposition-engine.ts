import { EventEmitter } from 'events';

export interface DecompositionConfig {
  enabled: boolean;
  maxDepth: number;
  minComplexityScore: number;
  strategies: DecompositionStrategy[];
}

export interface DecompositionStrategy {
  name: string;
  pattern: RegExp;
  extractors: ComponentExtractor[];
  agentTemplate: SubAgentTemplate;
  complexityMultiplier: number;
}

export interface ComponentExtractor {
  name: string;
  prompt: string;
  contextWindow: number;
}

export interface SubAgentTemplate {
  role: string;
  expertise: string[];
  constraints: string[];
  deliverables: string[];
}

export interface TaskComponent {
  id: string;
  name: string;
  description: string;
  complexity: number;
  dependencies: string[];
  contextScope: {
    files: string[];
    symbols: string[];
    patterns: string[];
  };
  estimatedEffort: number;
  risk: 'low' | 'medium' | 'high';
  template: SubAgentTemplate;
}

export interface DecompositionResult {
  shouldDecompose: boolean;
  complexityScore: number;
  reason: string;
  components: TaskComponent[];
  coordinationStrategy: 'sequential' | 'parallel' | 'hybrid';
  strategy: string;
}

// Built-in strategies
export const FileBasedStrategy: DecompositionStrategy = {
  name: 'file-based',
  pattern: /refactor|organize|split.*module|restructure|move.*files/i,
  complexityMultiplier: 0.8,
  extractors: [
    {
      name: 'identify-files',
      prompt: 'Analyze the codebase and identify all files that need to be modified. Return as a JSON array of objects with {path, reason, complexity}.',
      contextWindow: 2000,
    },
    {
      name: 'group-components',
      prompt: 'Group these files into logical components that can be worked on independently. Return as JSON array of {name, files[], dependencies[]}.',
      contextWindow: 2000,
    },
  ],
  agentTemplate: {
    role: 'file-refactor-agent',
    expertise: ['file-operations', 'code-structure', 'imports', 'exports'],
    constraints: [
      'only modify assigned files',
      'preserve all public exports',
      'update all related imports',
      'maintain backward compatibility when possible',
    ],
    deliverables: ['refactored files', 'import map', 'migration guide', 'test updates'],
  },
};

export const LayerBasedStrategy: DecompositionStrategy = {
  name: 'layer-based',
  pattern: /implement.*api|add.*endpoint|create.*service|build.*backend|rest.*api|graphql/i,
  complexityMultiplier: 0.9,
  extractors: [
    {
      name: 'identify-layers',
      prompt: 'Identify the architectural layers needed: controller/route handlers, service/business logic, repository/data access, models/entities. Return as JSON with layer names and responsibilities.',
      contextWindow: 1500,
    },
    {
      name: 'layer-dependencies',
      prompt: 'Map the dependencies between these layers. Which layer depends on which? Return as a JSON adjacency list.',
      contextWindow: 1000,
    },
  ],
  agentTemplate: {
    role: 'layer-implementation-agent',
    expertise: ['layered-architecture', 'api-design', 'data-flow', 'dependency-injection'],
    constraints: [
      'respect layer boundaries (no skipping layers)',
      'no circular dependencies between layers',
      'define clear interfaces between layers',
      'include unit tests for each layer',
    ],
    deliverables: ['layer implementation', 'interface definitions', 'dependency graph', 'unit tests'],
  },
};

export const FeatureBasedStrategy: DecompositionStrategy = {
  name: 'feature-based',
  pattern: /implement.*feature|add.*support|enable.*functionality|build.*module|create.*system/i,
  complexityMultiplier: 0.85,
  extractors: [
    {
      name: 'identify-features',
      prompt: 'Break this down into minimal viable sub-features that can be delivered independently. Consider user-facing features, not technical tasks. Return JSON array of {name, description, acceptanceCriteria[], priority}.',
      contextWindow: 2500,
    },
    {
      name: 'feature-dependencies',
      prompt: 'Identify which features depend on others being completed first. Return a JSON dependency graph.',
      contextWindow: 1500,
    },
  ],
  agentTemplate: {
    role: 'feature-agent',
    expertise: ['feature-development', 'user-stories', 'acceptance-criteria', 'vertical-slicing'],
    constraints: [
      'deliver vertical slices (UI to database)',
      'each feature must be independently deliverable',
      'include acceptance tests',
      'document user-facing changes',
    ],
    deliverables: ['working feature', 'acceptance tests', 'user documentation', 'api documentation'],
  },
};

export const DomainBasedStrategy: DecompositionStrategy = {
  name: 'domain-based',
  pattern: /implement.*domain|model.*entities|business.*logic|domain.*driven|ddd/i,
  complexityMultiplier: 0.75,
  extractors: [
    {
      name: 'identify-domains',
      prompt: 'Identify the bounded contexts or domains in this system. Look for distinct business capabilities. Return JSON array of {name, entities[], responsibilities[]}.',
      contextWindow: 2000,
    },
    {
      name: 'domain-relationships',
      prompt: 'Identify how these domains interact. Which domains call which? Return JSON with relationships and integration patterns.',
      contextWindow: 1500,
    },
  ],
  agentTemplate: {
    role: 'domain-agent',
    expertise: ['domain-driven-design', 'bounded-contexts', 'aggregates', 'domain-events'],
    constraints: [
      'maintain domain boundaries',
      'use domain events for cross-domain communication',
      'avoid direct database access across domains',
      'keep aggregates small and focused',
    ],
    deliverables: ['domain model', 'aggregates', 'domain events', 'repository implementations'],
  },
};

// Complexity analyzer
interface ComplexityFactors {
  fileCount: number;
  lineCount: number;
  scopeCount: number;      // Number of distinct scopes/modules
  dependencyCount: number;
  crossCuttingCount: number;  // Number of cross-cutting concerns
}

export class DecompositionEngine extends EventEmitter {
  private config: DecompositionConfig;

  constructor(config: Partial<DecompositionConfig> = {}) {
    super();
    this.config = {
      enabled: true,
      maxDepth: 3,
      minComplexityScore: 0.6,
      strategies: [
        FileBasedStrategy,
        LayerBasedStrategy,
        FeatureBasedStrategy,
        DomainBasedStrategy,
      ],
      ...config,
    };
  }

  async analyze(task: any): Promise<DecompositionResult> {
    if (!this.config.enabled) {
      return {
        shouldDecompose: false,
        complexityScore: 0,
        reason: 'Decomposition disabled',
        components: [],
        coordinationStrategy: 'sequential',
        strategy: 'none',
      };
    }

    // Check if already at max depth
    if (task.depth && task.depth >= this.config.maxDepth) {
      return {
        shouldDecompose: false,
        complexityScore: 0,
        reason: `Maximum decomposition depth (${this.config.maxDepth}) reached`,
        components: [],
        coordinationStrategy: 'sequential',
        strategy: 'none',
      };
    }

    // Extract complexity factors from task
    const factors = this.extractComplexityFactors(task);
    
    // Calculate complexity score
    const complexityScore = this.calculateComplexity(factors);

    // Match strategy
    const strategy = this.matchStrategy(task);

    // Determine if decomposition needed
    const shouldDecompose = complexityScore >= this.config.minComplexityScore;

    const result: DecompositionResult = {
      shouldDecompose,
      complexityScore,
      reason: shouldDecompose 
        ? `Complexity score ${complexityScore.toFixed(2)} >= threshold ${this.config.minComplexityScore}`
        : `Complexity score ${complexityScore.toFixed(2)} < threshold ${this.config.minComplexityScore}`,
      components: [],
      coordinationStrategy: this.determineCoordinationStrategy(factors, strategy),
      strategy: strategy?.name || 'none',
    };

    this.emit('analyzed', result);
    return result;
  }

  async decompose(task: any, result: DecompositionResult): Promise<TaskComponent[]> {
    if (!result.shouldDecompose || result.components.length > 0) {
      return result.components;
    }

    const strategy = this.config.strategies.find(s => s.name === result.strategy);
    if (!strategy) {
      return [];
    }

    // Use extractors to identify components
    const components = await this.extractComponents(task, strategy);

    // Validate and enhance components
    const enhanced = this.enhanceComponents(components, strategy);

    // Build dependency graph
    this.resolveDependencies(enhanced);

    this.emit('decomposed', { task, components: enhanced, strategy: strategy.name });

    return enhanced;
  }

  private extractComplexityFactors(task: any): ComplexityFactors {
    const content = task.content || task.description || '';
    
    // Count indicators of complexity
    const fileCount = (content.match(/file|module|component/gi) || []).length;
    const scopeCount = (content.match(/\b(api|service|controller|model|database|frontend|backend|auth|payment)\b/gi) || []).length;
    const dependencyCount = (content.match(/depend|require|import|use|call/gi) || []).length;
    const crossCuttingCount = (content.match(/\b(auth|logging|validation|error|security|cache)\b/gi) || []).length;
    const lineCount = content.split('\n').length;

    return {
      fileCount,
      lineCount,
      scopeCount,
      dependencyCount,
      crossCuttingCount,
    };
  }

  private calculateComplexity(factors: ComplexityFactors): number {
    // Normalized scoring (0-1)
    const fileScore = Math.min(factors.fileCount / 10, 1);
    const scopeScore = Math.min(factors.scopeCount / 5, 1);
    const dependencyScore = Math.min(factors.dependencyCount / 10, 1);
    const lineScore = Math.min(factors.lineCount / 100, 1);

    // Weighted average
    const score = (
      fileScore * 0.3 +
      scopeScore * 0.3 +
      dependencyScore * 0.2 +
      lineScore * 0.2
    );

    return Math.min(score, 1);
  }

  private matchStrategy(task: any): DecompositionStrategy | undefined {
    const content = task.content || task.description || task.name || '';
    
    // Find strategy with highest match score
    let bestStrategy: DecompositionStrategy | undefined;
    let bestScore = 0;

    for (const strategy of this.config.strategies) {
      const matches = content.match(strategy.pattern);
      if (matches) {
        const score = matches.length * strategy.complexityMultiplier;
        if (score > bestScore) {
          bestScore = score;
          bestStrategy = strategy;
        }
      }
    }

    return bestStrategy;
  }

  private determineCoordinationStrategy(
    factors: ComplexityFactors, 
    strategy?: DecompositionStrategy
  ): 'sequential' | 'parallel' | 'hybrid' {
    // High dependencies = sequential
    // Low dependencies = parallel
    // Mixed = hybrid

    if (factors.dependencyCount > factors.scopeCount * 2) {
      return 'sequential';
    } else if (factors.dependencyCount < factors.scopeCount) {
      return 'parallel';
    } else {
      return 'hybrid';
    }
  }

  private async extractComponents(
    task: any, 
    strategy: DecompositionStrategy
  ): Promise<Partial<TaskComponent>[]> {
    // In a real implementation, this would use LLM calls
    // For now, create simple heuristic-based components
    
    const components: Partial<TaskComponent>[] = [];
    const content = task.content || task.description || '';

    // Extract file names mentioned in task
    const fileMatches = content.match(/\b[a-zA-Z0-9_-]+\.(ts|js|tsx|jsx|py|java|go|rs)\b/g) || [];
    
    // Extract module/feature names
    const moduleMatches = content.match(/\b(?:auth|user|payment|order|product|api|service)\b/gi) || [];

    // Create components based on matches
    if (fileMatches.length > 0) {
      // File-based decomposition
      const fileGroups = this.groupFiles(fileMatches);
      for (const group of fileGroups) {
        components.push({
          name: `Refactor ${group.name}`,
          description: `Update and reorganize ${group.files.length} files in ${group.name}`,
          contextScope: {
            files: group.files,
            symbols: [],
            patterns: [group.name.toLowerCase()],
          },
          estimatedEffort: Math.min(group.files.length * 2, 10),
          risk: group.files.length > 5 ? 'high' : 'medium',
          template: strategy.agentTemplate,
        });
      }
    } else if (moduleMatches.length > 0) {
      // Module-based decomposition
      const uniqueModules = [...new Set<string>(moduleMatches as string[])];
      for (const mod of uniqueModules.slice(0, 5)) {
        components.push({
          name: `Implement ${mod} functionality`,
          description: `Build ${mod} module with all necessary components`,
          contextScope: {
            files: [],
            symbols: [mod],
            patterns: [mod.toLowerCase()],
          },
          estimatedEffort: 6,
          risk: 'medium',
          template: strategy.agentTemplate,
        });
      }
    }

    // If no components found, create a single component
    if (components.length === 0) {
      components.push({
        name: task.name || 'Main task',
        description: task.description || task.content || '',
        contextScope: {
          files: [],
          symbols: [],
          patterns: [],
        },
        estimatedEffort: 5,
        risk: 'medium',
        template: strategy.agentTemplate,
      });
    }

    return components;
  }

  private groupFiles(files: string[]): Array<{ name: string; files: string[] }> {
    const groups: Record<string, string[]> = {};

    for (const file of files) {
      // Extract directory or prefix
      const parts = file.split(/[._-]/);
      const prefix = parts[0];

      if (!groups[prefix]) {
        groups[prefix] = [];
      }
      groups[prefix].push(file);
    }

    return Object.entries(groups).map(([name, files]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      files,
    }));
  }

  private enhanceComponents(
    components: Partial<TaskComponent>[], 
    strategy: DecompositionStrategy
  ): TaskComponent[] {
    return components.map((comp, index) => ({
      id: `comp-${Date.now()}-${index}`,
      name: comp.name || `Component ${index + 1}`,
      description: comp.description || '',
      complexity: comp.estimatedEffort ? comp.estimatedEffort / 10 : 0.5,
      dependencies: comp.dependencies || [],
      contextScope: comp.contextScope || { files: [], symbols: [], patterns: [] },
      estimatedEffort: comp.estimatedEffort || 5,
      risk: comp.risk || 'medium',
      template: comp.template || strategy.agentTemplate,
    }));
  }

  private resolveDependencies(components: TaskComponent[]): void {
    // Build dependency graph based on shared context
    for (let i = 0; i < components.length; i++) {
      for (let j = i + 1; j < components.length; j++) {
        const a = components[i];
        const b = components[j];

        // Check for shared files
        const sharedFiles = a.contextScope.files.filter(f => 
          b.contextScope.files.includes(f)
        );

        // Check for shared symbols
        const sharedSymbols = a.contextScope.symbols.filter(s => 
          b.contextScope.symbols.includes(s)
        );

        // If shared context, create dependency (lower index depends on higher if simpler)
        if (sharedFiles.length > 0 || sharedSymbols.length > 0) {
          if (a.estimatedEffort <= b.estimatedEffort) {
            // Simpler one first
            if (!b.dependencies.includes(a.id)) {
              b.dependencies.push(a.id);
            }
          } else {
            if (!a.dependencies.includes(b.id)) {
              a.dependencies.push(b.id);
            }
          }
        }
      }
    }
  }

  getConfig(): DecompositionConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<DecompositionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getStrategies(): DecompositionStrategy[] {
    return [...this.config.strategies];
  }
}

// Singleton
let globalEngine: DecompositionEngine | null = null;

export function getGlobalDecompositionEngine(): DecompositionEngine {
  if (!globalEngine) {
    globalEngine = new DecompositionEngine();
  }
  return globalEngine;
}

export function setGlobalDecompositionEngine(engine: DecompositionEngine): void {
  globalEngine = engine;
}
