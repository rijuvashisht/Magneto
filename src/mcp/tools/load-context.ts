import * as path from 'path';
import { MCPToolResult } from '../server';
import { readJson } from '../../utils/fs';
import { buildContext } from '../../core/context';
import { logger } from '../../utils/logger';

export async function handleLoadContext(
  args: Record<string, unknown>
): Promise<MCPToolResult> {
  const taskFile = args.taskFile as string;
  const projectRoot = (args.projectRoot as string) || process.cwd();

  if (!taskFile) {
    return { success: false, data: null, error: 'taskFile is required' };
  }

  try {
    const taskPath = path.resolve(projectRoot, taskFile);
    const task = readJson<any>(taskPath);

    const context = await buildContext(projectRoot, task);

    logger.debug(`Context loaded for task: ${task.id}`);
    return {
      success: true,
      data: {
        classification: context.classification,
        roles: context.roles,
        subAgents: context.subAgents,
        relevantFiles: context.relevantFiles,
        config: context.config,
      },
    };
  } catch (err: any) {
    return { success: false, data: null, error: err.message };
  }
}
