/**
 * openclaw-magneto — Magneto AI governance plugin for OpenClaw
 *
 * Provides:
 *   - magneto_analyze     : scan codebase and build project memory
 *   - magneto_plan        : generate structured execution plan + security check for a task
 *   - magneto_generate    : produce a scoped implementation prompt from a task file
 *   - magneto_security_check : evaluate security risk of a command or action description
 *   - before_tool_call hook : intercept destructive agent actions and enforce Magneto guardrails
 *
 * Install:
 *   openclaw plugins install clawhub:magneto-ai/openclaw-magneto
 *
 * Requires magneto-ai to be installed globally:
 *   npm install -g magneto-ai
 */

import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry';
import { Type } from '@sinclair/typebox';
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ─── Security patterns (mirrors Magneto's security engine) ────────────────────

const BLOCKED_ACTION_PATTERNS: RegExp[] = [
  /delete[-_\s]?database/i,
  /drop[-_\s]?table/i,
  /drop[-_\s]?database/i,
  /truncate[-_\s]?table/i,
  /rm\s+-rf\s+[/~]/i,
  /rm\s+--force/i,
  /format\s+[a-z]:/i,
  /mkfs\./i,
  /dd\s+if=/i,
  /\bchmod\s+777\b/i,
  /\bchown\s+-R\s+root\b/i,
  /curl\s+.*\|\s*(bash|sh|zsh)/i,
  /wget\s+.*\|\s*(bash|sh|zsh)/i,
];

const PROTECTED_PATH_PATTERNS: RegExp[] = [
  /\.env(\.|$)/i,
  /\.pem$/i,
  /\.key$/i,
  /\.cert$/i,
  /\/secrets\//i,
  /\/\.ssh\//i,
  /\/credentials\//i,
  /id_rsa/i,
  /id_ed25519/i,
  /\.pfx$/i,
  /\.p12$/i,
];

const DESTRUCTIVE_TOOLS = new Set(['exec', 'bash', 'write', 'edit', 'apply_patch']);

function detectBlockedActions(text: string): string[] {
  return BLOCKED_ACTION_PATTERNS
    .filter(p => p.test(text))
    .map(p => p.source);
}

function detectProtectedPaths(text: string): string[] {
  return PROTECTED_PATH_PATTERNS
    .filter(p => p.test(text))
    .map(p => p.source);
}

function riskLevel(blocked: string[], paths: string[]): 'low' | 'medium' | 'high' | 'critical' {
  if (blocked.length > 0 && paths.length > 0) return 'critical';
  if (blocked.length > 0) return 'high';
  if (paths.length > 0) return 'medium';
  return 'low';
}

// ─── Magneto CLI runner ────────────────────────────────────────────────────────

/**
 * Resolve the magneto CLI command.
 * Priority: plugin config > env var MAGNETO_COMMAND > 'magneto' (PATH lookup)
 */
function resolveMagnetoCmd(api: { config?: { magnetoCommand?: string }; getPluginConfig?: () => { magnetoCommand?: string } }): string {
  return (
    api.config?.magnetoCommand ||
    api.getPluginConfig?.()?.magnetoCommand ||
    process.env.MAGNETO_COMMAND ||
    'magneto'
  );
}

function runMagneto(magnetoCmd: string, args: string[], cwd?: string): { stdout: string; stderr: string; ok: boolean } {
  const result = spawnSync(magnetoCmd, args, {
    cwd: cwd ?? process.cwd(),
    encoding: 'utf-8',
    timeout: 60_000,
  });

  if (result.error) {
    return {
      stdout: '',
      stderr: `magneto not found. Install it globally: npm install -g magneto-ai\n${result.error.message}`,
      ok: false,
    };
  }

  return {
    stdout: (result.stdout ?? '').trim(),
    stderr: (result.stderr ?? '').trim(),
    ok: result.status === 0,
  };
}

function textResult(text: string, isError = false) {
  return { content: [{ type: 'text' as const, text }], isError };
}

// ─── Skill content ────────────────────────────────────────────────────────────

function loadSkillContent(): string {
  const skillPath = join(new URL('.', import.meta.url).pathname, 'skill.md');
  if (existsSync(skillPath)) {
    return readFileSync(skillPath, 'utf-8');
  }
  return '# Magneto AI\nUse magneto_plan, magneto_analyze, magneto_generate for engineering tasks.';
}

// ─── Plugin entry ─────────────────────────────────────────────────────────────

export default definePluginEntry({
  id: 'openclaw-magneto',
  name: 'Magneto AI',
  description:
    'Governance, security guardrails, and task planning for engineering agents. Intercepts destructive actions and requires approval. Powered by Magneto AI.',

  register(api) {
    const magnetoCmd = resolveMagnetoCmd(api);

    // ── Register agent skill ──────────────────────────────────────────────────
    api.registerSkill({
      name: 'magneto',
      content: loadSkillContent(),
    });

    // ── Tool: magneto_analyze ─────────────────────────────────────────────────
    api.registerTool({
      name: 'magneto_analyze',
      description:
        'Scan the current project and build Magneto AI memory (file index, module summaries, dependency map). Run this before planning tasks in a new or updated project.',
      parameters: Type.Object({
        projectRoot: Type.Optional(
          Type.String({ description: 'Absolute path to project root. Defaults to current working directory.' })
        ),
      }),
      async execute(_id, params) {
        const cwd = (params.projectRoot as string | undefined) ?? process.cwd();
        const result = runMagneto(magnetoCmd, ['analyze'], cwd);
        if (!result.ok) {
          return textResult(`❌ magneto analyze failed:\n${result.stderr || result.stdout}`, true);
        }
        return textResult(`✅ Project analyzed.\n\n${result.stdout}`);
      },
    });

    // ── Tool: magneto_plan ────────────────────────────────────────────────────
    api.registerTool({
      name: 'magneto_plan',
      description:
        'Generate a structured execution plan for a task file (.md, .yaml, or .json). Classifies the task, assigns agent roles, evaluates security risk, and outputs the plan. Always run this before implementing.',
      parameters: Type.Object({
        taskFile: Type.String({
          description: 'Path to the task file (e.g. tasks/add-payment-webhook.md)',
        }),
        dryRun: Type.Optional(
          Type.Boolean({ description: 'Preview the plan without saving it. Default: false.' })
        ),
        projectRoot: Type.Optional(Type.String()),
      }),
      async execute(_id, params) {
        const cwd = (params.projectRoot as string | undefined) ?? process.cwd();
        const taskFile = params.taskFile as string;
        const args = ['plan', taskFile];
        if (params.dryRun) args.push('--dry-run');

        const result = runMagneto(magnetoCmd, args, cwd);
        if (!result.ok) {
          return textResult(`❌ magneto plan failed:\n${result.stderr || result.stdout}`, true);
        }
        return textResult(result.stdout || '✅ Plan generated.');
      },
    });

    // ── Tool: magneto_generate ────────────────────────────────────────────────
    api.registerTool(
      {
        name: 'magneto_generate',
        description:
          'Generate a scoped, context-aware implementation prompt from a task file. The prompt is pre-scoped to only the relevant files, reducing token cost by ~68%. Use this to get the prompt to hand to a coding agent.',
        parameters: Type.Object({
          taskFile: Type.String({
            description: 'Path to the task file (e.g. tasks/add-payment-webhook.md)',
          }),
          role: Type.Optional(
            Type.String({ description: 'Agent role override: backend, tester, requirements, orchestrator' })
          ),
          output: Type.Optional(
            Type.String({ description: 'Save the prompt to a file instead of returning it.' })
          ),
          projectRoot: Type.Optional(Type.String()),
        }),
        async execute(_id, params) {
          const cwd = (params.projectRoot as string | undefined) ?? process.cwd();
          const args = ['generate', params.taskFile as string];
          if (params.role) args.push('--role', params.role as string);
          if (params.output) args.push('--output', params.output as string);

          const result = runMagneto(magnetoCmd, args, cwd);
          if (!result.ok) {
            return textResult(`❌ magneto generate failed:\n${result.stderr || result.stdout}`, true);
          }
          return textResult(result.stdout || '✅ Prompt generated.');
        },
      },
      { optional: true }
    );

    // ── Tool: magneto_security_check ──────────────────────────────────────────
    api.registerTool(
      {
        name: 'magneto_security_check',
        description:
          'Evaluate the security risk of a command, action, or task description. Returns risk level (low/medium/high/critical), blocked patterns found, and whether human approval is required.',
        parameters: Type.Object({
          input: Type.String({
            description:
              'The command, action description, or task summary to evaluate. E.g. "rm -rf ./node_modules" or "drop the users table and recreate it".',
          }),
        }),
        async execute(_id, params) {
          const input = params.input as string;
          const blocked = detectBlockedActions(input);
          const paths = detectProtectedPaths(input);
          const risk = riskLevel(blocked, paths);

          const requiresApproval = risk === 'high' || risk === 'critical';
          const hardBlock = risk === 'critical' && blocked.length > 0 && paths.length > 0;

          const lines = [
            `## Magneto Security Check`,
            ``,
            `**Risk level:** ${risk.toUpperCase()}`,
            `**Requires human approval:** ${requiresApproval ? 'YES' : 'no'}`,
            `**Hard blocked:** ${hardBlock ? 'YES' : 'no'}`,
            ``,
            blocked.length > 0 ? `**Blocked action patterns matched:**\n${blocked.map(b => `- \`${b}\``).join('\n')}` : '',
            paths.length > 0 ? `**Protected paths involved:**\n${paths.map(p => `- \`${p}\``).join('\n')}` : '',
            ``,
            hardBlock
              ? `⛔ This action is BLOCKED. It matches both destructive action and protected path patterns.`
              : requiresApproval
              ? `⚠️ This action requires explicit user approval before proceeding.`
              : `✅ No critical patterns detected. Proceed with normal caution.`,
          ]
            .filter(l => l !== '')
            .join('\n');

          return textResult(lines);
        },
      },
      { optional: true }
    );

    // ── Hook: before_tool_call — compliance guardrail ─────────────────────────
    api.registerHook('before_tool_call', async (ctx) => {
      const { name: toolName, params } = ctx.tool;

      if (!DESTRUCTIVE_TOOLS.has(toolName)) return;

      // Extract the command string from common exec param shapes
      const commandText = [
        typeof params.command === 'string' ? params.command : '',
        typeof params.cmd === 'string' ? params.cmd : '',
        typeof params.input === 'string' ? params.input : '',
        typeof params.content === 'string' ? params.content : '',
        typeof params.path === 'string' ? params.path : '',
        typeof params.file_path === 'string' ? params.file_path : '',
      ]
        .filter(Boolean)
        .join(' ');

      if (!commandText) return;

      const blocked = detectBlockedActions(commandText);
      const paths = detectProtectedPaths(commandText);
      const risk = riskLevel(blocked, paths);

      if (risk === 'critical') {
        return {
          block: true,
          reason:
            `🛡 Magneto: CRITICAL risk detected in \`${toolName}\` call. ` +
            `Blocked patterns: ${blocked.join(', ')}. ` +
            `Protected paths: ${paths.join(', ')}. ` +
            `This action is not permitted. Run \`magneto_security_check\` to review.`,
        };
      }

      if (risk === 'high') {
        return {
          requireApproval: true,
          reason:
            `🛡 Magneto: HIGH risk detected in \`${toolName}\` call. ` +
            `Blocked patterns: ${blocked.join(', ')}. ` +
            `Please confirm you want to proceed.`,
        };
      }

      if (risk === 'medium') {
        return {
          requireApproval: true,
          reason:
            `🛡 Magneto: Protected path detected in \`${toolName}\` call — ` +
            `this touches sensitive files (${paths.join(', ')}). Please confirm.`,
        };
      }
    });
  },
});
