# Claude Code Adapter

Integrate Magneto AI with [Claude Code](https://code.claude.com/) — use `/magneto` commands directly in Claude Code.

## Overview

The Claude adapter creates a `.claude/` folder in your project with:
- `CLAUDE.md` — Project instructions for Claude
- `skills/magneto/SKILL.md` — Magneto skill with slash commands
- `magneto-adapter.json` — Adapter configuration

## Installation

```bash
# Install the Claude adapter
magneto adapter install claude

# Or during project init
magneto init --with claude
```

This creates:
```
.claude/
├── CLAUDE.md                    # Project instructions
├── skills/
│   └── magneto/
│       └── SKILL.md            # Magneto skill
└── magneto-adapter.json        # Adapter config
```

## Usage in Claude Code

Once installed, use Magneto through Claude's slash commands:

### `/magneto analyze`
Analyze the codebase and build knowledge graph:
```
/magneto analyze
```
Claude will run `magneto analyze` and report results.

### `/magneto query <text>`
Query the knowledge graph for relevant files:
```
/magneto query "authentication flow"
/magneto query "UserService"
/magneto query "payment processing"
```
Claude receives the graph results and can discuss them.

### `/magneto plan <task>`
Generate execution plan for a task:
```
/magneto plan tasks/add-oauth.md
```
Claude generates role-scoped prompts you can use.

### `/magneto telepathy`
Auto-discover and execute tasks:
```
/magneto telepathy              # Preview mode
/magneto telepathy --auto       # Auto-execute
```

## How It Works

Claude Code automatically discovers files in `.claude/`:

1. **CLAUDE.md** — Loaded as context for all conversations
2. **skills/magneto/SKILL.md** — Recognized as `/magneto` slash command
3. **Live reload** — Changes are detected automatically

When you type `/magneto query`, Claude:
1. Executes `magneto query` with your arguments
2. Receives the structured output
3. Can discuss, analyze, or act on results

## Claude vs .github/copilot-instructions.md

| Feature | Claude Code | GitHub Copilot |
|---------|-------------|----------------|
| Config folder | `.claude/` | `.github/` |
| Instructions | `CLAUDE.md` | `copilot-instructions.md` |
| Skills | `skills/*/SKILL.md` | N/A |
| Slash commands | `/magneto` | N/A |
| Subagents | `agents/*.md` | N/A |
| Auto-discovery | Yes | Via Copilot settings |

## Comparison: Magneto with Claude vs Copilot

### With Claude Code
```bash
# In Claude Code terminal
$ /magneto query "auth flow"
→ Claude shows: Relevant files, functions, relationships
→ Can discuss: "How does the auth middleware work?"
→ Can plan: "Let's implement OAuth"
```

### With GitHub Copilot
```bash
# In VS Code with Copilot
# Copilot reads .github/copilot-instructions.md
# Uses Magneto context automatically
# No explicit commands needed
```

### Both Together
```
VS Code + Copilot: Day-to-day coding with Magneto context
Claude Code: Complex analysis, planning, multi-file changes
```

## Skill Configuration

The Magneto skill supports these frontmatter options:

```yaml
---
name: magneto
description: Use Magneto AI for codebase analysis
disable-model-invocation: false
user-invocable: true
allowed-tools: Read Write Bash Grep
---
```

## Customization

### Add Custom Commands

Create `.claude/commands/my-command.md`:
```markdown
---
name: my-analysis
description: Run custom Magneto analysis
---

Run magneto query for "$ARGUMENTS" and explain the results.
```

Use: `/my-analysis authentication`

### Project-Specific Rules

Add to `.claude/CLAUDE.md`:
```markdown
## Project Conventions

When using Magneto:
1. Always query graph before large changes
2. Use roles: orchestrator, backend, tester
3. Check .magneto/security/policies.yaml
```

## Troubleshooting

### Skill not appearing
```bash
# Check skill loaded
/claude /skills

# Verify file exists
ls .claude/skills/magneto/SKILL.md
```

### Commands not working
```bash
# Verify magneto is installed
which magneto
magneto --version

# Check adapter config
cat .claude/magneto-adapter.json
```

### Update skill
```bash
# Reinstall adapter
magneto adapter install claude --force
```

## Next Steps

- [Claude Code Documentation](https://code.claude.com/docs)
- [Skills Reference](https://code.claude.com/docs/en/skills)
- [.claude Directory Reference](https://code.claude.com/docs/en/claude-directory)
- [Magneto Cache/Adapters/Roles Guide](./CACHE-ADAPTERS-ROLES.md)
