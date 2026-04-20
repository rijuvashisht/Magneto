# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- N/A

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A

---

## [0.12.0] - 2024-04-20

### Added
- **Telepathy Auto-Handoff Pipeline** — Tasks now auto-handoff to detected agents (Cascade, Copilot, Antigravity, Gemini)
- **New Runners** — `cascade`, `antigravity`, `gemini` runners with auto-environment detection
- **Task Completion Tracking** — `magneto telepathy` skips already-completed tasks (stored in `.magneto/cache/completed-tasks.json`)
- **Template Auto-Skip** — TASK_TEMPLATE and similar files are automatically ignored during discovery
- **New CLI Flags** — `--force` to re-run completed tasks, `--reset` to clear completion history
- **Landing Page Wiki** — Full documentation site with token savings, architecture, getting started guides
- **Documentation Badge** — README now links to https://magnetoai.vercel.app/
- `magneto task` command family for task management (create, list, validate, delete, show)
- Task templates for 7 types: feature, bug, security, performance, test, refactor, docs
- `magneto adapter` command family for adapter management
- Support for Claude Code, Google Antigravity, and Manus AI adapters
- Interactive configuration prompts for API-based adapters

### Changed
- Default runner changed from `openai` to `cascade` in config

---

## [0.9.0] - 2024-04-20

### Added
- Telepathy auto-handoff to Windsurf/Cascade IDE
- Task completion tracking and persistence
- Template file filtering

---

## [0.8.0] - 2024-04-19

### Added
- Task management system with templates and validation
- Adapter management commands (list, install, remove, config, doctor)
- Claude Code integration via `.claude/` folder
- Google Antigravity integration via `.agents/` folder
- Manus AI API integration with config management

---

## [0.7.0] - 2024-04-19

### Added
- Telepathy module for automatic task discovery and execution
- Telepathy levels 0-3 (manual to full-auto)
- Auto-classification of tasks from requirements and external sources

---

## [0.6.0] - 2024-04-19

### Added
- Graph querying with `magneto query` and `magneto path`
- Knowledge graph with community detection
- Multi-agent orchestration improvements

---

## [0.5.0] - 2024-04-19

### Added
- Security engine with guardrails and approval workflows
- Protected paths and blocked actions configuration
- Telepathy level enforcement

---

## Breaking Changes Guide

When upgrading between major versions, check here for migration instructions:

### v1.0.0 (Upcoming)
**Planned breaking changes for v1.0.0:**
- Configuration file format may change (`.magneto/config.json` → `.magneto/magneto.config.json`)
- Task file schema v2 will require `version` field in frontmatter
- Minimum Node.js version will be 18.0.0

### Migration Guide Template

When a breaking change is introduced:

```markdown
### [X.Y.Z] - YYYY-MM-DD
**BREAKING CHANGE**: Description of what changed

**Migration**:
1. Step 1 to migrate
2. Step 2 to migrate
3. Step 3 to migrate

**Before**:
```yaml
# Old format
name: my-task
type: feature
```

**After**:
```yaml
# New format  
name: my-task
type: feature
version: 2  # Required in new format
```
```

---

## Release Checklist

Before releasing a new version:

- [ ] Update version in `package.json`
- [ ] Update `CHANGELOG.md` with all changes
- [ ] Document any breaking changes with migration guide
- [ ] Update `README.md` if needed
- [ ] Run full test suite
- [ ] Test against example projects
- [ ] Verify all CLI commands work
- [ ] Check TypeScript compilation
- [ ] Review security implications

---

## Tracking Breaking Changes

Breaking changes are tracked in the following locations:

1. **This CHANGELOG.md** - High-level summary
2. **BREAKING_CHANGES.md** - Detailed migration guides
3. **GitHub Releases** - Auto-generated from tags with notes
4. **Release notes** - Published to npm

### Semantic Versioning

We follow [SemVer](https://semver.org/):

- **MAJOR** (X.0.0) - Breaking changes that require user action
- **MINOR** (0.X.0) - New features, backwards compatible
- **PATCH** (0.0.X) - Bug fixes, backwards compatible

### What Constitutes a Breaking Change?

- CLI command signature changes (removed/renamed commands or options)
- Configuration file format changes
- Task file schema changes
- API changes in programmatic usage
- Node.js version requirement increases
- Default behavior changes
- Removed or renamed environment variables
