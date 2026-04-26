# Security Policy

## Supported Versions

Only the latest minor release on the `main` branch receives security patches.

| Version | Supported |
|---------|-----------|
| 0.28.x (current) | ✅ |
| 0.27.x | ✅ (critical fixes only) |
| < 0.27 | ❌ |

Glasswing-era security features (sandbox, memory lock, SDD reconciler, dependency auto-fixer) require **0.28.x or newer**.

## Reporting a Vulnerability

**Please do not file public GitHub issues for security vulnerabilities.**

Report privately via GitHub's built-in security advisory system:

1. Go to **Security → Advisories → Report a vulnerability** on the [Magneto repository](https://github.com/rijuvashisht/Magneto/security/advisories/new).
2. Include: affected version(s), steps to reproduce, impact assessment, and any suggested fix.

**Response SLA:**
- Acknowledgement within **48 hours**
- Initial assessment within **5 business days**
- Fix or mitigation plan within **14 days** for Critical/High severity

You will receive updates as the issue progresses. If a report is accepted, the fix will be released in a patch version and credited in the CHANGELOG (or anonymised at your request). If declined, we will explain why.

## Security Model

Magneto AI operates entirely within your local repository. Understand what does and does not leave your machine:

### Data egress by runner

| Runner | Data sent externally |
|--------|---------------------|
| `openai` | Task context, file snippets, prompts → OpenAI API |
| `copilot-local` | None — routed through your active Copilot IDE process |
| `copilot-cloud` | Task context → your configured Copilot Cloud endpoint |
| `gemini` | Task context → Google AI API |
| `cascade` / `antigravity` | Via local Windsurf/Copilot process — no direct network call |
| **`ollama`** | **Nothing — all local, zero egress** |

Every runner result is tagged with `metadata.dataEgress` (`none` / `host` / `cloud`) and recorded to `.magneto/audit/approvals.json`.

### Sandbox isolation (`magneto sandbox`)

For untrusted AI output or regulated environments, run Magneto and OpenClaw inside an OS-level sandbox:

| Profile | Filesystem | Network | Process | Use |
|---|---|---|---|---|
| `strict` | Read-only project | Allowlist (LLM APIs only) | `nobody`, no shell | Audits |
| `standard` | RW project, denied `/etc /var /usr` | Allowlist + npm/pypi/maven | `magneto`, no sudo | Default for `execute` |
| `dev` | RW project | Open | `magneto`, no sudo | Local dev |
| `off` | Host | Host | Host | Trusted CI only |

Supported runtimes: Docker, Podman, macOS `sandbox-exec`, Linux `bwrap` (bubblewrap), **Windows Sandbox** (`.wsb` + `WindowsSandbox.exe`), **WSL2** (with DNS-leak hardening). Magneto auto-detects the best available and falls back transparently. See `magneto sandbox doctor`.

### Zero-trust memory lock

`.magneto/memory/` carries cross-session agent context. Tampering with it can poison every future agent run.

- `magneto memory lock` writes a manifest of SHA-256 hashes signed with HMAC-SHA256 using a key derived from `~/.magneto-key + hostname + uid`. The lock files become `chmod 0400`.
- `magneto memory verify` exits non-zero on tamper, missing files, or unrecorded files (covers prompt-injection-style memory poisoning).
- While a task is running, `assertMemoryWritable()` blocks any memory mutation — even the owner cannot edit memory mid-execution.
- `unlock` is **offline-only** by default and refuses to run when a network interface is up. Override with `--allow-online` (audited).
- `--require-root` policy restricts unlock to the root account.

### Spec-Driven Development & drift

`magneto sdd sync` is a security control as much as a docs control: stale specs mislead agents into shipping the wrong behavior. The reconciler exits non-zero when:
- A spec references a file that does not exist (`spec-only`).
- A `src/` subtree has zero spec coverage (`code-undocumented`).
- A task marked `[x]` references missing files (`mismatch`).

Wire `magneto sdd sync` into CI alongside `magneto security audit`.

### What Magneto stores locally

- `.magneto/sessions/` — interactive approval session files (auto-pruned to last 10)
- `.magneto/audit/approvals.json` — approval decision log
- `.magneto/cache/completed-tasks.json` — task completion cache
- `.magneto/power-packs/` — installed pack templates (copies of checked-in templates)

### Secrets handling

- Magneto reads `OPENAI_API_KEY`, `OLLAMA_HOST`, `OLLAMA_MODEL`, and runner-specific env vars at runtime
- **No credentials are ever written to disk** by Magneto itself
- Power pack checks actively flag hardcoded secrets in your codebase (rules `py-hardcoded-secret`, `aws-hardcoded-access-key`, `java-hardcoded-secret`, `SEC-001`–`SEC-004`, etc.)

### Protected paths

The security engine enforces a default blocklist of sensitive paths (`*.env`, `*.pem`, `*.key`, `secrets/**`, `.ssh/**`) that agents are blocked from reading or modifying. Configurable via `.magneto/magneto.config.json`.

## Known Security Considerations

- **Project Glasswing is shipped** (v0.28.x). Run `magneto security audit` (SAST + secrets), `magneto security scan-deps` (OSV.dev), `magneto security compliance SOC2` and `magneto security fix` before merging AI-generated code. Pre-execution gate: `magneto security check <task>`.
- **Power pack regex patterns** are run in-process. Malformed patterns in custom packs could cause catastrophic backtracking. All built-in patterns are tested. Validate custom patterns before installing.
- **Ollama runner**: if `OLLAMA_HOST` points to a shared server, task context (code snippets, task descriptions) is sent to that host. Ensure it is trust-bounded.
- **Memory key portability**: the HMAC key derives from `~/.magneto-key + hostname + uid`. Restoring `.magneto/memory/` from backup onto a different machine intentionally fails verification. To migrate, rotate the key and re-lock on the destination host.
- **Skill / MCP supply chain**: AI agent skills can be malicious ("ToxicSkills"). Run `snyk-agent-scan --skills <dir>` against any third-party skill before installing. Magneto's bundled skills under `src/templates/power-packs/adapters/*/skills/` are scanned in CI. See [`CONTRIBUTING.md`](./CONTRIBUTING.md#skill--mcp-scanning-snyk-agent-scan).

## Dependency Vulnerabilities

Dependabot is enabled on this repository. If you notice an unfixed high/critical advisory that is exploitable in a default Magneto installation, please report it via the private advisory process above rather than relying solely on the Dependabot alert.
