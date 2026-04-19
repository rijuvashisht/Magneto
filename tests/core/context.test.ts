import { buildContext, TaskInput } from '../../src/core/context';
import * as path from 'path';
import * as fs from 'fs';
import { ensureDir, writeJson } from '../../src/utils/fs';

const TEST_ROOT = path.join(__dirname, '..', '__fixtures__', 'test-project');

beforeAll(() => {
  // Create a minimal fixture project
  ensureDir(path.join(TEST_ROOT, '.magneto'));
  writeJson(path.join(TEST_ROOT, '.magneto', 'magneto.config.json'), {
    version: '0.1.0',
    executionMode: 'assist',
    roles: ['orchestrator', 'backend', 'tester'],
  });
  ensureDir(path.join(TEST_ROOT, 'src'));
  fs.writeFileSync(path.join(TEST_ROOT, 'src', 'index.ts'), '// entry');
});

afterAll(() => {
  fs.rmSync(TEST_ROOT, { recursive: true, force: true });
});

describe('buildContext', () => {
  it('should classify a bug-fix task', async () => {
    const task: TaskInput = {
      id: 'ctx-001',
      title: 'Fix login bug',
      description: 'Users cannot log in after password reset. Error in auth flow.',
      type: 'bug-fix',
      tags: ['bug', 'fix', 'auth'],
    };

    const ctx = await buildContext(TEST_ROOT, task);

    expect(ctx.classification).toBe('bug-fix');
    expect(ctx.roles).toContain('orchestrator');
    expect(ctx.roles).toContain('backend');
    expect(ctx.roles).toContain('tester');
    expect(ctx.subAgents.length).toBeGreaterThan(0);
    expect(ctx.projectRoot).toBe(TEST_ROOT);
  });

  it('should classify a security-audit task', async () => {
    const task: TaskInput = {
      id: 'ctx-002',
      title: 'Security vulnerability audit',
      description: 'Run a full security audit to identify CVE vulnerabilities',
      type: 'security',
      tags: ['security', 'audit'],
    };

    const ctx = await buildContext(TEST_ROOT, task);
    expect(ctx.classification).toBe('security-audit');
  });

  it('should classify a feature task', async () => {
    const task: TaskInput = {
      id: 'ctx-003',
      title: 'Implement new dashboard feature',
      description: 'Build a new analytics dashboard with charts and filters',
      type: 'feature',
      tags: ['feature', 'implement'],
    };

    const ctx = await buildContext(TEST_ROOT, task);
    expect(ctx.classification).toBe('feature-implementation');
    expect(ctx.roles).toContain('requirements');
  });

  it('should fall back to general classification', async () => {
    const task: TaskInput = {
      id: 'ctx-004',
      title: 'Housekeeping',
      description: 'Tidy up the repo folder layout',
      type: 'misc',
    };

    const ctx = await buildContext(TEST_ROOT, task);
    expect(ctx.classification).toBe('general');
    expect(ctx.roles).toContain('orchestrator');
  });

  it('should create sub-agents for each role', async () => {
    const task: TaskInput = {
      id: 'ctx-005',
      title: 'Review code quality',
      description: 'Code review of the pull request diff',
      type: 'review',
      tags: ['review', 'code quality'],
    };

    const ctx = await buildContext(TEST_ROOT, task);
    expect(ctx.subAgents.length).toBe(ctx.roles.length);
    for (const agent of ctx.subAgents) {
      expect(agent.id).toMatch(/^agent-/);
      expect(agent.model).toBe('gpt-4o');
      expect(agent.tools.length).toBeGreaterThan(0);
    }
  });

  it('should load config from project root', async () => {
    const task: TaskInput = {
      id: 'ctx-006',
      title: 'Check config',
      description: 'Verify config loading',
      type: 'test',
    };

    const ctx = await buildContext(TEST_ROOT, task);
    expect(ctx.config).toBeDefined();
    expect(ctx.config.version).toBe('0.1.0');
  });

  it('should use task scope when provided', async () => {
    const task: TaskInput = {
      id: 'ctx-007',
      title: 'Scoped task',
      description: 'Only touch these files',
      type: 'test',
      scope: ['src/api/routes.ts', 'src/api/middleware.ts'],
    };

    const ctx = await buildContext(TEST_ROOT, task);
    expect(ctx.relevantFiles).toEqual(task.scope);
  });
});
