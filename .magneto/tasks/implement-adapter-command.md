---
name: implement-adapter-command
description: Implement the magneto adapter CLI command family for managing adapters (list, install, remove, config, doctor)
type: feature-implementation
roles:
  - orchestrator
  - backend
priority: high
---

# Implement `magneto adapter` Command Family

## Objective

Create a comprehensive adapter management CLI that allows users to:
- `magneto adapter list` — Show available and installed adapters
- `magneto adapter install <name>` — Install an adapter (Claude, Antigravity, Manus, OpenClaw, Graphify)
- `magneto adapter remove <name>` — Remove an installed adapter
- `magneto adapter config <name>` — Configure adapter settings (especially API keys for Manus)
- `magneto adapter doctor` — Validate all adapters are correctly wired

## Context

Currently, adapters can only be installed via `magneto init --adapter <name>`. Users have no way to:
1. See which adapters are available
2. Install adapters after project initialization
3. Configure API keys (critical for Manus adapter)
4. Remove adapters they no longer need
5. Validate adapter setup

## Requirements

### Commands

1. **adapter list**
   - Scan `src/templates/power-packs/adapters/` for available adapters
   - Check `.magneto/adapters/` and project root (`.claude/`, `.agents/`, `.openclaw/`) for installed adapters
   - Show status: available, installed, partially-configured
   - Display adapter type (file-based vs API-based)

2. **adapter install <name>**
   - Accept adapter name: claude, antigravity, manus, openclaw, graphify
   - Copy adapter template files to appropriate locations
   - Run adapter-specific wiring (wireClaudeAdapter, wireAntigravityAdapter, etc.)
   - For API-based adapters (Manus), prompt for API key
   - Update `magneto.config.json` adapters array
   - Show success message with next steps

3. **adapter remove <name>**
   - Remove adapter files from project
   - Clean up adapter-specific folders (`.claude/`, `.agents/`, etc.)
   - Update `magneto.config.json`
   - Confirm before destructive operations

4. **adapter config <name>**
   - Interactive configuration for API-based adapters
   - For Manus: prompt for MANUS_API_KEY, projectId, sync settings
   - Read/write to `.magneto/adapters/<name>/config.json`
   - Validate config after save

5. **adapter doctor**
   - Check all installed adapters are correctly wired
   - Verify required files exist
   - For API adapters: test connectivity
   - Report issues and suggest fixes

### Files to Create/Modify

**New command file:**
- `src/commands/adapter.ts` — Main adapter command implementation

**Modify:**
- `src/cli.ts` — Add `adapter` command with subcommands
- `src/core/adapter-loader.ts` — Ensure install/remove functions are exported

**Templates:**
- `src/templates/power-packs/adapters/manus/config.template.json` — Already exists
- `src/templates/power-packs/adapters/*/adapter.json` — Already exist

## Acceptance Criteria

- [ ] `magneto adapter list` shows all 5 adapters with correct status
- [ ] `magneto adapter install claude` creates `.claude/` folder with files
- [ ] `magneto adapter install manus` prompts for API key and creates config
- [ ] `magneto adapter config manus` allows editing API key
- [ ] `magneto adapter remove claude` removes `.claude/` folder and updates config
- [ ] `magneto adapter doctor` validates all installed adapters
- [ ] All commands have proper help text and examples
- [ ] Build passes (`npm run build`)
- [ ] Documentation updated (README.md with new commands)

## Technical Notes

- Reuse existing `loadAdapter()` and adapter wiring functions from `adapter-loader.ts`
- For `adapter list`, read available adapters from `src/templates/power-packs/adapters/`
- For installed detection, check `magneto.config.json` adapters array and filesystem
- Use existing `writeJson()`, `readJson()`, `ensureDir()`, `fileExists()` utilities
- Follow existing command patterns in `src/commands/`
- Add TypeScript interfaces for adapter config

## Estimated Effort

- Command implementation: 2-3 hours
- Testing and refinement: 1 hour
- Documentation: 30 minutes
- **Total: ~4 hours**
