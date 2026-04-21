import * as vscode from 'vscode';
import { MagnetoService } from './magnetoService';

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

export interface MetricsSummary {
  totalTokensWithMagneto: number;
  totalTokensWithoutMagneto: number;
  totalCost: number;
  avgCompressionRatio: number;
  taskCount: number;
  sessionCount: number;
  metricCount: number;
}

export interface TokenMetricsResponse {
  sessions: SessionMetrics[];
  metrics: TokenMetric[];
  summary: MetricsSummary;
}

export class TokenMetricsService {
  private magnetoService: MagnetoService;
  private metricsCache: TokenMetricsResponse | null = null;
  private refreshInterval: NodeJS.Timeout | null = null;

  constructor(magnetoService: MagnetoService) {
    this.magnetoService = magnetoService;
  }

  async getMetrics(
    sessionId?: string,
    taskId?: string,
    runner?: string,
    limit: number = 100
  ): Promise<TokenMetricsResponse> {
    try {
      const response = await this.magnetoService.callMCPTool('token_metrics', {
        sessionId,
        taskId,
        runner,
        limit,
      });

      if (response.success) {
        this.metricsCache = response.data as TokenMetricsResponse;
        return this.metricsCache;
      } else {
        throw new Error(response.error || 'Failed to get token metrics');
      }
    } catch (error) {
      console.error('Error fetching token metrics:', error);
      return this.getEmptyResponse();
    }
  }

  async getRecentMetrics(limit: number = 50): Promise<TokenMetric[]> {
    const response = await this.getMetrics(undefined, undefined, undefined, limit);
    return response.metrics;
  }

  async getSessionMetrics(sessionId: string): Promise<SessionMetrics[]> {
    const response = await this.getMetrics(sessionId);
    return response.sessions;
  }

  getCompressionData(): {
    withMagneto: Array<{ timestamp: string; tokens: number }>;
    withoutMagneto: Array<{ timestamp: string; tokens: number }>;
  } {
    if (!this.metricsCache) {
      return { withMagneto: [], withoutMagneto: [] };
    }

    const withMagneto = this.metricsCache.metrics
      .filter(m => m.withMagneto)
      .map(m => ({ timestamp: m.timestamp, tokens: m.totalTokens }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const withoutMagneto = this.metricsCache.metrics
      .filter(m => !m.withMagneto)
      .map(m => ({ timestamp: m.timestamp, tokens: m.totalTokens }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return { withMagneto, withoutMagneto };
  }

  getCostData(): {
    totalCost: number;
    costWithMagneto: number;
    costWithoutMagneto: number;
    savings: number;
  } {
    if (!this.metricsCache) {
      return { totalCost: 0, costWithMagneto: 0, costWithoutMagneto: 0, savings: 0 };
    }

    const costWithMagneto = this.metricsCache.metrics
      .filter(m => m.withMagneto)
      .reduce((sum, m) => sum + m.costUSD, 0);

    const costWithoutMagneto = this.metricsCache.metrics
      .filter(m => !m.withMagneto)
      .reduce((sum, m) => sum + m.costUSD, 0);

    const totalCost = this.metricsCache.summary.totalCost;
    const savings = costWithoutMagneto - costWithMagneto;

    return { totalCost, costWithMagneto, costWithoutMagneto, savings };
  }

  getCompressionRatio(): number {
    if (!this.metricsCache) return 0;
    return this.metricsCache.summary.avgCompressionRatio;
  }

  startAutoRefresh(intervalMs: number = 5000): void {
    this.stopAutoRefresh();
    this.refreshInterval = setInterval(() => {
      this.getMetrics().catch(error => {
        console.error('Auto-refresh failed:', error);
      });
    }, intervalMs);
  }

  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  private getEmptyResponse(): TokenMetricsResponse {
    return {
      sessions: [],
      metrics: [],
      summary: {
        totalTokensWithMagneto: 0,
        totalTokensWithoutMagneto: 0,
        totalCost: 0,
        avgCompressionRatio: 0,
        taskCount: 0,
        sessionCount: 0,
        metricCount: 0,
      },
    };
  }
}
