import * as path from 'path';
import { MCPToolResult } from '../server';
import { readJson } from '../../utils/fs';
import { buildContext } from '../../core/context';
import { evaluateSecurity } from '../../core/security-engine';
import { logger } from '../../utils/logger';

export async function handleSecurityCheck(
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
    const security = evaluateSecurity(task, context);

    logger.debug(`Security check complete for task: ${task.id}`);
    return {
      success: true,
      data: {
        securityRisk: security.securityRisk,
        approvalRequired: security.approvalRequired,
        telepathyLevel: security.telepathyLevel,
        reasons: security.reasons,
        blockedActions: security.blockedActions,
        protectedPathsAccessed: security.protectedPathsAccessed,
        recommendation:
          security.securityRisk === 'high'
            ? 'Task requires manual review and approval before execution.'
            : security.securityRisk === 'medium'
              ? 'Task should be reviewed. Consider using assist mode.'
              : 'Task appears safe for automated execution.',
      },
    };
  } catch (err: any) {
    return { success: false, data: null, error: err.message };
  }
}
