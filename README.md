<p align="center">
  <img src="docs/logo.png" alt="Magneto AI Logo" width="560" />
</p>

<p align="center">
  <strong>Repo-local AI reasoning framework & agent control plane for enterprise environments.</strong>
</p>

<p align="center">
  <em>All AI Engineering Tasks. Any Language or Stack. Enterprise Security and Guardrails.<br/>
  One Magneto AI To Pull Them All.</em>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-raw-windsurfcopilot-vs-magneto-ai--token--cost-benchmarks">Benchmarks</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-power-pack-system">Power Packs</a> •
  <a href="#-copilot-integration">Copilot</a> •
  <a href="#-cli-reference">CLI Reference</a>
</p>

<p align="center">
  <a href="https://landing-fsmpg96k6-rijuvashisht-1233s-projects.vercel.app/"><img src="https://img.shields.io/badge/📚%20Documentation-58a6ff?style=for-the-badge" alt="Documentation" /></a>
  <a href="https://www.npmjs.com/package/magneto-ai"><img src="https://img.shields.io/npm/v/magneto-ai?color=brightgreen&label=npm" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/magneto-ai"><img src="https://img.shields.io/npm/dm/magneto-ai?color=blue&label=downloads" alt="npm downloads" /></a>
  <a href="https://github.com/rijuvashisht/Magneto/actions"><img src="https://github.com/rijuvashisht/Magneto/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://buymeacoffee.com/rijuvashisht"><img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-☕-yellow" alt="Buy Me a Coffee" /></a>
  <a href="https://github.com/sponsors/rijuvashisht"><img src="https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?logo=github" alt="GitHub Sponsors" /></a>
</p>

---


Magneto AI is a multi-agent AI orchestration system that brings structured reasoning, security guardrails, and pluggable intelligence to your codebase — designed to work alongside every major AI coding assistant and agent gateway.

---

## 🧠 About Magneto AI

Magneto AI is **not** another AI wrapper. It is a **reasoning engine**, **governance layer**, and **agent control plane** that sits between your team and any AI coding assistant — enforcing security, planning tasks, and building deep project understanding before a single line is written or deleted.

- **🚨 AI Security Auditing (Project Glasswing)** — Pre-execution vulnerability scanning for ALL AI assistants (Claude, Copilot, Manus, etc.)
- **Orchestrates multiple AI agents** with role-based task delegation
- **Enforces security guardrails** — protected paths, blocked actions, approval workflows
- **Classifies tasks** and creates execution plans before running anything
- **Merges agent outputs** with confidence-weighted deduplication
- **Plugs into your existing workflow** — Copilot, OpenAI, MCP tools
- **Extends via Power Packs** — language, framework, cloud, and project-type intelligence

Think of it as the nervous system connecting your AI tools to your codebase — with the safety controls an enterprise demands.

### Works With Every AI Coding Assistant

Magneto AI acts as the **skill and governance layer** for the full ecosystem of AI coding assistants and agent gateways — so your rules, security checks, and task plans travel with you regardless of which tool you use:

| Assistant / Gateway | Integration |
|---|---|
| **Claude Code** | MCP tools via `mcp.json`, skill files injected into context |
| **Codex / OpenAI** | Direct API runner with structured JSON task execution |
| **OpenCode** | Prompt generation via `magneto generate` scoped to relevant files only |
| **Cursor** | Skill files + `.cursor/rules/` auto-generated on `magneto init` |
| **Gemini CLI** | MCP-compatible tool layer (`plan_task`, `security_check`, etc.) |
| **GitHub Copilot CLI** | MCP server + `.github/agents/` + `copilot-instructions.md` |
| **VS Code Copilot Chat** | `.github/copilot-instructions.md` + MCP config in `.vscode/mcp.json` |
| **Aider** | Skill injection via adapter system + `AGENTS.md` |
| **OpenClaw** | Native plugin on ClawHub — `openclaw plugins install clawhub:openclaw-magneto` |
| **Factory Droid** | Governance adapter via MCP tool hooks |
| **Trae** | Skill injection via adapter system + `AGENTS.md` |
| **Hermes** | Skill injection via adapter system |
| **Kiro** | Skill files in `.kiro/skills/` + steering rules |
| **Google Antigravity** | MCP-compatible `security_check` and `plan_task` tools |

One `magneto init`. All assistants governed.

### Turn Any Folder Into a Queryable Knowledge Graph

Magneto AI's `analyze` command ingests your entire project and builds a **knowledge graph** with community detection, confidence-scored edges, and interactive visualization:

