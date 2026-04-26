# AI Assistant Setup Guide

Magneto runs as the **governance and reasoning layer** for every major AI coding assistant. After `magneto init`, the appropriate skill files, MCP configs, and steering rules are scaffolded automatically. This page is a per-tool walkthrough for what to do *after* `magneto init` to make Magneto fully governing your assistant.

---

## Quick reference

| Assistant | Setup path | Magneto adapter command | Required env vars |
|---|---|---|---|
| Claude Code | `mcp.json` + `~/.claude/skills/magneto/` | `magneto adapter install claude` | — |
| GitHub Copilot (CLI / IDE) | `.github/copilot-instructions.md` + `.vscode/mcp.json` | auto-scaffolded by `magneto init` | — |
| Cursor | `.cursor/rules/` + skill files | auto-scaffolded by `magneto init` | — |
| Windsurf / Cascade | `.windsurf/workflows/` + native MCP | auto-detected by `runner: cascade` | — |
| Google Antigravity | `~/.antigravity/skills/magneto/` + MCP | `magneto adapter install antigravity` | — |
| OpenClaw | ClawHub plugin | `magneto adapter install openclaw` | `OPENCLAW_API_KEY` (optional) |
| Manus | API adapter | `magneto adapter install manus --api-key <key>` | `MANUS_API_KEY` |
| Gemini CLI | MCP-compatible | auto-scaffolded by `magneto init` | `GEMINI_API_KEY` |
| Aider | `AGENTS.md` + skill injection | auto-scaffolded by `magneto init` | — |
| Kiro | `.kiro/skills/` + steering | auto-scaffolded by `magneto init` | — |
| Trae | `AGENTS.md` + skill injection | auto-scaffolded by `magneto init` | — |
| OpenCode | Prompt generation | `magneto generate <task>` | — |
| Factory Droid | MCP tool hooks | governance adapter via MCP | — |
| OpenAI / Codex | API runner | `--runner openai` | `OPENAI_API_KEY` |
| Ollama | Local | `--runner ollama` | `OLLAMA_HOST`, `OLLAMA_MODEL` |

Every assistant gets the same MCP tools: `plan_task`, `load_context`, `security_check`, `evaluate_security`, `query_graph`, `path_between`.

---

## Claude Code

Claude Code reads MCP servers from `mcp.json` and skill files from a `skills/magneto/` directory.

```bash
magneto init                                  # scaffolds .vscode/mcp.json + skill files
magneto adapter install claude                # adds Claude-specific skills + steering
```

After install, Claude Code will see the `magneto` MCP server and the `magneto` skill. To verify:

```bash
magneto adapter doctor
# ✓ Claude:       skills installed at .claude/skills/magneto/
# ✓ MCP server:   plan_task, load_context, security_check
```

**Project skills** live in `.claude/skills/magneto/SKILL.md` and Magneto auto-injects:
- The active SDD framework (OpenSpec / Spec Kit / BMAD) and constitution path
- Power pack rules
- Protected paths and blocked actions
- The current security profile (`magneto sandbox status`)

**Global skills** (across all projects) live in `~/.claude/skills/magneto/` and contain the same skill scaffold so Claude knows how to drive Magneto from the CLI.

To reload after a config change:

```bash
magneto refresh                               # re-detect packs, regenerate skills
```

---

## GitHub Copilot

Copilot picks up `.github/copilot-instructions.md` automatically. Magneto generates this file on `init` and updates it on every `magneto refresh`.

```bash
magneto init --with typescript nextjs         # writes .github/copilot-instructions.md
```

For Copilot CLI (`gh copilot`), Magneto registers an MCP server in `.github/agents/`. For VS Code / JetBrains Copilot Chat, the same instructions file is consumed.

