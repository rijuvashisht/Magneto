# Publishing Magneto AI to npm

## Prerequisites

1. **npm account** — Create one at [npmjs.com](https://www.npmjs.com/signup)
2. **npm login** — Run `npm login` and authenticate
3. **Verify your email** on npmjs.com (required for first publish)

## Pre-Publish Checklist

```bash
# 1. Ensure clean build
npm run build

# 2. Run all tests
npm test

# 3. Verify package contents (what gets published)
npm pack --dry-run

# 4. Check the version
npm version  # should show 0.1.0

# 5. Verify the binary works
node dist/cli.js --help
```

## Publishing

### First Publish

```bash
# Dry run first — review what would be published
npm publish --dry-run

# Publish for real (public package)
npm publish --access public
```

### Version Bumps

```bash
# Patch (0.1.0 → 0.1.1) — bug fixes
npm version patch

# Minor (0.1.1 → 0.2.0) — new features
npm version minor

# Major (0.2.0 → 1.0.0) — breaking changes
npm version major

# Then publish
npm publish
```

## After Publishing

Users can install and use immediately:

```bash
# Global install
npm install -g magneto-ai
magneto --help
magneto init

# Or via npx (no install needed)
npx magneto-ai --help
npx magneto-ai init --with typescript nextjs

# Or as a project devDependency
npm install --save-dev magneto-ai
npx magneto init
```

## CI/CD Publishing

The GitHub Actions workflow (`.github/workflows/ci.yml`) includes a publish job.

To enable automated publishing:

1. Go to **npmjs.com** → Account → Access Tokens → Generate New Token (Automation)
2. Copy the token
3. In your GitHub repo → Settings → Secrets → Actions → New secret
4. Name: `NPM_TOKEN`, Value: your npm token
5. Change `npm publish --dry-run` to `npm publish --access public` in the workflow

## Package Contents

The `files` field in `package.json` controls what gets published:

```json
"files": [
  "dist/",
  "src/templates/",
  "README.md",
  "LICENSE"
]
```

This includes:
- **`dist/`** — Compiled JavaScript + type declarations
- **`src/templates/`** — Scaffolding templates (agents, configs, power packs)
- **`README.md`** — Package documentation (shown on npmjs.com)
- **`LICENSE`** — MIT license

## Binary

The `bin` field in `package.json` creates the `magneto` CLI command:

```json
"bin": {
  "magneto": "dist/cli.js"
}
```

When installed globally (`npm install -g magneto-ai`), the `magneto` command becomes available system-wide.

## Scoped Package (Optional)

If `magneto-ai` is taken, use a scoped name:

```json
"name": "@rijuvashisht/magneto-ai"
```

Then publish with:

```bash
npm publish --access public
```

Users install with:

```bash
npm install -g @rijuvashisht/magneto-ai
```
