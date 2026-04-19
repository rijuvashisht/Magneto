# OpenClaw Development Rules

Rules and patterns for building OpenClaw channel plugins, gateway extensions, and agent skills.

## Project structure conventions

```
.openclaw/
  openclaw.json          ← gateway config (JSON — machine config)
  skills/                ← SKILL.md files (Markdown — agent-facing)
    magneto.SKILL.md     ← Magneto governance skill
    your-skill.SKILL.md  ← custom skills
  plugins/               ← installed channel plugins
```

## Config file convention

OpenClaw config (`openclaw.json` or `~/.openclaw/openclaw.json`) is always **JSON** — it is machine-read by the gateway daemon. Do not convert it to YAML or Markdown.

## SKILL.md conventions

Skills are Markdown files with natural language instructions. They are agent-facing — write them clearly and concisely:
- Use imperative language: "Run X when Y"
- Include concrete command examples in code blocks
- Group by trigger condition (when to use) vs action (how to use)
- Keep each skill focused on one capability domain

## Channel plugin development

When building a new channel plugin:
- Entry point must export `ChannelPlugin` interface
- Config schema must be registered with the gateway
- Handle `onMessage`, `onConnect`, `onDisconnect` lifecycle hooks
- Use `exec` tool for shell operations, not direct `child_process` calls in agent context
- Test against the WebChat built-in channel first before deploying

## Security patterns

- Always scope `allowFrom` in channel config to known senders before production
- Use `requireMention: true` for group chat channels
- Never log full message content — use message IDs for tracing
- Validate `exec` commands against an allowlist before the agent runs them

## Agent routing

- Use isolated sessions per workspace or per sender — never share session state across users
- When routing to sub-agents, pass only the minimum context needed
- Magneto's `magneto plan` output is the correct input to a specialized sub-agent

## Testing

- Test channel plugins locally with `openclaw gateway status` and WebChat
- Mock the gateway in unit tests — do not make real channel API calls in tests
- Use `openclaw dashboard` for integration testing with real channels
