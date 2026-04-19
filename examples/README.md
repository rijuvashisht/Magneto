# Magneto AI — Example Projects

> **Real-world examples showing how full-stack engineers using Windsurf deliver faster, cheaper, and with higher standards.**

## Why These Examples Exist

AI-assisted development has a hidden cost problem:

```
The AI Cost Equation:
  Cost = Tokens × Price per Token
  Speed = 1 / (Context Size × Response Time)

  → Bigger context window = More tokens = Higher cost = Slower response
  → Magneto AI shrinks the context window while improving result quality
```

**Magneto AI solves this by being smart about *what* your AI sees.** Instead of dumping your entire project into the context window, Magneto classifies the task, assigns specialized agents, and scopes the context to only what's relevant.

## Example Projects

### 1. [Next.js Frontend](./nextjs-frontend/)

A dashboard application demonstrating:
- **Auth flow implementation** — 4 agents, scoped to auth files only → 70% token reduction
- **Bundle size optimization** — Performance-focused agents → faster than manual analysis
- **Component architecture review** — Cross-cutting analysis that catches pattern violations

### 2. [Java Backend](./java-backend/)

A Spring Boot microservice demonstrating:
- **Payment API implementation** — Scoped to payment layer → 80% token reduction
- **Security audit** — Multi-agent audit catches what single-pass AI misses
- **Microservice architecture review** — Domain boundary analysis with contradiction detection

### 3. [Standalone Tasks](./tasks/)

Individual task files for common scenarios:
- **Checkout mismatch bug** — Cross-layer bug investigation
- **AI RAG pipeline audit** — Specialized AI system review

## The Numbers

### Token Usage Comparison

| Scenario | Traditional AI | Magneto AI | Savings |
|---|---|---|---|
| Next.js auth feature | ~100K tokens | ~25K tokens | **75%** |
| Java payment API | ~90K tokens | ~20K tokens | **78%** |
| Java security audit | ~120K tokens | ~30K tokens | **75%** |
| Next.js bundle review | ~80K tokens | ~30K tokens | **63%** |
| Java architecture review | ~140K tokens | ~35K tokens | **75%** |

### Monthly Cost for a 10-Developer Team

```
Without Magneto AI:
  15 AI tasks/dev/day × 100K tokens avg × 10 devs × 22 days
  = 330M tokens/month
  = ~$825/month (GPT-4o input @ $2.50/1M)

With Magneto AI:
  15 AI tasks/dev/day × 28K tokens avg × 10 devs × 22 days
  = 92.4M tokens/month
  = ~$231/month (GPT-4o input @ $2.50/1M)

  Annual savings: ~$7,128 on input tokens alone
  + Output token savings: ~$3,000–5,000/year
  + Developer time savings: ~2 hours/dev/day × $75/hr = $330K/year
```

### Speed Improvement

| Task Category | Without Magneto AI | With Magneto AI | Speedup |
|---|---|---|---|
| Feature implementation | 4–8 hours | 1–2 hours | **3–5x** |
| Security audit | 1–2 days | 2–4 hours | **3–4x** |
| Architecture review | 2–3 days | 4–8 hours | **3–4x** |
| Bug fix + tests | 2–4 hours | 30–60 min | **3–4x** |
| Performance optimization | 4–6 hours | 1–2 hours | **3–4x** |

## How Magneto AI Reduces Context Window Size

### 1. Task Classification
```
Input:  "Add payment processing with Stripe"
Output: classification = "feature-implementation"
        roles = ["orchestrator", "backend", "tester", "requirements"]
        scope = only payment-related files
```
→ Instead of loading all 200 files, only 8 payment files are loaded.

### 2. Parallel Focused Agents
```
Without Magneto AI:
  1 agent × 100K token context = 100K tokens total

With Magneto AI:
  4 agents × 25K token context each = 100K tokens total
  BUT each agent is 4x more focused → better results at same cost
  AND agents run in parallel → 4x faster wall-clock time
```

### 3. Persistent Memory
```
Session 1: AI learns your auth pattern → stored in .magneto/memory/
Session 2: AI already knows your auth pattern → no re-scanning needed
            Saves ~20K tokens per session on repeated context
```

### 4. Contradiction Detection
```
Without Magneto AI:
  Bug ships to production → costs $500–$5,000 to fix

With Magneto AI:
  Tester says: "test passes"
  Backend says: "endpoint missing @PreAuthorize"
  → Contradiction detected: stale test
  → Fixed before merge → $0 production cost
```

## Getting Started

```bash
# Install Magneto AI
npm install -g magneto-ai

# Try the Next.js example
cd examples/nextjs-frontend
magneto plan tasks/implement-auth-flow.json

# Try the Java example
cd examples/java-backend
magneto plan tasks/implement-payment-api.json
```

## How It Works in Windsurf

1. **Drop a task file** in `.magneto/tasks/`
2. **Run `magneto plan`** — Magneto classifies, scopes, and assigns agents
3. **Run `magneto run`** — Agents execute in parallel with focused contexts
4. **Run `magneto merge`** — Results combined, contradictions flagged
5. **Review the report** — Confident findings, identified risks, resolved contradictions

Your AI assistant in Windsurf gets better context, gives better answers, uses fewer tokens, and catches more issues. That's the Magneto AI advantage.
