import * as path from 'path';
import { logger } from '../utils/logger';
import { resolveProjectRoot, isMagnetoProject } from '../utils/paths';
import { writeJson, fileExists } from '../utils/fs';
import { buildContext } from '../core/context';
import { evaluateSecurity, ExecutionMode } from '../core/security-engine';
import { RunnerType, createRunner } from '../runners/types';
import { parseTaskFile } from '../utils/task-parser';
import { InteractiveWorkflow, ExecutionPlan, PlanStep } from '../core/interactive-workflow';
import { StreamingRunner, StreamingConfig } from '../core/streaming-runner';
import { ProgressRenderer } from '../utils/progress-renderer';
import { 
  DecompositionEngine, 
  getGlobalDecompositionEngine,
  DecompositionResult 
} from '../core/decomposition-engine';
import { 
  SubAgentOrchestrator, 
  getGlobalSubAgentOrchestrator,
  SubAgent 
} from '../core/sub-agent-orchestrator';
import { getGlobalTokenCollector, resetGlobalTokenCollector } from '../core/token-tracker';
import { getGlobalPerformanceTracker } from '../core/performance-tracker';
import { listFiles } from '../utils/fs';

export interface RunOptions {
  runner: string;
  mode: string;
  interactive?: boolean;
  approveEach?: boolean;
  diff?: boolean;
  rollbackOnFail?: boolean;
  autoApproveLowRisk?: boolean;
  stream?: boolean;
  watch?: boolean;
  streamFormat?: 'text' | 'json' | 'sse';
  withMemory?: boolean;
  saveMemory?: boolean;
  checkpointAuto?: boolean;
  resume?: string;
  decompose?: boolean;
  noDecompose?: boolean;
  maxSubAgents?: number;
  coordination?: 'sequential' | 'parallel' | 'hybrid';
  watchSubAgents?: boolean;
  trackTokens?: boolean;
}

async function getTotalFiles(projectRoot: string): Promise<number> {
  try {
    const files = await listFiles(projectRoot);
    // Filter out common exclude directories
    const filtered = files.filter(f => 
      !f.includes('node_modules') && 
      !f.includes('.git') && 
      !f.includes('dist') && 
      !f.includes('build')
    );
    return filtered.length;
  } catch {
    return 0;
  }
}

function calculateCompressionRatio(filesLoaded: number, totalFiles: number): number {
  if (totalFiles === 0) return 0;
  return ((totalFiles - filesLoaded) / totalFiles) * 100;
}

