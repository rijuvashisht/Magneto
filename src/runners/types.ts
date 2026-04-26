import { ExecutionContext } from '../core/context';
import { SecurityEvaluation, ExecutionMode } from '../core/security-engine';

export type RunnerType = 'openai' | 'copilot-local' | 'copilot-cloud' | 'cascade' | 'antigravity' | 'gemini' | 'ollama';

export interface RunnerInput {
  task: Record<string, unknown>;
  context: ExecutionContext;
  security: SecurityEvaluation;
  mode: string;
  projectRoot: string;
  onProgress?: (progress: {
    percentComplete: number;
    currentStep: string;
    tokensUsed?: number;
    estimatedTimeRemaining?: number;
  }) => void;
  onOutput?: (data: string) => void;
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
  promptPath?: string;
  metadata: Record<string, unknown>;
}

export interface Runner {
  name: string;
  type: RunnerType;
  execute(input: RunnerInput): Promise<RunnerOutput>;
}

/**
 * Detect the active agent environment by checking for known markers.
 * Returns the runner type that matches the current IDE/agent.
 */
export function detectAgentEnvironment(projectRoot: string): RunnerType | null {
  const fs = require('fs');
  const path = require('path');

  // Cascade / Windsurf — check for .windsurf/ folder or WINDSURF env
  if (process.env.WINDSURF || process.env.CASCADE) {
    return 'cascade';
  }
  if (fs.existsSync(path.join(projectRoot, '.windsurf'))) {
    return 'cascade';
  }

  // Copilot — check for .github/agents/ or GITHUB_COPILOT env
  if (process.env.GITHUB_COPILOT || process.env.COPILOT_AGENT) {
    return 'copilot-local';
  }
  if (fs.existsSync(path.join(projectRoot, '.github', 'agents'))) {
    return 'copilot-local';
  }

  // Antigravity
  if (process.env.ANTIGRAVITY) {
    return 'antigravity';
  }

  // Gemini
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY) {
    return 'gemini';
  }

  // Fallback: check for OpenAI key
  if (process.env.OPENAI_API_KEY) {
    return 'openai';
  }

  // Final fallback: if user explicitly opted into Ollama, use it
  if (process.env.OLLAMA_HOST || process.env.MAGNETO_USE_OLLAMA) {
    return 'ollama';
  }

  return null;
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
    case 'cascade': {
      const { CascadeRunner } = require('./cascade');
      return new CascadeRunner();
    }
    case 'antigravity': {
      const { AntigravityRunner } = require('./antigravity');
      return new AntigravityRunner();
    }
    case 'gemini': {
      const { GeminiRunner } = require('./gemini');
      return new GeminiRunner();
    }
    case 'ollama': {
      const { OllamaRunner } = require('./ollama');
      return new OllamaRunner();
    }
    default:
      throw new Error(`Unknown runner type: ${type}`);
  }
}
