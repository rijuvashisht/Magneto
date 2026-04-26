import { Runner, RunnerInput, RunnerOutput } from './types';
import { logger } from '../utils/logger';
import { getGlobalTokenCollector } from '../core/token-tracker';

/**
 * Ollama Runner — runs Magneto tasks against a local Ollama server.
 *
 * Why: no API key, no cloud call, no data egress. The privacy/offline
 * runner for developers and regulated enterprises.
 *
 * Requires: Ollama installed and running locally (https://ollama.com).
 * Model pulled: `ollama pull llama3.1` (or any other model).
 *
 * Environment:
 *   OLLAMA_HOST   URL of Ollama server (default: http://localhost:11434)
 *   OLLAMA_MODEL  Default model to use (default: llama3.1)
 *
 * CLI override:
 *   magneto run task.md --runner ollama --model qwen2.5-coder
 */
export class OllamaRunner implements Runner {
  name = 'Ollama Runner';
  type = 'ollama' as const;

  private host: string;
  private model: string;
  /** Request timeout in milliseconds. Local models can be slow; default 5 min. */
  private timeoutMs: number;

  constructor(options: { host?: string; model?: string; timeoutMs?: number } = {}) {
    this.host = (options.host ?? process.env.OLLAMA_HOST ?? 'http://localhost:11434').replace(
      /\/+$/,
      ''
    );
    this.model = options.model ?? process.env.OLLAMA_MODEL ?? 'llama3.1';
    this.timeoutMs = options.timeoutMs ?? 5 * 60 * 1000;
  }

