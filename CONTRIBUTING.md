# Contributing to Magneto AI

Thank you for your interest in contributing to Magneto AI! This document provides guidelines for contributing to the project.

---

## Quick Start

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/Magneto.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/my-feature`
5. Make changes and test: `npm run build && npm test`
6. Commit with conventional format: `git commit -m "feat: add new feature"`
7. Push and open PR: `git push origin feature/my-feature`

---

## Development Workflow

### Building

```bash
npm run build        # Build TypeScript to dist/
npm run dev          # Watch mode for development
```

### Testing

```bash
npm test             # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # With coverage report
```

### Linting

```bash
npm run lint         # Run ESLint
```

---

## Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New feature (minor version bump)
- `fix`: Bug fix (patch version bump)
- `docs`: Documentation changes
- `style`: Code style (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/process changes

### Breaking Changes

Mark breaking changes with `!` or `BREAKING CHANGE:`:

```bash
# Using !
feat(cli)!: rename adapter command to integration

# Using BREAKING CHANGE footer
feat(cli): rename adapter command to integration

BREAKING CHANGE: The 'adapter' command is now 'integration'. 
Update your scripts from 'magneto adapter' to 'magneto integration'.
```

### Scopes

Common scopes:
- `cli`: CLI commands
- `core`: Core functionality
- `adapter`: Adapter system
- `task`: Task management
- `graph`: Knowledge graph
- `security`: Security engine
- `docs`: Documentation

---

## Breaking Changes Policy

### What Requires Breaking Change Documentation?

- CLI command removals or renames
- Option/flag changes
- Configuration file format changes
- Task schema changes
- API changes (for programmatic use)
- Environment variable changes
- Default behavior changes

### Breaking Change Checklist

Before submitting a PR with breaking changes:

- [ ] Mark commits with `!` or `BREAKING CHANGE:`
- [ ] Update `CHANGELOG.md` under `[Unreleased]`
- [ ] Update `BREAKING_CHANGES.md` with migration guide
- [ ] Provide migration commands/scripts
- [ ] Consider deprecation period (don't break immediately)
- [ ] Announce in PR description

### Example PR Description for Breaking Changes

```markdown
## Breaking Change: Rename `adapter` command to `integration`

### Summary
This PR renames the `adapter` command to `integration` for clarity.

### Migration
**Before:**
```bash
magneto adapter install claude
magneto adapter list
```

**After:**
```bash
magneto integration install claude
magneto integration list
```

### Breaking Change Documentation
- [x] CHANGELOG.md updated
- [x] BREAKING_CHANGES.md updated with migration guide
- [x] Commits marked with `!`

### Deprecation Plan
This change takes effect immediately. The old command names will not work.
```

---

## Pull Request Process

1. **Create a task file** (for significant changes):
   ```bash
   magneto task create feature "Your feature description"
   ```

2. **Plan the implementation**:
   ```bash
   magneto plan .magneto/tasks/your-feature.md
   ```

3. **Implement and test**

4. **Update documentation**:
   - README.md (if needed)
   - CHANGELOG.md (under [Unreleased])
   - BREAKING_CHANGES.md (if breaking changes)

5. **Submit PR** with:
   - Clear description
   - Issue references (if any)
   - Breaking change notes (if applicable)
   - Screenshots/logs (if applicable)

6. **Review process**:
   - CI must pass (build, test, lint)
   - Breaking changes must be documented
   - Code review by maintainers

---

## Coding Standards

### TypeScript

- Use strict TypeScript settings
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Document public APIs with JSDoc

### Code Style

- Follow existing code patterns
- Use meaningful variable names
- Keep functions focused and small
- Add comments for complex logic

### Testing

- Add tests for new features
- Maintain >80% coverage
- Test edge cases
- Use descriptive test names

---

## Documentation

### Code Documentation

```typescript
/**
 * Brief description of what the function does.
 * 
 * @param paramName - Description of parameter
 * @returns Description of return value
 * @throws When and what errors are thrown
 * 
 * @example
 * // Example usage
 * const result = myFunction('input');
 */
export function myFunction(paramName: string): string {
  // Implementation
}
```

### User Documentation

- Update README.md for user-facing changes
- Add examples to help text
- Update ROADMAP.md for new features

---

## Release Process

### For Maintainers

1. **Prepare release**:
   ```bash
   npm run changelog:check      # Validate changelog
   npm run version:check          # Check breaking changes
   ```

2. **Update version**:
   ```bash
   # For patch release
   npm run release:patch

   # For minor release (new features)
   npm run release:minor

   # For major release (breaking changes)
   npm run release:major
   ```

3. **Verify release**:
   - Check GitHub releases page
   - Verify npm package updated
   - Test installation: `npm install -g magneto-ai@latest`

---

## Questions?

- 💬 [GitHub Discussions](https://github.com/rijuvashisht/Magneto/discussions)
- 🐛 [Issue Tracker](https://github.com/rijuvashisht/Magneto/issues)
- 📧 Email: riju.vashisht@gmail.com

---

## Spec-Driven Development (SDD)

Magneto ships pluggable support for three SDD frameworks. Pick one on `magneto init`
or run `magneto sdd init` later.

| Framework | Best for | Layout |
|---|---|---|
| **OpenSpec** *(default)* | Brownfield / existing code | `openspec/{project.md,specs,changes/<name>/{proposal,design,tasks}.md}` |
| **Spec Kit** | Greenfield / new projects | `.specify/constitution.md` + `specs/<slug>/{spec,plan,tasks}.md` |
| **BMAD-METHOD** | Regulated / SOC2 audit trails | `bmad-core/agents/*.md` + `docs/{prd,architecture,stories,qa}/` |

Recommended workflow:

```bash
magneto sdd init                              # interactive prompt
magneto sdd new add-dark-mode "Toggle theme"  # scaffold a change
# ...implement task by task...
magneto sdd sync                              # reconcile spec ↔ code drift before merge
```

`magneto sdd sync` is the single most important command. It exits non-zero when drift
is detected — wire it into CI alongside `magneto security audit`.

**Constitution rules** must follow the WHY → WHAT → HOW pattern. Single-line
prohibitions ("don't do X") are routinely ignored by LLMs (see EPAM Spec Kit
brownfield case study). The default constitution Magneto generates already follows
this pattern; preserve it when adding project-specific rules.

References:
- [Spec Kit vs BMAD vs OpenSpec — dev.to/willtorber](https://dev.to/willtorber/spec-kit-vs-bmad-vs-openspec-choosing-an-sdd-framework-in-2026-d3j)
- [OpenSpec docs](https://openspec.dev)
- [BMAD-METHOD docs](https://docs.bmad-method.org)
- [GitHub Spec Kit](https://github.com/github/spec-kit)
- arXiv 2602.00180v1 — Spec-Driven Development: From Code to Contract

---

## Skill & MCP scanning (Snyk Agent Scan)

Before committing changes that touch `src/templates/power-packs/adapters/*/skills/`,
or any MCP server configuration, run:

```bash
pip3 install --user snyk-agent-scan
export SNYK_TOKEN=<your token from app.snyk.io/account>

# Scan installed skills
snyk-agent-scan --skills src/templates/power-packs/adapters/claude/skills
snyk-agent-scan --skills src/templates/power-packs/adapters/antigravity/skills

# Scan MCP server configurations
snyk-agent-scan
```

This catches "ToxicSkills" — malicious AI agent skills that exfiltrate data or
hijack tool calls. See https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/

---

## Code of Conduct

- Be respectful and constructive
- Welcome newcomers
- Focus on what's best for the project
- Accept constructive criticism gracefully

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