export async function runCommand(taskFile: string, options: RunOptions): Promise<void> {
  const projectRoot = resolveProjectRoot();

  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto AI project. Run "magneto init" first.');
    process.exit(1);
  }

  // Initialize performance tracker
  const perfTracker = getGlobalPerformanceTracker(projectRoot);

  // Initialize token collector if tracking is enabled
  if (options.trackTokens) {
    const collector = getGlobalTokenCollector(projectRoot);
    logger.info('📊 Token tracking enabled - A/B mode active');
  }

  const taskPath = path.resolve(projectRoot, taskFile);
  logger.info(`Running task: ${taskPath}`);

  let task: any;
  try {
    task = parseTaskFile(taskPath);
  } catch {
    logger.error(`Failed to read task file: ${taskPath}`);
    process.exit(1);
  }

  const taskId = (task as any).id || taskFile;

  // Start task timing
  perfTracker.startTask(taskId);

  // Security check
  const context = await buildContext(projectRoot, task);
  const security = evaluateSecurity(task, context);

  const mode = options.mode as ExecutionMode;
  if (security.approvalRequired && mode === 'execute') {
    logger.error('Task requires approval. Cannot auto-execute in restricted mode.');
    logger.warn('Use --mode assist or --mode observe instead.');
    process.exit(1);
  }

  if (security.securityRisk === 'high' && mode !== 'restricted') {
    logger.warn('High security risk detected. Switching to restricted mode.');
  }

  // Decomposition check
  let decomposition: DecompositionResult | null = null;
  let subAgents: SubAgent[] = [];
  
  if (!options.noDecompose) {
    const engine = getGlobalDecompositionEngine();
    decomposition = await engine.analyze(task);
    
    if (decomposition && (decomposition.shouldDecompose || options.decompose)) {
      logger.info(`Task complexity: ${decomposition.complexityScore.toFixed(2)}`);
      logger.info(`Decomposition strategy: ${decomposition.strategy}`);
      logger.info(`Coordination: ${decomposition.coordinationStrategy}`);
      
      const components = await engine.decompose(task, decomposition);
      
      if (components.length > 0) {
        logger.info(`Spawning ${components.length} sub-agents...\n`);
        
        const orchestrator = getGlobalSubAgentOrchestrator();
        
        // Limit sub-agents if specified
        const limitedComponents = options.maxSubAgents 
          ? components.slice(0, options.maxSubAgents)
          : components;
        
        // Spawn agents
        for (const component of limitedComponents) {
          const agent = await orchestrator.spawn(component, { 
            id: task.id, 
            depth: 0 
          });
          subAgents.push(agent);
        }
        
        // Execute sub-agents
        logger.info('Executing sub-agents...');
        const results = await orchestrator.coordinate(subAgents);
        
        // Merge results
        const merged = await orchestrator.mergeResults(results);
        
        // Report status
        const status = orchestrator.getStatus();
        logger.info(`\nSub-agent execution complete:`);
        logger.info(`  Completed: ${status.completed}/${status.total}`);
        logger.info(`  Failed: ${status.failed}`);
        logger.info(`  Progress: ${status.progress.toFixed(1)}%`);
        
        if (merged.success) {
          logger.success('All sub-agents completed successfully');
        } else {
          logger.error(`${status.failed} sub-agent(s) failed`);
        }
        
        // Save to memory if requested
        if (options.saveMemory) {
          // ... save sub-agent results to memory
        }
        
        // Return early if we handled via decomposition
        if (merged.success) {
          return;
        }
      }
    }
  }

  // Interactive mode
  if (options.interactive || options.approveEach) {
    logger.info('Starting interactive execution mode...');
    
    const plan = generatePlanFromTask(task);
    const workflow = new InteractiveWorkflow({
      autoApproveLowRisk: options.autoApproveLowRisk,
      requireDiffView: options.diff,
    });

    await workflow.startInteractiveSession(plan, {
      autoApproveLowRisk: options.autoApproveLowRisk,
      requireDiffView: options.diff,
    });

    const success = await workflow.runInteractiveSession();
    
    if (success) {
      logger.success(workflow.generateReport());
    } else {
      logger.error('Interactive session ended with rejections');
      process.exit(1);
    }
    
    return;
  }

  // Check for existing plan
  const planPath = path.join(projectRoot, '.magneto', 'tasks', `${task.id}-plan.json`);
  if (!fileExists(planPath)) {
    logger.warn('No execution plan found. Run "magneto plan" first for optimal results.');
  }

  // Create and run the runner
  const runnerType = options.runner as RunnerType;
  const runner = createRunner(runnerType);

  logger.info(`Using runner: ${runnerType}`);
  logger.info(`Execution mode: ${mode}`);

  // Streaming mode
  if (options.stream || options.watch) {
    const streamConfig: StreamingConfig = {
      enabled: true,
      format: options.streamFormat || 'text',
      transport: 'stdio',
      bufferSize: 1024,
      flushInterval: 100,
      compression: false,
    };
    
    const streamer = new StreamingRunner(streamConfig);
    await streamer.startStream(task.id);
    
    const renderer = new ProgressRenderer({
      showSpinner: true,
      showProgressBar: true,
      showStepIndicator: true,
      showTokenCount: true,
      showEstimatedTime: true,
    });

    // Listen to stream events
    streamer.on('event', (event) => {
      renderer.renderEvent(event);
    });

    try {
      // Hook streaming into runner
      const result = await runner.execute({
        task,
        context,
        security,
        mode,
        projectRoot,
        onProgress: (progress) => {
          streamer.emitProgress(progress.percentComplete, {
            currentOperation: progress.currentStep,
            tokensUsed: progress.tokensUsed,
            estimatedTimeRemaining: progress.estimatedTimeRemaining,
          });
        },
        onOutput: (data) => {
          streamer.emitOutput(data);
        },
      });

      await streamer.emitComplete('Task completed successfully');
      await streamer.end();

      // Save results
      const outputPath = path.join(projectRoot, '.magneto', 'cache', `${task.id}-result.json`);
      writeJson(outputPath, {
        taskId: task.id,
        runner: runnerType,
        mode,
        result,
        streamed: true,
        completedAt: new Date().toISOString(),
      });

      logger.success(`Task completed with streaming. Results saved: ${outputPath}`);

      // Record performance metric
      await perfTracker.recordMetric({
        taskId,
        taskType: task.type || 'general',
        filesLoaded: context.relevantFiles.length,
        totalFiles: await getTotalFiles(projectRoot),
        compressionRatio: calculateCompressionRatio(context.relevantFiles.length, await getTotalFiles(projectRoot)),
        graphNodes: 0, // Will be updated from graph
        graphEdges: 0,
        graphCommunities: 0,
        success: true,
        retries: 0,
      });

      return;
    } catch (err: any) {
      await streamer.emitError(err.message);
      await streamer.end();
      logger.error(`Task execution failed: ${err.message}`);
      process.exit(1);
    }
  }

  // Non-streaming execution (original)
  try {
    const result = await runner.execute({
      task,
      context,
      security,
      mode,
      projectRoot,
    });

    // Save results
    const outputPath = path.join(projectRoot, '.magneto', 'cache', `${task.id}-result.json`);
    writeJson(outputPath, {
      taskId: task.id,
      runner: runnerType,
      mode,
      result,
      completedAt: new Date().toISOString(),
    });

    logger.success(`Task completed. Results saved: ${outputPath}`);

    // Record performance metric
    await perfTracker.recordMetric({
      taskId,
      taskType: task.type || 'general',
      filesLoaded: context.relevantFiles.length,
      totalFiles: await getTotalFiles(projectRoot),
      compressionRatio: calculateCompressionRatio(context.relevantFiles.length, await getTotalFiles(projectRoot)),
      graphNodes: 0, // Will be updated from graph
      graphEdges: 0,
      graphCommunities: 0,
      success: true,
      retries: 0,
    });
  } catch (err: any) {
    logger.error(`Task execution failed: ${err.message}`);
    process.exit(1);
  }
}

// Helper function to generate execution plan from task for interactive mode
function generatePlanFromTask(task: { id: string; filePath?: string; title?: string; requirements?: string[] }): ExecutionPlan {
  // Generate mock steps based on task requirements
  const steps: PlanStep[] = [];
  const requirements = task.requirements || ['Analyze codebase', 'Implement changes', 'Add tests', 'Update documentation'];
  
  requirements.forEach((req, index) => {
    steps.push({
      index,
      action: req,
      description: req,
      files: [],
      riskLevel: index === 0 ? 'low' : index === requirements.length - 1 ? 'medium' : 'medium',
      requiresBackup: index > 0,
    });
  });

  return {
    steps,
    taskFile: task.filePath || `${task.id}.md`,
    totalSteps: steps.length,
  };
}
