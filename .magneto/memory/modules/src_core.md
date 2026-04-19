# Module: src/core

- **Files:** 8
- **Total lines:** 2,606
- **Total size:** 76.3 KB

## Exports

- `Adapter`
- `GraphifyAdapter`
- `loadAdapters`
- `loadGraphifyData`
- `TaskInput`
- `TaskClassification`
- `ExecutionContext`
- `SubAgent`
- `buildContext`
- `detectPacks`
- `GraphNode`
- `GraphEdge`
- `GraphCommunity`
- `KnowledgeGraph`
- `FileInfo`
- `ModuleSummary`
- `buildKnowledgeGraph`
- `generateGraphReport`
- `Finding`
- `Risk`
- `AgentOutput`
- `Contradiction`
- `MergedOutput`
- `mergeResults`
- `PowerPack`
- `PackCheck`
- `loadPowerPacks`
- `ScaffoldOptions`
- `scaffold`
- `SecurityRisk`
- `TelepathyLevel`
- `ExecutionMode`
- `SecurityEvaluation`
- `SecurityConfig`
- `evaluateSecurity`

## Dependencies

### External
- `fs`
- `path`

### Internal
- `../utils/logger`
- `../utils/paths`
- `../utils/fs`

## Files

### `adapter-loader.ts`

- **Path:** `src/core/adapter-loader.ts`
- **Lines:** 114 | **Size:** 3.7 KB
- **Interfaces:** `Adapter`, `GraphifyAdapter`
- **Functions:** `loadAdapters`, `wireOpenClawAdapter`, `loadGraphifyData`, `mapGraphToMemory`, `updateConfigWithAdapter`, `adapters`
- **Exports:** `Adapter`, `GraphifyAdapter`, `loadAdapters`, `loadGraphifyData`

### `context.ts`

- **Path:** `src/core/context.ts`
- **Lines:** 195 | **Size:** 5.5 KB
- **Interfaces:** `TaskInput`, `ExecutionContext`, `SubAgent`
- **Types:** `TaskClassification`
- **Functions:** `buildContext`, `classifyTask`, `chooseRoles`, `createSubAgents`, `getToolsForRole`, `getScopeForRole`, `resolveRelevantFiles`, `loadMemory`, `loadConfig`
- **Exports:** `TaskInput`, `TaskClassification`, `ExecutionContext`, `SubAgent`, `buildContext`

### `detect-packs.ts`

- **Path:** `src/core/detect-packs.ts`
- **Lines:** 69 | **Size:** 1.9 KB
- **Interfaces:** `PackageJson`
- **Functions:** `detectPacks`
- **Exports:** `detectPacks`

### `graph-engine.ts`

- **Path:** `src/core/graph-engine.ts`
- **Lines:** 629 | **Size:** 17.9 KB
- **Interfaces:** `GraphNode`, `GraphEdge`, `GraphCommunity`, `KnowledgeGraph`, `FileInfo`, `ModuleSummary`
- **Functions:** `buildKnowledgeGraph`, `addNode`, `addEdge`, `louvainCommunities`, `resolveImportTarget`, `segments`, `baseName`, `nameSimilarity`, `generateGraphReport`
- **Exports:** `GraphNode`, `GraphEdge`, `GraphCommunity`, `KnowledgeGraph`, `FileInfo`, `ModuleSummary`, `buildKnowledgeGraph`, `generateGraphReport`

### `merge-results.ts`

- **Path:** `src/core/merge-results.ts`
- **Lines:** 285 | **Size:** 8.3 KB
- **Interfaces:** `Finding`, `Risk`, `AgentOutput`, `Contradiction`, `MergedOutput`
- **Functions:** `mergeResults`, `deduplicateFindings`, `deduplicateRisks`, `calculateCombinedConfidence`, `detectContradictions`, `getSharedKeywords`, `determineOverallRisk`
- **Exports:** `Finding`, `Risk`, `AgentOutput`, `Contradiction`, `MergedOutput`, `mergeResults`

### `power-pack-loader.ts`

- **Path:** `src/core/power-pack-loader.ts`
- **Lines:** 72 | **Size:** 2.0 KB
- **Interfaces:** `PowerPack`, `PackCheck`
- **Functions:** `loadPowerPacks`, `updateConfigWithPack`, `packs`
- **Exports:** `PowerPack`, `PackCheck`, `loadPowerPacks`

### `scaffold.ts`

- **Path:** `src/core/scaffold.ts`
- **Lines:** 1066 | **Size:** 31.8 KB
- **Interfaces:** `ScaffoldOptions`, `FileEntry`, `Finding`, `Risk`, `Contradiction`
- **Functions:** `scaffold`, `getDefaultConfig`, `getMinConfig`, `getStartMd`, `getCopilotInstructions`, `getMcpConfig`, `writeAgentFiles`, `writeRolePacks`, `writeSkillFiles`, `writeMemoryFiles`, `writeTaskSchemas`, `writeScripts`, `scanDirectory`
- **Exports:** `ScaffoldOptions`, `scaffold`

### `security-engine.ts`

- **Path:** `src/core/security-engine.ts`
- **Lines:** 176 | **Size:** 5.0 KB
- **Interfaces:** `SecurityEvaluation`, `SecurityConfig`, `TaskLike`, `ContextLike`
- **Types:** `SecurityRisk`, `TelepathyLevel`, `ExecutionMode`
- **Functions:** `evaluateSecurity`, `maxTelepathy`, `extractSecurityConfig`, `matchesProtectedPath`
- **Exports:** `SecurityRisk`, `TelepathyLevel`, `ExecutionMode`, `SecurityEvaluation`, `SecurityConfig`, `evaluateSecurity`
