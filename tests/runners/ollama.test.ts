import { OllamaRunner } from '../../src/runners/ollama';
import { detectAgentEnvironment, createRunner } from '../../src/runners/types';
import type { RunnerInput } from '../../src/runners/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function ndjsonStreamResponse(events: object[]): Response {
  const text = events.map((e) => JSON.stringify(e)).join('\n') + '\n';
  return new Response(text, {
    status: 200,
    headers: { 'Content-Type': 'application/x-ndjson' },
  });
}

function makeInput(overrides: Partial<RunnerInput> = {}): RunnerInput {
  return {
    task: { id: 'task-42', title: 'Audit a function', description: 'desc', type: 'general' },
    context: {
      classification: 'analysis',
      roles: ['auditor'],
      relevantFiles: ['src/foo.ts', 'src/bar.ts'],
    } as any,
    security: {
      securityRisk: 'low',
      approvalRequired: false,
      blockedActions: [],
      protectedPathsAccessed: [],
    } as any,
    mode: 'assist',
    projectRoot: '/tmp/proj',
    ...overrides,
  };
}

// ─── Suite ──────────────────────────────────────────────────────────────────

describe('OllamaRunner', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
  });

  afterEach(() => {
    (global as any).fetch = originalFetch;
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  describe('configuration', () => {
    it('reads host and model from env by default', () => {
      process.env.OLLAMA_HOST = 'http://my-ollama:11434';
      process.env.OLLAMA_MODEL = 'qwen2.5-coder';
      const runner = new OllamaRunner();
      expect((runner as any).host).toBe('http://my-ollama:11434');
      expect((runner as any).model).toBe('qwen2.5-coder');
    });

    it('falls back to localhost and llama3.1', () => {
      delete process.env.OLLAMA_HOST;
      delete process.env.OLLAMA_MODEL;
      const runner = new OllamaRunner();
      expect((runner as any).host).toBe('http://localhost:11434');
      expect((runner as any).model).toBe('llama3.1');
    });

    it('strips trailing slash from host', () => {
      const runner = new OllamaRunner({ host: 'http://localhost:11434/' });
      expect((runner as any).host).toBe('http://localhost:11434');
    });

    it('explicit options take precedence over env', () => {
      process.env.OLLAMA_HOST = 'http://env-host';
      const runner = new OllamaRunner({ host: 'http://opt-host', model: 'opt-model' });
      expect((runner as any).host).toBe('http://opt-host');
      expect((runner as any).model).toBe('opt-model');
    });
  });

  describe('healthCheck', () => {
    it('returns true when server reachable and model available', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ models: [{ name: 'llama3.1:8b' }, { name: 'codellama:7b' }] })
      );

      const runner = new OllamaRunner({ model: 'llama3.1' });
      expect(await runner.healthCheck()).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.any(Object)
      );
    });

    it('returns false when model is missing', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ models: [{ name: 'mistral:7b' }] }));
      const runner = new OllamaRunner({ model: 'llama3.1' });
      expect(await runner.healthCheck()).toBe(false);
    });

    it('returns false when server unreachable', async () => {
      fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      const runner = new OllamaRunner();
      expect(await runner.healthCheck()).toBe(false);
    });

    it('returns false on non-2xx response', async () => {
      fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }));
      const runner = new OllamaRunner();
      expect(await runner.healthCheck()).toBe(false);
    });
  });

  describe('execute', () => {
    it('returns a structured RunnerOutput on success', async () => {
      // Health check
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ models: [{ name: 'llama3.1' }] })
      );
      // Chat completion
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          model: 'llama3.1',
          message: {
            role: 'assistant',
            content: JSON.stringify({
              findings: [{ source: 'auditor', content: 'no issues', confidence: 0.9 }],
              risks: [],
              summary: 'clean',
            }),
          },
          done: true,
          prompt_eval_count: 120,
          eval_count: 80,
          total_duration: 1_000_000_000,
        })
      );

      const runner = new OllamaRunner({ model: 'llama3.1' });
      const out = await runner.execute(makeInput());

      expect(out.success).toBe(true);
      expect(out.findings).toHaveLength(1);
      expect(out.findings[0].confidence).toBe(0.9);
      expect(out.metadata.tokensUsed).toBe(200);
      expect(out.metadata.dataEgress).toBe('none');
    });

    it('tolerates JSON wrapped in markdown fences', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ models: [{ name: 'llama3.1' }] })
      );
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          message: {
            role: 'assistant',
            content:
              'Sure! Here is my analysis:\n```json\n{"findings":[{"source":"a","content":"c","confidence":0.5}],"risks":[]}\n```\nLet me know if you want more.',
          },
          done: true,
        })
      );

      const runner = new OllamaRunner();
      const out = await runner.execute(makeInput());
      expect(out.success).toBe(true);
      expect(out.findings).toHaveLength(1);
    });

    it('returns failure with helpful guidance when health check fails', async () => {
      fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const runner = new OllamaRunner();
      const out = await runner.execute(makeInput());

      expect(out.success).toBe(false);
      expect(out.risks[0].severity).toBe('high');
      expect(out.risks[0].description).toMatch(/ollama/i);
      expect(out.metadata.error).toBe('health-check-failed');
    });

    it('returns failure when chat endpoint returns 500', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ models: [{ name: 'llama3.1' }] })
      );
      fetchMock.mockResolvedValueOnce(new Response('boom', { status: 500 }));

      const runner = new OllamaRunner();
      const out = await runner.execute(makeInput());

      expect(out.success).toBe(false);
      expect(out.risks[0].description).toMatch(/500/);
    });

    it('returns success with empty findings when model output is malformed', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ models: [{ name: 'llama3.1' }] })
      );
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          message: { role: 'assistant', content: 'not json at all' },
          done: true,
        })
      );

      const runner = new OllamaRunner();
      const out = await runner.execute(makeInput());
      expect(out.success).toBe(true);
      expect(out.findings).toEqual([]);
      expect(out.risks).toEqual([]);
    });
  });

  describe('executeStreaming', () => {
    it('emits chunks and assembles final output', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ models: [{ name: 'llama3.1' }] })
      );

      // Stream a JSON response across multiple ndjson events
      const fullJson = '{"findings":[{"source":"s","content":"c","confidence":1}],"risks":[]}';
      const events = [
        { message: { role: 'assistant', content: fullJson.slice(0, 20) }, done: false },
        { message: { role: 'assistant', content: fullJson.slice(20, 40) }, done: false },
        { message: { role: 'assistant', content: fullJson.slice(40) }, done: false },
        { done: true, prompt_eval_count: 50, eval_count: 30 },
      ];
      fetchMock.mockResolvedValueOnce(ndjsonStreamResponse(events));

      const runner = new OllamaRunner();
      const chunks: string[] = [];
      const out = await runner.executeStreaming(makeInput(), (c) => chunks.push(c));

      expect(out.success).toBe(true);
      expect(chunks.join('')).toBe(fullJson);
      expect(out.findings).toHaveLength(1);
      expect(out.metadata.tokensUsed).toBe(80);
      expect(out.metadata.streaming).toBe(true);
      expect(out.metadata.dataEgress).toBe('none');
    });
  });
});

