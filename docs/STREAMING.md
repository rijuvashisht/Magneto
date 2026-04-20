# Streaming Runner Output

Magneto's streaming runner provides real-time output during task execution, allowing you to see progress as it happens rather than waiting for completion.

## Overview

The streaming feature displays:
- **Live progress bars** with percentage completion
- **Spinners** showing active processing
- **Step indicators** (Step X/Y)
- **Token counts** and **estimated time remaining**
- **Real-time output** from AI agents
- **Checkpoint notifications**

## Usage

### Basic Streaming

```bash
magneto run task.md --stream
```

Enables real-time streaming with progress indicators.

### Watch Mode

```bash
magneto run task.md --watch
```

Continuously displays updates with timestamps.

### JSON Format

```bash
magneto run task.md --stream --stream-format json
```

Outputs machine-readable JSON stream:

```json
{"type":"start","timestamp":"2024-04-19T10:30:00Z"}
{"type":"progress","metadata":{"percentComplete":45,"tokensUsed":1245},"timestamp":"2024-04-19T10:30:01Z"}
{"type":"output","data":"Processing file: src/app.ts","timestamp":"2024-04-19T10:30:02Z"}
{"type":"complete","timestamp":"2024-04-19T10:30:05Z"}
```

### Server-Sent Events (SSE)

```bash
magneto run task.md --stream --stream-format sse
```

Outputs SSE format for browser/EventSource consumption:

```
data: {"type":"progress","metadata":{"percentComplete":50}}

data: {"type":"output","data":"Analysis complete"}
```

## Display Formats

### Text Mode (Default)

```
┌────────────────────────────────────────
│ 🚀 Stream Started
└────────────────────────────────────────

⠋ Step 2/5 [████████████████░░░░░░░░░░░░░░░░░░] 40.0% | Tokens: 1,245 | Est: 2m 30s | Generating plan...
> Processing file: src/core/context.ts
> Found 15 functions, 3 classes
> Generating embeddings...

✓ Checkpoint: Plan saved to cache

✅ Stream Completed
   Task completed successfully
```

### Watch Mode

```
[2024-04-19 10:30:01] Step 2/5: Generating plan
[2024-04-19 10:30:02] Output: Found 3 sub-agents needed
[2024-04-19 10:30:03] Progress: 45%
[2024-04-19 10:30:05] Checkpoint: Plan saved to cache
[2024-04-19 10:30:08] Complete: Task finished
```

## Configuration

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

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `enabled` | Enable streaming globally | `true` |
| `format` | Output format: text, json, sse | `text` |
| `transport` | Transport method: stdio, websocket, sse | `stdio` |
| `bufferSize` | Events to buffer before flush | `1024` |
| `flushInterval` | Milliseconds between forced flushes | `100` |
| `compression` | Compress large outputs | `true` |
| `progress.showSpinner` | Show animated spinner | `true` |
| `progress.showProgressBar` | Show progress bar | `true` |
| `progress.showStepIndicator` | Show "Step X/Y" | `true` |
| `progress.showTokenCount` | Show token usage | `true` |
| `progress.showEstimatedTime` | Show ETA | `true` |

## Stream Events

The streaming runner emits the following event types:

### Start Event

```json
{
  "type": "start",
  "timestamp": "2024-04-19T10:30:00Z",
  "metadata": {
    "currentOperation": "Stream started"
  }
}
```

### Progress Event

```json
{
  "type": "progress",
  "timestamp": "2024-04-19T10:30:01Z",
  "stepIndex": 2,
  "totalSteps": 5,
  "metadata": {
    "percentComplete": 45,
    "tokensUsed": 1245,
    "estimatedTimeRemaining": 150,
    "currentOperation": "Analyzing codebase",
    "bytesProcessed": 102400,
    "linesProcessed": 1500
  }
}
```

### Output Event

```json
{
  "type": "output",
  "timestamp": "2024-04-19T10:30:02Z",
  "stepIndex": 2,
  "data": "Processing file: src/core/context.ts"
}
```

### Checkpoint Event

```json
{
  "type": "checkpoint",
  "timestamp": "2024-04-19T10:30:03Z",
  "data": "Plan saved to cache"
}
```

### Error Event

```json
{
  "type": "error",
  "timestamp": "2024-04-19T10:30:04Z",
  "data": "Failed to connect to API"
}
```

