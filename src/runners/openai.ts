import OpenAI from 'openai';
import { Runner, RunnerInput, RunnerOutput } from './types';
import { logger } from '../utils/logger';
import { getGlobalTokenCollector } from '../core/token-tracker';

export class OpenAIRunner implements Runner {
  name = 'OpenAI Runner';
  type = 'openai' as const;

  private client: OpenAI;
  private validated: boolean = false;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    this.validated = OpenAIRunner.validateApiKey(apiKey);
    if (!this.validated) {
      logger.warn('OPENAI_API_KEY is missing or invalid. OpenAI runner will not function.');
      logger.warn('Set a valid key: export OPENAI_API_KEY="sk-..."');
    }
    this.client = new OpenAI({ apiKey: apiKey || 'missing' });
  }

  static validateApiKey(key: string | undefined): boolean {
    if (!key) return false;
    // OpenAI keys start with "sk-" and are typically 40+ characters
    if (!key.startsWith('sk-')) {
      logger.error('OPENAI_API_KEY must start with "sk-".');
      return false;
    }
    if (key.length < 20) {
      logger.error('OPENAI_API_KEY appears too short to be valid.');
      return false;
    }
    return true;
  }

  async execute(input: RunnerInput): Promise<RunnerOutput> {
    if (!this.validated) {
      return {
        success: false,
        findings: [],
        risks: [
          {
            severity: 'high',
            description: 'OpenAI API key is missing or invalid. Set OPENAI_API_KEY environment variable.',
            source: 'openai-runner',
          },
        ],
        metadata: { error: 'Invalid API key' },
      };
    }

    logger.info('Executing task via OpenAI Responses API...');

    const systemPrompt = this.buildSystemPrompt(input);
    const userPrompt = this.buildUserPrompt(input);

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);

      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;
      const totalTokens = response.usage?.total_tokens || 0;

      // Track token usage
      const collector = getGlobalTokenCollector(input.projectRoot);
      if (collector) {
        await collector.recordMetric({
          taskId: (input.task as any).id || 'unknown',
          runner: 'openai',
          model: 'gpt-4o',
          withMagneto: true, // Will be set by A/B mode
          inputTokens,
          outputTokens,
          totalTokens,
          contextSize: input.context.relevantFiles.length,
        });
      }

      return {
        success: true,
        findings: parsed.findings || [],
        risks: parsed.risks || [],
        rawOutput: content,
        metadata: {
          model: 'gpt-4o',
          usage: response.usage,
          finishReason: response.choices[0]?.finish_reason,
          tokensUsed: totalTokens,
        },
      };
    } catch (err: any) {
      logger.error(`OpenAI API error: ${err.message}`);
      return {
        success: false,
        findings: [],
        risks: [
          {
            severity: 'high',
            description: `OpenAI API call failed: ${err.message}`,
            source: 'openai-runner',
          },
        ],
        metadata: { error: err.message },
      };
    }
  }

  private buildSystemPrompt(input: RunnerInput): string {
    const roles = input.context.roles.join(', ');
    const mode = input.mode;

    return `You are a Magneto AI reasoning agent operating in "${mode}" mode.
Your assigned roles: ${roles}
Task classification: ${input.context.classification}

Security constraints:
- Security risk level: ${input.security.securityRisk}
- Approval required: ${input.security.approvalRequired}
- Blocked actions: ${input.security.blockedActions.join(', ') || 'none'}
- Protected paths: ${input.security.protectedPathsAccessed.join(', ') || 'none'}

You MUST respond with valid JSON containing:
{
  "findings": [{"source": "agent-role", "content": "finding description", "confidence": 0.0-1.0}],
  "risks": [{"severity": "low|medium|high|critical", "description": "risk description", "source": "agent-role"}],
  "summary": "brief summary"
}

Never suggest actions that violate security constraints.
Never access protected paths.
Always report confidence levels.`;
  }

  private buildUserPrompt(input: RunnerInput): string {
    const task = input.task;
    const files = input.context.relevantFiles.slice(0, 20).join('\n- ');

    return `Analyze the following task:

Title: ${task.title || 'Untitled'}
Description: ${task.description || 'No description'}
Type: ${task.type || 'general'}
Tags: ${(task.tags as string[] || []).join(', ')}

Relevant files:
- ${files || 'No files specified'}

Provide your analysis as the structured JSON response.`;
  }

  async executeStreaming(
    input: RunnerInput,
    onChunk: (chunk: string) => void
  ): Promise<RunnerOutput> {
    if (!this.validated) {
      return {
        success: false,
        findings: [],
        risks: [
          {
            severity: 'high',
            description: 'OpenAI API key is missing or invalid.',
            source: 'openai-runner',
          },
        ],
        metadata: { error: 'Invalid API key' },
      };
    }

    logger.info('Executing task via OpenAI (streaming)...');

    const systemPrompt = this.buildSystemPrompt(input);
    const userPrompt = this.buildUserPrompt(input);

    try {
      const stream = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4096,
        stream: true,
      });

      let fullContent = '';
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          fullContent += delta;
          onChunk(delta);
        }
      }

      let parsed: any = {};
      try {
        parsed = JSON.parse(fullContent);
      } catch {
        logger.warn('Streaming response was not valid JSON. Returning raw output.');
      }

      return {
        success: true,
        findings: parsed.findings || [],
        risks: parsed.risks || [],
        rawOutput: fullContent,
        metadata: { model: 'gpt-4o', streaming: true },
      };
    } catch (err: any) {
      logger.error(`OpenAI streaming error: ${err.message}`);
      return {
        success: false,
        findings: [],
        risks: [
          {
            severity: 'high',
            description: `OpenAI streaming call failed: ${err.message}`,
            source: 'openai-runner',
          },
        ],
        metadata: { error: err.message },
      };
    }
  }
}
