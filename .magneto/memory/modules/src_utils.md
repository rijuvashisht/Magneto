# Module: src/utils

- **Files:** 4
- **Total lines:** 386
- **Total size:** 10.5 KB

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
- `parseTaskFile`

## Dependencies

### External
- `fs`
- `path`
- `chalk`

### Internal
- `../core/context`
- `./logger`

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
- **Lines:** 58 | **Size:** 1.8 KB
- **Functions:** `resolveProjectRoot`, `magnetoPath`, `githubPath`, `vscodePath`, `getTemplatesDir`, `isMagnetoProject`
- **Exports:** `MAGNETO_DIR`, `GITHUB_DIR`, `VSCODE_DIR`, `AGENTS_DIR`, `COPILOT_INSTRUCTIONS`, `MAGNETO_CONFIG`, `MAGNETO_MIN_CONFIG`, `MAGNETO_START`, `MAGNETO_SUBDIRS`, `resolveProjectRoot`, `magnetoPath`, `githubPath`, `vscodePath`, `getTemplatesDir`, `isMagnetoProject`

### `task-parser.ts`

- **Path:** `src/utils/task-parser.ts`
- **Lines:** 196 | **Size:** 5.2 KB
- **Functions:** `parseTaskFile`, `parseMarkdownTask`, `parseYaml`, `extractFirstHeading`
- **Exports:** `parseTaskFile`
