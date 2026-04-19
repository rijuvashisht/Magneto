<p align="center">
  <img src="docs/images/magneto-helmet.svg" alt="Magneto Logo" width="120" />
</p>

<h1 align="center">⚡ Magneto Framework</h1>

<p align="center">
  <strong>Repo-local AI reasoning framework & agent control plane for enterprise environments.</strong>
</p>

<p align="center">
  <em>All AI Engineering Tasks. Any Language or Stack. Enterprise Security and Guardrails.<br/>
  One Magneto To Pull Them All.</em>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-power-pack-system">Power Packs</a> •
  <a href="#-copilot-integration">Copilot</a> •
  <a href="#-cli-reference">CLI Reference</a>
</p>

---

<p align="center">
  <img src="docs/images/magneto-vision.png" alt="Magneto — The Starting Point for AI Developers" width="600" />
</p>

---

Magneto is a multi-agent AI orchestration system that brings structured reasoning, security guardrails, and pluggable intelligence to your codebase. It integrates natively with GitHub Copilot, OpenAI APIs, and optional tools like Graphify.

---

## 🧠 What Is Magneto?

Magneto is **not** another AI wrapper. It is a **reasoning engine** and **control plane** that:

- **Orchestrates multiple AI agents** with role-based task delegation
- **Enforces security guardrails** — protected paths, blocked actions, approval workflows
- **Classifies tasks** and creates execution plans before running anything
- **Merges agent outputs** with confidence-weighted deduplication
- **Plugs into your existing workflow** — Copilot, OpenAI, MCP tools
- **Extends via Power Packs** — language, framework, cloud, and project-type intelligence

Think of it as the nervous system connecting your AI tools to your codebase — with the safety controls an enterprise demands.

---

## 🔬 The Magneto Power Model

Magneto draws its conceptual architecture from electromagnetic forces:

| Ability | Magneto Capability |
|---|---|
| **Magnetokinesis** | Multi-agent orchestration — coordinate, delegate, merge |
| **Force Field** | Security guardrails — block unsafe actions, protect secrets |
| **Electromagnetic Sight** | Dependency & contradiction detection across the codebase |
| **Telepathic Resistance** | Reject bad instructions — hallucination filtering, constraint enforcement |
| **Telepathic Amplification** | Power boost when safe — higher autonomy for low-risk tasks |
| **Sentinel Lock** | Enterprise approval workflows — human-in-the-loop for critical operations |

---

## 🚀 Quick Start

### Install

```bash
npm install magneto-framework
```

Or clone and build:

```bash
git clone https://github.com/rijuvashisht/Magneto.git
cd magneto-framework
npm install
npm run build
```

### Initialize in Your Project

```bash
npx magneto init
```

With power packs:

```bash
npx magneto init --with typescript nextjs ai-platform --adapter graphify
```

### Validate Setup

```bash
npx magneto doctor
```

### Plan & Run a Task

```bash
npx magneto plan examples/tasks/checkout-mismatch.json
npx magneto run examples/tasks/checkout-mismatch.json --runner openai --mode assist
```

### Merge Agent Outputs

```bash
npx magneto merge .magneto/cache --format markdown
```

---

## 📦 Architecture

<p align="center">
  <img src="docs/images/magneto-architecture.png" alt="Magneto Architecture Diagram" width="800" />
</p>

<details>
<summary>Text-based architecture diagram</summary>

```
┌─────────────────────────────────────────────────────┐
│                   CLI (commander)                     │
│   init │ refresh │ doctor │ plan │ run │ merge       │
├─────────────────────────────────────────────────────┤
│                   Core Engine                         │
│   context │ security │ merge │ scaffold │ packs      │
├──────────────┬──────────────┬────────────────────────┤
│   Runners    │   MCP Server │   Power Packs          │
│  ┌─────────┐ │  ┌──────────┐│  ┌──────────────────┐  │
│  │ OpenAI  │ │  │plan_task ││  │ TypeScript        │  │
│  │ Copilot │ │  │load_ctx  ││  │ Next.js           │  │
│  │  Local  │ │  │merge_res ││  │ AI Platform       │  │
│  │  Cloud  │ │  │sec_check ││  │ Azure             │  │
│  └─────────┘ │  └──────────┘│  └──────────────────┘  │
├──────────────┴──────────────┴────────────────────────┤
│                  Adapter Layer                         │
│            Graphify │ (extensible)                     │
└─────────────────────────────────────────────────────┘
```
</details>

