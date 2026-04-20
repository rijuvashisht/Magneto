import { EventEmitter } from 'events';

export interface StreamingConfig {
  enabled: boolean;
  format: 'text' | 'json' | 'sse';
  transport: 'websocket' | 'sse' | 'stdio';
  bufferSize: number;
  flushInterval: number;
  compression: boolean;
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
    bytesProcessed?: number;
    linesProcessed?: number;
  };
}

export interface StreamSession {
  id: string;
  taskId: string;
  startTime: string;
  events: StreamEvent[];
  status: 'running' | 'paused' | 'completed' | 'error';
  config: StreamingConfig;
}

export interface BackpressureConfig {
  highWaterMark: number;
  lowWaterMark: number;
  maxQueueSize: number;
  strategy: 'drop-old' | 'block' | 'sample';
}

export class BackpressureController {
  private buffer: StreamEvent[] = [];
  private config: BackpressureConfig;
  private paused = false;

  constructor(config?: Partial<BackpressureConfig>) {
    this.config = {
      highWaterMark: 1000,
      lowWaterMark: 100,
      maxQueueSize: 5000,
      strategy: 'block',
      ...config,
    };
  }

  async write(chunk: StreamEvent): Promise<boolean> {
    if (this.paused) {
      await this.waitForDrain();
    }

    if (this.buffer.length >= this.config.highWaterMark) {
      switch (this.config.strategy) {
        case 'drop-old':
          this.buffer = this.buffer.slice(-this.config.maxQueueSize);
          break;
        case 'block':
          this.paused = true;
          await this.waitForDrain();
          break;
        case 'sample':
          // Drop every other event to reduce load
          this.buffer = this.buffer.filter((_, i) => i % 2 === 0);
          break;
      }
    }

    this.buffer.push(chunk);
    return true;
  }

  async drain(): Promise<void> {
    const events = [...this.buffer];
    this.buffer = [];
    this.paused = false;
    return events as unknown as void;
  }

  getBufferSize(): number {
    return this.buffer.length;
  }

  isPaused(): boolean {
    return this.paused;
  }

  private waitForDrain(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (this.buffer.length <= this.config.lowWaterMark) {
          this.paused = false;
          resolve();
        } else {
          setTimeout(check, 10);
        }
      };
      check();
    });
  }

  getEvents(): StreamEvent[] {
    return [...this.buffer];
  }

  clear(): void {
    this.buffer = [];
    this.paused = false;
  }
}

export class StreamingRunner extends EventEmitter {
  private session: StreamSession | null = null;
  private config: StreamingConfig;
  private backpressure: BackpressureController;
  private flushTimer: NodeJS.Timeout | null = null;
  private paused = false;

  constructor(config: Partial<StreamingConfig> = {}) {
    super();
    this.config = {
      enabled: true,
      format: 'text',
      transport: 'stdio',
      bufferSize: 1024,
      flushInterval: 100,
      compression: false,
      ...config,
    };
    this.backpressure = new BackpressureController();
  }

