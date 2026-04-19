# Cache, Adapters, and Roles Explained

## 1. CACHE — Execution State & Persistence

**Location:** `.magneto/cache/`

Stores execution artifacts and agent outputs:

```
.magneto/cache/
├── prompt-{role}-{task}.md       # Generated prompts per role
├── merge-results-{task}.md      # Consolidated outputs
└── execution-log-{date}.json    # Audit trail
```

**Example workflow:**
```bash
magneto plan tasks/add-auth.md
# Creates: prompt-orchestrator-auth.md, prompt-backend-auth.md

magneto run tasks/add-auth.md  
# Creates: results in cache/

magneto merge .magneto/cache --output report.md
# Consolidates all outputs
```

**Benefits:** Resume capability, audit trail, token tracking, debugging

---

## 2. ADAPTERS — External System Integration

**Location:** `.magneto/adapters/`

Bridges Magneto to external tools:

### OpenClaw Adapter
```bash
magneto adapter install openclaw
# Writes: .openclaw/skills/magneto.SKILL.md
# Result: OpenClaw agents can call "magneto plan"
```

### Graphify Adapter  
```json
{
  "name": "graphify",
  "inputPath": ".graphify-out/graph.json",
  "outputMapping": {
    "nodes": "memory.graph.nodes",
    "edges": "memory.graph.edges"
  }
}
```

**vs Power Packs:**
- **Power Packs:** Define capabilities for technologies (Python, FastAPI)
- **Adapters:** Bridge to external systems (OpenClaw, Jira)

---

## 3. ROLES — Agent Specialization

**Location:** `.magneto/roles/`

Defines agent identities:

```
.magneto/roles/
├── orchestrator.pack.md    # Task coordinator
├── backend.pack.md         # Backend specialist  
├── tester.pack.md          # Testing specialist
└── custom-role.pack.md     # Your custom roles
```

### Default Orchestrator Role
```markdown
## Identity
You are the **orchestrator** — central coordinator

## Responsibilities  
- Decompose tasks into subtasks
- Assign work to specialist agents
- Merge and validate results

## Tools
- query_graph — Find relevant files
- plan_task — Generate execution plans
- merge_results — Combine outputs
- security_check — Validate constraints
```

### Task Type → Role Mapping

| Task Type | Roles | Cache Outputs |
|-----------|-------|---------------|
| Feature | orchestrator, backend, tester, requirements | 4 prompts + merge |
| Bug Fix | orchestrator, backend, tester | 3 prompts + merge |
| Security | orchestrator, backend, security | 3 prompts + eval |
| E2E Test | orchestrator, tester, requirements | 3 prompts + merge |

### Custom Role: DevOps
```markdown
# .magneto/roles/devops.pack.md
## Identity
DevOps specialist — infrastructure, CI/CD, deployment

## Focus Areas
- Terraform/CloudFormation
- Kubernetes/Helm
- CI/CD pipelines
- Docker best practices

## Usage:
magneto plan deploy.md --roles orchestrator,devops
```

---

## How They Work Together

```bash
# 1. Task defines roles
tasks/add-feature.md:
  roles: [orchestrator, backend, tester]

# 2. Plan generates cache using roles
magneto plan tasks/add-feature.md
# → query_graph finds relevant files
# → Generates: prompt-orchestrator.md, prompt-backend.md, prompt-tester.md

# 3. Run populates cache
magneto run tasks/add-feature.md
# → Each role executes, writes to cache

# 4. Merge consolidates
magneto merge .magneto/cache
# → Final report with all outputs
```

---

## Summary

| Component | Location | Purpose |
|-----------|----------|---------|
| **Cache** | `.magneto/cache/` | Store execution artifacts |
| **Adapters** | `.magneto/adapters/` | External system integration |
| **Roles** | `.magneto/roles/` | Agent specialization |

**Quick commands:**
```bash
# Cache
magneto plan task.md --output .magneto/cache/prompt.md
magneto merge .magneto/cache --output report.md

# Adapters  
magneto adapter install openclaw

# Roles
magneto plan task.md --roles orchestrator,backend,tester
```