**Copilot Cloud runner** (executes via Copilot's hosted endpoint):

```bash
export MAGNETO_COPILOT_CLOUD_ENDPOINT=https://your-tenant.copilot.github.com
export MAGNETO_COPILOT_CLOUD_TOKEN=<token>
magneto run tasks/feature.md --runner copilot-cloud
```

**Copilot Local runner** (uses the Copilot CLI in your IDE — zero direct egress):

```bash
magneto run tasks/feature.md --runner copilot-local --stream
```

---

## Cursor

Magneto writes `.cursor/rules/magneto.mdc` containing the constitution, power-pack rules, and protected paths. No further setup needed — Cursor reads this on every prompt.

```bash
magneto init                                  # scaffolds .cursor/rules/
```

To verify the rules loaded, open Cursor's *Composer* panel and look for "magneto.mdc" under "Rules in effect".

---

## Windsurf / Cascade

Cascade (Windsurf) auto-detects local MCP servers. Magneto writes:

- `.windsurf/workflows/*.md` — slash-command workflows for `magneto plan`, `magneto run`, `magneto sdd sync`, etc.
- `.codeium/windsurf/cascade-mcp.json` — MCP server registration

Use the `cascade` runner:

```bash
magneto run tasks/feature.md --runner cascade
```

Data egress: **none** — Cascade's local process owns the network.

---

## Google Antigravity

```bash
magneto adapter install antigravity
```

This writes `~/.antigravity/skills/magneto/SKILL.md` and registers the `magneto` MCP server in Antigravity's tool catalog. Antigravity then exposes `security_check` and `plan_task` as first-class tools.

To verify:

```bash
magneto adapter doctor
# ✓ Antigravity: skills installed at ~/.antigravity/skills/magneto/
```

---

## OpenClaw

OpenClaw is a self-hosted AI agent gateway (Telegram, Slack, WhatsApp, Discord). Magneto integrates as the governance layer:

```bash
magneto adapter install openclaw
# OR install via ClawHub:
openclaw plugins install clawhub:openclaw-magneto
```

After install, every OpenClaw message routes through Magneto for security evaluation, task classification, and memory-graph context — *before* it hits the underlying agent.

```bash
magneto adapter config openclaw --set sync.autoPushTasks --value true
```

For full isolation, run OpenClaw inside Magneto's sandbox:

```bash
magneto sandbox run --profile standard -- openclaw start
```

---

## Manus

Manus is API-based, so the adapter requires a key:

```bash
magneto adapter install manus --api-key $MANUS_API_KEY
```

Manus tasks are dispatched through Magneto's planner and the results merged back into `.magneto/cache/`.

---

## Gemini CLI

Google's Gemini CLI is MCP-compatible. Magneto's MCP server is auto-registered in `.vscode/mcp.json`. To run via Gemini:

```bash
export GEMINI_API_KEY=<key>
magneto run tasks/feature.md --runner gemini
```

---

## Aider, Trae, Hermes, Kiro

These tools read `AGENTS.md` and/or skill files from a tool-specific directory. Magneto scaffolds all of them on `init`:

```
AGENTS.md                            ← read by Aider, Trae, Hermes
.kiro/skills/magneto/SKILL.md        ← Kiro-specific skill
.kiro/steering/magneto.md            ← Kiro project rules
```

For Kiro, also run:

```bash
magneto refresh                      # syncs power-pack rules into .kiro/steering/
```

---

## OpenCode (and any tool that takes a prompt)

For tools without a skill or MCP integration, use prompt generation:

```bash
magneto generate tasks/feature.md > prompt.md
# Paste prompt.md into the tool of your choice
```

`magneto generate` pre-scopes the prompt to **only the files that matter** (using the knowledge graph), saving 60–80% tokens versus a raw "load my whole repo" prompt.

Role-scoped:

```bash
magneto generate tasks/feature.md --role backend
magneto generate tasks/feature.md --role tester
```

---

## OpenAI / Codex

```bash
export OPENAI_API_KEY=<key>
magneto run tasks/feature.md --runner openai --stream
```

This is the default cloud runner. Data egress: prompts + relevant file snippets → OpenAI API.

---

## Ollama (zero-egress)

For air-gapped, healthcare, finance, or classified environments where source code **cannot leave the machine**:

```bash
ollama pull qwen2.5-coder
ollama serve

export OLLAMA_HOST=http://localhost:11434
export OLLAMA_MODEL=qwen2.5-coder

magneto run tasks/feature.md --runner ollama --stream
```

Every result is tagged `metadata.dataEgress = "none"` and recorded in `.magneto/audit/approvals.json` for compliance audits.

---

## Combine Magneto with sandbox + memory-lock for full hardening

The most secure setup runs *any* assistant inside Magneto's sandbox, with the memory locked:

```bash
magneto memory lock --require-root            # signed manifest, root-only unlock
magneto sandbox run --profile strict -- \
  magneto run tasks/audit.md --runner ollama
```

This gives you:
- Source code never leaves the machine (Ollama)
- The agent process can only read/write inside the project (sandbox `strict`)
- Agent memory cannot be silently mutated even by a compromised agent (memory lock)
- Spec ↔ code drift is checked before merge (`magneto sdd sync`)
- AI-generated code is scanned for vulns + dep CVEs (`magneto security audit`, `magneto security fix`)

---

## Troubleshooting

```bash
magneto doctor                      # validates all required files & env vars
magneto adapter doctor              # validates installed adapters
magneto adapter list --verbose      # show config + status of every adapter
magneto sandbox doctor              # validates sandbox setup
```

If an assistant isn't picking up the skill files, run `magneto refresh` and restart the assistant. If issues persist, file an issue with the output of `magneto doctor`.
