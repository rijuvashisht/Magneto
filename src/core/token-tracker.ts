import * as path from 'path';
import { logger } from '../utils/logger';
import { readJson, writeJson, fileExists } from '../utils/fs';
import { magnetoPath } from '../utils/paths';

export interface TokenMetric {
  timestamp: string;
  sessionId: string;
  taskId: string;
  runner: string;
  model: string;
  withMagneto: boolean;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  contextSize: number;
  compressionRatio: number;
  costUSD: number;
  duration?: number;
}

export interface SessionMetrics {
  sessionId: string;
  startTime: string;
  endTime?: string;
  tasks: string[];
  metrics: TokenMetric[];
  totalTokensWithMagneto: number;
  totalTokensWithoutMagneto: number;
  totalCost: number;
  avgCompressionRatio: number;
}

export interface TrackerConfig {
  enabled: boolean;
  abTesting: boolean;
  retentionDays: number;
  pricing: Record<string, { input: number; output: number }>;
}

const DEFAULT_CONFIG: TrackerConfig = {
  enabled: true,
  abTesting: true,
  retentionDays: 30,
  pricing: {
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-opus': { input: 0.015, output: 0.075 },
    'gemini-pro': { input: 0.00025, output: 0.0005 },
  },
};

export class TokenMetricCollector {
  private config: TrackerConfig;
  private sessionId: string;
  private currentMetrics: TokenMetric[] = [];
  private metricsFile: string;

