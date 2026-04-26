# v0.29.0 — Glasswing, Sandbox, Memory Lock, Spec-Driven Development

A flagship release covering four new feature surfaces. All shipped behind new subcommands; existing flows are untouched.

## What's in

### 🚨 Project Glasswing — AI Security Audit (`magneto security`)
- `audit` (SAST + secrets), `scan` (OSV.dev dep CVEs), `fix` (auto-remediation for code + deps), `compliance` (SOC2/HIPAA/GDPR/PCI-DSS), `check` (pre-execution gate)
- Grouped CVE output + semver-aware fix-version selection
- Auto-fixer updates `package.json` files repo-wide preserving `^`/`~` prefixes

### 📐 OS-level Sandbox (`magneto sandbox`)
- Detects Docker, Podman, macOS `sandbox-exec`, Linux `bwrap`, **Windows Sandbox** (`.wsb`), **WSL2** (with DNS-leak hardening)
- Profiles: `strict` / `standard` / `dev` / `off`
- Auto-fallback when Docker image isn't built
- Subcommands: `status | init | build | run | shell | doctor`

### 🔐 Zero-Trust Memory Lock (`magneto memory lock`)
- HMAC-SHA256 manifest with machine-bound key (`~/.magneto-key + hostname + uid`)
- Runtime active-task gating, owner / `--require-root` policies, offline-only mutation
- `chmod 0400` while locked
- Subcommands: `lock | unlock | verify | status`

### 🧱 Spec-Driven Development (`magneto sdd`)
- Pluggable: **OpenSpec** (default, brownfield), **Spec Kit** (greenfield), **BMAD-METHOD** (regulated/SOC2)
- Auto-detect existing scaffolding; heuristic recommender (brownfield ⇒ OpenSpec)
- WHY → WHAT → HOW constitution template (LLMs ignore terse "don't do X" rules — see EPAM case study)
- Static drift reconciler: `spec-only`, `code-undocumented`, `mismatch` (no LLM call, exits 1 in CI on drift)
- Subcommands: `init | new | status | sync` and `--sdd <fw>` on `magneto init`

### 🛡 Skill / MCP supply chain
- `snyk-agent-scan` documented for ToxicSkills detection
- Bundled skill files at `src/templates/power-packs/adapters/{claude,antigravity}/skills/magneto/SKILL.md` are scannable

### 📚 Docs & landing
- New `docs/AI-ASSISTANTS.md` — per-tool walkthroughs for **Claude Code, GitHub Copilot (CLI/IDE/Cloud), Cursor, Windsurf/Cascade, Antigravity, Gemini CLI, OpenClaw, Manus, Aider/Trae/Hermes, Kiro, OpenCode, OpenAI/Codex, Ollama**
- Includes "most-secure setup" recipe (memory lock + strict sandbox + Ollama)
- Landing: live npm-downloads badge in Hero (~7.4K/month at time of writing); 4 new feature cards (12 total); SDD/Sandbox/Memory-Lock sections in Getting Started
- README, ROADMAP, SECURITY all refreshed; Glasswing moved from "on roadmap" to "shipped"

### 🐛 Dependabot fixes (was 7 high / 8 mod / 6 low)
- Removed unused self-referential `magneto-ai@^0.1.4` from root (was pulling vulnerable `uuid@9` transitively)
- Added npm `overrides` in landing for `postcss ^8.5.10` and `uuid ^14.0.0` (no breaking parent upgrades)
- `npm audit`: **0 vulnerabilities** in all three tracked lockfiles (root, landing, vscode-extension)

## Verification

| Check | Result |
|---|---|
| `npm run build` (root) | ✅ tsc clean |
| `jest` | ✅ **177/177** pass (was 130 in 0.28.0) |
| `next build` (landing) | ✅ 13/13 static pages generated |
| `npm audit` (root) | ✅ 0 vulnerabilities (was 2 moderate) |
| `npm audit` (landing) | ✅ 0 vulnerabilities (was 4 moderate) |
| `npm audit` (vscode-extension) | ✅ 0 vulnerabilities |
| `magneto security scan` | ✅ "No critical/high dependency vulnerabilities" |

## Backward compatibility

All four feature surfaces are additive:
- New `magneto security`, `magneto sandbox`, `magneto memory`, `magneto sdd` command trees
- `magneto init` adds an optional SDD prompt; pass `--no-sdd` to skip
- No breaking changes to `init`, `plan`, `run`, `merge`, `analyze`, `query`, `path`, `task`, `adapter`, `telepathy`

## Files changed (high level)

- `src/core/{security-fixer,vulnerability-scanner,dependency-scanner,dependency-fixer,compliance-engine,sandbox,sandbox-profiles,memory-lock}.ts`
- `src/core/sdd/{types,framework,constitution,openspec-adapter,speckit-adapter,bmad-adapter,detector,reconciler}.ts`
- `src/commands/{security,sandbox,memory-lock,sdd,init}.ts`
- `src/cli.ts` — wired all new commands
- `tests/core/*.test.ts` — 47 new tests
- `docs/AI-ASSISTANTS.md` — new
- `README.md`, `ROADMAP.md`, `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md` — refreshed
- `examples/nextjs-frontend/landing/` — Hero, Features, Getting Started

## Commits in this PR

```
35b9815 chore(release): cut v0.29.0 with Glasswing/Sandbox/Memory-Lock/SDD changelog
cf5db16 fix(deps): resolve all Dependabot vulnerabilities (was 7 high / 8 mod / 6 low)
ac655a0 docs: refresh README, ROADMAP, SECURITY + landing page for v0.28.x feature set
8e3f639 feat(sdd): add Spec-Driven Development with OpenSpec, Spec Kit, BMAD
8b3878b feat(sandbox,windows): add Windows Sandbox and WSL2 runtime handlers
c008222 chore: gitignore per-machine memory lock artifacts (hostname-bound HMAC)
99305a4 feat: zero-trust memory lock system
0b42c75 feat: sandbox isolation for Magneto runtime
fc28d23 feat(glasswing): grouped CVE output + dependency auto-fixer
d0940cd fix(glasswing): scan transitive deps + monorepo subprojects
6d42c37 chore: gitignore .magneto/reports/ (generated per-run)
d6e4518 fix(glasswing): exclude test fixtures from default SAST scan
ad818c9 feat(glasswing): compliance engine + auto-fix
1ca37e7 feat(glasswing): SAST + secrets + dependency scanning (Project Glasswing)
```
