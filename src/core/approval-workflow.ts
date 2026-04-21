import * as readline from 'readline';
import { logger } from '../utils/logger';
import { writeJson, fileExists, readJson } from '../utils/fs';
import { magnetoPath } from '../utils/paths';

export interface ApprovalStep {
  id: string;
  title: string;
  description: string;
  type: 'file-change' | 'command' | 'api-call' | 'other';
  filePath?: string;
  originalContent?: string;
  newContent?: string;
  command?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface ApprovalDecision {
  stepId: string;
  decision: 'approve' | 'reject' | 'skip';
  timestamp: string;
  reason?: string;
}

export interface ApprovalSession {
  sessionId: string;
  taskId: string;
  startTime: string;
  endTime?: string;
  decisions: ApprovalDecision[];
  totalSteps: number;
  approved: number;
  rejected: number;
  skipped: number;
}

export class ApprovalWorkflow {
  private steps: ApprovalStep[] = [];
  private decisions: ApprovalDecision[] = [];
  private sessionId: string;
  private auditLogPath: string;

  constructor(projectRoot: string, taskId: string) {
    this.sessionId = `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.auditLogPath = magnetoPath(projectRoot, 'audit', 'approvals.json');
  }

  addStep(step: ApprovalStep): void {
    this.steps.push(step);
  }

  async runInteractiveApproval(): Promise<{ approved: boolean; decisions: ApprovalDecision[] }> {
    if (this.steps.length === 0) {
      logger.info('No steps to approve');
      return { approved: true, decisions: [] };
    }

    logger.info(`\n📋 Interactive Approval Workflow - ${this.steps.length} steps to review`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      const decision = await this.promptForApproval(rl, step, i + 1, this.steps.length);
      this.decisions.push(decision);

      if (decision.decision === 'reject') {
        logger.warn(`Step ${i + 1} rejected. Workflow aborted.`);
        rl.close();
        await this.saveAuditLog();
        return { approved: false, decisions: this.decisions };
      }
    }

    rl.close();
    await this.saveAuditLog();
    logger.success('All steps approved. Proceeding with execution.');
    return { approved: true, decisions: this.decisions };
  }

  private async promptForApproval(
    rl: readline.Interface,
    step: ApprovalStep,
    stepNumber: number,
    totalSteps: number
  ): Promise<ApprovalDecision> {
    const riskEmoji = this.getRiskEmoji(step.riskLevel);
    logger.info(`\n${riskEmoji} Step ${stepNumber}/${totalSteps}: ${step.title}`);
    logger.info(`   ${step.description}`);
    logger.info(`   Type: ${step.type} | Risk: ${step.riskLevel}`);

    if (step.filePath) {
      logger.info(`   File: ${step.filePath}`);
    }

    if (step.command) {
      logger.info(`   Command: ${step.command}`);
    }

    // Show diff if available
    if (step.originalContent && step.newContent) {
      logger.info('\n   Diff Preview:');
      logger.info('   ──────────────────────────────────────────────────────────────');
      this.showDiff(step.originalContent, step.newContent);
      logger.info('   ──────────────────────────────────────────────────────────────');
    }

    const answer = await this.askQuestion(
      rl,
      `\n   Approve? [y]es, [n]o, [s]kip (default: yes): `
    );

    const decision = this.parseDecision(answer);

    if (decision === 'reject') {
      const reason = await this.askQuestion(rl, '   Reason for rejection (optional): ');
      return {
        stepId: step.id,
        decision: 'reject',
        timestamp: new Date().toISOString(),
        reason: reason || undefined,
      };
    }

    return {
      stepId: step.id,
      decision,
      timestamp: new Date().toISOString(),
    };
  }

  private getRiskEmoji(riskLevel: string): string {
    switch (riskLevel) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return '⚡';
      case 'low':
        return '✅';
      default:
        return 'ℹ️';
    }
  }

  private showDiff(original: string, modified: string): void {
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');
    const maxLines = Math.max(originalLines.length, modifiedLines.length);

    for (let i = 0; i < Math.min(maxLines, 20); i++) {
      const origLine = originalLines[i] || '';
      const modLine = modifiedLines[i] || '';

      if (origLine !== modLine) {
        if (origLine && !modLine) {
          logger.info(`   - ${origLine}`);
        } else if (!origLine && modLine) {
          logger.info(`   + ${modLine}`);
        } else {
          logger.info(`   - ${origLine}`);
          logger.info(`   + ${modLine}`);
        }
      }
    }

    if (maxLines > 20) {
      logger.info('   ... (diff truncated for preview)');
    }
  }

  private askQuestion(rl: readline.Interface, question: string): Promise<string> {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  private parseDecision(answer: string): 'approve' | 'reject' | 'skip' {
    const lower = answer.toLowerCase();
    if (lower === 'n' || lower === 'no') {
      return 'reject';
    }
    if (lower === 's' || lower === 'skip') {
      return 'skip';
    }
    return 'approve';
  }

  private async saveAuditLog(): Promise<void> {
    try {
      const existingData = await fileExists(this.auditLogPath)
        ? (await readJson(this.auditLogPath)) as ApprovalSession[]
        : [];

      const session: ApprovalSession = {
        sessionId: this.sessionId,
        taskId: this.sessionId.split('-')[1],
        startTime: new Date().toISOString(),
        decisions: this.decisions,
        totalSteps: this.steps.length,
        approved: this.decisions.filter((d) => d.decision === 'approve').length,
        rejected: this.decisions.filter((d) => d.decision === 'reject').length,
        skipped: this.decisions.filter((d) => d.decision === 'skip').length,
      };

      existingData.push(session);
      await writeJson(this.auditLogPath, existingData);
      logger.debug(`Approval audit log saved to ${this.auditLogPath}`);
    } catch (error) {
      logger.error(`Failed to save approval audit log: ${error}`);
    }
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getDecisions(): ApprovalDecision[] {
    return this.decisions;
  }
}