```
magneto analyze
```

- **Source code** → exports, imports, classes, functions, dependency maps, EXTRACTED edges (confidence 1.0)
- **Module structure** → directory-level nodes with INFERRED co-location edges (confidence 0.5–0.9)
- **Community detection** → Louvain algorithm identifies clusters of related code
- **God nodes** → highest-degree concepts that everything connects through
- **Config & docs** → environment shapes, schema definitions, feature flags

**Outputs:**

```
.magneto/memory/
├── graph.json            queryable knowledge graph (nodes, edges, communities)
├── graph.html            interactive vis.js visualization — open in any browser
├── graph-report.md       god nodes, communities, edge distribution, suggested questions
├── root-summary.md       project overview + token savings
├── file-index.md         all files with signatures
├── dependencies.md       import/dependency map
└── modules/*.md          per-directory summaries
```

**Query the graph from the terminal:**

```bash
magneto query "auth flow"                        # BFS subgraph extraction
magneto query "security" --dfs --budget 500      # DFS with token budget
magneto path "evaluateSecurity" "initCommand"    # shortest path between nodes
```

The result: every AI prompt is pre-scoped to only the files that matter — **fewer tokens**, faster responses, no hallucinated file paths.

### Magneto + Graphify: Deep Multimodal Analysis

For full multimodal support — PDFs, images, screenshots, video, audio, and 25-language tree-sitter AST — pair Magneto with [Graphify](https://github.com/safishamsi/graphify):

```bash
pip install graphifyy
magneto analyze --deep       # shells to graphify for multimodal extraction
```

When `--deep` is passed, Magneto invokes Graphify under the hood and imports its richer graph (Leiden clustering, Claude vision extraction, Whisper transcription) into `.magneto/memory/`. If Graphify isn't installed, Magneto falls back to its native code-only graph.

| Capability | `magneto analyze` | `magneto analyze --deep` |
|---|---|---|
| Code parsing | Regex (JS/TS, Java, Python, Go, + more) | tree-sitter AST (25 languages) |
| Knowledge graph | Louvain communities + god nodes | Leiden communities + hyperedges |
| Confidence scores | EXTRACTED / INFERRED | + AMBIGUOUS with confidence 0.0–1.0 |
| Interactive visualization | vis.js graph.html | vis.js graph.html (richer) |
| PDFs, images, video | — | Claude vision + Whisper transcription |
| Graph querying | `magneto query` / `magneto path` | Same + `graphify query` / `graphify explain` |

### What It Is Not

Magneto AI is **not** an AI model, a chat interface, or a replacement for your coding assistant. It is the **layer of intelligence underneath** — planning, securing, and contextualizing every task before your assistant runs it.

---

## ⚙️ Core Capabilities

Magneto AI unifies task classification, multi-agent orchestration, security evaluation, and result merging into a single framework that any AI coding assistant can plug into.

### Task Classification & Planning
Every task is automatically classified into one of 9 categories — `architecture-review`, `bug-fix`, `feature-implementation`, `security-audit`, `performance-review`, `testing`, `requirements-analysis`, `code-review`, or `general` — using keyword analysis against the task title, description, and tags. Based on the classification, Magneto AI assigns the right roles (orchestrator, backend, tester, requirements) and generates a structured execution plan before any AI agent runs.

### Multi-Agent Orchestration
Magneto AI creates dedicated sub-agents for each assigned role, each with its own model configuration (`gpt-4o`), tool access (`plan_task`, `load_context`, `merge_results`, `security_check`), and scoped file visibility. The orchestrator coordinates the agents; each agent works within its defined scope and constraints.

### Security Guardrail Engine
**Every task is evaluated before execution.** The security engine scans for:
- **Protected paths** — `.env`, `.pem`, `.key`, `.cert`, `secrets/`, `.ssh/`, `credentials/`
- **Blocked actions** — `delete-database`, `drop-table`, `rm -rf`, `format`, `truncate`
- **Auth changes** — permission modifications, token operations, authentication logic
- **Infrastructure risk** — deploy, migrate, infra-as-code changes
- **Dependency risk** — package installs, lockfile modifications

The engine returns a risk level (`low` / `medium` / `high`), whether human approval is required, a list of blocked actions detected, and a **telepathy level** (0–3) that controls how much autonomy the AI agents receive.

### Confidence-Weighted Result Merging
After agents complete their analysis, Magneto AI merges all findings and risks with **content-based deduplication** — identical findings keep the higher confidence score, identical risks keep the higher severity. The overall confidence is calculated using a weighted average that favors high-confidence agents. The final merged output includes an `overallRisk` assessment (`low` → `critical`).

### Auto-Detection Power Packs
Magneto AI scans your project to automatically detect which Power Packs to activate:
- **TypeScript** — detects `tsconfig.json` or `typescript` in dependencies
- **Next.js** — detects `next` in dependencies
- **AI Platform** — detects `openai`, `@azure/openai`, `langchain`, or `@langchain/core`
- **Azure** — detects `azure.yaml`, `bicep/`, or `infra/` directories
- **Graphify** — detects `.graphify-out/graph.json`

Each pack adds domain-specific rules and checks that are injected into agent prompts and execution plans.

### MCP-Compatible Tool Layer
Magneto AI exposes its core engine as 4 MCP tools via an HTTP server, allowing any MCP-compatible client (GitHub Copilot, VS Code, custom agents) to invoke Magneto AI directly:
- `plan_task` — classify a task and generate an execution plan
- `load_context` — build full project context with role assignments and file resolution
- `merge_results` — merge multiple agent output files with deduplication
- `security_check` — evaluate security constraints and get approval requirements

### Copilot-Native Integration
Magneto AI generates full GitHub Copilot integration out of the box:
- **4 agent definitions** (`magneto-orchestrator`, `magneto-backend`, `magneto-tester`, `magneto-requirements`) in `.github/agents/`
- **Copilot instructions** in `.github/copilot-instructions.md` teaching Copilot how to use Magneto tools
- **MCP config** in `.vscode/mcp.json` connecting VS Code to the local MCP server

### Multiple Execution Runners
Six built-in runners execute tasks through different AI backends:
- **OpenAI Runner** — Chat Completions API, structured JSON output, streaming, auto-selected when `OPENAI_API_KEY` is set
- **Copilot Local Runner** — structured prompts for GitHub Copilot's local agent mode via MCP tools
- **Copilot Cloud Runner** — remote Copilot Cloud API endpoint with bearer token auth
- **Cascade / Antigravity Runner** — routes through the local Windsurf/Copilot process; no direct network call
- **Gemini Runner** — Google AI API, auto-selected when `GEMINI_API_KEY` or `GOOGLE_AI_KEY` is set
- **Ollama Runner** — fully local, zero-egress; no API key required. Set `OLLAMA_HOST` or `MAGNETO_USE_OLLAMA` to activate. See `docs/RUNNER-OLLAMA.md`.

### Adapter System
Adapters import external tool data into Magneto's memory. The **Graphify adapter** reads `.graphify-out/graph.json` and maps dependency graph nodes/edges into Magneto's context, with configurable priority modes (`internal-first` or `external-first`).

### Secure by Design
Input validation on all task files. Protected path patterns block access to secrets and credentials. Blocked action detection prevents destructive operations. Execution modes (`observe`, `assist`, `execute`, `restricted`) enforce escalating levels of control. High-risk tasks automatically set telepathy to 0 and require human approval.

---

## 🔬 The Magneto AI Power Model

Magneto AI draws its conceptual architecture from electromagnetic forces:

| Ability | Magneto AI Capability |
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
# Install globally (recommended — use magneto without npx)
npm install -g magneto-ai

# Or use without installing via npx
npx magneto-ai@latest init
```

### Initialize in Your Project

```bash
magneto init
```

With power packs:

```bash
magneto init --with typescript nextjs ai-platform --adapter graphify
magneto init --adapter openclaw   # wire Magneto as OpenClaw governance layer
```

### Validate Setup

```bash
magneto doctor
```

### Plan & Run a Task

```bash
# Tasks can be written as Markdown (.md), YAML (.yaml), or JSON (.json)
magneto plan examples/tasks/checkout-mismatch.md
magneto run examples/tasks/checkout-mismatch.md --runner openai --mode assist
```

### Merge Agent Outputs

```bash
magneto merge .magneto/cache --format markdown
```

---

## ⚡ See Magneto in Action

Six real scenarios — pick the one that matches your stack.

---

### 🖥 Scenario 1 — Next.js Frontend Feature

You have a Next.js + TypeScript project. You need a new analytics dashboard. One command sets up Magneto, then it plans and executes with 4 parallel agents.

```bash
$ magneto init --with typescript nextjs
[magneto] Initializing Magneto AI...
[magneto] ✓ Detected stack: TypeScript · Next.js 14 · React 18
[magneto] ✓ Base scaffolding complete  (.magneto/, .github/agents/, .vscode/mcp.json)
[magneto] ✓ Power packs loaded         (typescript, nextjs)
[magneto] ✓ Magneto AI initialized successfully!

$ magneto plan tasks/add-dashboard.md
[magneto] Planning task: add-dashboard
[magneto] Classification: feature-implementation
[magneto] Security Risk: low ✓
[magneto] Agents: orchestrator, backend, frontend, tester
[magneto] Subtasks:
[magneto]   1. Design analytics API route    → backend
[magneto]   2. Build dashboard components    → frontend
[magneto]   3. Write integration tests       → tester
[magneto] ✓ Plan saved to .magneto/cache/plan-add-dashboard.json

$ magneto run tasks/add-dashboard.md --stream
[magneto] ⚡ Executing with 4 agents in parallel...
[orchestrator] Decomposing into 3 subtasks...
[backend]      Implementing API routes...         ████████░░  80%
[frontend]     Building dashboard components...  ██████░░░░  60%
[tester]       Generating test suite...           ██████████ 100%
[backend]      API routes complete ✓
[frontend]     Dashboard components complete ✓
[magneto] ✓ Task completed — 12 files, 847 lines, 31 tests generated

$ magneto merge .magneto/cache --format markdown
[magneto] ✓ Merged 4 agent outputs → .magneto/reports/add-dashboard.md
[magneto]   Findings: 3 · Risks: 0 · Confidence: 0.94
```

**What Magneto caught that raw Copilot missed:** missing `'use client'` on a component using `useState`, a server/client boundary violation that would have caused a hydration error at runtime.

---

### 🐍 Scenario 2 — Python FastAPI Security Audit

You're about to deploy a FastAPI service. Magneto scans for the 10 most common FastAPI security mistakes before a single line ships.

```bash
$ magneto init --with python fastapi
[magneto] ✓ Detected stack: Python 3.12 · FastAPI 0.110 · Pydantic v2
[magneto] ✓ Power packs loaded  (python, fastapi)

$ magneto run tasks/pre-deploy-audit.md --mode observe
[magneto] ⚡ Running security audit (observe mode — read-only)...
[magneto] Scanning 24 Python files...

[python-pack]   py-hardcoded-secret     FOUND   src/config.py:14
                → SECRET_KEY = "my-super-secret-key-12345"
[python-pack]   py-shell-true           FOUND   src/utils/runner.py:38
                → subprocess.run(cmd, shell=True)  ← command injection risk
[fastapi-pack]  fastapi-cors-wildcard   FOUND   src/main.py:22
                → allow_origins=["*"] + allow_credentials=True  ← blocked by browsers
[fastapi-pack]  fastapi-debug-true      FOUND   src/main.py:7
                → FastAPI(debug=True)  ← leaks tracebacks in production
[python-pack]   py-requests-no-timeout  FOUND   src/integrations/stripe.py:51
                → requests.post(url, json=payload)  ← hangs on unresponsive server

[magneto] ✓ Audit complete — 5 issues across 4 files (3 error, 2 warning)
[magneto] ✓ Report saved to .magneto/reports/pre-deploy-audit.md

$ magneto run tasks/pre-deploy-audit.md --mode assist
[magneto] Generating fixes for 5 issues...
[magneto] ✓ Fix suggestions written to .magneto/reports/pre-deploy-fixes.md
```

**Time to catch this without Magneto:** 2–3 hours of manual code review, or one very bad production incident.

---

### ☕ Scenario 3 — Java Spring Boot Refactor

Your Spring Boot service is mysteriously slow and occasionally throws `LazyInitializationException`. Magneto finds the N+1 query, the missing transaction boundary, and the exposed actuator — all in seconds.

```bash
$ magneto init --with java spring-boot
[magneto] ✓ Detected stack: Java 21 · Spring Boot 3.2 · PostgreSQL
[magneto] ✓ Power packs loaded  (java, spring-boot)

$ magneto run tasks/perf-audit.md --mode observe --stream
[magneto] ⚡ Scanning 67 Java files...

[spring-pack]  spring-open-in-view         FOUND   src/main/resources/application.yml:12
               → spring.jpa.open-in-view=true  ← N+1 queries in every controller
[spring-pack]  spring-transactional-priv   FOUND   src/service/OrderService.java:84
               → @Transactional on private method  ← proxy bypass, no transaction applied
[spring-pack]  spring-actuator-all-exposed FOUND   src/main/resources/application-prod.yml:4
               → management.endpoints.web.exposure.include=*  ← heapdump publicly accessible
[java-pack]    java-catch-throwable        FOUND   src/service/PaymentService.java:127
               → catch (Throwable t)  ← swallows OutOfMemoryError and InterruptedException
[java-pack]    java-unsafe-deserialize     FOUND   src/legacy/MessageParser.java:33
               → new ObjectInputStream(input)  ← RCE risk on untrusted data

[magneto] ✓ Found 5 issues across 5 files (3 error, 2 warning)
[magneto] ⚡ Orchestrating fixes with 3 agents...
[backend]  Fixing application.yml + OrderService...  ██████████ 100%
[tester]   Updating integration tests...              ██████████ 100%
[magneto] ✓ 6 files changed — estimated 60–80% reduction in DB query count
```

---

### ☁️ Scenario 4 — AWS Infrastructure Review

You've written Terraform for a new microservice. Before `terraform apply`, Magneto scans every `.tf` file for the 16 AWS security checks — IAM, S3, SGs, encryption, hardcoded keys.

```bash
$ magneto init --with aws
[magneto] ✓ Detected stack: Terraform 1.7 · AWS Provider 5.x
[magneto] ✓ Power packs loaded  (aws)

$ magneto run tasks/infra-pre-deploy.md --mode observe
[magneto] ⚡ Scanning Terraform files (31 .tf files)...

[aws-pack]  aws-iam-wildcard-action    FOUND   infra/iam.tf:18
            → Action: "*", Resource: "*"  ← grants all AWS permissions
[aws-pack]  aws-s3-public-acl          FOUND   infra/storage.tf:7
            → acl = "public-read"  ← bucket contents publicly accessible
[aws-pack]  aws-sg-ssh-open            FOUND   infra/networking.tf:44
            → cidr_blocks = ["0.0.0.0/0"] on port 22  ← SSH open to internet
[aws-pack]  aws-rds-unencrypted        FOUND   infra/database.tf:29
            → storage_encrypted = false  ← RDS data unencrypted at rest
[aws-pack]  aws-hardcoded-access-key   FOUND   infra/providers.tf:11
            → access_key = "AKIA..."  ← hardcoded AWS key (rotate immediately)
[aws-pack]  aws-lambda-no-timeout      FOUND   infra/lambda.tf:8
            → No timeout set  ← unbounded execution, cost risk

[magneto] ✗ 6 CRITICAL/HIGH issues found — deploy blocked pending review
[magneto] ✓ Report: .magneto/reports/infra-pre-deploy.md
```

**Deploy blocked.** The hardcoded `AKIA` key alone would have triggered a GitHub secret scanner alert and potentially an AWS account compromise within minutes of pushing.

---

### 🔒 Scenario 5 — Regulated/Offline (Ollama — Zero Egress)

You work in healthcare, finance, or a classified environment. Source code cannot leave your machine. Magneto with the Ollama runner gives you full AI-powered reasoning with **zero data egress**.

```bash
# One-time setup — pull a model locally
$ ollama pull qwen2.5-coder
$ ollama serve

# Tell Magneto to use Ollama
$ export OLLAMA_HOST=http://localhost:11434
$ export OLLAMA_MODEL=qwen2.5-coder

$ magneto run tasks/audit-auth-module.md --runner ollama --stream
[magneto] Runner: ollama (qwen2.5-coder @ localhost)
[magneto] Data egress: none ✓  — all processing is local
[magneto] ⚡ Pre-flight health check...
[magneto] ✓ Ollama reachable · model qwen2.5-coder available

[magneto] Executing task via local model...
[ollama]  Analyzing auth module (4 files, 612 lines)...  ████████████ 100%

[magneto] ✓ Task complete
[magneto]   Findings: 4 · Risks: 1 · Tokens: 2,847 · Egress: none
[magneto]   metadata.dataEgress = "none"  ← audit-ready tag on every result

# Every result is tagged — verifiable in your audit log
$ cat .magneto/audit/approvals.json | jq '.[-1].metadata.dataEgress'
"none"
```

**No API key. No cloud call. No data leaving your network.** Same structured findings, same agent output format, runs on a $2,000 developer laptop.

---

### 🔍 Scenario 6 — Auto-Detect Any Stack

Don't know which packs to install? Just run `magneto detect`. Magneto reads your project files and tells you exactly what's there — with confidence scores.

```bash
$ magneto detect
[magneto] Scanning project structure...

Stack detected:
  ✓ TypeScript      confidence: 0.98  (tsconfig.json, 47 .ts files)
  ✓ Next.js         confidence: 0.95  (next.config.js, app/ router)
  ✓ Python          confidence: 0.81  (requirements.txt, 12 .py files)
  ✓ FastAPI         confidence: 0.79  (fastapi in requirements.txt)
  ✓ AWS             confidence: 0.92  (14 .tf files, aws provider)

Recommended packs:
  → typescript   [available]   magneto init --with typescript
  → nextjs       [available]   magneto init --with nextjs
  → python       [available]   magneto init --with python
  → fastapi      [available]   magneto init --with fastapi
  → aws          [available]   magneto init --with aws

$ magneto init --auto-install
[magneto] Installing all 5 detected packs...
[magneto] ✓ typescript · nextjs · python · fastapi · aws installed
[magneto] ✓ Magneto AI ready — 67 checks active across your full stack
```

---

## 📊 Raw Windsurf/Copilot vs Magneto AI — Token & Cost Benchmarks

> **Same tasks. Measured token-by-token. Magneto AI uses 68% fewer tokens and delivers 3.5x faster.**

### Real Task Comparison

| Task | Raw Windsurf/Copilot | With Magneto AI | Token Savings | Cost Savings | Speed |
|---|---|---|---|---|---|
| **Bug fix** (checkout price mismatch) | 44,470 tokens / $0.156 | 24,400 tokens / $0.079 | **-45%** | **-49%** | **3.8x faster** |
| **Feature** (Next.js auth flow) | 82,200 tokens / $0.247 | 29,700 tokens / $0.088 | **-64%** | **-64%** | **4.8x faster** |
| **Security audit** (Java endpoints) | 96,500 tokens / $0.300 | 33,000 tokens / $0.098 | **-66%** | **-67%** | **3.0x faster** |
| **Performance** (bundle optimization) | 77,000 tokens / $0.220 | 20,500 tokens / $0.060 | **-73%** | **-73%** | **3.5x faster** |
| **Architecture** (microservice review) | 119,000 tokens / $0.370 | 29,000 tokens / $0.087 | **-76%** | **-76%** | **5.3x faster** |

### Why the Difference?

```
Raw Windsurf/Copilot:
  ├─ Loads 15–40 files (shotgun)          → bloated context
  ├─ 5–10 back-and-forth exchanges        → wasted tokens on "show me more"
  ├─ Re-explains project every session    → no memory
  ├─ 1 generic agent pass                 → misses cross-cutting issues
  └─ Manual cross-referencing             → slow and error-prone

Magneto AI:
  ├─ Loads 4–8 files (task-classified)    → 50–70% fewer tokens
  ├─ 0 back-and-forth                     → all files pre-scoped
  ├─ Persistent .magneto/memory/          → no re-explaining
  ├─ 3–4 parallel role-focused agents     → catches contradictions
  └─ Automatic merge + deduplication      → instant consolidated report
```

### Long-Term Savings

| Team Size | Annual AI Cost (Raw) | Annual AI Cost (Magneto AI) | **Annual Savings** |
|---|---|---|---|
| 1 developer | $1,322 | $429 | **$893** |
| 10 developers | $13,216 | $4,289 | **$8,927** |
| 50 developers | $66,080 | $21,447 | **$44,633** |

*Based on 15 AI tasks/developer/day at GPT-4o pricing. Excludes developer time savings.*

### Developer Time Savings

| Team Size | Hours Saved/Year | Value (@ $75/hr) |
|---|---|---|
| 1 developer | 480 hours | $36,000/year |
| 10 developers | 4,800 hours | $360,000/year |
| 50 developers | 24,000 hours | $1,800,000/year |

> 📊 **[See full benchmark details with step-by-step token breakdowns →](./examples/METRICS.md)**

---

## �� Architecture

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

Power Packs add domain-specific intelligence to Magneto AI.

### Built-in Packs

| Pack | Category | What It Does |
|---|---|---|
| **TypeScript** | Language | Import graph analysis, type safety checks, `any` detection |
| **Python** | Language | Type hints (PEP 484), security checks (eval/SQL injection/pickle), Django/FastAPI/Flask guidance |
| **Next.js** | Framework | Server/client boundaries, hydration safety, routing validation |
| **Java** | Language | Modern Java idioms (records/sealed/pattern matching/virtual threads), concurrency safety, security (RCE/SQLi/XXE) |
| **FastAPI** | Framework | Pydantic validation, async correctness, CORS/auth security, lifespan hygiene |
| **Spring Boot** | Framework | Spring Security review, JPA N+1 detection, transaction boundaries, actuator hardening |
| **AI Platform** | Project Type | Prompt injection detection, RAG pipeline validation, token limits |
| **AWS** | Cloud | IAM least-privilege, S3 public-exposure, SG wide-open ports, encryption at rest, Terraform/CDK practices |
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

Adapters integrate external tools into Magneto AI's memory system.

### Graphify Adapter

Imports dependency graph data from Graphify:

```bash
magneto init --adapter graphify
```

Reads from `.graphify-out/graph.json` and maps into Magneto AI memory.

**Memory modes:**

| Mode | Behavior |
|---|---|
| `internal-first` | Magneto AI's own analysis takes priority; Graphify supplements |
| `external-first` | Graphify data takes priority; Magneto AI enriches it |

### OpenClaw Adapter

Integrates Magneto AI as the **governance and reasoning layer for OpenClaw agents**. [OpenClaw](https://docs.openclaw.ai) is a self-hosted AI agent gateway that routes messages from Telegram, Slack, WhatsApp, Discord, and more to AI agents.

```bash
magneto init --adapter openclaw
```

This installs a **Magneto skill** into your OpenClaw project that teaches agents to use Magneto for all software engineering tasks:

```
.openclaw/
  skills/
    magneto.SKILL.md     ← teaches OpenClaw agents when/how to use Magneto
  magneto-adapter.json   ← adapter config (minimal JSON)
```

**How it works:**

```
User → Telegram/Slack/WhatsApp
          ↓
     OpenClaw Gateway
          ↓
     AI Agent (reads magneto.SKILL.md)
          ↓
     magneto analyze         ← understands the codebase
     magneto plan task.md    ← structured plan + security check
     magneto generate task.md ← scoped implementation prompt
          ↓
     Governed, secure AI response back to user
```

After running `magneto init --adapter openclaw`, restart your OpenClaw gateway:

```bash
openclaw gateway restart
```

OpenClaw agents will now automatically use Magneto for task planning, security checks, and context loading on every engineering request.

### Adapter Management Commands

Magneto provides a full CLI for managing adapters after initialization:

```bash
# List available and installed adapters
magneto adapter list

# Install an adapter
magneto adapter install claude
magneto adapter install manus --api-key=your_key_here
magneto adapter install antigravity

# Configure an adapter (especially for API-based ones)
magneto adapter config manus
magneto adapter config manus --set apiKey --value xxx
magneto adapter config manus --set sync.autoPushTasks --value true

# Validate all installed adapters
magneto adapter doctor

# Remove an adapter
magneto adapter remove claude --force
```

### Claude Code Adapter

Install the Claude Code adapter to use `/magneto` commands directly in Claude Code:

```bash
magneto adapter install claude
```

This creates `.claude/` with:
- `CLAUDE.md` — Project instructions
- `skills/magneto/SKILL.md` — `/magneto` slash command

### Google Antigravity Adapter

Install the Antigravity adapter for the Google Antigravity IDE:

```bash
magneto adapter install antigravity
```

This creates `.agents/` with Magneto skill files for `/magneto-*` commands.

### Manus AI Adapter

Install the Manus adapter for API-based integration:

```bash
magneto adapter install manus
magneto adapter config manus  # Set your API key
```

---

## 🤖 Copilot Integration

Magneto AI generates full Copilot integration:

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

## 🌐 Runners

Magneto selects a runner automatically via `detectAgentEnvironment()` — priority order: Cascade/Windsurf → Copilot → Antigravity → Gemini → OpenAI → Ollama (fallback).

| Runner | How to activate | Data egress |
|--------|----------------|-------------|
| `openai` | Set `OPENAI_API_KEY` | OpenAI API |
| `copilot` | Set `MAGNETO_COPILOT_CLOUD_TOKEN` | GitHub Copilot |
| `cascade` | Auto-detected in Windsurf | Local process |
| `gemini` | Set `GEMINI_API_KEY` | Google AI API |
| `ollama` | Set `OLLAMA_HOST` or `MAGNETO_USE_OLLAMA` | **None — fully local** |

### OpenAI Runner
```bash
magneto run task.json --runner openai --mode assist
```
Requires `OPENAI_API_KEY`. Builds structured system prompt, parses JSON findings/risks, saves results to `.magneto/cache/`.

### Ollama Runner
```bash
magneto run task.md --runner ollama
```
No API key. No data leaves your machine. Requires [Ollama](https://ollama.com) running locally. See [`docs/RUNNER-OLLAMA.md`](./docs/RUNNER-OLLAMA.md) for setup, hardware guidance, and team self-hosting.

---

## 📊 Why Magneto AI vs. Graphify?

| Feature | Graphify | Magneto AI |
|---|---|---|
| Dependency graphs | ✅ Core strength | ✅ Via adapter or native |
| Multi-agent orchestration | ❌ | ✅ Core feature |
| Security guardrails | ❌ | ✅ Built-in engine |
| Copilot integration | ❌ | ✅ Native agents + MCP |
| OpenAI API runner | ❌ | ✅ Built-in |
| Power pack system | ❌ | ✅ Extensible |
| Task planning | ❌ | ✅ Plan → Execute → Merge |
| Enterprise approvals | ❌ | ✅ Sentinel Lock system |

**Magneto AI doesn't replace Graphify — it can consume it.** Use the Graphify adapter to import dependency data into Magneto AI's reasoning pipeline.

---

##  Project Structure

```
magneto-ai/
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
    README.md                       # Examples overview + cost narrative
    METRICS.md                      # Full token & cost benchmarks
    tasks/                          # Standalone example tasks
    nextjs-frontend/                # Next.js dashboard example
      tasks/                        #   Auth, bundle, architecture tasks
    java-backend/                   # Spring Boot API example
      tasks/                        #   Payment, security, microservice tasks
  package.json
  tsconfig.json
  README.md
  LICENSE
```

---

## 🧪 CLI Reference

| Command | Description |
|---|---|
| `magneto init` | Initialize Magneto AI (auto-detects stack and prompts to install matching packs) |
| `magneto init --with <packs>` | Initialize with specific power packs |
| `magneto init --adapter <name>` | Initialize with an adapter |
| `magneto init --auto-install` | CI mode: auto-install all detected packs without prompting |
| `magneto init --no-suggest` | Skip auto-detection prompt |
| `magneto detect` | Print detected stack (languages, frameworks, clouds) and recommend packs — read-only |
| `magneto detect --json` | Detection output as JSON for tooling |
| `magneto refresh` | Refresh configuration and detect packs |
| `magneto doctor` | Validate setup and diagnose issues |
| `magneto plan <task>` | Generate execution plan (.md, .yaml, or .json) |
| `magneto plan <task> --dry-run` | Preview plan without saving |
| `magneto run <task>` | Execute a task |
| `magneto run <task> --runner openai` | Execute with specific runner |
| `magneto run <task> --runner ollama` | Execute locally via Ollama (no API key, no data egress) |
| `magneto run <task> --mode observe` | Execute in observe mode |
| `magneto run <task> --approve-each` | Execute with step-by-step approval workflow |
| `magneto merge <outputDir>` | Merge agent results |
| `magneto merge <outputDir> --format md` | Merge as Markdown report |
| `magneto generate <task>` | Generate scoped prompt for Windsurf/Copilot |
| `magneto generate <task> --role backend` | Generate prompt for a specific agent role |
| `magneto generate <task> --output prompt.md` | Save prompt to file |
| `magneto analyze` | Analyze codebase and build structured memory |
| `magneto analyze --include src lib` | Analyze specific directories only |
| `magneto analyze --depth 3` | Limit directory scan depth |

---

## 🛣 Roadmap

- [x] Interactive plan approval workflow
- [x] Ollama Runner (local, zero-egress)
- [x] Python, Java, FastAPI, Spring Boot, AWS Power Packs
- [x] Streaming runner output (Ollama NDJSON streaming)
- [ ] AI Security Audit & Vulnerability Detection (Project Glasswing) 🚨
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

## ☕ Support This Project

Magneto AI is free and open source. If it saves you time, consider supporting continued development:

<p align="center">
  <a href="https://buymeacoffee.com/rijuvashisht">
    <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50" />
  </a>
  &nbsp;&nbsp;
  <a href="https://github.com/sponsors/rijuvashisht">
    <img src="https://img.shields.io/badge/Sponsor%20on%20GitHub-%E2%9D%A4-pink?style=for-the-badge&logo=github" alt="GitHub Sponsors" height="50" />
  </a>
</p>

Your support helps fund:
- New integrations and power packs
- Better documentation and examples
- Long-term maintenance and security updates

---

<p align="center">
  <img src="docs/images/magneto-helmet.svg" alt="Magneto" width="40" /><br/>
  Built with ⚡ by the Magneto AI team.
</p>