  constructor(projectRoot: string, config: Partial<TrackerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.generateSessionId();
    this.metricsFile = path.join(magnetoPath(projectRoot), 'token-metrics.json');
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async recordMetric(metric: Omit<TokenMetric, 'timestamp' | 'sessionId' | 'costUSD' | 'compressionRatio'>): Promise<void> {
    if (!this.config.enabled) return;

    const fullMetric: TokenMetric = {
      ...metric,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      costUSD: this.calculateCost(metric.model, metric.inputTokens, metric.outputTokens),
      compressionRatio: 1.0, // Will be calculated in A/B mode
    };

    this.currentMetrics.push(fullMetric);
    await this.saveMetrics();
  }

  recordABComparison(
    withMagneto: Omit<TokenMetric, 'timestamp' | 'sessionId' | 'costUSD' | 'compressionRatio' | 'withMagneto'>,
    withoutMagneto: Omit<TokenMetric, 'timestamp' | 'sessionId' | 'costUSD' | 'compressionRatio' | 'withMagneto'>
  ): void {
    if (!this.config.enabled) return;

    const compressionRatio = withoutMagneto.totalTokens > 0 
      ? (1 - (withMagneto.totalTokens / withoutMagneto.totalTokens)) * 100 
      : 0;

    // Record with Magneto
    this.currentMetrics.push({
      ...withMagneto,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      withMagneto: true,
      costUSD: this.calculateCost(withMagneto.model, withMagneto.inputTokens, withMagneto.outputTokens),
      compressionRatio,
    });

    // Record without Magneto (baseline)
    this.currentMetrics.push({
      ...withoutMagneto,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      withMagneto: false,
      costUSD: this.calculateCost(withoutMagneto.model, withoutMagneto.inputTokens, withoutMagneto.outputTokens),
      compressionRatio: 0,
    });
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = this.config.pricing[model.toLowerCase()] || this.config.pricing['gpt-4o'];
    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;
    return inputCost + outputCost;
  }

  async saveMetrics(): Promise<void> {
    try {
      const existingData = await this.loadMetrics();
      
      // Merge with existing data
      const mergedMetrics = [...existingData.metrics, ...this.currentMetrics];
      
      // Clean up old metrics based on retention
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
      const filteredMetrics = mergedMetrics.filter(m => new Date(m.timestamp) > cutoffDate);

      // Group by session
      const sessions = this.groupBySession(filteredMetrics);

      const data = {
        lastUpdated: new Date().toISOString(),
        sessions,
        config: this.config,
      };

      await writeJson(this.metricsFile, data);
      logger.debug(`Saved ${this.currentMetrics.length} token metrics to ${this.metricsFile}`);
      
      this.currentMetrics = [];
    } catch (error) {
      logger.error(`Failed to save token metrics: ${error}`);
    }
  }

  async loadMetrics(): Promise<{ metrics: TokenMetric[]; sessions: SessionMetrics[]; config: TrackerConfig }> {
    try {
      if (!await fileExists(this.metricsFile)) {
        return { metrics: [], sessions: [], config: DEFAULT_CONFIG };
      }

      const data = await readJson(this.metricsFile) as {
        sessions?: SessionMetrics[];
        config?: TrackerConfig;
      };
      return {
        metrics: data.sessions?.flatMap((s: SessionMetrics) => s.metrics) || [],
        sessions: data.sessions || [],
        config: data.config || DEFAULT_CONFIG,
      };
    } catch (error) {
      logger.error(`Failed to load token metrics: ${error}`);
      return { metrics: [], sessions: [], config: DEFAULT_CONFIG };
    }
  }

  private groupBySession(metrics: TokenMetric[]): SessionMetrics[] {
    const sessionMap = new Map<string, SessionMetrics>();

    for (const metric of metrics) {
      let session = sessionMap.get(metric.sessionId);
      
      if (!session) {
        session = {
          sessionId: metric.sessionId,
          startTime: metric.timestamp,
          tasks: [],
          metrics: [],
          totalTokensWithMagneto: 0,
          totalTokensWithoutMagneto: 0,
          totalCost: 0,
          avgCompressionRatio: 0,
        };
        sessionMap.set(metric.sessionId, session);
      }

      session.metrics.push(metric);
      if (!session.tasks.includes(metric.taskId)) {
        session.tasks.push(metric.taskId);
      }
      
      if (metric.withMagneto) {
        session.totalTokensWithMagneto += metric.totalTokens;
      } else {
        session.totalTokensWithoutMagneto += metric.totalTokens;
      }
      
      session.totalCost += metric.costUSD;
      session.endTime = metric.timestamp;
    }

    // Calculate average compression ratio per session
    for (const session of sessionMap.values()) {
      const magnetoMetrics = session.metrics.filter(m => m.withMagneto && m.compressionRatio > 0);
      if (magnetoMetrics.length > 0) {
        session.avgCompressionRatio = magnetoMetrics.reduce((sum, m) => sum + m.compressionRatio, 0) / magnetoMetrics.length;
      }
    }

    return Array.from(sessionMap.values()).sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }

  async getSessionMetrics(sessionId?: string): Promise<SessionMetrics[]> {
    const data = await this.loadMetrics();
    if (sessionId) {
      return data.sessions.filter(s => s.sessionId === sessionId);
    }
    return data.sessions;
  }

  async getMetricsByTask(taskId: string): Promise<TokenMetric[]> {
    const data = await this.loadMetrics();
    return data.metrics.filter(m => m.taskId === taskId);
  }

  async getMetricsByRunner(runner: string): Promise<TokenMetric[]> {
    const data = await this.loadMetrics();
    return data.metrics.filter(m => m.runner === runner);
  }

  async getRecentMetrics(limit: number = 100): Promise<TokenMetric[]> {
    const data = await this.loadMetrics();
    return data.metrics.slice(-limit);
  }

  async clearOldMetrics(): Promise<void> {
    await this.saveMetrics(); // This will apply retention policy
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getConfig(): TrackerConfig {
    return this.config;
  }
}

let globalCollector: TokenMetricCollector | null = null;

export function getGlobalTokenCollector(projectRoot?: string): TokenMetricCollector {
  if (!globalCollector && projectRoot) {
    globalCollector = new TokenMetricCollector(projectRoot);
  }
  return globalCollector!;
}

export function resetGlobalTokenCollector(): void {
  globalCollector = null;
}
