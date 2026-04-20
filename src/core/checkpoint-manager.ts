import { EventEmitter } from 'events';
import * as path from 'path';
import { fileExists, readJson, writeJson, ensureDir } from '../utils/fs';

export interface Checkpoint {
  id: string;
  taskId: string;
  stepIndex: number;
  totalSteps: number;
  state: {
    context: any;
    results: any[];
    variables: Record<string, any>;
  };
  metadata: {
    createdAt: string;
    description: string;
    automatic: boolean;
    tags: string[];
  };
}

export interface AutoCheckpointConfig {
  enabled: boolean;
  interval: number;
  onError: boolean;
  maxCheckpoints: number;
}

export class CheckpointManager extends EventEmitter {
  private checkpointsDir: string;
  private autoConfig: AutoCheckpointConfig;
  private checkpoints: Map<string, Checkpoint> = new Map();

  constructor(projectRoot: string, autoConfig?: Partial<AutoCheckpointConfig>) {
    super();
    this.checkpointsDir = path.join(projectRoot, '.magneto', 'checkpoints');
    this.autoConfig = {
      enabled: true,
      interval: 5,
      onError: true,
      maxCheckpoints: 10,
      ...autoConfig,
    };
  }

  async init(): Promise<void> {
    await ensureDir(this.checkpointsDir);
    await this.loadAll();
  }

