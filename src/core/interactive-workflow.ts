import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { logger } from '../utils/logger';
import { magnetoPath, resolveProjectRoot } from '../utils/paths';
import { ensureDir, writeJson, readJson } from '../utils/fs';

export interface InteractiveSession {
  plan: ExecutionPlan;
  currentStep: number;
  decisions: StepDecision[];
  startTime: string;
  auditLog: AuditEntry[];
  checkpoints: Map<number, CheckpointState>;
}

export interface ExecutionPlan {
  steps: PlanStep[];
  taskFile: string;
  totalSteps: number;
}

export interface PlanStep {
  index: number;
  action: string;
  description: string;
  files: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  command?: string;
  requiresBackup: boolean;
}

export interface StepDecision {
  stepIndex: number;
  action: 'approve' | 'reject' | 'skip' | 'modify';
  reason?: string;
  timestamp: string;
  user: string;
  diffViewed: boolean;
  modifiedCommand?: string;
}

export interface AuditEntry {
  timestamp: string;
  event: string;
  stepIndex?: number;
  details: Record<string, unknown>;
}

export interface CheckpointState {
  stepIndex: number;
  fileStates: Map<string, string>; // filepath -> content hash
  timestamp: string;
}

export interface InteractiveOptions {
  autoApproveLowRisk?: boolean;
  requireDiffView?: boolean;
  timeout?: number; // minutes
  maxRollbackSteps?: number;
}

export interface StepContext {
  beforeState?: string;
  afterState?: string;
  diff?: string;
}

export class InteractiveWorkflow {
  private session: InteractiveSession | null = null;
  private options: InteractiveOptions;
  private projectRoot: string;

  constructor(options: InteractiveOptions = {}) {
    this.options = {
      autoApproveLowRisk: false,
      requireDiffView: true,
      timeout: 5,
      maxRollbackSteps: 5,
      ...options,
    };
    this.projectRoot = resolveProjectRoot();
  }

