import * as path from 'path';
import { MCPToolResult } from '../server';
import { logger } from '../../utils/logger';
import { fileExists, readJson } from '../../utils/fs';
import { magnetoPath } from '../../utils/paths';
import { getGlobalTokenCollector, SessionMetrics, TokenMetric } from '../../core/token-tracker';

export async function handleTokenMetrics(
  args: Record<string, unknown>
): Promise<MCPToolResult> {
  const projectRoot = (args.projectRoot as string) || process.cwd();
  const sessionId = (args.sessionId as string);
  const taskId = (args.taskId as string);
  const runner = (args.runner as string);
  const limit = parseInt((args.limit as string) || '100', 10);

  if (!fileExists(magnetoPath(projectRoot, 'token-metrics.json'))) {
    return {
      success: true,
      data: {
        message: 'No token metrics found. Run tasks with --track-tokens to enable tracking.',
        sessions: [],
        metrics: [],
        summary: {
          totalTokensWithMagneto: 0,
          totalTokensWithoutMagneto: 0,
          totalCost: 0,
          avgCompressionRatio: 0,
          taskCount: 0,
        },
      },
    };
  }

  try {
    const collector = getGlobalTokenCollector(projectRoot);
    
    let sessions: SessionMetrics[] = [];
    let metrics: TokenMetric[] = [];

    if (sessionId) {
      sessions = await collector.getSessionMetrics(sessionId);
      metrics = sessions.flatMap(s => s.metrics);
    } else if (taskId) {
      metrics = await collector.getMetricsByTask(taskId);
    } else if (runner) {
      metrics = await collector.getMetricsByRunner(runner);
    } else {
      sessions = await collector.getSessionMetrics();
      metrics = await collector.getRecentMetrics(limit);
    }

    // Calculate summary
    const magnetoMetrics = metrics.filter(m => m.withMagneto);
    const baselineMetrics = metrics.filter(m => !m.withMagneto);

    const totalTokensWithMagneto = magnetoMetrics.reduce((sum, m) => sum + m.totalTokens, 0);
    const totalTokensWithoutMagneto = baselineMetrics.reduce((sum, m) => sum + m.totalTokens, 0);
    const totalCost = metrics.reduce((sum, m) => sum + m.costUSD, 0);
    
    const compressionMetrics = magnetoMetrics.filter(m => m.compressionRatio > 0);
    const avgCompressionRatio = compressionMetrics.length > 0
      ? compressionMetrics.reduce((sum, m) => sum + m.compressionRatio, 0) / compressionMetrics.length
      : 0;

    const taskIds = new Set(metrics.map(m => m.taskId));

    const summary = {
      totalTokensWithMagneto,
      totalTokensWithoutMagneto,
      totalCost,
      avgCompressionRatio,
      taskCount: taskIds.size,
      sessionCount: sessions.length,
      metricCount: metrics.length,
    };

    return {
      success: true,
      data: {
        sessions,
        metrics,
        summary,
      },
    };
  } catch (error) {
    logger.error(`Failed to get token metrics: ${error}`);
    return {
      success: false,
      data: null,
      error: `Failed to get token metrics: ${error}`,
    };
  }
}
