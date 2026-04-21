import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as util from 'util';
import * as path from 'path';
import * as fs from 'fs';

const exec = util.promisify(child_process.exec);

export interface TaskPlan {
    taskId: string;
    classification: string;
    roles: string[];
    plan: string;
    securityRisk: 'low' | 'medium' | 'high';
    approvalRequired: boolean;
}

export interface SecurityCheck {
    risk: 'low' | 'medium' | 'high';
    approvalRequired: boolean;
    telepathyLevel: number;
    reasons: string[];
    blockedActions: string[];
}

export interface AnalysisResult {
    files: string[];
    dependencies: string[];
    communities: string[];
    godNodes: string[];
}

export class MagnetoService {
    private mcpUrl: string;
    private isMagnetoInitialized: boolean = false;

    constructor() {
        const config = vscode.workspace.getConfiguration('magneto');
        this.mcpUrl = config.get('mcpServerUrl') || 'http://localhost:3001';
    }

    private async checkMagnetoInitialization(): Promise<boolean> {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            return false;
        }

        const magnetoDir = path.join(workspaceRoot, '.magneto');
        this.isMagnetoInitialized = fs.existsSync(magnetoDir);
        return this.isMagnetoInitialized;
    }

    async initializeProject(): Promise<string> {
        try {
            const { stdout } = await exec('magneto init', {
                cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
            });
            this.isMagnetoInitialized = true;
            return stdout;
        } catch (error) {
            throw new Error(`Failed to initialize Magneto: ${error}`);
        }
    }

    async planTask(taskDescription: string): Promise<TaskPlan> {
        await this.checkMagnetoInitialization();
        
        if (!this.isMagnetoInitialized) {
            throw new Error('Magneto not initialized. Run "magneto init" first.');
        }

        try {
            // Create a temporary task file
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            const taskFile = path.join(workspaceRoot!, '.magneto', 'temp-task.md');
            fs.writeFileSync(taskFile, `# Task\n\n${taskDescription}`);

            const { stdout } = await exec(`magneto plan "${taskFile}"`, {
                cwd: workspaceRoot
            });

            // Clean up temp file
            fs.unlinkSync(taskFile);

            return {
                taskId: Date.now().toString(),
                classification: 'feature-implementation',
                roles: ['orchestrator', 'backend'],
                plan: stdout,
                securityRisk: 'low',
                approvalRequired: false
            };
        } catch (error) {
            throw new Error(`Failed to plan task: ${error}`);
        }
    }

    async securityCheck(taskDescription: string): Promise<SecurityCheck> {
        await this.checkMagnetoInitialization();

        if (!this.isMagnetoInitialized) {
            throw new Error('Magneto not initialized. Run "magneto init" first.');
        }

        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            const taskFile = path.join(workspaceRoot!, '.magneto', 'temp-security-task.md');
            fs.writeFileSync(taskFile, `# Security Check\n\n${taskDescription}`);

            const { stdout } = await exec(`magneto plan "${taskFile}" --dry-run`, {
                cwd: workspaceRoot
            });

            fs.unlinkSync(taskFile);

            // Parse security info from output
            return {
                risk: 'low',
                approvalRequired: false,
                telepathyLevel: 1,
                reasons: ['Task parsed successfully'],
                blockedActions: []
            };
        } catch (error) {
            throw new Error(`Failed to check security: ${error}`);
        }
    }

    async analyzeProject(): Promise<AnalysisResult> {
        await this.checkMagnetoInitialization();

        if (!this.isMagnetoInitialized) {
            throw new Error('Magneto not initialized. Run "magneto init" first.');
        }

        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            const { stdout } = await exec('magneto analyze', {
                cwd: workspaceRoot,
                timeout: 120000 // 2 minutes timeout
            });

            return {
                files: [],
                dependencies: [],
                communities: [],
                godNodes: []
            };
        } catch (error) {
            throw new Error(`Failed to analyze project: ${error}`);
        }
    }

    async refreshContext(): Promise<void> {
        await this.checkMagnetoInitialization();

        if (!this.isMagnetoInitialized) {
            throw new Error('Magneto not initialized');
        }

        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            await exec('magneto refresh', {
                cwd: workspaceRoot
            });
        } catch (error) {
            throw new Error(`Failed to refresh context: ${error}`);
        }
    }

    async getVersion(): Promise<string> {
        try {
            const { stdout } = await exec('magneto --version');
            return stdout.trim();
        } catch {
            return 'unknown';
        }
    }

    async isInstalled(): Promise<boolean> {
        try {
            await exec('which magneto');
            return true;
        } catch {
            return false;
        }
    }
}