### Complete Event

```json
{
  "type": "complete",
  "timestamp": "2024-04-19T10:30:05Z",
  "data": "Task completed successfully"
}
```

## Use Cases

### 1. Long-Running Analysis

For tasks that take minutes or hours, streaming provides visibility:

```bash
magneto run large-codebase-analysis.md --stream
```

Output:
```
⠋ Step 1/3 [██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 15.0% | Tokens: 5,432 | Est: 12m | Scanning src/...
> Found 150 source files
> Parsing TypeScript AST...
> Extracting dependencies...
```

### 2. CI/CD Integration

JSON format for programmatic processing:

```bash
magneto run task.md --stream --stream-format json | jq -c '. | select(.type == "progress")'
```

### 3. Real-time Monitoring

Watch mode with timestamps:

```bash
magneto run task.md --watch 2>&1 | tee execution.log
```

### 4. Web Dashboard

SSE format for browser dashboards:

```javascript
const eventSource = new EventSource('/magneto-stream');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateProgressBar(data.metadata.percentComplete);
};
```

## Performance

### Memory Usage

- **Buffer size**: Default 1024 events (~100KB)
- **Max memory**: ~50MB for 10,000 line output
- **Backpressure**: Automatic handling of large outputs

### Update Frequency

- **UI updates**: 60fps smooth animation
- **Flush interval**: 100ms (configurable)
- **Network**: Compressed batches for WebSocket/SSE

## Backpressure

When output exceeds buffer capacity, the runner handles it gracefully:

| Strategy | Behavior |
|----------|----------|
| `block` | Pause until buffer drains (default) |
| `drop-old` | Remove oldest events to make room |
| `sample` | Drop every other event to reduce load |

Configure in `magneto.config.json`:

```json
{
  "streaming": {
    "backpressure": {
      "highWaterMark": 1000,
      "lowWaterMark": 100,
      "maxQueueSize": 5000,
      "strategy": "block"
    }
  }
}
```

## Error Handling

Stream errors are handled gracefully:

1. **Buffer overflow**: Backpressure kicks in
2. **Network disconnect**: Auto-reconnect with exponential backoff
3. **Invalid JSON**: Graceful degradation to text mode
4. **Terminal resize**: Progress bar adjusts automatically

## API Usage

### Programmatic Access

```typescript
import { StreamingRunner } from 'magneto-ai';

const runner = new StreamingRunner({
  format: 'json',
  transport: 'stdio',
});

await runner.startStream('task-123');

// Listen to events
runner.on('event', (event) => {
  console.log('Event:', event.type);
});

// Emit custom events
await runner.emitProgress(50, {
  currentOperation: 'Processing...',
});

await runner.emitOutput('Step complete');
await runner.emitComplete('Done');
await runner.end();
```

### Event Types

```typescript
interface StreamEvent {
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
```

## Troubleshooting

### Progress bar not updating

- Check `flushInterval` setting (default 100ms)
- Ensure terminal supports ANSI codes
- Try `format: 'json'` to see raw events

### Too much output

- Increase `bufferSize`
- Use `strategy: 'sample'` to reduce events
- Filter with `grep`: `magneto run task.md --stream | grep "Progress"`

### Terminal flickering

- Reduce update frequency: `flushInterval: 500`
- Disable spinner: `showSpinner: false`
- Use `--stream-format json` for cleaner output

### Memory issues

- Reduce `bufferSize` to 512 or 256
- Enable compression: `compression: true`
- Use `strategy: 'drop-old'` for high-volume output

## Comparison

| Feature | Default | `--stream` | `--watch` | `--stream-format json` |
|---------|---------|------------|-----------|------------------------|
| Progress bar | ❌ | ✅ | ❌ | ❌ |
| Spinner | ❌ | ✅ | ❌ | ❌ |
| Live output | ❌ | ✅ | ✅ | ✅ |
| Timestamps | ❌ | ❌ | ✅ | ✅ |
| JSON output | ❌ | ❌ | ❌ | ✅ |
| ETA display | ❌ | ✅ | ❌ | ❌ |
| Token count | ❌ | ✅ | ❌ | ❌ |

## See Also

- [Interactive Workflow](./INTERACTIVE-WORKFLOW.md)
- [Configuration](./CONFIGURATION.md)
- [CLI Reference](../README.md#commands)
