---
name: streaming-runner-output
description: Real-time streaming of agent output during execution with WebSocket/SSE, progress indicators, and partial results
type: feature
priority: high
telepathyLevel: 2
roles:
  - orchestrator
  - backend
  - frontend
security:
  maxTelepathyLevel: 2
  requireApproval: false
---

# Streaming Runner Output (Roadmap 1.2)

## Objective

Implement real-time streaming of agent output during task execution, providing users with live updates, progress indicators, and streaming partial results instead of waiting for completion.

## Background

Currently, `magneto run` waits for the entire task to complete before showing output. For long-running tasks (e.g., code analysis, multi-step execution), users need visibility into progress in real-time.

## Requirements

### 1. CLI Options

```bash
magneto run task.md --stream              # Enable real-time streaming
magneto run task.md --watch               # Watch mode with live updates
magneto run task.md --stream --output json  # JSON stream format
```

### 2. Streaming Architecture

**File**: `src/core/streaming-runner.ts`

```typescript
export interface StreamingConfig {
  enabled: boolean;
  format: 'text' | 'json' | 'sse';      // Server-Sent Events
  transport: 'websocket' | 'sse' | 'stdio';  // Transport method
  bufferSize: number;                     // Bytes to buffer before flush
  flushInterval: number;                  // ms between forced flushes
  compression: boolean;                   // gzip compression for large outputs
}

export interface StreamEvent {
  timestamp: string;
  type: 'start' | 'progress' | 'output' | 'error' | 'complete' | 'checkpoint';
  stepIndex?: number;
  totalSteps?: number;
  data?: string;
  metadata?: {
    percentComplete?: number;
    tokensUsed?: number;
    estimatedTimeRemaining?: number;
    currentOperation?: string;
  };
}

export interface StreamingRunner {
  constructor(config: StreamingConfig);
  
  // Start streaming session
  async startStream(taskId: string): Promise<StreamSession>;
  
  // Emit event to stream
  async emit(event: StreamEvent): Promise<void>;
  
  // Connect consumer to stream
  on(event: StreamEvent['type'], handler: (event: StreamEvent) => void): void;
  
  // Pause/resume
  pause(): void;
  resume(): void;
  
  // End stream
  end(): Promise<void>;
}

export interface StreamSession {
  id: string;
  taskId: string;
  startTime: string;
  events: StreamEvent[];
  status: 'running' | 'paused' | 'completed' | 'error';
}
```

### 3. Transport Implementations

**WebSocket Server** (`src/mcp/streaming-server.ts`):
```typescript
export class WebSocketStreamingServer {
  async start(port: number): Promise<void>;
  async broadcast(event: StreamEvent): Promise<void>;
  async subscribe(clientId: string, taskId: string): Promise<void>;
}
```

**Server-Sent Events** (`src/mcp/sse-streaming.ts`):
```typescript
export class SSEStreamingTransport {
  async createStream(response: http.ServerResponse): Promise<void>;
  async writeEvent(event: StreamEvent): Promise<void>;
}
```

### 4. Progress Indicators

**Terminal UI** (`src/utils/progress-renderer.ts`):
```typescript
export class ProgressRenderer {
  renderProgressBar(percent: number, width?: number): string;
  renderSpinner(text: string): string;
  renderStepIndicator(current: number, total: number): string;
  renderLiveOutput(data: string): void;
  clear(): void;
}
```

### 5. Backpressure Handling

```typescript
export interface BackpressureConfig {
  highWaterMark: number;      // Max buffer size before pause
  lowWaterMark: number;       // Resume threshold
  maxQueueSize: number;       // Drop old events if exceeded
  strategy: 'drop-old' | 'block' | 'sample';
}

export class BackpressureController {
  async write(chunk: StreamEvent): Promise<boolean>;
  async drain(): Promise<void>;
  getBufferSize(): number;
}
```

### 6. Integration with Run Command

Update `src/commands/run.ts`:

```typescript
export interface RunOptions {
  runner: string;
  mode: string;
  stream?: boolean;           // NEW: Enable streaming
  watch?: boolean;            // NEW: Watch mode
  streamFormat?: 'text' | 'json' | 'sse';  // NEW: Output format
}

// In runCommand:
if (options.stream || options.watch) {
  const streamer = new StreamingRunner(config.streaming);
  await streamer.startStream(task.id);
  
  // Hook into runner events
  runner.on('output', (data) => {
    streamer.emit({
      type: 'output',
      data,
      timestamp: new Date().toISOString(),
    });
  });
  
  runner.on('progress', (meta) => {
    streamer.emit({
      type: 'progress',
      metadata: meta,
      timestamp: new Date().toISOString(),
    });
  });
}
```

