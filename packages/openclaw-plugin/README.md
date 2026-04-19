# openclaw-magneto

> **Magneto AI governance and security guardrails for OpenClaw agents.**
> Task planning, compliance hooks, and security checks — across every channel.

[![npm](https://img.shields.io/npm/v/magneto-ai?label=magneto-ai&color=brightgreen)](https://www.npmjs.com/package/magneto-ai)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](https://github.com/rijuvashisht/Magneto/blob/main/LICENSE)

---

## What it does

This plugin wires [Magneto AI](https://github.com/rijuvashisht/Magneto) into your OpenClaw gateway as the governance and reasoning layer for all AI engineering agents.

### Tools added to every agent session

| Tool | Description |
|---|---|
| `magneto_analyze` | Scan the project and build AI memory (file index, modules, dependencies) |
| `magneto_plan` | Generate a structured plan + security check for a task file |
| `magneto_generate` | Produce a scoped implementation prompt (68% fewer tokens than raw prompts) |
| `magneto_security_check` | Evaluate risk of any command or action before running it |

### Compliance hook — `before_tool_call`

Every call to `exec`, `bash`, `write`, `edit`, or `apply_patch` passes through Magneto's security engine:

| Risk level | What happens |
|---|---|
| **LOW** | Allowed to proceed normally |
| **MEDIUM** | Protected path detected → user must confirm via channel button or `/approve` |
| **HIGH** | Blocked action pattern → requires explicit approval |
| **CRITICAL** | Blocked action + protected path → hard blocked, not permitted |

Blocked patterns include: `rm -rf`, `DROP TABLE`, `DELETE DATABASE`, `curl | bash`, credential file access, and more.

### Bundled skill

A `magneto.SKILL.md` is registered with the agent, teaching it when and how to invoke all four tools and follow Magneto's governance workflow.

---

## Install

Requires `magneto-ai` globally on your gateway host:

```bash
npm install -g magneto-ai
```

Install the plugin:

```bash
# Users install it from their own gateway
openclaw plugins install clawhub:magneto-ai/openclaw-magneto
openclaw gateway restart
```

---

## Quick start

1. Install the plugin (above)
2. Initialize Magneto in your project:
   ```bash
   cd /your/project
   magneto init
   ```
3. Send a message from any channel: *"Plan the auth feature"*
4. The agent calls `magneto_analyze` → `magneto_plan` → returns a structured plan with risk level

---

## How Magneto works

```
User → Telegram / Slack / WhatsApp / Discord
          ↓
     OpenClaw Gateway
          ↓
     Agent (reads magneto.SKILL.md)
          ↓
     magneto_analyze   → understands the codebase
     magneto_plan      → structured plan + security check
     magneto_generate  → scoped implementation prompt (68% fewer tokens)
          ↓
     before_tool_call hook intercepts any destructive exec/write calls
          ↓
     Governed, safe response back to user
```

---

## Why this matters

| Without Magneto | With Magneto |
|---|---|
| Agent has no project context | Project memory built from codebase |
| Every prompt dumps the whole repo | Only relevant files are included |
| No security checks | Every exec/write intercepted and evaluated |
| Agent can delete files, drop tables | Blocked at the hook level |
| No compliance trail | Risk levels logged per action |

---

## Configuration

No configuration required after install. Optional: set the `projectRoot` parameter on any tool call to point to a specific project directory.

---

## Links

- [Magneto AI docs](https://github.com/rijuvashisht/Magneto)
- [OpenClaw Plugin SDK](https://docs.openclaw.ai/plugins/building-plugins)
- [OpenClaw Skills reference](https://docs.openclaw.ai/tools/skills)
- [Buy Me a Coffee](https://buymeacoffee.com/rijuvashisht)
- [GitHub Sponsors](https://github.com/sponsors/rijuvashisht)