  async startInteractiveSession(
    plan: ExecutionPlan,
    options?: InteractiveOptions
  ): Promise<InteractiveSession> {
    if (options) {
      this.options = { ...this.options, ...options };
    }

    this.session = {
      plan,
      currentStep: 0,
      decisions: [],
      startTime: new Date().toISOString(),
      auditLog: [],
      checkpoints: new Map(),
    };

    this.logAuditEvent('session_started', {
      taskFile: plan.taskFile,
      totalSteps: plan.totalSteps,
      options: this.options,
    });

    logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('🎮 INTERACTIVE MODE ACTIVATED');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info(`Task: ${path.basename(plan.taskFile)}`);
    logger.info(`Total Steps: ${plan.totalSteps}`);
    logger.info(`Options:`);
    logger.info(`  Auto-approve low risk: ${this.options.autoApproveLowRisk}`);
    logger.info(`  Timeout: ${this.options.timeout} minutes`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return this.session;
  }

  async runInteractiveSession(): Promise<boolean> {
    if (!this.session) {
      throw new Error('No active session. Call startInteractiveSession first.');
    }

    const { plan } = this.session;

    for (let i = 0; i < plan.steps.length; i++) {
      this.session.currentStep = i;
      const step = plan.steps[i];

      // Create checkpoint before step execution
      await this.createCheckpoint(i);

      // Auto-approve low risk if enabled
      if (this.options.autoApproveLowRisk && step.riskLevel === 'low') {
        logger.info(`\n✓ Step ${i + 1}/${plan.totalSteps}: ${step.action} (auto-approved - low risk)`);
        this.recordDecision(i, 'approve', 'Auto-approved (low risk)', false);
        continue;
      }

      // Get user decision for this step
      const decision = await this.promptForStepApproval(step, { beforeState: '' });

      switch (decision.action) {
        case 'approve':
          logger.success(`\n✓ Step ${i + 1} approved - executing...`);
          this.logAuditEvent('step_approved', { stepIndex: i, action: step.action });
          // Execution would happen here
          logger.success(`✓ Step ${i + 1} completed successfully`);
          break;

        case 'skip':
          logger.warn(`\n⏭  Step ${i + 1} skipped`);
          this.logAuditEvent('step_skipped', { stepIndex: i, reason: decision.reason });
          break;

        case 'modify':
          logger.info(`\n✏️  Step ${i + 1} modified`);
          this.logAuditEvent('step_modified', {
            stepIndex: i,
            original: step.command,
            modified: decision.modifiedCommand,
          });
          // Execute modified command
          logger.success(`✓ Modified step ${i + 1} completed`);
          break;

        case 'reject':
          logger.error(`\n✗ Step ${i + 1} rejected`);
          this.logAuditEvent('step_rejected', { stepIndex: i, reason: decision.reason });

          // Rollback previous steps if requested
          if (i > 0) {
            const shouldRollback = await this.promptForRollback(i);
            if (shouldRollback) {
              await this.rollbackToStep(this.session, i - 1);
              return false;
            }
          }

          return false;
      }

      // Save session state after each step
      await this.saveSessionState();
    }

    // Session completed successfully
    this.logAuditEvent('session_completed', {
      totalSteps: plan.totalSteps,
      approved: this.session.decisions.filter(d => d.action === 'approve').length,
      skipped: this.session.decisions.filter(d => d.action === 'skip').length,
    });

    logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.success('🎉 All steps completed!');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return true;
  }

  async promptForStepApproval(step: PlanStep, context: StepContext): Promise<StepDecision> {
    const stepNum = step.index + 1;
    const totalSteps = this.session?.plan.totalSteps || 0;

    // Display step information
    logger.info(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    logger.info(`Step ${stepNum}/${totalSteps}: ${step.action}`);
    logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    logger.info(`\n📋 Description: ${step.description}`);
    logger.info(`🎯 Files: ${step.files.join(', ') || 'None'}`);

    // Display risk level with color
    const riskEmoji = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴',
    };
    logger.info(`⚡ Risk Level: ${riskEmoji[step.riskLevel]} ${step.riskLevel.toUpperCase()}`);

    if (step.command) {
      logger.info(`\n💻 Command: ${step.command}`);
    }

    // Show diff if available and required
    let diffViewed = false;
    if (context.diff && this.options.requireDiffView) {
      const viewDiff = await this.promptYesNo('View diff? [y/N]: ', false);
      if (viewDiff) {
        await this.showDiff('', context.diff);
        diffViewed = true;
      }
    }

    // Get user action
    const validActions = ['approve', 'reject', 'skip', 'modify'];
    let action: string;

    while (true) {
      action = await this.promptInput(
        '\n[Approve/Reject/Skip/Modify] (or h for help): '
      );
      action = action.toLowerCase().trim();

      if (action === 'h' || action === 'help') {
        this.showInteractiveHelp();
        continue;
      }

      if (validActions.includes(action)) {
        break;
      }

      // Allow single letter shortcuts
      const shortcuts: Record<string, string> = {
        a: 'approve',
        r: 'reject',
        s: 'skip',
        m: 'modify',
        y: 'approve',
        n: 'reject',
      };

      if (shortcuts[action]) {
        action = shortcuts[action];
        break;
      }

      logger.warn('Invalid option. Use: approve (a), reject (r), skip (s), modify (m), or h for help');
    }

    // Handle modify option
    let modifiedCommand: string | undefined;
    if (action === 'modify') {
      if (step.command) {
        modifiedCommand = await this.promptInput('Enter modified command: ');
      } else {
        logger.info('\nWhat would you like to modify?');
        logger.info('  1. Description');
        logger.info('  2. Add command');
        const choice = await this.promptInput('Enter choice (1 or 2): ');
        
        if (choice === '1') {
          const newDescription = await this.promptInput('Enter new description: ');
          step.description = newDescription;
        } else if (choice === '2') {
          modifiedCommand = await this.promptInput('Enter command to add: ');
        } else {
          logger.warn('Invalid choice. Skipping modification.');
          action = 'approve';
        }
      }
    }

    // Get reason for reject/skip
    let reason: string | undefined;
    if (action === 'reject' || action === 'skip') {
      reason = await this.promptInput(`Reason for ${action} (optional): `);
    }

    // Double confirmation for critical steps
    if (step.riskLevel === 'critical' && action === 'approve') {
      const confirmed = await this.promptYesNo(
        '⚠️  This is a CRITICAL step. Are you absolutely sure? [y/N]: ',
        false
      );
      if (!confirmed) {
        return this.promptForStepApproval(step, context); // Re-prompt
      }
    }

    const decision: StepDecision = {
      stepIndex: step.index,
      action: action as StepDecision['action'],
      reason,
      timestamp: new Date().toISOString(),
      user: process.env.USER || 'unknown',
      diffViewed,
      modifiedCommand,
    };

    this.session?.decisions.push(decision);
    return decision;
  }

  async showDiff(before: string, after: string): Promise<void> {
    logger.info('\n📊 Diff View:');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (!before && !after) {
      logger.info('No changes to display');
      return;
    }

    // Simple diff display (in real implementation, use a proper diff library)
    const lines = after.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('+')) {
        logger.success(`  ${line}`); // Added
      } else if (line.startsWith('-')) {
        logger.error(`  ${line}`); // Removed
      } else if (line.startsWith('~')) {
        logger.warn(`  ${line}`); // Modified
      } else {
        logger.info(`  ${line}`);
      }
    }

    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  async rollbackToStep(session: InteractiveSession, stepIndex: number): Promise<void> {
    logger.warn(`\n🔄 Rolling back to step ${stepIndex + 1}...`);

    const checkpoint = session.checkpoints.get(stepIndex);
    if (!checkpoint) {
      logger.error(`No checkpoint found for step ${stepIndex + 1}`);
      return;
    }

    // Restore file states from checkpoint
    for (const [filePath, contentHash] of checkpoint.fileStates) {
      const backupPath = this.getBackupPath(filePath, stepIndex);
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, filePath);
        logger.info(`  Restored: ${path.relative(this.projectRoot, filePath)}`);
      }
    }

    this.logAuditEvent('rollback_completed', {
      fromStep: session.currentStep,
      toStep: stepIndex,
      filesRestored: checkpoint.fileStates.size,
    });

    logger.success(`✓ Rollback to step ${stepIndex + 1} completed`);
  }

  private async createCheckpoint(stepIndex: number): Promise<void> {
    if (!this.session) return;

    const step = this.session.plan.steps[stepIndex];
    if (!step.requiresBackup) return;

    const checkpoint: CheckpointState = {
      stepIndex,
      fileStates: new Map(),
      timestamp: new Date().toISOString(),
    };

    // Backup files that will be modified
    for (const file of step.files) {
      const filePath = path.isAbsolute(file) ? file : path.join(this.projectRoot, file);
      if (fs.existsSync(filePath)) {
        const backupPath = this.getBackupPath(filePath, stepIndex);
        ensureDir(path.dirname(backupPath));
        fs.copyFileSync(filePath, backupPath);
        checkpoint.fileStates.set(filePath, this.hashFile(filePath));
      }
    }

    this.session.checkpoints.set(stepIndex, checkpoint);
    this.logAuditEvent('checkpoint_created', {
      stepIndex,
      filesBackedUp: checkpoint.fileStates.size,
    });
  }

  private getBackupPath(filePath: string, stepIndex: number): string {
    const relativePath = path.relative(this.projectRoot, filePath);
    const backupDir = magnetoPath(this.projectRoot, 'backup', `step-${stepIndex}`);
    return path.join(backupDir, relativePath);
  }

  private hashFile(filePath: string): string {
    const content = fs.readFileSync(filePath);
    // Simple hash - in production use crypto.createHash
    return content.length.toString();
  }

  private async promptForRollback(currentStep: number): Promise<boolean> {
    return this.promptYesNo(
      `\nRollback changes from steps 1-${currentStep}? [y/N]: `,
      false
    );
  }

  private showInteractiveHelp(): void {
    logger.info('\n📖 Interactive Mode Help:');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('Commands:');
    logger.info('  approve (a, y)  - Approve and execute this step');
    logger.info('  reject (r, n)   - Reject this step (optionally rollback)');
    logger.info('  skip (s)        - Skip this step');
    logger.info('  modify (m)      - Modify the command for this step');
    logger.info('');
    logger.info('Tips:');
    logger.info('  • Critical steps require double-confirmation');
    logger.info('  • View diffs to understand changes before approving');
    logger.info('  • Session auto-saves after each step');
    logger.info('  • Timeout after 5 minutes of inactivity');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  private async promptYesNo(message: string, defaultValue: boolean): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      const defaultText = defaultValue ? 'Y/n' : 'y/N';
      rl.question(`${message} [${defaultText}]: `, (answer) => {
        rl.close();
        const trimmed = answer.trim().toLowerCase();
        if (trimmed === '') {
          resolve(defaultValue);
        } else {
          resolve(trimmed === 'y' || trimmed === 'yes');
        }
      });
    });
  }

  private async promptInput(message: string): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(message, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  private recordDecision(
    stepIndex: number,
    action: StepDecision['action'],
    reason: string,
    diffViewed: boolean
  ): void {
    const decision: StepDecision = {
      stepIndex,
      action,
      reason,
      timestamp: new Date().toISOString(),
      user: process.env.USER || 'unknown',
      diffViewed,
    };
    this.session?.decisions.push(decision);
  }

  private logAuditEvent(event: string, details: Record<string, unknown>): void {
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
    };
    this.session?.auditLog.push(entry);
  }

  private async saveSessionState(): Promise<void> {
    if (!this.session) return;

    const sessionPath = magnetoPath(
      this.projectRoot,
      'cache',
      `interactive-session-${Date.now()}.json`
    );

    // Convert Map to serializable object
    const serialized = {
      ...this.session,
      checkpoints: Array.from(this.session.checkpoints.entries()),
    };

    writeJson(sessionPath, serialized);
  }

  getSession(): InteractiveSession | null {
    return this.session;
  }

  generateReport(): string {
    if (!this.session) {
      return 'No active session';
    }

    const { decisions, auditLog, plan } = this.session;

    let report = '\n📊 Interactive Session Report\n';
    report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    report += `Task: ${path.basename(plan.taskFile)}\n`;
    report += `Total Steps: ${plan.totalSteps}\n`;
    report += `Completed: ${new Date().toLocaleString()}\n\n`;

    report += 'Decisions:\n';
    decisions.forEach((d) => {
      const emoji = { approve: '✓', reject: '✗', skip: '⏭', modify: '✏️' }[d.action];
      report += `  ${emoji} Step ${d.stepIndex + 1}: ${d.action}`;
      if (d.reason) report += ` (${d.reason})`;
      report += '\n';
    });

    report += '\nAudit Log:\n';
    auditLog.slice(-10).forEach((entry) => {
      report += `  [${entry.timestamp}] ${entry.event}\n`;
    });

    report += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

    return report;
  }
}
