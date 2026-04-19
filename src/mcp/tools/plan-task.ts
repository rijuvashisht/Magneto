import * as path from 'path';
import { MCPToolResult } from '../server';
import { parseTaskFile } from '../../utils/task-parser';
import { buildContext } from '../../core/context';
import { evaluateSecurity } from '../../core/security-engine';
import { logger } from '../../utils/logger';

export async function handlePlanTask(
  args: Record<string, unknown>
): Promise<MCPToolResult> {
  const taskFile = args.taskFile as string;
  const projectRoot = (args.projectRoot as string) || process.cwd();

  if (!taskFile) {
    return { success: false, data: null, error: 'taskFile is required' };
  }

  try {
    const taskPath = path.resolve(projectRoot, taskFile);
    const task = parseTaskFile(taskPath);

    const context = await buildContext(projectRoot, task);
    const security = evaluateSecurity(task, context);

    const plan = {
      taskId: task.id,
      title: task.title,
      classification: context.classification,
      roles: context.roles,
      subAgents: context.subAgents,
      security: {
        risk: security.securityRisk,
        approvalRequired: security.approvalRequired,
        telepathyLevel: security.telepathyLevel,
      },
      steps: context.roles.map((role, i) => ({
        order: i + 1,
        role,
        action: 'execute',
        description: `Execute ${role} analysis for: ${task.title}`,
      })),
      createdAt: new Date().toISOString(),
    };

    logger.debug(`Plan generated for task: ${task.id}`);
    return { success: true, data: plan };
  } catch (err: any) {
    return { success: false, data: null, error: err.message };
  }
}
