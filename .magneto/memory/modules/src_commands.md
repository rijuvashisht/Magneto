# Module: src/commands

- **Files:** 9
- **Total lines:** 1,921
- **Total size:** 62.1 KB

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
- `QueryOptions`
- `queryCommand`
- `pathCommand`
- `refreshCommand`
- `RunOptions`
- `runCommand`

## Dependencies

### External
- `path`
- `fs`
- `child_process`

### Internal
- `../utils/logger`
- `../utils/paths`
- `../utils/fs`
- `../core/context`
- `../core/security-engine`
- `../utils/task-parser`
- `../core/scaffold`
- `../core/power-pack-loader`
- `../core/adapter-loader`
- `../core/merge-results`
- `../core/graph-engine`
- `../core/detect-packs`
- `../runners/types`

## Files

### `analyze.ts`

- **Path:** `src/commands/analyze.ts`
- **Lines:** 792 | **Size:** 26.1 KB
- **Interfaces:** `AnalyzeOptions`, `FileInfo`, `ModuleSummary`
- **Functions:** `analyzeCommand`, `scanFiles`, `parseFile`, `parseJavaScriptLike`, `parseJavaLike`, `parsePython`, `parseGo`, `groupByModule`, `renderModuleSummary`, `buildDependencyMap`, `buildFileIndex`, `buildRootSummary`, `formatBytes`, `writeGraphHtml`, `runGraphifyDeep`
- **Exports:** `AnalyzeOptions`, `analyzeCommand`

### `doctor.ts`

- **Path:** `src/commands/doctor.ts`
- **Lines:** 85 | **Size:** 3.1 KB
- **Interfaces:** `DiagnosticResult`
- **Functions:** `doctorCommand`, `checkPath`, `checkPathOptional`
- **Exports:** `doctorCommand`

### `generate.ts`

- **Path:** `src/commands/generate.ts`
- **Lines:** 374 | **Size:** 12.8 KB
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
- **Lines:** 143 | **Size:** 3.6 KB
- **Interfaces:** `PlanOptions`, `Task`, `ExecutionPlan`, `PlanStep`
- **Functions:** `planCommand`, `generateSteps`
- **Exports:** `PlanOptions`, `Task`, `ExecutionPlan`, `PlanStep`, `planCommand`

### `query.ts`

- **Path:** `src/commands/query.ts`
- **Lines:** 276 | **Size:** 9.0 KB
- **Interfaces:** `QueryOptions`
- **Functions:** `queryCommand`, `pathCommand`, `findNode`, `traverseBFS`, `traverseDFS`, `dfs`, `estimateEdgeTokens`
- **Exports:** `QueryOptions`, `queryCommand`, `pathCommand`

### `refresh.ts`

- **Path:** `src/commands/refresh.ts`
- **Lines:** 31 | **Size:** 1.0 KB
- **Functions:** `refreshCommand`
- **Exports:** `refreshCommand`

### `run.ts`

- **Path:** `src/commands/run.ts`
- **Lines:** 87 | **Size:** 2.6 KB
- **Interfaces:** `RunOptions`
- **Functions:** `runCommand`
- **Exports:** `RunOptions`, `runCommand`
