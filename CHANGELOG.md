# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Nothing yet

---

## [0.28.0] - 2025-04-25

### Added
- **Java Language Power Pack** (`magneto init --with java`) — 14 checks: catching `Throwable`/`Error`, swallowed `InterruptedException`, `Thread.sleep` in loops, `String +=` in loops, `System.exit`, `e.printStackTrace`, `Runtime.exec` shell parsing (command injection), raw generic types, hardcoded secrets, unsafe `ObjectInputStream` (RCE), SQL string concat, missing `@Override`, public mutable static fields, ad-hoc `new Thread()`. Rules cover modern Java 17/21 (records, sealed types, pattern matching, virtual threads), null handling, generics (PECS), exceptions, concurrency, security, collections/streams, performance, build, testing.
- **AWS Cloud Power Pack** (`magneto init --with aws`) — 16 infrastructure security checks: IAM wildcard `Action+Resource`, `AdministratorAccess` attached, S3 public ACLs, missing Block Public Access, SG `0.0.0.0/0` on SSH/RDP/DB ports, unencrypted RDS/EBS, hardcoded `AKIA` keys and secret access keys, Lambda without timeout/log retention, local Terraform state, wide-open egress. Comprehensive `rules.md` covers IAM, S3, VPC/SG, encryption at rest/in transit, Secrets Manager, Lambda, RDS, cost governance, CloudTrail/GuardDuty, Terraform & CDK practices, incident response.
- **Ollama Runner** (`magneto run task.md --runner ollama`) — first fully-local, zero-egress runner. No API key, no cloud calls, no data leaving the machine. Reads `OLLAMA_HOST` (default `http://localhost:11434`) and `OLLAMA_MODEL` (default `llama3.1`). Pre-flight health check verifies server reachability and model availability with actionable guidance. Blocking and NDJSON streaming support. Tolerant JSON parser strips markdown fences. Token tracking via `prompt_eval_count`/`eval_count`. Every result tagged `metadata.dataEgress = 'none'`. `detectAgentEnvironment()` falls back to Ollama when `OLLAMA_HOST` or `MAGNETO_USE_OLLAMA` is set. See `docs/RUNNER-OLLAMA.md`.
- **FastAPI Framework Power Pack** (`magneto init --with fastapi`) — 10 checks: CORS wildcard+credentials, hardcoded `SECRET_KEY`, sync I/O in async endpoints, `debug=True`, untyped request bodies, missing auth dependency on mutating routes, `TrustedHostMiddleware` wildcard, bare exception handler, deprecated `@app.on_event`. Rules cover Pydantic validation, DI, async correctness, routing, security, background tasks, lifespan, testing, performance.
- **Spring Boot Framework Power Pack** (`magneto init --with spring-boot`) — 12 checks: `@Autowired` field injection, `permitAll()` on broad patterns, `csrf().disable()`, actuator wildcard exposure, `show-sql=true`, `open-in-view=true`, `ddl-auto=create/create-drop`, hardcoded datasource password, `@Transactional` on private methods, BCrypt strength < 10, `@CrossOrigin(origins="*")`, broad `catch(Exception)`. Rules cover DI, configuration, JPA/N+1, transactions, Spring Security 6+, actuator hardening, DTOs, error handling, async/scheduling, testing, performance, build.
- **Python Language Power Pack** (`magneto init --with python`) — 14 checks: `eval`/`exec`, SQL injection via f-string, `shell=True`, `os.system`, `pickle.loads`, `yaml.load` without `SafeLoader`, bare `except:`, mutable default args, hardcoded secrets, `DEBUG=True`, missing type hints, `print()` debugging, `requests` without timeout, `assert` for security. Auto-detected from `requirements.txt`, `pyproject.toml`, `setup.py`, `Pipfile`, `poetry.lock`.
- **Auto-Detect & Suggest Power Packs** — `magneto init` auto-detects project stack and prompts to install matching packs. New `magneto detect` command (read-only). New `--auto-install` flag for CI. New `--no-suggest` flag to opt out. Detection covers 20+ languages/frameworks/clouds with confidence scoring. New `detectPacksDetailed()` programmatic API. See `docs/AUTO-DETECT.md`.
- **Interactive Plan Approval Workflow** — Step-by-step execution approval via `--approve-each`. Approve/reject/skip per step with diff preview, modify option, and audit log at `.magneto/audit/approvals.json`. Session files auto-pruned to last 10.

### Changed
- `--with` pack list expanded: `typescript, python, java, nextjs, fastapi, spring-boot, aws, ai-platform, azure`
- `detectAgentEnvironment()` now falls back to `ollama` when `OLLAMA_HOST`/`MAGNETO_USE_OLLAMA` set and no cloud API key present
- Session files automatically cleaned up when starting new interactive sessions

### Fixed
- Modify option in interactive approval now properly prompts when step has no command

### Security
- Replaced boilerplate `SECURITY.md` with accurate version support table, private reporting guidance, data-egress matrix per runner, secrets handling policy, and known considerations
- Power packs actively detect hardcoded secrets and credentials across Python, Java, and AWS IaC files

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