  async save(
    taskId: string,
    stepIndex: number,
    totalSteps: number,
    state: Checkpoint['state'],
    options: {
      description?: string;
      automatic?: boolean;
      tags?: string[];
    } = {}
  ): Promise<Checkpoint> {
    const id = `chk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const checkpoint: Checkpoint = {
      id,
      taskId,
      stepIndex,
      totalSteps,
      state,
      metadata: {
        createdAt: new Date().toISOString(),
        description: options.description || `Checkpoint at step ${stepIndex}/${totalSteps}`,
        automatic: options.automatic ?? false,
        tags: options.tags || [],
      },
    };

    // Save to disk
    const filePath = path.join(this.checkpointsDir, `${id}.json`);
    await writeJson(filePath, checkpoint);

    // Update in-memory cache
    this.checkpoints.set(id, checkpoint);

    // Manage auto-checkpoint limit
    if (options.automatic && this.autoConfig.enabled) {
      await this.enforceMaxCheckpoints(taskId);
    }

    this.emit('saved', checkpoint);
    return checkpoint;
  }

  async load(checkpointId: string): Promise<Checkpoint> {
    // Check in-memory first
    let checkpoint = this.checkpoints.get(checkpointId);
    
    if (!checkpoint) {
      // Load from disk
      const filePath = path.join(this.checkpointsDir, `${checkpointId}.json`);
      if (!await fileExists(filePath)) {
        throw new Error(`Checkpoint not found: ${checkpointId}`);
      }
      checkpoint = await readJson<Checkpoint>(filePath);
      this.checkpoints.set(checkpointId, checkpoint);
    }

    return checkpoint;
  }

  async list(taskId?: string): Promise<Checkpoint[]> {
    let checkpoints = Array.from(this.checkpoints.values());

    if (taskId) {
      checkpoints = checkpoints.filter(c => c.taskId === taskId);
    }

    // Sort by creation time (newest first)
    checkpoints.sort((a, b) => 
      new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime()
    );

    return checkpoints;
  }

  async delete(checkpointId: string): Promise<boolean> {
    const filePath = path.join(this.checkpointsDir, `${checkpointId}.json`);
    
    try {
      const fs = await import('fs');
      fs.unlinkSync(filePath);
    } catch (err) {
      // File might not exist
    }

    const existed = this.checkpoints.has(checkpointId);
    this.checkpoints.delete(checkpointId);

    if (existed) {
      this.emit('deleted', checkpointId);
    }

    return existed;
  }

  async autoSave(
    taskId: string,
    stepIndex: number,
    totalSteps: number,
    state: Checkpoint['state']
  ): Promise<Checkpoint | null> {
    if (!this.autoConfig.enabled) {
      return null;
    }

    // Only save at intervals
    if (stepIndex % this.autoConfig.interval !== 0) {
      return null;
    }

    return this.save(taskId, stepIndex, totalSteps, state, {
      description: `Auto-save at step ${stepIndex}/${totalSteps}`,
      automatic: true,
      tags: ['auto', `step-${stepIndex}`],
    });
  }

  async saveOnError(
    taskId: string,
    stepIndex: number,
    totalSteps: number,
    state: Checkpoint['state'],
    error: Error
  ): Promise<Checkpoint | null> {
    if (!this.autoConfig.enabled || !this.autoConfig.onError) {
      return null;
    }

    return this.save(taskId, stepIndex, totalSteps, state, {
      description: `Error checkpoint: ${error.message}`,
      automatic: true,
      tags: ['error', `step-${stepIndex}`],
    });
  }

  async resumeFrom(checkpointId: string): Promise<{
    checkpoint: Checkpoint;
    canResume: boolean;
  }> {
    const checkpoint = await this.load(checkpointId);

    // Validate checkpoint
    const canResume = this.validateCheckpoint(checkpoint);

    if (canResume) {
      this.emit('resumed', checkpoint);
    }

    return { checkpoint, canResume };
  }

  async getLatest(taskId: string): Promise<Checkpoint | null> {
    const taskCheckpoints = await this.list(taskId);
    return taskCheckpoints[0] || null;
  }

  async clear(taskId?: string): Promise<number> {
    let toDelete: string[];

    if (taskId) {
      const taskCheckpoints = await this.list(taskId);
      toDelete = taskCheckpoints.map(c => c.id);
    } else {
      toDelete = Array.from(this.checkpoints.keys());
    }

    let deletedCount = 0;
    for (const id of toDelete) {
      if (await this.delete(id)) {
        deletedCount++;
      }
    }

    this.emit('cleared', { deleted: deletedCount, taskId });
    return deletedCount;
  }

  async stats(): Promise<{
    totalCheckpoints: number;
    byTask: Record<string, number>;
    autoCheckpoints: number;
    manualCheckpoints: number;
  }> {
    const checkpoints = await this.list();

    const byTask: Record<string, number> = {};
    let autoCheckpoints = 0;
    let manualCheckpoints = 0;

    for (const checkpoint of checkpoints) {
      byTask[checkpoint.taskId] = (byTask[checkpoint.taskId] || 0) + 1;
      
      if (checkpoint.metadata.automatic) {
        autoCheckpoints++;
      } else {
        manualCheckpoints++;
      }
    }

    return {
      totalCheckpoints: checkpoints.length,
      byTask,
      autoCheckpoints,
      manualCheckpoints,
    };
  }

  setAutoConfig(config: Partial<AutoCheckpointConfig>): void {
    this.autoConfig = { ...this.autoConfig, ...config };
  }

  getAutoConfig(): AutoCheckpointConfig {
    return { ...this.autoConfig };
  }

  private async loadAll(): Promise<void> {
    const fs = await import('fs');
    
    try {
      const files = fs.readdirSync(this.checkpointsDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.checkpointsDir, file);
          try {
            const checkpoint = await readJson<Checkpoint>(filePath);
            this.checkpoints.set(checkpoint.id, checkpoint);
          } catch (err) {
            // Skip invalid checkpoint files
            console.warn(`Failed to load checkpoint: ${file}`);
          }
        }
      }
    } catch (err) {
      // Directory might be empty or not exist yet
    }
  }

  private async enforceMaxCheckpoints(taskId: string): Promise<void> {
    const taskCheckpoints = (await this.list(taskId))
      .filter(c => c.metadata.automatic);

    if (taskCheckpoints.length > this.autoConfig.maxCheckpoints) {
      // Delete oldest auto-checkpoints
      const toDelete = taskCheckpoints.slice(this.autoConfig.maxCheckpoints);
      for (const checkpoint of toDelete) {
        await this.delete(checkpoint.id);
      }
    }
  }

  private validateCheckpoint(checkpoint: Checkpoint): boolean {
    // Check if checkpoint has required fields
    if (!checkpoint.state || !checkpoint.taskId) {
      return false;
    }

    // Check if step index is valid
    if (checkpoint.stepIndex < 0 || checkpoint.stepIndex > checkpoint.totalSteps) {
      return false;
    }

    // Could add more validation here
    // - Check if referenced files still exist
    // - Check if context is still valid

    return true;
  }
}

// Singleton instance
let globalManager: CheckpointManager | null = null;

export function getGlobalCheckpointManager(): CheckpointManager {
  if (!globalManager) {
    throw new Error('Checkpoint manager not initialized. Call initGlobalCheckpointManager() first.');
  }
  return globalManager;
}

export function initGlobalCheckpointManager(
  projectRoot: string,
  config?: Partial<AutoCheckpointConfig>
): CheckpointManager {
  globalManager = new CheckpointManager(projectRoot, config);
  return globalManager;
}

export function setGlobalCheckpointManager(manager: CheckpointManager): void {
  globalManager = manager;
}
