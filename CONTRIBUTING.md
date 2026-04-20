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

## Code of Conduct

- Be respectful and constructive
- Welcome newcomers
- Focus on what's best for the project
- Accept constructive criticism gracefully

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