---

## 🛡 Security Engine

The security engine evaluates **every task** before execution:

```typescript
evaluateSecurity(task): {
  securityRisk: "low" | "medium" | "high"
  approvalRequired: boolean
  telepathyLevel: 0 | 1 | 2 | 3
  reasons: string[]
  blockedActions: string[]
  protectedPathsAccessed: string[]
}
```

### Execution Modes

| Mode | Description |
|---|---|
| `observe` | Read-only analysis, no changes |
| `assist` | Suggestions only, human applies changes |
| `execute` | Automated execution with guardrails |
| `restricted` | Locked down — requires explicit approval for everything |

### What Gets Checked

- **Protected paths** — `.env`, `.pem`, `.key`, secrets directories
- **Blocked actions** — database drops, destructive shell commands
- **Dependency risk** — package changes, install operations
- **Auth changes** — permission modifications, token operations
- **Infrastructure** — deploy, migrate, infra-as-code changes

---

## 🧩 Power Pack System

Power Packs add domain-specific intelligence to Magneto.

### Built-in Packs

| Pack | Category | What It Does |
|---|---|---|
| **TypeScript** | Language | Import graph analysis, type safety checks, `any` detection |
| **Next.js** | Framework | Server/client boundaries, hydration safety, routing validation |
| **AI Platform** | Project Type | Prompt injection detection, RAG pipeline validation, token limits |
| **Azure** | Cloud | Infrastructure reasoning, RBAC validation, networking checks |

### Using Packs

```bash
# Include during init
magneto init --with typescript nextjs

# Packs are detected automatically on refresh
magneto refresh
```

Packs live in `.magneto/power-packs/` and contain:
- `pack.json` — rules, checks, and configuration
- `rules.md` — detailed reasoning guidelines for agents

---

## 🔌 Adapter System

Adapters integrate external tools into Magneto's memory system.

### Graphify Adapter

Imports dependency graph data from Graphify:

```bash
magneto init --adapter graphify
```

Reads from `.graphify-out/graph.json` and maps into Magneto memory.

**Memory modes:**

| Mode | Behavior |
|---|---|
| `internal-first` | Magneto's own analysis takes priority; Graphify supplements |
| `external-first` | Graphify data takes priority; Magneto enriches it |

---

## 🤖 Copilot Integration

Magneto generates full Copilot integration:

### Agent Definitions (`.github/agents/`)

- **magneto-orchestrator** — coordinates multi-agent tasks
- **magneto-backend** — backend analysis specialist
- **magneto-tester** — test generation and validation
- **magneto-requirements** — requirements tracing

### MCP Integration (`.vscode/mcp.json`)

Exposes tools to Copilot:
- `plan_task` — generate execution plans
- `load_context` — load project context
- `merge_results` — merge agent outputs
- `security_check` — validate security constraints

---

## 🌐 OpenAI Runner

The OpenAI runner uses the Chat Completions API with structured JSON output:

```bash
magneto run task.json --runner openai --mode assist
```

Requires `OPENAI_API_KEY` environment variable.

The runner:
1. Builds a system prompt from task context and security constraints
2. Sends structured analysis request
3. Parses JSON response with findings, risks, and confidence scores
4. Saves results to `.magneto/cache/`

---

## 📊 Why Magneto vs. Graphify?

| Feature | Graphify | Magneto |
|---|---|---|
| Dependency graphs | ✅ Core strength | ✅ Via adapter or native |
| Multi-agent orchestration | ❌ | ✅ Core feature |
| Security guardrails | ❌ | ✅ Built-in engine |
| Copilot integration | ❌ | ✅ Native agents + MCP |
| OpenAI API runner | ❌ | ✅ Built-in |
| Power pack system | ❌ | ✅ Extensible |
| Task planning | ❌ | ✅ Plan → Execute → Merge |
| Enterprise approvals | ❌ | ✅ Sentinel Lock system |