  /**
   * Check Ollama reachability and confirm the target model is available.
   * Returns true when ready to execute, false with logged guidance otherwise.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetchWithTimeout(`${this.host}/api/tags`, {}, 5000);
      if (!res.ok) {
        logger.error(`Ollama server returned ${res.status} at ${this.host}`);
        return false;
      }
      const body = (await res.json()) as { models?: Array<{ name: string }> };
      const names = (body.models ?? []).map((m) => m.name);
      const match = names.some(
        (n) => n === this.model || n.startsWith(`${this.model}:`) || n.split(':')[0] === this.model
      );
      if (!match) {
        logger.warn(
          `Model "${this.model}" not pulled. Available: ${names.join(', ') || '(none)'}.`
        );
        logger.warn(`Run: ollama pull ${this.model}`);
        return false;
      }
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Cannot reach Ollama at ${this.host}: ${msg}`);
      logger.warn('Install Ollama from https://ollama.com and run `ollama serve`.');
      return false;
    }
  }

  async execute(input: RunnerInput): Promise<RunnerOutput> {
    const healthy = await this.healthCheck();
    if (!healthy) {
      return {
        success: false,
        findings: [],
        risks: [
          {
            severity: 'high',
            description: `Ollama not available at ${this.host} with model "${this.model}". Install from ollama.com, run \`ollama serve\`, and \`ollama pull ${this.model}\`.`,
            source: 'ollama-runner',
          },
        ],
        metadata: { error: 'health-check-failed', host: this.host, model: this.model },
      };
    }

    logger.info(`Executing task via Ollama (model: ${this.model}, host: ${this.host})...`);

    const systemPrompt = this.buildSystemPrompt(input);
    const userPrompt = this.buildUserPrompt(input);

    try {
      const res = await fetchWithTimeout(
        `${this.host}/api/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.model,
            stream: false,
            format: 'json',
            options: {
              temperature: 0.3,
              num_ctx: 8192,
            },
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
        },
        this.timeoutMs
      );

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Ollama returned ${res.status}: ${body.slice(0, 200)}`);
      }

      const data = (await res.json()) as OllamaChatResponse;
      const content = data.message?.content ?? '{}';
      const parsed = safeParseJson(content);

      // Ollama reports token counts in prompt_eval_count / eval_count
      const inputTokens = data.prompt_eval_count ?? 0;
      const outputTokens = data.eval_count ?? 0;
      const totalTokens = inputTokens + outputTokens;

      const collector = getGlobalTokenCollector(input.projectRoot);
      if (collector) {
        await collector.recordMetric({
          taskId: (input.task as any).id || 'unknown',
          runner: 'ollama',
          model: this.model,
          withMagneto: true,
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
          model: this.model,
          host: this.host,
          tokensUsed: totalTokens,
          promptEvalCount: inputTokens,
          evalCount: outputTokens,
          totalDurationMs: data.total_duration ? Math.round(data.total_duration / 1e6) : undefined,
          // Clear signal to consumers that no data left the machine
          dataEgress: 'none',
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Ollama execution failed: ${msg}`);
      return {
        success: false,
        findings: [],
        risks: [
          {
            severity: 'high',
            description: `Ollama call failed: ${msg}`,
            source: 'ollama-runner',
          },
        ],
        metadata: { error: msg, host: this.host, model: this.model },
      };
    }
  }

  async executeStreaming(
    input: RunnerInput,
    onChunk: (chunk: string) => void
  ): Promise<RunnerOutput> {
    const healthy = await this.healthCheck();
    if (!healthy) {
      return {
        success: false,
        findings: [],
        risks: [
          {
            severity: 'high',
            description: `Ollama not available at ${this.host} with model "${this.model}".`,
            source: 'ollama-runner',
          },
        ],
        metadata: { error: 'health-check-failed' },
      };
    }

    logger.info(`Streaming task via Ollama (model: ${this.model})...`);

    const systemPrompt = this.buildSystemPrompt(input);
    const userPrompt = this.buildUserPrompt(input);

    try {
      const res = await fetchWithTimeout(
        `${this.host}/api/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.model,
            stream: true,
            options: { temperature: 0.3, num_ctx: 8192 },
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
        },
        this.timeoutMs
      );

      if (!res.ok || !res.body) {
        const body = await res.text().catch(() => '');
        throw new Error(`Ollama returned ${res.status}: ${body.slice(0, 200)}`);
      }

      let fullContent = '';
      let inputTokens = 0;
      let outputTokens = 0;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Ollama streams NDJSON — one JSON object per line.
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIdx).trim();
          buffer = buffer.slice(newlineIdx + 1);
          if (!line) continue;

          try {
            const evt = JSON.parse(line) as OllamaChatResponse;
            const delta = evt.message?.content ?? '';
            if (delta) {
              fullContent += delta;
              onChunk(delta);
            }
            if (evt.done) {
              inputTokens = evt.prompt_eval_count ?? inputTokens;
              outputTokens = evt.eval_count ?? outputTokens;
            }
          } catch {
            // Malformed line — skip without aborting the stream
          }
        }
      }

      const parsed = safeParseJson(fullContent);

      return {
        success: true,
        findings: parsed.findings || [],
        risks: parsed.risks || [],
        rawOutput: fullContent,
        metadata: {
          model: this.model,
          host: this.host,
          streaming: true,
          tokensUsed: inputTokens + outputTokens,
          promptEvalCount: inputTokens,
          evalCount: outputTokens,
          dataEgress: 'none',
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Ollama streaming failed: ${msg}`);
      return {
        success: false,
        findings: [],
        risks: [
          {
            severity: 'high',
            description: `Ollama streaming call failed: ${msg}`,
            source: 'ollama-runner',
          },
        ],
        metadata: { error: msg },
      };
    }
  }

  private buildSystemPrompt(input: RunnerInput): string {
    const roles = input.context.roles.join(', ');
    const mode = input.mode;

    return `You are a Magneto AI reasoning agent operating in "${mode}" mode, running locally via Ollama.
Your assigned roles: ${roles}
Task classification: ${input.context.classification}

Security constraints:
- Security risk level: ${input.security.securityRisk}
- Approval required: ${input.security.approvalRequired}
- Blocked actions: ${input.security.blockedActions.join(', ') || 'none'}
- Protected paths: ${input.security.protectedPathsAccessed.join(', ') || 'none'}

You MUST respond with a single valid JSON object with this shape:
{
  "findings": [{"source": "agent-role", "content": "finding description", "confidence": 0.0}],
  "risks": [{"severity": "low|medium|high|critical", "description": "risk description", "source": "agent-role"}],
  "summary": "brief summary"
}

Never include prose before or after the JSON object.
Never suggest actions that violate security constraints.
Never access protected paths.
Always report a confidence level between 0.0 and 1.0.`;
  }

  private buildUserPrompt(input: RunnerInput): string {
    const task = input.task;
    const files = input.context.relevantFiles.slice(0, 20).join('\n- ');

    return `Analyze the following task:

Title: ${task.title || 'Untitled'}
Description: ${task.description || 'No description'}
Type: ${task.type || 'general'}
Tags: ${((task.tags as string[]) || []).join(', ')}

Relevant files:
- ${files || 'No files specified'}

Respond with only the structured JSON object.`;
  }
}

// ─── Internal helpers ───────────────────────────────────────────────────────

interface OllamaChatResponse {
  model?: string;
  created_at?: string;
  message?: { role: string; content: string };
  done?: boolean;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tolerant JSON parser: strips ```json fences, locates the outermost {...},
 * and returns {} on failure rather than throwing. Local models occasionally
 * wrap their output in prose or markdown despite instructions.
 */
interface ParsedAgentResponse {
  findings?: Array<{ source: string; content: string; confidence: number }>;
  risks?: Array<{ severity: string; description: string; source: string }>;
  summary?: string;
}

function safeParseJson(raw: string): ParsedAgentResponse {
  if (!raw) return {};
  let text = raw.trim();

  // Strip ``` fences
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  // Find outermost JSON object braces
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }

  try {
    return JSON.parse(text);
  } catch {
    logger.warn('Ollama response was not valid JSON. Returning empty findings.');
    return {};
  }
}