  async startStream(taskId: string): Promise<StreamSession> {
    const sessionId = `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.session = {
      id: sessionId,
      taskId,
      startTime: new Date().toISOString(),
      events: [],
      status: 'running',
      config: this.config,
    };

    // Start flush timer
    if (this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flushBuffer();
      }, this.config.flushInterval);
    }

    // Emit start event
    await this.emitEvent({
      timestamp: new Date().toISOString(),
      type: 'start',
      metadata: {
        currentOperation: 'Stream started',
      },
    });

    super.emit('stream-started', this.session);
    return this.session;
  }

  async emitEvent(event: StreamEvent): Promise<void> {
    if (!this.session || this.session.status !== 'running') {
      return;
    }

    if (this.paused) {
      await this.waitForResume();
    }

    // Add to session events
    this.session.events.push(event);

    // Add to backpressure buffer
    await this.backpressure.write(event);

    // Emit immediately for stdio transport
    if (this.config.transport === 'stdio') {
      super.emit('event', event);
      this.renderEvent(event);
    }
  }

  async emitOutput(data: string, stepIndex?: number): Promise<void> {
    await this.emitEvent({
      timestamp: new Date().toISOString(),
      type: 'output',
      stepIndex,
      data,
    });
  }

  async emitProgress(
    percentComplete: number,
    metadata?: StreamEvent['metadata']
  ): Promise<void> {
    await this.emitEvent({
      timestamp: new Date().toISOString(),
      type: 'progress',
      metadata: {
        percentComplete,
        ...metadata,
      },
    });
  }

  async emitCheckpoint(message: string): Promise<void> {
    await this.emitEvent({
      timestamp: new Date().toISOString(),
      type: 'checkpoint',
      data: message,
    });
  }

  async emitError(error: string | Error): Promise<void> {
    const message = error instanceof Error ? error.message : error;
    await this.emitEvent({
      timestamp: new Date().toISOString(),
      type: 'error',
      data: message,
    });
  }

  async emitComplete(summary?: string): Promise<void> {
    await this.emitEvent({
      timestamp: new Date().toISOString(),
      type: 'complete',
      data: summary || 'Stream completed',
    });
    
    if (this.session) {
      this.session.status = 'completed';
    }
  }

  pause(): void {
    this.paused = true;
    if (this.session) {
      this.session.status = 'paused';
    }
  }

  resume(): void {
    this.paused = false;
    if (this.session) {
      this.session.status = 'running';
    }
    super.emit('resumed');
  }

  async end(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush remaining events
    await this.flushBuffer();

    if (this.session && this.session.status === 'running') {
      this.session.status = 'completed';
    }

    super.emit('stream-ended', this.session);
  }

  getSession(): StreamSession | null {
    return this.session;
  }

  getEvents(): StreamEvent[] {
    return this.session?.events || [];
  }

  isPaused(): boolean {
    return this.paused;
  }

  private async flushBuffer(): Promise<void> {
    const events = this.backpressure.getEvents();
    if (events.length === 0) return;

    this.backpressure.clear();

    // Process based on format
    switch (this.config.format) {
      case 'json':
        for (const event of events) {
          console.log(JSON.stringify(event));
        }
        break;
      case 'sse':
        for (const event of events) {
          console.log(`data: ${JSON.stringify(event)}\n`);
        }
        break;
      case 'text':
      default:
        // Text format is handled by renderEvent
        break;
    }
  }

  private renderEvent(event: StreamEvent): void {
    if (this.config.format !== 'text') return;

    switch (event.type) {
      case 'start':
        console.log('┌────────────────────────────────────────');
        console.log('│ 🚀 Stream Started');
        console.log('└────────────────────────────────────────');
        break;

      case 'progress':
        const percent = event.metadata?.percentComplete || 0;
        const bar = this.renderProgressBar(percent, 30);
        const spinner = this.getSpinner();
        const operation = event.metadata?.currentOperation || 'Processing...';
        
        process.stdout.clearLine?.(0);
        process.stdout.cursorTo?.(0);
        process.stdout.write(
          `${spinner} ${bar} ${percent.toFixed(1)}% | ${operation}`
        );
        
        if (percent >= 100) {
          process.stdout.write('\n');
        }
        break;

      case 'output':
        if (event.data) {
          console.log(`> ${event.data}`);
        }
        break;

      case 'checkpoint':
        console.log(`✓ Checkpoint: ${event.data}`);
        break;

      case 'error':
        console.error(`✗ Error: ${event.data}`);
        break;

      case 'complete':
        console.log('\n✅ Stream Completed');
        if (event.data) {
          console.log(`   ${event.data}`);
        }
        break;
    }
  }

  private renderProgressBar(percent: number, width: number): string {
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `[${bar}]`;
  }

  private spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private spinnerIndex = 0;

  private getSpinner(): string {
    const frame = this.spinnerFrames[this.spinnerIndex];
    this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerFrames.length;
    return frame;
  }

  private waitForResume(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (!this.paused) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }
}

// Singleton instance for global access
let globalRunner: StreamingRunner | null = null;

export function getGlobalStreamingRunner(): StreamingRunner {
  if (!globalRunner) {
    globalRunner = new StreamingRunner();
  }
  return globalRunner;
}

export function setGlobalStreamingRunner(runner: StreamingRunner): void {
  globalRunner = runner;
}
