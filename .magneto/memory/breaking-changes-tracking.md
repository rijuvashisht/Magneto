# Breaking Changes Tracking Implementation

**Status**: ✅ COMPLETED  
**Date**: 2024-04-19  
**Version**: v0.8.0+  
**Related Roadmap Item**: Developer Experience

---

## Overview

Magneto now has comprehensive breaking changes tracking and communication to ensure users are informed about breaking changes in each release.

---

## Files Created

### Documentation
- `CHANGELOG.md` - Standard changelog following Keep a Changelog format
- `BREAKING_CHANGES.md` - Detailed migration guides and version compatibility matrix
- `.magneto/memory/breaking-changes-tracking.md` - This tracking document

### Scripts
- `scripts/check-changelog.js` - Validates CHANGELOG.md format
- `scripts/check-breaking-changes.js` - Detects breaking changes in commits and verifies documentation

### CI/CD Updates
- `.github/workflows/ci.yml` - Modified to:
  - Detect breaking change markers in commits ("BREAKING CHANGE", "!:" conventional commits)
  - Extract breaking changes for release notes
  - Include breaking changes section in GitHub releases when present
  - Link to migration guide in all releases

---

## Breaking Change Detection

### Commit Message Patterns
The system detects breaking changes via these patterns:

```
BREAKING CHANGE: description
BREAKING-CHANGE: description
<type>!: description (conventional commits with !)
⚠️ BREAKING: description
[!important] description
```

### Release Process

1. **Pre-release checks**:
   ```bash
   npm run changelog:check      # Validate changelog format
   npm run version:check          # Check for breaking changes
   ```

2. **During release**:
   - CI analyzes commits since last tag
   - Detects breaking change markers
   - Includes breaking changes in release notes
   - Links to BREAKING_CHANGES.md

3. **Release notes include**:
   - ⚠️ Breaking Changes section (if any)
   - Migration steps
   - Quick migration commands
   - Links to full documentation

---

## User Communication Channels

Breaking changes are communicated via:

1. **CHANGELOG.md** - All changes with breaking changes highlighted
2. **BREAKING_CHANGES.md** - Detailed migration guides
3. **GitHub Releases** - Auto-generated with breaking change warnings
4. **npm publish** - Changelog included in npm package
5. **CLI warnings** - Runtime deprecation notices (planned for v1.0)

---

## Semantic Versioning

Magneto follows [SemVer](https://semver.org/):

- **MAJOR (X.0.0)** - Breaking changes requiring user action
- **MINOR (0.X.0)** - New features, backwards compatible
- **PATCH (0.0.X)** - Bug fixes, backwards compatible

### What Constitutes a Breaking Change?

- CLI command signature changes (removed/renamed commands or options)
- Configuration file format changes
- Task file schema changes
- API changes in programmatic usage
- Node.js version requirement increases
- Default behavior changes
- Removed or renamed environment variables

---

## Migration Best Practices (for Users)

### Before Upgrading

```bash
# 1. Backup your project
cp -r .magneto .magneto.backup

# 2. Check current version
magneto --version

# 3. Review changelog
cat CHANGELOG.md | head -100

# 4. Validate existing tasks
magneto task list
for task in .magneto/tasks/*.md; do
  magneto task validate "$task"
done
```

### After Upgrading

```bash
# 1. Run diagnostics
magneto doctor
magneto adapter doctor

# 2. Refresh configuration
magneto refresh

# 3. Test with dry-run
magneto telepathy --dry-run
```

---

## Future Enhancements (v1.0.0+)

### Planned
- [ ] Automated migration tool: `magneto migrate --to-version 1.0.0`
- [ ] CLI deprecation warnings with migration hints
- [ ] Version compatibility checker: `magneto doctor --check-version`
- [ ] Interactive migration wizard

---

## Related Commands

```bash
# Check for breaking changes in current branch
node scripts/check-breaking-changes.js

# Validate changelog format
npm run changelog:check

# View breaking changes history
cat BREAKING_CHANGES.md

# Check version compatibility
magneto doctor
```

---

## Maintenance

### Before Each Release

1. Run `npm run changelog:check` to validate format
2. Run `npm run version:check` to detect breaking changes
3. Ensure BREAKING_CHANGES.md is updated if breaking changes present
4. Verify CI workflow detects breaking changes correctly

### Release Notes Template

When creating releases, ensure they include:

```markdown
## magneto-ai vX.Y.Z — [Major/Minor/Patch]

### Install
\`\`\`bash
npm install -g magneto-ai@X.Y.Z
\`\`\`

### ⚠️ Breaking Changes (if any)
[Breaking changes list]

**Migration Guide:** [Link to BREAKING_CHANGES.md]

### Changes
[List of changes]

---

📖 **Documentation:** https://github.com/rijuvashisht/Magneto#readme
📋 **Changelog:** https://github.com/rijuvashisht/Magneto/blob/main/CHANGELOG.md
⚠️ **Breaking Changes:** https://github.com/rijuvashisht/Magneto/blob/main/BREAKING_CHANGES.md
```

---

## Success Metrics

- ✅ Breaking changes are detected automatically in CI
- ✅ All releases include proper documentation links
- ✅ Users can find migration guides easily
- ✅ Version bump recommendations are accurate
- ✅ Changelog follows Keep a Changelog format

---

## Notes for Future Development

When working on roadmap items that might introduce breaking changes:

1. Mark commits clearly: `feat(cli)!: rename command [BREAKING CHANGE: old command removed]`
2. Update CHANGELOG.md under [Unreleased] immediately
3. Update BREAKING_CHANGES.md with migration steps
4. Consider deprecation period before removal
5. Provide migration commands/scripts when possible
6. Announce breaking changes in GitHub Discussions before release

---

## Dependencies

- Git history for commit analysis
- CI/CD workflow for release automation
- CHANGELOG.md and BREAKING_CHANGES.md for documentation

---

**Last Updated**: 2024-04-19 by Magneto AI
