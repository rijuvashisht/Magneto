# Module: src/utils

- **Files:** 3
- **Total lines:** 185
- **Total size:** 5.0 KB

## Exports

- `ensureDir`
- `writeJson`
- `readJson`
- `writeText`
- `readText`
- `fileExists`
- `copyDir`
- `listFiles`
- `LogLevel`
- `setLogLevel`
- `getLogLevel`
- `logger`
- `MAGNETO_DIR`
- `GITHUB_DIR`
- `VSCODE_DIR`
- `AGENTS_DIR`
- `COPILOT_INSTRUCTIONS`
- `MAGNETO_CONFIG`
- `MAGNETO_MIN_CONFIG`
- `MAGNETO_START`
- `MAGNETO_SUBDIRS`
- `resolveProjectRoot`
- `magnetoPath`
- `githubPath`
- `vscodePath`
- `getTemplatesDir`
- `isMagnetoProject`

## Dependencies

### External
- `fs`
- `path`
- `chalk`

## Files

### `fs.ts`

- **Path:** `src/utils/fs.ts`
- **Lines:** 67 | **Size:** 1.8 KB
- **Functions:** `ensureDir`, `writeJson`, `readJson`, `writeText`, `readText`, `fileExists`, `copyDir`, `listFiles`, `walk`
- **Exports:** `ensureDir`, `writeJson`, `readJson`, `writeText`, `readText`, `fileExists`, `copyDir`, `listFiles`

### `logger.ts`

- **Path:** `src/utils/logger.ts`
- **Lines:** 65 | **Size:** 1.6 KB
- **Functions:** `setLogLevel`, `getLogLevel`
- **Exports:** `LogLevel`, `setLogLevel`, `getLogLevel`, `logger`

### `paths.ts`

- **Path:** `src/utils/paths.ts`
- **Lines:** 53 | **Size:** 1.5 KB
- **Functions:** `resolveProjectRoot`, `magnetoPath`, `githubPath`, `vscodePath`, `getTemplatesDir`, `isMagnetoProject`
- **Exports:** `MAGNETO_DIR`, `GITHUB_DIR`, `VSCODE_DIR`, `AGENTS_DIR`, `COPILOT_INSTRUCTIONS`, `MAGNETO_CONFIG`, `MAGNETO_MIN_CONFIG`, `MAGNETO_START`, `MAGNETO_SUBDIRS`, `resolveProjectRoot`, `magnetoPath`, `githubPath`, `vscodePath`, `getTemplatesDir`, `isMagnetoProject`
