import { Runner, RunnerInput, RunnerOutput } from './types';
import { logger } from '../utils/logger';

export class CopilotCloudRunner implements Runner {
  name = 'Copilot Cloud Runner';
  type = 'copilot-cloud' as const;

  async execute(input: RunnerInput): Promise<RunnerOutput> {
    logger.info('Executing task via Copilot Cloud...');

    const endpoint = process.env.MAGNETO_COPILOT_CLOUD_ENDPOINT;
    const token = process.env.MAGNETO_COPILOT_CLOUD_TOKEN;

    if (!endpoint || !token) {
      logger.warn('Copilot Cloud credentials not configured.');
      logger.warn('Set MAGNETO_COPILOT_CLOUD_ENDPOINT and MAGNETO_COPILOT_CLOUD_TOKEN.');

      return {
        success: false,
        findings: [],
        risks: [
          {
            severity: 'medium',
            description: 'Copilot Cloud runner not configured. Missing endpoint or token.',
            source: 'copilot-cloud',
          },
        ],
        metadata: {
          runner: 'copilot-cloud',
          configured: false,
        },
      };
    }

    try {
      const payload = this.buildPayload(input);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Copilot Cloud API returned ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as Record<string, any>;

      return {
        success: true,
        findings: data.findings || [],
        risks: data.risks || [],
        rawOutput: JSON.stringify(data),
        metadata: {
          runner: 'copilot-cloud',
          statusCode: response.status,
        },
      };
    } catch (err: any) {
      logger.error(`Copilot Cloud error: ${err.message}`);
      return {
        success: false,
        findings: [],
        risks: [
          {
            severity: 'high',
            description: `Copilot Cloud API call failed: ${err.message}`,
            source: 'copilot-cloud',
          },
        ],
        metadata: { error: err.message },
      };
    }
  }

  private buildPayload(input: RunnerInput): Record<string, unknown> {
    return {
      task: input.task,
      context: {
        classification: input.context.classification,
        roles: input.context.roles,
        relevantFiles: input.context.relevantFiles.slice(0, 20),
      },
      security: {
        risk: input.security.securityRisk,
        approvalRequired: input.security.approvalRequired,
        mode: input.mode,
      },
    };
  }
}
