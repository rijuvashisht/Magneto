import { EventEmitter } from 'events';
import { TaskComponent } from './decomposition-engine';

export interface ContextBoundary {
  // Define what a sub-agent can access
  allowedFiles: string[];
  allowedSymbols: string[];
  allowedOperations: string[];
  forbiddenPatterns: RegExp[];
  maxTokens: number;
  maxFiles: number;
  maxDepth: number;
  readOnly: boolean;
  allowNetwork: boolean;
  allowExternalCommands: boolean;
}

export interface ContextViolation {
  agentId: string;
  violation: string;
  attempted: string;
  blocked: boolean;
  timestamp: string;
  severity: 'warning' | 'error' | 'critical';
}

export interface BoundaryConfig {
  maxTokensPerAgent: number;
  maxFilesPerAgent: number;
  maxDepth: number;
  defaultReadOnly: boolean;
  allowNetworkByDefault: boolean;
  allowExternalCommandsDefault: boolean;
  forbiddenPatterns: string[];
}

export class ContextBoundaryManager extends EventEmitter {
  private config: BoundaryConfig;
  private violations: ContextViolation[] = [];
  private activeBoundaries: Map<string, ContextBoundary> = new Map();

  constructor(config: Partial<BoundaryConfig> = {}) {
    super();
    this.config = {
      maxTokensPerAgent: 8000,
      maxFilesPerAgent: 20,
      maxDepth: 3,
      defaultReadOnly: false,
      allowNetworkByDefault: false,
      allowExternalCommandsDefault: false,
      forbiddenPatterns: [
        '\.env',
        'password',
        'secret',
        'key',
        'token',
        'credential',
      ],
      ...config,
    };
  }

  async createBoundary(
    component: TaskComponent,
    parentTask: { id: string; depth?: number },
    options: Partial<ContextBoundary> = {}
  ): Promise<ContextBoundary> {
    // Calculate depth
    const depth = (parentTask.depth || 0) + 1;

    // Build allowed operations based on component
    const allowedOperations = this.determineAllowedOperations(component);

    // Build forbidden patterns
    const forbiddenPatterns = [
      ...this.config.forbiddenPatterns.map(p => new RegExp(p, 'i')),
      ...(options.forbiddenPatterns || []),
    ];

    const boundary: ContextBoundary = {
      allowedFiles: component.contextScope.files,
      allowedSymbols: component.contextScope.symbols,
      allowedOperations,
      forbiddenPatterns,
      maxTokens: options.maxTokens || this.config.maxTokensPerAgent,
      maxFiles: component.contextScope.files.length || this.config.maxFilesPerAgent,
      maxDepth: this.config.maxDepth,
      readOnly: options.readOnly ?? this.config.defaultReadOnly,
      allowNetwork: options.allowNetwork ?? this.config.allowNetworkByDefault,
      allowExternalCommands: options.allowExternalCommands ?? this.config.allowExternalCommandsDefault,
    };

    // Validate boundary before storing
    this.validateBoundary(boundary);

    const boundaryId = `${parentTask.id}-${component.id}`;
    this.activeBoundaries.set(boundaryId, boundary);

    this.emit('boundary-created', { boundaryId, boundary, depth });

    return boundary;
  }

