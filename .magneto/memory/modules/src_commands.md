# Module: src/commands

- **Files:** 8
- **Total lines:** 1,502
- **Total size:** 47.5 KB

## Exports

- `AnalyzeOptions`
- `analyzeCommand`
- `doctorCommand`
- `GenerateOptions`
- `generateCommand`
- `InitOptions`
- `initCommand`
- `MergeOptions`
- `mergeCommand`
- `PlanOptions`
- `Task`
- `ExecutionPlan`
- `PlanStep`
- `planCommand`
- `refreshCommand`
- `RunOptions`
- `runCommand`

## Dependencies

### External
- `path`
- `fs`

### Internal
- `../utils/logger`
- `../utils/paths`
- `../utils/fs`
- `../core/context`
- `../core/security-engine`
- `../core/scaffold`
- `../core/power-pack-loader`
- `../core/adapter-loader`
- `../core/merge-results`
- `../core/detect-packs`
- `../runners/types`

## Files

### `analyze.ts`

- **Path:** `src/commands/analyze.ts`
- **Lines:** 671 | **Size:** 21.2 KB
- **Interfaces:** `AnalyzeOptions`, `FileInfo`, `ModuleSummary`
- **Functions:** `analyzeCommand`, `scanFiles`, `parseFile`, `parseJavaScriptLike`, `parseJavaLike`, `parsePython`, `parseGo`, `groupByModule`, `renderModuleSummary`, `buildDependencyMap`, `buildFileIndex`, `buildRootSummary`, `formatBytes`
- **Exports:** `AnalyzeOptions`, `analyzeCommand`

### `doctor.ts`

- **Path:** `src/commands/doctor.ts`
- **Lines:** 82 | **Size:** 2.9 KB
- **Interfaces:** `DiagnosticResult`
- **Functions:** `doctorCommand`, `checkPath`, `checkPathOptional`
- **Exports:** `doctorCommand`

### `generate.ts`

- **Path:** `src/commands/generate.ts`
- **Lines:** 357 | **Size:** 12.4 KB
- **Interfaces:** `GenerateOptions`
- **Functions:** `generateCommand`, `buildPrompt`, `loadRolePacks`, `loadScopedFiles`, `loadMemoryContext`, `getRoleDescription`, `getTaskInstructions`, `estimateTokens`
- **Exports:** `GenerateOptions`, `generateCommand`

### `init.ts`

- **Path:** `src/commands/init.ts`
- **Lines:** 52 | **Size:** 1.5 KB
- **Interfaces:** `InitOptions`
- **Functions:** `initCommand`
- **Exports:** `InitOptions`, `initCommand`

### `merge.ts`

- **Path:** `src/commands/merge.ts`
- **Lines:** 81 | **Size:** 2.4 KB
- **Interfaces:** `MergeOptions`
- **Functions:** `mergeCommand`, `renderMarkdown`
- **Exports:** `MergeOptions`, `mergeCommand`

### `plan.ts`

- **Path:** `src/commands/plan.ts`
- **Lines:** 142 | **Size:** 3.6 KB
- **Interfaces:** `PlanOptions`, `Task`, `ExecutionPlan`, `PlanStep`
- **Functions:** `planCommand`, `generateSteps`
- **Exports:** `PlanOptions`, `Task`, `ExecutionPlan`, `PlanStep`, `planCommand`

### `refresh.ts`

- **Path:** `src/commands/refresh.ts`
- **Lines:** 31 | **Size:** 1.0 KB
- **Functions:** `refreshCommand`
- **Exports:** `refreshCommand`

### `run.ts`

- **Path:** `src/commands/run.ts`
- **Lines:** 86 | **Size:** 2.5 KB
- **Interfaces:** `RunOptions`
- **Functions:** `runCommand`
- **Exports:** `RunOptions`, `runCommand`