describe('runner factory & detection', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('createRunner("ollama") returns an OllamaRunner', () => {
    const r = createRunner('ollama');
    expect(r.type).toBe('ollama');
    expect(r.name).toMatch(/ollama/i);
  });

  it('detectAgentEnvironment falls back to ollama when only OLLAMA_HOST set', () => {
    // Clear all higher-priority signals
    delete process.env.WINDSURF;
    delete process.env.CASCADE;
    delete process.env.GITHUB_COPILOT;
    delete process.env.COPILOT_AGENT;
    delete process.env.ANTIGRAVITY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_AI_KEY;
    delete process.env.OPENAI_API_KEY;
    process.env.OLLAMA_HOST = 'http://localhost:11434';

    expect(detectAgentEnvironment('/nonexistent-project-root')).toBe('ollama');
  });

  it('OPENAI_API_KEY still wins over OLLAMA_HOST in detection', () => {
    delete process.env.WINDSURF;
    delete process.env.CASCADE;
    delete process.env.GITHUB_COPILOT;
    delete process.env.COPILOT_AGENT;
    delete process.env.ANTIGRAVITY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_AI_KEY;
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.OLLAMA_HOST = 'http://localhost:11434';

    expect(detectAgentEnvironment('/nonexistent-project-root')).toBe('openai');
  });
});
