import { Runner, RunnerInput, RunnerOutput } from './types';
import { logger } from '../utils/logger';

export class CopilotLocalRunner implements Runner {
  name = 'Copilot Local Runner';
  type = 'copilot-local' as const;

  async execute(input: RunnerInput): Promise<RunnerOutput> {
    logger.info('Executing task via Copilot Local (agent mode)...');
    logger.info('This runner delegates to GitHub Copilot via local MCP tools.');

    // Copilot Local works through the MCP server integration.
    // The agent definitions in .github/agents/ guide Copilot behavior.
    // This runner prepares context and returns a structured prompt for Copilot.

    const prompt = this.buildCopilotPrompt(input);

    logger.info('Copilot local prompt prepared.');
    logger.info('Copilot will process this through agent definitions and MCP tools.');

    return {
      success: true,
      findings: [
        {
          source: 'copilot-local',
          content: 'Task delegated to GitHub Copilot via local agent mode. Check IDE for results.',
          confidence: 0.5,
        },
      ],
      risks: [],
      rawOutput: prompt,
      metadata: {
        runner: 'copilot-local',
        mode: input.mode,
        delegated: true,
        agentFiles: [
          '.github/agents/magneto-orchestrator.agent.md',
          '.github/agents/magneto-backend.agent.md',
          '.github/agents/magneto-tester.agent.md',
          '.github/agents/magneto-requirements.agent.md',
        ],
      },
    };
  }

  private buildCopilotPrompt(input: RunnerInput): string {
    const task = input.task;
    const roles = input.context.roles;

    return `# Magneto AI Task for Copilot

## Task
- **Title:** ${task.title || 'Untitled'}
- **Description:** ${task.description || 'N/A'}
- **Type:** ${task.type || 'general'}
- **Classification:** ${input.context.classification}

## Assigned Roles
${roles.map((r) => `- ${r}`).join('\n')}

## Security
- **Risk:** ${input.security.securityRisk}
- **Approval Required:** ${input.security.approvalRequired}
- **Mode:** ${input.mode}

## Instructions
Use the Magneto MCP tools (plan_task, load_context, merge_results, security_check) to process this task.
Follow the agent definitions in .github/agents/ for role-specific behavior.
Report findings and risks in structured format.
`;
  }
}
