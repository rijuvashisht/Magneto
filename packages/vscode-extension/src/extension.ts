import * as vscode from 'vscode';
import { AgentPanelProvider } from './agentPanel';
import { MagnetoService } from './magnetoService';

export function activate(context: vscode.ExtensionContext) {
    console.log('Magneto AI extension is now active');

    const magnetoService = new MagnetoService();
    const agentPanelProvider = new AgentPanelProvider(context.extensionUri, magnetoService);

    // Register the agent panel view
    vscode.window.registerWebviewViewProvider('magneto.agentPanel', agentPanelProvider);

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('magneto.openAgentPanel', () => {
            vscode.commands.executeCommand('magneto.agentPanel.focus');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('magneto.planTask', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor');
                return;
            }

            const selection = editor.document.getText(editor.selection);
            if (!selection) {
                vscode.window.showWarningMessage('No text selected');
                return;
            }

            await agentPanelProvider.planTask(selection);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('magneto.runTask', async () => {
            await agentPanelProvider.runTask();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('magneto.securityCheck', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor');
                return;
            }

            const selection = editor.document.getText(editor.selection);
            if (!selection) {
                vscode.window.showWarningMessage('No text selected');
                return;
            }

            await agentPanelProvider.securityCheck(selection);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('magneto.analyzeProject', async () => {
            await agentPanelProvider.analyzeProject();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('magneto.refreshContext', async () => {
            await agentPanelProvider.refreshContext();
        })
    );

    // Set context as enabled
    vscode.commands.executeCommand('setContext', 'magneto.enabled', true);

    // Auto-analyze if configured
    const config = vscode.workspace.getConfiguration('magneto');
    if (config.get('autoAnalyzeOnOpen')) {
        agentPanelProvider.analyzeProject();
    }
}

export function deactivate() {
    console.log('Magneto AI extension is now deactivated');
}
