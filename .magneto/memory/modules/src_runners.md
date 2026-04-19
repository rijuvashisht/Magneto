# Module: src/runners

- **Files:** 4
- **Total lines:** 442
- **Total size:** 12.4 KB

## Exports

- `CopilotCloudRunner`
- `CopilotLocalRunner`
- `OpenAIRunner`
- `RunnerType`
- `RunnerInput`
- `RunnerOutput`
- `Runner`
- `createRunner`

## Dependencies

### External
- `openai`

### Internal
- `./types`
- `../utils/logger`
- `../core/context`
- `../core/security-engine`
- `./openai`
- `./copilot-local`
- `./copilot-cloud`

## Files

### `copilot-cloud.ts`

- **Path:** `src/runners/copilot-cloud.ts`
- **Lines:** 96 | **Size:** 2.6 KB
- **Classes:** `CopilotCloudRunner`
- **Functions:** `data`
- **Exports:** `CopilotCloudRunner`

### `copilot-local.ts`

- **Path:** `src/runners/copilot-local.ts`
- **Lines:** 73 | **Size:** 2.3 KB
- **Classes:** `CopilotLocalRunner`
- **Exports:** `CopilotLocalRunner`

### `openai.ts`

- **Path:** `src/runners/openai.ts`
- **Lines:** 219 | **Size:** 6.2 KB
- **Classes:** `OpenAIRunner`
- **Exports:** `OpenAIRunner`

### `types.ts`

- **Path:** `src/runners/types.ts`
- **Lines:** 54 | **Size:** 1.3 KB
- **Interfaces:** `RunnerInput`, `RunnerOutput`, `Runner`
- **Types:** `RunnerType`
- **Functions:** `createRunner`
- **Exports:** `RunnerType`, `RunnerInput`, `RunnerOutput`, `Runner`, `createRunner`