  async validateAccess(
    agentId: string,
    operation: string,
    target: string,
    boundary?: ContextBoundary
  ): Promise<boolean> {
    // Get boundary if not provided
    if (!boundary) {
      boundary = this.activeBoundaries.get(agentId);
    }

    if (!boundary) {
      // No boundary means no restrictions (for non-sub-agent contexts)
      return true;
    }

    // Check operation permission
    if (!boundary.allowedOperations.includes(operation)) {
      this.recordViolation(agentId, 'unauthorized-operation', operation, true, 'error');
      return false;
    }

    // Check forbidden patterns
    for (const pattern of boundary.forbiddenPatterns) {
      if (pattern.test(target)) {
        this.recordViolation(agentId, 'forbidden-pattern', target, true, 'critical');
        return false;
      }
    }

    // Check file access
    if (operation === 'read' || operation === 'write') {
      const isAllowed = this.isFileAllowed(target, boundary);
      if (!isAllowed) {
        this.recordViolation(agentId, 'file-access', target, true, 'error');
        return false;
      }

      // Check read-only restriction
      if (operation === 'write' && boundary.readOnly) {
        this.recordViolation(agentId, 'read-only-violation', target, true, 'error');
        return false;
      }
    }

    // Check network access
    if (operation === 'network' && !boundary.allowNetwork) {
      this.recordViolation(agentId, 'network-access', target, true, 'error');
      return false;
    }

    // Check external commands
    if (operation === 'exec' && !boundary.allowExternalCommands) {
      this.recordViolation(agentId, 'external-command', target, true, 'error');
      return false;
    }

    return true;
  }

  async enforceBoundary(
    context: any,
    boundary: ContextBoundary
  ): Promise<any> {
    // Create a filtered copy of context based on boundary
    const filtered: any = {};

    // Filter files in context
    if (context.files) {
      filtered.files = context.files.filter((f: string) => 
        this.isFileAllowed(f, boundary)
      );
    }

    // Filter symbols in context
    if (context.symbols) {
      filtered.symbols = context.symbols.filter((s: string) =>
        boundary.allowedSymbols.includes(s) || boundary.allowedSymbols.length === 0
      );
    }

    // Filter code references
    if (context.code) {
      filtered.code = this.filterCodeContent(context.code, boundary);
    }

    // Copy allowed fields
    const allowedFields = ['task', 'config', 'memoryIds', 'sharedState'];
    for (const field of allowedFields) {
      if (context[field] !== undefined) {
        filtered[field] = context[field];
      }
    }

    // Add boundary info
    filtered._boundary = {
      readOnly: boundary.readOnly,
      allowNetwork: boundary.allowNetwork,
      allowExternalCommands: boundary.allowExternalCommands,
      maxTokens: boundary.maxTokens,
    };

    return filtered;
  }

  async checkTokenLimit(agentId: string, tokens: number): Promise<boolean> {
    const boundary = this.activeBoundaries.get(agentId);
    if (!boundary) return true;

    if (tokens > boundary.maxTokens) {
      this.recordViolation(
        agentId,
        'token-limit-exceeded',
        `${tokens} > ${boundary.maxTokens}`,
        false,
        'warning'
      );
      return false;
    }

    return true;
  }

  async checkFileLimit(agentId: string, fileCount: number): Promise<boolean> {
    const boundary = this.activeBoundaries.get(agentId);
    if (!boundary) return true;

    if (fileCount > boundary.maxFiles) {
      this.recordViolation(
        agentId,
        'file-limit-exceeded',
        `${fileCount} > ${boundary.maxFiles}`,
        false,
        'warning'
      );
      return false;
    }

    return true;
  }

  getViolations(agentId?: string): ContextViolation[] {
    if (agentId) {
      return this.violations.filter(v => v.agentId === agentId);
    }
    return [...this.violations];
  }

  getActiveBoundaries(): Map<string, ContextBoundary> {
    return new Map(this.activeBoundaries);
  }

  removeBoundary(agentId: string): boolean {
    const existed = this.activeBoundaries.has(agentId);
    this.activeBoundaries.delete(agentId);
    if (existed) {
      this.emit('boundary-removed', agentId);
    }
    return existed;
  }

  clearAllBoundaries(): void {
    this.activeBoundaries.clear();
    this.violations = [];
    this.emit('boundaries-cleared');
  }

