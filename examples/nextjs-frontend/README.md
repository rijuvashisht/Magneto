# Magneto AI — Next.js Frontend Example

> **How a full-stack engineer using Windsurf delivers features 3–5x faster while cutting AI costs by 60%+**

## The Problem

You're a full-stack engineer building a Next.js dashboard. Every time you ask your AI assistant to help with a feature, it:

1. **Re-scans your entire codebase** — burning thousands of tokens on files that aren't relevant
2. **Loses context between sessions** — you re-explain your auth flow, state management, and API contracts every time
3. **Gives inconsistent advice** — one session suggests Redux, the next suggests Zustand, with no memory of prior decisions
4. **Misses cross-cutting concerns** — a "simple" component change breaks 3 tests and violates 2 requirements

**Result:** Your context window fills up fast, costs pile up, and delivery slows down.

## The Magneto AI Solution

Magneto AI sits inside your repo as a `.magneto/` directory and brings **structure, memory, and multi-agent reasoning** to your AI workflow in Windsurf.

### Before Magneto AI (Typical AI-Assisted Development)

| Metric | Without Magneto AI |
|---|---|
| Context window usage per task | ~80,000–120,000 tokens |
| Files loaded into context | All files (shotgun approach) |
| Agent passes per feature | 1 large, unfocused pass |
| Cross-cutting issue detection | Manual / missed |
| Session-to-session memory | None |
| Average feature delivery | 4–8 hours |

### After Magneto AI

| Metric | With Magneto AI |
|---|---|
| Context window usage per task | ~15,000–35,000 tokens |
| Files loaded into context | Only scoped, relevant files |
| Agent passes per feature | 2–4 parallel, role-focused passes |
| Cross-cutting issue detection | Automatic contradiction detection |
| Session-to-session memory | Persistent `.magneto/memory/` |
| Average feature delivery | 1–2 hours |

### How It Saves Money

```
Traditional approach (per feature):
  4 AI calls × 100K tokens avg = 400K tokens
  At $2.50/1M input tokens (GPT-4o) = ~$1.00/feature

Magneto AI approach (per feature):
  4 parallel agents × 25K tokens avg = 100K tokens
  At $2.50/1M input tokens (GPT-4o) = ~$0.25/feature

  → 75% cost reduction per feature
  → At 20 features/sprint: $15/sprint saved per developer
  → At 10 developers: $150/sprint → $3,900/year
```

## Project Setup

```bash
# Initialize Magneto AI in your Next.js project
cd your-nextjs-app
npx magneto-ai init --with typescript nextjs react

# Validate setup
npx magneto doctor
```

## Example Tasks

This example includes real-world tasks that a full-stack engineer would encounter:

### 1. Implement Auth Flow (`tasks/implement-auth-flow.json`)

A feature implementation task where Magneto AI:
- **Orchestrator** scopes the work to auth-related files only (saving ~70% context)
- **Backend agent** reviews the NextAuth.js integration and API routes
- **Tester agent** generates auth edge-case tests (expired tokens, role-based access)
- **Requirements agent** validates against the auth spec

### 2. Optimize Bundle Size (`tasks/optimize-bundle-size.json`)

A performance review where Magneto AI:
- **Orchestrator** identifies large dependencies and lazy-load candidates
- **Backend agent** analyzes dynamic imports and tree-shaking opportunities
- **Tester agent** ensures optimizations don't break existing functionality

### 3. Review Component Architecture (`tasks/review-component-architecture.json`)

An architecture review where Magneto AI:
- **Orchestrator** maps component hierarchy and data flow
- **Backend agent** evaluates state management patterns
- **Requirements agent** checks component contracts against design specs

## How It Works in Windsurf

1. **Create a task** — Drop a JSON task file in `.magneto/tasks/`
2. **Plan** — `magneto plan tasks/implement-auth-flow.json`
   - Magneto classifies the task, assigns roles, scopes files
   - Only auth-related files are loaded → small context window
3. **Run** — `magneto run tasks/implement-auth-flow.json --runner openai`
   - 4 agents run in parallel, each with a focused context
   - Total tokens used: ~25K instead of ~100K
4. **Merge** — `magneto merge .magneto/cache --format md`
   - Contradictions detected (e.g., test expects old behavior vs new requirement)
   - Single merged report with confidence scores

## Configuration

See `magneto.config.json` for the project-specific configuration including:
- Security guardrails (protected `.env`, deployment configs)
- Power packs (TypeScript, Next.js, React)
- Memory mode (internal-first)
- Role assignments

## Key Insight

> **Magneto AI doesn't replace your AI assistant — it makes it smarter.**
> By structuring *what* context the AI sees and *how* multiple agents reason about your code,
> you get better results with fewer tokens. That means faster features, lower costs,
> and consistent standards across your codebase.
