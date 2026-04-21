import * as path from 'path';
import { logger } from '../utils/logger';
import { readJson, writeJson, fileExists } from '../utils/fs';
import { magnetoPath } from '../utils/paths';

export interface PerformanceMetric {
  timestamp: string;
  sessionId: string;
  taskId: string;
  taskType: string;
  duration: number; // milliseconds
  filesLoaded: number;
  totalFiles: number;
  compressionRatio: number; // percentage
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
  improvementTrend: number; // percentage improvement over time
}

const DEFAULT_RETENTION_DAYS = 30;

export class PerformanceTracker {
  private sessionId: string;
  private currentMetrics: PerformanceMetric[] = [];
  private metricsFile: string;
  private taskStartTime: Map<string, number> = new Map();

  constructor(projectRoot: string) {
    this.sessionId = this.generateSessionId();
    this.metricsFile = path.join(magnetoPath(projectRoot), 'performance-metrics.json');
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  startTask(taskId: string): void {
    this.taskStartTime.set(taskId, Date.now());
  }

  async recordMetric(metric: Omit<PerformanceMetric, 'timestamp' | 'sessionId' | 'duration'>): Promise<void> {
    const startTime = this.taskStartTime.get(metric.taskId) || Date.now();
    const duration = Date.now() - startTime;

    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      duration,
    };

    this.currentMetrics.push(fullMetric);
    this.taskStartTime.delete(metric.taskId);
    await this.saveMetrics();
  }

  async saveMetrics(): Promise<void> {
    try {
      const existingData = await this.loadMetrics();
      
      const mergedMetrics = [...existingData.metrics, ...this.currentMetrics];
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - DEFAULT_RETENTION_DAYS);
      const filteredMetrics = mergedMetrics.filter(m => new Date(m.timestamp) > cutoffDate);

      const sessions = this.groupBySession(filteredMetrics);

      const data = {
        lastUpdated: new Date().toISOString(),
        sessions,
      };

      await writeJson(this.metricsFile, data);
      logger.debug(`Saved ${this.currentMetrics.length} performance metrics to ${this.metricsFile}`);
      
      this.currentMetrics = [];
    } catch (error) {
      logger.error(`Failed to save performance metrics: ${error}`);
    }
  }

  async loadMetrics(): Promise<{ metrics: PerformanceMetric[]; sessions: SessionPerformance[] }> {
    try {
      if (!await fileExists(this.metricsFile)) {
        return { metrics: [], sessions: [] };
      }

      const data = await readJson(this.metricsFile) as {
        sessions?: SessionPerformance[];
      };
      return {
        metrics: data.sessions?.flatMap(s => s.metrics) || [],
        sessions: data.sessions || [],
      };
    } catch (error) {
      logger.error(`Failed to load performance metrics: ${error}`);
      return { metrics: [], sessions: [] };
    }
  }

  private groupBySession(metrics: PerformanceMetric[]): SessionPerformance[] {
    const sessionMap = new Map<string, SessionPerformance>();

    for (const metric of metrics) {
      let session = sessionMap.get(metric.sessionId);
      
      if (!session) {
        session = {
          sessionId: metric.sessionId,
          startTime: metric.timestamp,
          tasks: [],
          metrics: [],
          avgDuration: 0,
          avgCompressionRatio: 0,
          totalTasks: 0,
          successRate: 0,
        };
        sessionMap.set(metric.sessionId, session);
      }

      session.metrics.push(metric);
      if (!session.tasks.includes(metric.taskId)) {
        session.tasks.push(metric.taskId);
      }
      
      session.endTime = metric.timestamp;
    }

    for (const session of sessionMap.values()) {
      session.totalTasks = session.metrics.length;
      session.avgDuration = session.metrics.reduce((sum, m) => sum + m.duration, 0) / session.totalTasks;
      session.avgCompressionRatio = session.metrics.reduce((sum, m) => sum + m.compressionRatio, 0) / session.totalTasks;
      session.successRate = (session.metrics.filter(m => m.success).length / session.totalTasks) * 100;
    }

    return Array.from(sessionMap.values()).sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }

  async getSessionMetrics(sessionId?: string): Promise<SessionPerformance[]> {
    const data = await this.loadMetrics();
    if (sessionId) {
      return data.sessions.filter(s => s.sessionId === sessionId);
    }
    return data.sessions;
  }

  async getSummary(): Promise<PerformanceSummary> {
    const data = await this.loadMetrics();
    
    if (data.metrics.length === 0) {
      return {
        totalTasks: 0,
        totalDuration: 0,
        avgDuration: 0,
        avgCompressionRatio: 0,
        successRate: 0,
        graphGrowth: { nodes: 0, edges: 0, communities: 0 },
        improvementTrend: 0,
      };
    }

    const totalTasks = data.metrics.length;
    const totalDuration = data.metrics.reduce((sum, m) => sum + m.duration, 0);
    const avgDuration = totalDuration / totalTasks;
    const avgCompressionRatio = data.metrics.reduce((sum, m) => sum + m.compressionRatio, 0) / totalTasks;
    const successRate = (data.metrics.filter(m => m.success).length / totalTasks) * 100;

    // Get latest graph metrics
    const latestMetric = data.metrics[data.metrics.length - 1];
    const graphGrowth = {
      nodes: latestMetric.graphNodes,
      edges: latestMetric.graphEdges,
      communities: latestMetric.graphCommunities,
    };

    // Calculate improvement trend (compare first 25% vs last 25%)
    const quarter = Math.floor(data.metrics.length / 4);
    if (quarter > 0) {
      const firstQuarter = data.metrics.slice(0, quarter);
      const lastQuarter = data.metrics.slice(-quarter);
      
      const firstAvgDuration = firstQuarter.reduce((sum, m) => sum + m.duration, 0) / firstQuarter.length;
      const lastAvgDuration = lastQuarter.reduce((sum, m) => sum + m.duration, 0) / lastQuarter.length;
      
      const improvement = ((firstAvgDuration - lastAvgDuration) / firstAvgDuration) * 100;
      graphGrowth.nodes = improvement; // Temporary storage
    }

    return {
      totalTasks,
      totalDuration,
      avgDuration,
      avgCompressionRatio,
      successRate,
      graphGrowth,
      improvementTrend: 0,
    };
  }

  getSessionId(): string {
    return this.sessionId;
  }
}

let globalTracker: PerformanceTracker | null = null;

export function getGlobalPerformanceTracker(projectRoot?: string): PerformanceTracker {
  if (!globalTracker && projectRoot) {
    globalTracker = new PerformanceTracker(projectRoot);
  }
  return globalTracker!;
}

export function resetGlobalPerformanceTracker(): void {
  globalTracker = null;
}
