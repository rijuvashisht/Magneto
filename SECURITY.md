# Security Policy

## Supported Versions

Only the latest minor release on the `main` branch receives security patches.

| Version | Supported |
|---------|-----------|
| 0.28.x (current) | ✅ |
| 0.27.x | ✅ (critical fixes only) |
| < 0.27 | ❌ |

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
| `copilot` | Task context → GitHub Copilot endpoint |
| `gemini` | Task context → Google AI API |
| `cascade` / `antigravity` | Via local Windsurf/Copilot process — no direct network call |
| **`ollama`** | **Nothing — all local, zero egress** |

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

- **AI-generated code is not audited by default** — Project Glasswing (`magneto security audit`) is on the roadmap to address this. Until released, review all AI output before committing.
- **Power pack regex patterns** are run in-process. Malformed patterns in custom packs could cause catastrophic backtracking. All built-in patterns are tested. Validate custom patterns before installing.
- **Ollama runner**: if `OLLAMA_HOST` points to a shared server, task context (code snippets, task descriptions) is sent to that host. Ensure it is trust-bounded.

## Dependency Vulnerabilities

Dependabot is enabled on this repository. If you notice an unfixed high/critical advisory that is exploitable in a default Magneto installation, please report it via the private advisory process above rather than relying solely on the Dependabot alert.
