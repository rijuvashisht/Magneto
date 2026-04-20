# Breaking Changes & Migration Guide

This document tracks all breaking changes in Magneto AI and provides detailed migration instructions.

**Current Version**: 0.8.0
**Last Updated**: 2024-04-19

---

## Quick Reference

| Version | Breaking Changes | Migration Effort |
|---------|-----------------|------------------|
| 0.8.0 | None | N/A |
| 0.7.0 | None | N/A |
| 0.6.0 | None | N/A |
| 0.5.0 | None | N/A |

---

## Upcoming Breaking Changes (v1.0.0)

**Target Date**: TBD

The following changes are planned for the v1.0.0 release:

### 1. Configuration File Schema v2

**Change**: Configuration files will require a `version` field.

**Current** (v0.x):
```json
{
  "security": {
    "maxTelepathyLevel": 2
  },
  "runners": {
    "default": "openai"
  }
}
```

**Future** (v1.0.0):
```json
{
  "version": 2,
  "security": {
    "maxTelepathyLevel": 2
  },
  "runners": {
    "default": "openai"
  }
}
```

**Migration**: Magneto will auto-migrate existing configs during `magneto init --refresh`.

### 2. Task File Schema v2

**Change**: Task files will require explicit `version` in frontmatter.

**Current** (v0.x):
```yaml
---
name: my-task
type: feature
priority: high
---
```

**Future** (v1.0.0):
```yaml
---
name: my-task
type: feature
priority: high
version: 2  # Required
---
```

**Migration**: Use `magneto task validate` to identify tasks needing updates, then add `version: 2`.

### 3. Minimum Node.js Version

**Change**: Minimum Node.js version will be 18.0.0 (currently >=16.0.0).

**Migration**: Update Node.js to v18+ via `nvm`, `n`, or your package manager.

### 4. Adapter Configuration Location

**Change**: API adapter configs will move from `.magneto/adapters/<name>/config.json` to `.magneto/config/adapters/<name>.json`.

**Migration**: Magneto will auto-migrate configs, or run `magneto adapter config <name> --migrate`.

---

## Historical Breaking Changes

### None Yet

Magneto is currently in pre-1.0 development. All v0.x releases may introduce changes, but we strive to maintain backwards compatibility within minor versions.

---

## Deprecation Policy

### Deprecation Timeline

1. **Announcement** - Feature marked as deprecated in release notes and code
2. **Grace Period** - 2 minor versions (e.g., deprecated in 0.8.0, removed in 0.10.0)
3. **Removal** - Feature removed in next major or after grace period

### Currently Deprecated

| Feature | Deprecated In | Will Be Removed | Replacement |
|---------|--------------|-----------------|-------------|
| None currently | - | - | - |

---

## Migration Best Practices

### Before Upgrading

1. **Backup your project**:
   ```bash
   cp -r .magneto .magneto.backup
   ```

2. **Check current version**:
   ```bash
   magneto --version
   ```

3. **Review changelog**:
   ```bash
   cat CHANGELOG.md | head -100
   ```

4. **Validate existing tasks**:
   ```bash
   magneto task list
   for task in .magneto/tasks/*.md; do
     magneto task validate "$task"
   done
   ```

### After Upgrading

1. **Run doctor**:
   ```bash
   magneto doctor
   ```

2. **Validate adapters**:
   ```bash
   magneto adapter doctor
   ```

3. **Refresh configuration**:
   ```bash
   magneto refresh
   ```

4. **Test with dry-run**:
   ```bash
   magneto telepathy --dry-run
   ```

---

## Version Compatibility Matrix

| Magneto Version | Node.js | Task Schema | Config Schema | CLI Compatible |
|----------------|---------|-------------|---------------|----------------|
| 0.8.x | >=16.0.0 | v1 | v1 | ✅ |
| 0.7.x | >=16.0.0 | v1 | v1 | ✅ |
| 0.6.x | >=16.0.0 | v1 | v1 | ✅ |
| 1.0.0 (planned) | >=18.0.0 | v2 | v2 | ⚠️ Breaking |

---

## Reporting Breaking Change Issues

If you encounter unexpected breaking changes:

1. **Check this document** - Verify if it's documented
2. **Check CHANGELOG.md** - See if it was announced
3. **Check version** - Confirm you're on the expected version:
   ```bash
   magneto --version
   ```
4. **Open an issue** - If undocumented:
   - Include version numbers (before/after)
   - Include error messages
   - Include minimal reproduction

---

## Automated Migration Tools

### Planned for v1.0.0

```bash
# Auto-migrate all configs and tasks
magneto migrate --to-version 1.0.0 --dry-run
magneto migrate --to-version 1.0.0 --execute

# Migrate specific items
magneto migrate --configs-only
magneto migrate --tasks-only
```

### Current Migration Helpers

```bash
# Validate all tasks (identifies issues)
find .magneto/tasks -name "*.md" -exec magneto task validate {} \;

# Check for deprecated features
grep -r "TODO.*deprecate\|FIXME.*deprecated" .magneto/
```

---

## Communicating Breaking Changes

Breaking changes are announced via:

1. **CHANGELOG.md** - All changes
2. **This document** - Detailed migration
3. **GitHub Releases** - Release notes with highlights
4. **npm publish** - `npm deprecate` for critical issues
5. **CLI warnings** - Runtime deprecation notices

---

## Questions?

- 📖 [Full Documentation](https://github.com/rijuvashisht/Magneto#readme)
- 🐛 [Report Issues](https://github.com/rijuvashisht/Magneto/issues)
- 💬 [Discussions](https://github.com/rijuvashisht/Magneto/discussions)