**Magneto doesn't replace Graphify — it can consume it.** Use the Graphify adapter to import dependency data into Magneto's reasoning pipeline.

---

## 💰 Monetization Strategy

### Open Core (MIT License)

The core framework is **free and open source**:
- CLI tool
- Core reasoning engine
- Security engine
- Power pack system
- Copilot integration
- MCP server
- All built-in packs

### Paid Offerings

| Tier | What's Included |
|---|---|
| **Control Plane SaaS** | Hosted dashboard, team management, audit logs, analytics |
| **Enterprise Packs** | Compliance packs (SOC2, HIPAA, PCI), advanced security rules |
| **Premium Adapters** | Jira, Linear, Datadog, PagerDuty integrations |
| **Agent Runtime** | Managed multi-agent execution with GPU-backed inference |
| **Enterprise Dashboard** | Real-time agent monitoring, cost tracking, approval workflows |

### Pricing Model

- **Free** — MIT core, unlimited local usage
- **Team** — $29/user/month — SaaS dashboard, team features, 5 premium packs
- **Enterprise** — Custom pricing — dedicated runtime, custom adapters, SLA, SSO

---

## 🗂 Project Structure

```
magneto-framework/
  src/
    cli.ts                          # CLI entry point
    commands/                       # CLI commands
      init.ts                       #   magneto init
      refresh.ts                    #   magneto refresh
      doctor.ts                     #   magneto doctor
      plan.ts                       #   magneto plan
      run.ts                        #   magneto run
      merge.ts                      #   magneto merge
    core/                           # Core engine
      scaffold.ts                   #   Project scaffolding
      detect-packs.ts               #   Auto-detect power packs
      context.ts                    #   Task classification & context
      merge-results.ts              #   Agent output merging
      security-engine.ts            #   Security evaluation
      power-pack-loader.ts          #   Power pack loading
      adapter-loader.ts             #   Adapter loading
    runners/                        # Execution runners
      types.ts                      #   Runner interface
      openai.ts                     #   OpenAI API runner
      copilot-local.ts              #   Copilot local agent runner
      copilot-cloud.ts              #   Copilot cloud runner
    mcp/                            # MCP server
      server.ts                     #   HTTP MCP server
      tools/                        #   MCP tool handlers
        plan-task.ts
        load-context.ts
        merge-results.ts
        security-check.ts
    utils/                          # Utilities
      logger.ts
      paths.ts
      fs.ts
    templates/                      # Scaffolding templates
      base/                         #   Base project templates
      power-packs/                  #   Power pack templates
  examples/
    tasks/                          # Example task files
  package.json
  tsconfig.json
  README.md
  LICENSE
```

---

## 🧪 CLI Reference

| Command | Description |
|---|---|
| `magneto init` | Initialize Magneto in the current project |
| `magneto init --with <packs>` | Initialize with specific power packs |
| `magneto init --adapter <name>` | Initialize with an adapter |
| `magneto refresh` | Refresh configuration and detect packs |
| `magneto doctor` | Validate setup and diagnose issues |
| `magneto plan <task.json>` | Generate an execution plan |
| `magneto plan <task.json> --dry-run` | Preview plan without saving |
| `magneto run <task.json>` | Execute a task |
| `magneto run <task.json> --runner openai` | Execute with specific runner |
| `magneto run <task.json> --mode observe` | Execute in observe mode |
| `magneto merge <outputDir>` | Merge agent results |
| `magneto merge <outputDir> --format md` | Merge as Markdown report |

---

## 🛣 Roadmap

- [ ] Interactive plan approval workflow
- [ ] Streaming runner output
- [ ] VS Code extension with agent panel
- [ ] Custom power pack authoring guide
- [ ] Agent memory persistence across sessions
- [ ] Multi-repo orchestration
- [ ] GitHub Actions integration
- [ ] Cost tracking and budget limits
- [ ] Plugin marketplace

---

## 📄 License

MIT — see [LICENSE](./LICENSE)

---

<p align="center">
  <img src="docs/images/magneto-helmet.svg" alt="Magneto" width="40" /><br/>
  Built with ⚡ by the Magneto team.
</p>