  getConfig(): BoundaryConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<BoundaryConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config-updated', this.config);
  }

  generateSecurityReport(): {
    totalViolations: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    topViolators: Array<{ agentId: string; count: number }>;
  } {
    const bySeverity: Record<string, number> = { warning: 0, error: 0, critical: 0 };
    const byType: Record<string, number> = {};
    const agentCounts: Record<string, number> = {};

    for (const violation of this.violations) {
      bySeverity[violation.severity]++;
      byType[violation.violation] = (byType[violation.violation] || 0) + 1;
      agentCounts[violation.agentId] = (agentCounts[violation.agentId] || 0) + 1;
    }

    const topViolators = Object.entries(agentCounts)
      .map(([agentId, count]) => ({ agentId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalViolations: this.violations.length,
      bySeverity,
      byType,
      topViolators,
    };
  }

  private determineAllowedOperations(component: TaskComponent): string[] {
    // Base operations all sub-agents can do
    const base = ['read', 'analyze', 'suggest'];

    // Add based on risk level
    if (component.risk === 'low') {
      base.push('write', 'modify', 'refactor');
    } else if (component.risk === 'medium') {
      base.push('write', 'modify');
    }

    // Add based on template
    if (component.template.constraints.includes('no-write')) {
      return base.filter(op => !['write', 'modify', 'refactor'].includes(op));
    }

    return base;
  }

  private isFileAllowed(filePath: string, boundary: ContextBoundary): boolean {
    // If no allowed files specified, allow all (with forbidden pattern check)
    if (boundary.allowedFiles.length === 0) {
      return true;
    }

    // Check if file is in allowed list
    return boundary.allowedFiles.some(allowed => {
      // Exact match
      if (allowed === filePath) return true;
      
      // Directory prefix match
      if (filePath.startsWith(allowed + '/')) return true;
      
      // Pattern match (glob-like)
      const pattern = allowed.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(filePath);
    });
  }

  private filterCodeContent(code: string, boundary: ContextBoundary): string {
    // Remove sensitive information from code
    let filtered = code;

    // Remove lines matching forbidden patterns
    const lines = code.split('\n');
    const safeLines = lines.filter(line => {
      for (const pattern of boundary.forbiddenPatterns) {
        if (pattern.test(line)) {
          return false;
        }
      }
      return true;
    });

    filtered = safeLines.join('\n');

    // Truncate if too long (respect token limit)
    const maxChars = boundary.maxTokens * 4; // Rough estimate: 1 token ≈ 4 chars
    if (filtered.length > maxChars) {
      filtered = filtered.substring(0, maxChars) + '\n\n... [truncated for token limit]';
    }

    return filtered;
  }

  private validateBoundary(boundary: ContextBoundary): void {
    // Ensure maxFiles doesn't exceed limit
    if (boundary.allowedFiles.length > this.config.maxFilesPerAgent) {
      boundary.allowedFiles = boundary.allowedFiles.slice(0, this.config.maxFilesPerAgent);
    }

    // Ensure maxTokens doesn't exceed limit
    if (boundary.maxTokens > this.config.maxTokensPerAgent * 2) {
      boundary.maxTokens = this.config.maxTokensPerAgent * 2;
    }
  }

  private recordViolation(
    agentId: string,
    violation: string,
    attempted: string,
    blocked: boolean,
    severity: 'warning' | 'error' | 'critical'
  ): void {
    const record: ContextViolation = {
      agentId,
      violation,
      attempted,
      blocked,
      timestamp: new Date().toISOString(),
      severity,
    };

    this.violations.push(record);
    this.emit('violation', record);

    // Limit stored violations
    if (this.violations.length > 1000) {
      this.violations = this.violations.slice(-500);
    }
  }
}

// Singleton
let globalManager: ContextBoundaryManager | null = null;

export function getGlobalContextBoundaryManager(): ContextBoundaryManager {
  if (!globalManager) {
    globalManager = new ContextBoundaryManager();
  }
  return globalManager;
}

export function setGlobalContextBoundaryManager(manager: ContextBoundaryManager): void {
  globalManager = manager;
}
