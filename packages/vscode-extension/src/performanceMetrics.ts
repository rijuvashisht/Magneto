import * as vscode from 'vscode';
import { MagnetoService } from './magnetoService';

export interface PerformanceMetric {
  timestamp: string;
  sessionId: string;
  taskId: string;
  taskType: string;
  duration: number;
  filesLoaded: number;
  totalFiles: number;
  compressionRatio: number;
  graphNodes: number;
  graphEdges: number;
  graphCommunities: number;
  success: boolean;
  retries: number;
}

export interface SessionPerformance {
  sessionId: string;
  startTime: string;
  endTime?: string;
  tasks: string[];
  metrics: PerformanceMetric[];
  avgDuration: number;
  avgCompressionRatio: number;
  totalTasks: number;
  successRate: number;
}

export interface PerformanceSummary {
  totalTasks: number;
  totalDuration: number;
  avgDuration: number;
  avgCompressionRatio: number;
  successRate: number;
  graphGrowth: {
    nodes: number;
    edges: number;
    communities: number;
  };
  improvementTrend: number;
}

export interface PerformanceMetricsResponse {
  sessions: SessionPerformance[];
  metrics: PerformanceMetric[];
  summary: PerformanceSummary;
}

export class PerformanceMetricsService {
  private magnetoService: MagnetoService;
  private metricsCache: PerformanceMetricsResponse | null = null;

  constructor(magnetoService: MagnetoService) {
    this.magnetoService = magnetoService;
  }

  async getMetrics(
    sessionId?: string,
    taskId?: string,
    limit: number = 100
  ): Promise<PerformanceMetricsResponse> {
    try {
      const response = await this.magnetoService.callMCPTool('performance_metrics', {
        sessionId,
        taskId,
        limit,
      });

      if (response.success) {
        this.metricsCache = response.data as PerformanceMetricsResponse;
        return this.metricsCache;
      } else {
        throw new Error(response.error || 'Failed to get performance metrics');
      }
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      return this.getEmptyResponse();
    }
  }

  async getRecentMetrics(limit: number = 50): Promise<PerformanceMetric[]> {
    const response = await this.getMetrics(undefined, undefined, limit);
    return response.metrics;
  }

  getDurationData(): {
    timestamps: string[];
    durations: number[];
    avgDuration: number;
  } {
    if (!this.metricsCache) {
      return { timestamps: [], durations: [], avgDuration: 0 };
    }

    const metrics = this.metricsCache.metrics;
    const timestamps = metrics
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(m => new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    const durations = metrics
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(m => m.duration / 1000); // Convert to seconds

    const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length / 1000;

    return { timestamps, durations, avgDuration };
  }

  getCompressionData(): {
    timestamps: string[];
    compressionRatios: number[];
    avgCompressionRatio: number;
  } {
    if (!this.metricsCache) {
      return { timestamps: [], compressionRatios: [], avgCompressionRatio: 0 };
    }

    const metrics = this.metricsCache.metrics;
    const timestamps = metrics
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(m => new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    const compressionRatios = metrics
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(m => m.compressionRatio);

    const avgCompressionRatio = metrics.reduce((sum, m) => sum + m.compressionRatio, 0) / metrics.length;

    return { timestamps, compressionRatios, avgCompressionRatio };
  }

  getImprovementTrend(): number {
    if (!this.metricsCache || this.metricsCache.metrics.length < 4) return 0;

    const metrics = this.metricsCache.metrics;
    const quarter = Math.floor(metrics.length / 4);

    if (quarter === 0) return 0;

    const firstQuarter = metrics.slice(0, quarter);
    const lastQuarter = metrics.slice(-quarter);

    const firstAvgDuration = firstQuarter.reduce((sum, m) => sum + m.duration, 0) / firstQuarter.length;
    const lastAvgDuration = lastQuarter.reduce((sum, m) => sum + m.duration, 0) / lastQuarter.length;

    return ((firstAvgDuration - lastAvgDuration) / firstAvgDuration) * 100;
  }

  startAutoRefresh(intervalMs: number = 5000): void {
    // Auto-refresh implementation if needed
  }

  stopAutoRefresh(): void {
    // Stop auto-refresh implementation if needed
  }

  private getEmptyResponse(): PerformanceMetricsResponse {
    return {
      sessions: [],
      metrics: [],
      summary: {
        totalTasks: 0,
        totalDuration: 0,
        avgDuration: 0,
        avgCompressionRatio: 0,
        successRate: 0,
        graphGrowth: { nodes: 0, edges: 0, communities: 0 },
        improvementTrend: 0,
      },
    };
  }
}
