import { ExecutionContext } from '../core/context';
import { SecurityEvaluation, ExecutionMode } from '../core/security-engine';

export type RunnerType = 'openai' | 'copilot-local' | 'copilot-cloud';

export interface RunnerInput {
  task: Record<string, unknown>;
  context: ExecutionContext;
  security: SecurityEvaluation;
  mode: string;
  projectRoot: string;
}

export interface RunnerOutput {
  success: boolean;
  findings: Array<{
    source: string;
    content: string;
    confidence: number;
  }>;
  risks: Array<{
    severity: string;
    description: string;
    source: string;
  }>;
  rawOutput?: string;
  metadata: Record<string, unknown>;
}

export interface Runner {
  name: string;
  type: RunnerType;
  execute(input: RunnerInput): Promise<RunnerOutput>;
}

export function createRunner(type: RunnerType): Runner {
  switch (type) {
    case 'openai': {
      const { OpenAIRunner } = require('./openai');
      return new OpenAIRunner();
    }
    case 'copilot-local': {
      const { CopilotLocalRunner } = require('./copilot-local');
      return new CopilotLocalRunner();
    }
    case 'copilot-cloud': {
      const { CopilotCloudRunner } = require('./copilot-cloud');
      return new CopilotCloudRunner();
    }
    default:
      throw new Error(`Unknown runner type: ${type}`);
  }
}
