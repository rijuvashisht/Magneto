import * as path from 'path';
import { MCPToolResult } from '../server';
import { logger } from '../../utils/logger';
import { fileExists, readJson } from '../../utils/fs';
import { magnetoPath } from '../../utils/paths';
import { getGlobalPerformanceTracker, SessionPerformance, PerformanceMetric, PerformanceSummary } from '../../core/performance-tracker';

export async function handlePerformanceMetrics(
  args: Record<string, unknown>
): Promise<MCPToolResult> {
  const projectRoot = (args.projectRoot as string) || process.cwd();
  const sessionId = (args.sessionId as string);
  const taskId = (args.taskId as string);
  const limit = parseInt((args.limit as string) || '100', 10);

  if (!fileExists(magnetoPath(projectRoot, 'performance-metrics.json'))) {
    return {
      success: true,
      data: {
        message: 'No performance metrics found. Run tasks to enable tracking.',
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
      },
    };
  }

  try {
    const tracker = getGlobalPerformanceTracker(projectRoot);
    
    let sessions: SessionPerformance[] = [];
    let metrics: PerformanceMetric[] = [];

    if (sessionId) {
      sessions = await tracker.getSessionMetrics(sessionId);
      metrics = sessions.flatMap(s => s.metrics);
    } else if (taskId) {
      const allSessions = await tracker.getSessionMetrics();
      metrics = allSessions.flatMap(s => s.metrics).filter(m => m.taskId === taskId);
    } else {
      sessions = await tracker.getSessionMetrics();
      metrics = sessions.slice(0, limit).flatMap(s => s.metrics);
    }

    const summary = await tracker.getSummary();

    return {
      success: true,
      data: {
        sessions,
        metrics,
        summary,
      },
    };
  } catch (error) {
    logger.error(`Failed to get performance metrics: ${error}`);
    return {
      success: false,
      data: null,
      error: `Failed to get performance metrics: ${error}`,
    };
  }
}