### 7. Configuration

Add to `magneto.config.json`:

```json
{
  "streaming": {
    "enabled": true,
    "format": "text",
    "transport": "stdio",
    "bufferSize": 1024,
    "flushInterval": 100,
    "compression": true,
    "progress": {
      "showSpinner": true,
      "showProgressBar": true,
      "showStepIndicator": true,
      "showTokenCount": true,
      "showEstimatedTime": true
    }
  }
}
```

### 8. CLI Display Modes

**Text Mode** (default):
```
⠋ Analyzing codebase... (step 1/5)
[████████████████░░░░░░░░░░░░░░░░░░] 40%
Tokens: 1,245 | Est. time: 2m 30s

> Processing file: src/core/context.ts
> Found 15 functions, 3 classes
> Generating embeddings...
```

**JSON Mode** (`--output json`):
```json
{"type":"progress","stepIndex":1,"totalSteps":5,"metadata":{"percentComplete":40,"tokensUsed":1245}}
{"type":"output","data":"Processing file: src/core/context.ts"}
```

**Watch Mode** (`--watch`):
```
[2024-04-19 10:30:01] Step 2/5: Generating plan
[2024-04-19 10:30:02] Output: Found 3 sub-agents needed
[2024-04-19 10:30:03] Progress: 45%
[2024-04-19 10:30:05] Checkpoint: Plan saved to cache
```

## Implementation Phases

### Phase 1: Core Streaming Engine (Week 1)
- [ ] Create `src/core/streaming-runner.ts`
- [ ] Implement StreamEvent types and interfaces
- [ ] Build BackpressureController
- [ ] Add unit tests

### Phase 2: Transport Layer (Week 1)
- [ ] Create `src/mcp/sse-streaming.ts` for Server-Sent Events
- [ ] Create `src/mcp/streaming-server.ts` for WebSocket
- [ ] Implement stdio transport for CLI

### Phase 3: UI/Progress (Week 2)
- [ ] Create `src/utils/progress-renderer.ts`
- [ ] Add spinner, progress bar, step indicator
- [ ] Implement live output display

### Phase 4: CLI Integration (Week 2)
- [ ] Update `src/commands/run.ts` with --stream, --watch options
- [ ] Update `src/cli.ts` with new flags
- [ ] Add configuration handling

### Phase 5: Testing & Documentation (Week 3)
- [ ] Unit tests for streaming components
- [ ] Integration tests
- [ ] Documentation

## Acceptance Criteria

- [ ] `magneto run task.md --stream` shows real-time output
- [ ] Progress bar updates correctly (0-100%)
- [ ] Spinner shows during processing
- [ ] Step indicator shows "Step X/Y"
- [ ] Token count and estimated time displayed
- [ ] JSON format works with `--output json`
- [ ] Watch mode shows timestamped updates
- [ ] Backpressure handles large outputs gracefully
- [ ] All tests pass
- [ ] Documentation complete

## Testing Scenarios

1. **Basic Streaming**
   ```bash
   magneto run task.md --stream
   # Should show live progress
   ```

2. **JSON Streaming**
   ```bash
   magneto run task.md --stream --output json | jq
   # Should parse as valid JSON stream
   ```

3. **Long-running Task**
   ```bash
   magneto run large-analysis.md --stream
   # Progress should update every 100ms
   # No UI freezing
   ```

4. **High Volume Output**
   ```bash
   magneto run verbose-task.md --stream
   # Backpressure should prevent memory issues
   ```

## Performance Requirements

- Stream flush interval: ≤100ms
- UI update rate: 60fps for smooth progress
- Memory usage: <50MB for 10k line output
- Backpressure: Handle 1MB/s sustained output

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Terminal flickering | Use ANSI escape codes properly, clear only changed lines |
| Memory overflow | Backpressure controller with configurable limits |
| Network latency (WebSocket) | Buffer events, compress large payloads |
| JSON parsing errors | Schema validation, graceful degradation to text |

## Documentation Requirements

- [ ] `docs/STREAMING.md` - User guide for streaming features
- [ ] `docs/STREAMING-CONFIG.md` - Configuration reference
- [ ] Inline help for --stream, --watch options

---

**Estimated Effort**: 3 weeks
**Dependencies**: None (builds on existing runner infrastructure)
**Breaking Changes**: None (additive feature)
**Security Review**: Not required (no security impact)

