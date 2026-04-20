# Project Decisions & Guidelines

## Documentation Synchronization Policy

**Created:** April 20, 2024  
**Applies to:** All new features, README updates, and releases

### Rule: Wiki Documentation Must Stay Synchronized

Whenever new features are added or the README is updated, the wiki/documentation site must also be updated **before** the npm build is pushed and committed.

### Workflow

```
New Feature or README Update
          │
          ▼
    ┌─────────────┐
    │  Update Wiki │ ← Required step
    │  (landing/  │
    │   src/docs) │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   Build &   │
    │    Test     │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  npm version│
    │    patch    │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  npm publish│
    │  git push   │
    └─────────────┘
```

### What Must Be Updated

When adding new features:
- [ ] Add/update relevant documentation pages in `examples/nextjs-frontend/landing/src/app/docs/`
- [ ] Update navigation in `DocsSidebar.tsx` if new section added
- [ ] Add search index entries in `SearchModal.tsx`
- [ ] Create Mermaid diagrams for architecture changes
- [ ] Update Token Savings examples with real metrics

When updating README.md:
- [ ] Mirror changes in `docs/getting-started/page.mdx`
- [ ] Update feature lists in `landing/src/components/landing/Features.tsx`
- [ ] Refresh screenshots/demos if applicable

### Pre-Release Checklist

Before `npm version` and `npm publish`:

```bash
# 1. Verify wiki is up to date
cd examples/nextjs-frontend/landing
npm run build  # Must pass

# 2. Verify all links work
# 3. Verify search index includes new pages
# 4. Verify sidebar navigation complete
```

### Rationale

The wiki (at `examples/nextjs-frontend/landing`) is the primary documentation site for Magneto AI. It must remain in sync with the actual codebase to avoid:
- Conflicting information between README and docs
- Missing documentation for new features
- Broken user experience for early adopters

### Related Files

- Wiki source: `/examples/nextjs-frontend/landing/src/app/docs/`
- Landing page: `/examples/nextjs-frontend/landing/src/components/landing/`
- Sidebar nav: `/examples/nextjs-frontend/landing/src/components/docs/DocsSidebar.tsx`
- Search index: `/examples/nextjs-frontend/landing/src/components/docs/SearchModal.tsx`

---

## Telepathy Auto-Handoff Pipeline

**Created:** April 20, 2024  
**Applies to:** All task execution flows

### Rule: Tasks Must Auto-Handoff to Active Agent

When `magneto telepathy` or `magneto generate` runs, the system must:

1. **Discover** tasks from `.magneto/tasks/`, requirements, Jira, GitHub
2. **Classify** task type, roles, complexity, telepathy level
3. **Generate** a scoped prompt with context, memory, and constraints
4. **Detect** the active agent (Cascade, Copilot, Antigravity, Gemini)
5. **Hand off** the prompt to the agent automatically

### Agent Detection Order

```
1. Cascade — .windsurf/ folder or WINDSURF/CASCADE env
2. Copilot — .github/agents/ or GITHUB_COPILOT env  
3. Antigravity — ANTIGRAVITY env
4. Gemini — GEMINI_API_KEY or GOOGLE_AI_KEY env
5. OpenAI — OPENAI_API_KEY env (fallback)
```

### Handoff Mechanism Per Agent

| Agent | Handoff Method |
|-------|----------------|
| **Cascade** | Write to `.windsurf/workflows/` + `.magneto/cache/` |
| **Copilot** | Write to `.github/copilot-instructions.md` |
| **Antigravity** | Write to `.magneto/cache/prompt-*.md` |
| **Gemini** | Write to `.magneto/cache/prompt-*.md` |
| **OpenAI** | Direct API call via runner |

### No Manual Copy-Paste

The old two-step flow (`generate` → manually paste into agent) is deprecated.
The new flow is: `magneto telepathy` → auto-discovers → auto-hands-off.

### Related Files

- Runner types: `src/runners/types.ts`
- Cascade runner: `src/runners/cascade.ts`
- Antigravity runner: `src/runners/antigravity.ts`
- Gemini runner: `src/runners/gemini.ts`
- Telepathy core: `src/core/telepathy.ts`
- Telepathy command: `src/commands/telepathy.ts`
