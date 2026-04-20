import { StreamEvent } from '../core/streaming-runner';

export interface ProgressRenderOptions {
  width?: number;
  showSpinner?: boolean;
  showProgressBar?: boolean;
  showStepIndicator?: boolean;
  showTokenCount?: boolean;
  showEstimatedTime?: boolean;
}

export class ProgressRenderer {
  private options: ProgressRenderOptions;
  private spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private spinnerIndex = 0;
  private lastRender = '';

  constructor(options: ProgressRenderOptions = {}) {
    this.options = {
      width: 30,
      showSpinner: true,
      showProgressBar: true,
      showStepIndicator: true,
      showTokenCount: true,
      showEstimatedTime: true,
      ...options,
    };
  }

  renderProgressBar(percent: number, width?: number): string {
    const barWidth = width || this.options.width || 30;
    const filled = Math.round((percent / 100) * barWidth);
    const empty = barWidth - filled;
    return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
  }

  renderSpinner(text?: string): string {
    const frame = this.spinnerFrames[this.spinnerIndex];
    this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerFrames.length;
    return text ? `${frame} ${text}` : frame;
  }

  renderStepIndicator(current: number, total: number): string {
    return `Step ${current}/${total}`;
  }

  renderLiveOutput(data: string): void {
    console.log(`> ${data}`);
  }

  renderEvent(event: StreamEvent): string {
    switch (event.type) {
      case 'start':
        return this.renderStart();
      case 'progress':
        return this.renderProgress(event);
      case 'output':
        return this.renderOutput(event.data || '');
      case 'checkpoint':
        return this.renderCheckpoint(event.data || '');
      case 'error':
        return this.renderError(event.data || '');
      case 'complete':
        return this.renderComplete(event.data);
      default:
        return '';
    }
  }

  private renderStart(): string {
    return `
┌────────────────────────────────────────
│ 🚀 Stream Started
└────────────────────────────────────────`;
  }

  private renderProgress(event: StreamEvent): string {
    const percent = event.metadata?.percentComplete || 0;
    const currentStep = event.stepIndex !== undefined ? event.stepIndex + 1 : 1;
    const totalSteps = event.totalSteps || 1;
    const operation = event.metadata?.currentOperation || 'Processing...';
    
    const parts: string[] = [];

    if (this.options.showSpinner) {
      parts.push(this.renderSpinner());
    }

    if (this.options.showStepIndicator) {
      parts.push(this.renderStepIndicator(currentStep, totalSteps));
    }

    if (this.options.showProgressBar) {
      parts.push(this.renderProgressBar(percent));
    }

    parts.push(`${percent.toFixed(1)}%`);

    // Add metadata
    const metadata: string[] = [];
    
    if (this.options.showTokenCount && event.metadata?.tokensUsed) {
      metadata.push(`Tokens: ${event.metadata.tokensUsed.toLocaleString()}`);
    }

    if (this.options.showEstimatedTime && event.metadata?.estimatedTimeRemaining) {
      const seconds = event.metadata.estimatedTimeRemaining;
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      metadata.push(`Est: ${mins}m ${secs}s`);
    }

    if (metadata.length > 0) {
      parts.push('| ' + metadata.join(' | '));
    }

    parts.push(`| ${operation}`);

    const line = parts.join(' ');
    
    // Clear previous line and render new one
    if (process.stdout.clearLine && process.stdout.cursorTo) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(line);
      
      if (percent >= 100) {
        process.stdout.write('\n');
      }
    } else {
      console.log(line);
    }

    this.lastRender = line;
    return line;
  }

  private renderOutput(data: string): string {
    // Clear any in-progress progress line
    if (this.lastRender && process.stdout.clearLine) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
    }
    
    const output = `> ${data}`;
    console.log(output);
    return output;
  }

  private renderCheckpoint(message: string): string {
    if (this.lastRender && process.stdout.clearLine) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
    }
    
    const output = `✓ Checkpoint: ${message}`;
    console.log(output);
    return output;
  }

  private renderError(message: string): string {
    if (this.lastRender && process.stdout.clearLine) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
    }
    
    const output = `✗ Error: ${message}`;
    console.error(output);
    return output;
  }

  private renderComplete(summary?: string): string {
    if (this.lastRender && process.stdout.clearLine) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
    }
    
    let output = '\n✅ Stream Completed';
    if (summary) {
      output += `\n   ${summary}`;
    }
    console.log(output);
    return output;
  }

  clear(): void {
    if (this.lastRender && process.stdout.clearLine && process.stdout.cursorTo) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
    }
    this.lastRender = '';
  }

  // Static utility methods for one-off rendering
  static renderProgressBar(percent: number, width = 30): string {
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
  }

  static renderSpinner(): string {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    const frame = frames[Math.floor(Date.now() / 80) % frames.length];
    return frame;
  }

  static formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${mins}m ${secs}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    }
  }

  static formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}

// Factory function for creating renderers with preset configurations
export function createProgressRenderer(
  format: 'minimal' | 'standard' | 'verbose' = 'standard'
): ProgressRenderer {
  const configs: Record<string, ProgressRenderOptions> = {
    minimal: {
      showSpinner: true,
      showProgressBar: true,
      showStepIndicator: false,
      showTokenCount: false,
      showEstimatedTime: false,
      width: 20,
    },
    standard: {
      showSpinner: true,
      showProgressBar: true,
      showStepIndicator: true,
      showTokenCount: true,
      showEstimatedTime: true,
      width: 30,
    },
    verbose: {
      showSpinner: true,
      showProgressBar: true,
      showStepIndicator: true,
      showTokenCount: true,
      showEstimatedTime: true,
      width: 40,
    },
  };

  return new ProgressRenderer(configs[format]);
}
