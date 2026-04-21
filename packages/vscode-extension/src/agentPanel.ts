import * as vscode from 'vscode';
import { MagnetoService, TaskPlan, SecurityCheck, AnalysisResult } from './magnetoService';
import { PerformanceMetricsService } from './performanceMetrics';
import { PerformanceGraphProvider } from './performanceGraph';

export class AgentPanelProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private _magnetoService: MagnetoService;
    private _currentTask?: string;
    private _performanceMetricsService: PerformanceMetricsService;
    private _performanceGraphProvider: PerformanceGraphProvider;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        magnetoService: MagnetoService
    ) {
        this._magnetoService = magnetoService;
        this._performanceMetricsService = new PerformanceMetricsService(magnetoService);
        this._performanceGraphProvider = new PerformanceGraphProvider(this._performanceMetricsService);
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (message: { command: string; text?: string }) => {
            switch (message.command) {
                case 'planTask':
                    await this.planTask(message.text || '');
                    break;
                case 'runTask':
                    await this.runTask();
                    break;
                case 'securityCheck':
                    await this.securityCheck(message.text || '');
                    break;
                case 'analyzeProject':
                    await this.analyzeProject();
                    break;
                case 'initialize':
                    await this.initializeProject();
                    break;
                case 'refresh':
                    await this.refreshContext();
                    break;
                case 'getStatus':
                    await this.sendStatus();
                    break;
                case 'refreshTokenMetrics':
                    await this.refreshPerformanceMetrics();
                    break;
            }
        });

        // Send initial status
        this.sendStatus();
        
        // Load performance metrics
        this.refreshPerformanceMetrics();
    }

    private async sendStatus() {
        if (!this._view) return;

        const isInstalled = await this._magnetoService.isInstalled();
        const version = isInstalled ? await this._magnetoService.getVersion() : 'not installed';

        this._view.webview.postMessage({
            command: 'status',
            isInstalled,
            version
        });
    }

    async planTask(taskDescription?: string) {
        if (!this._view) return;

        if (!taskDescription) {
            // Show input box
            const input = await vscode.window.showInputBox({
                prompt: 'Enter task description',
                placeHolder: 'e.g., Fix authentication bug in login flow'
            });
            if (!input) return;
            taskDescription = input;
        }

        this._view.webview.postMessage({
            command: 'loading',
            message: 'Planning task...'
        });

        try {
            const plan = await this._magnetoService.planTask(taskDescription);
            this._currentTask = taskDescription;

            this._view.webview.postMessage({
                command: 'planResult',
                plan
            });

            vscode.window.showInformationMessage(`Task planned: ${plan.classification}`);
        } catch (error: any) {
            this._view.webview.postMessage({
                command: 'error',
                message: error.message
            });
            vscode.window.showErrorMessage(`Failed to plan task: ${error.message}`);
        }
    }

    async runTask() {
        if (!this._view) return;

        if (!this._currentTask) {
            vscode.window.showWarningMessage('No task planned yet. Plan a task first.');
            return;
        }

        this._view.webview.postMessage({
            command: 'loading',
            message: 'Running task...'
        });

        // Simulate running task (actual implementation would call magneto run)
        vscode.window.showInformationMessage('Task execution started');

        setTimeout(() => {
            this._view?.webview.postMessage({
                command: 'runComplete',
                success: true
            });
        }, 2000);
    }

    async securityCheck(text?: string) {
        if (!this._view) return;

        const checkText = text || this._currentTask;
        if (!checkText) {
            vscode.window.showWarningMessage('No task to check. Select text or plan a task first.');
            return;
        }

        this._view.webview.postMessage({
            command: 'loading',
            message: 'Checking security...'
        });

        try {
            const check = await this._magnetoService.securityCheck(checkText);

            this._view.webview.postMessage({
                command: 'securityResult',
                check
            });

            if (check.approvalRequired) {
                vscode.window.showWarningMessage(`Security check: ${check.risk} risk - Approval required`);
            } else {
                vscode.window.showInformationMessage(`Security check: ${check.risk} risk - Approved`);
            }
        } catch (error: any) {
            this._view.webview.postMessage({
                command: 'error',
                message: error.message
            });
        }
    }

    async analyzeProject() {
        if (!this._view) return;

        this._view.webview.postMessage({
            command: 'loading',
            message: 'Analyzing project...'
        });

        try {
            const result = await this._magnetoService.analyzeProject();

            this._view.webview.postMessage({
                command: 'analysisResult',
                result
            });

            vscode.window.showInformationMessage('Project analysis complete');
        } catch (error: any) {
            this._view.webview.postMessage({
                command: 'error',
                message: error.message
            });
        }
    }

    async initializeProject() {
        if (!this._view) return;

        this._view.webview.postMessage({
            command: 'loading',
            message: 'Initializing Magneto...'
        });

        try {
            const result = await this._magnetoService.initializeProject();

            this._view.webview.postMessage({
                command: 'initialized',
                result
            });

            vscode.window.showInformationMessage('Magneto initialized successfully');
            this.sendStatus();
        } catch (error: any) {
            this._view.webview.postMessage({
                command: 'error',
                message: error.message
            });
            vscode.window.showErrorMessage(`Failed to initialize: ${error.message}`);
        }
    }

    async refreshContext() {
        if (!this._view) return;

        this._view.webview.postMessage({
            command: 'loading',
            message: 'Refreshing context...'
        });

        try {
            await this._magnetoService.refreshContext();

            this._view.webview.postMessage({
                command: 'refreshed'
            });

            vscode.window.showInformationMessage('Context refreshed');
        } catch (error: any) {
            this._view.webview.postMessage({
                command: 'error',
                message: error.message
            });
        }
    }

    async refreshPerformanceMetrics() {
        if (!this._view) return;

        try {
            await this._performanceMetricsService.getMetrics();
            const graphHtml = await this._performanceGraphProvider.updateGraph();
            const styles = this._performanceGraphProvider.getStyles();

            this._view.webview.postMessage({
                command: 'tokenGraphUpdate',
                graph: graphHtml,
                styles: styles,
            });
        } catch (error) {
            console.error('Failed to refresh performance metrics:', error);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Magneto AI</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-sidebar-background);
                    padding: 20px;
                    margin: 0;
                }
                
                .header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                
                .logo {
                    font-size: 24px;
                }
                
                .title {
                    font-size: 18px;
                    font-weight: bold;
                    color: var(--vscode-foreground);
                }
                
                .status {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    margin-left: auto;
                }
                
                .section {
                    margin-bottom: 20px;
                }
                
                .section-title {
                    font-size: 14px;
                    font-weight: bold;
                    margin-bottom: 10px;
                    text-transform: uppercase;
                    color: var(--vscode-descriptionForeground);
                }
                
                button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    margin-right: 8px;
                    margin-bottom: 8px;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }
                
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                
                button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                .input-group {
                    margin-bottom: 15px;
                }
                
                textarea {
                    width: 100%;
                    min-height: 80px;
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 4px;
                    padding: 8px;
                    font-family: inherit;
                    font-size: 13px;
                    resize: vertical;
                }
                
                .result {
                    background-color: var(--vscode-textCodeBlock-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 4px;
                    padding: 12px;
                    margin-top: 10px;
                    font-size: 13px;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                }
                
                .loading {
                    display: none;
                    align-items: center;
                    gap: 8px;
                    padding: 10px;
                    background-color: var(--vscode-progressBar-background);
                    border-radius: 4px;
                    margin: 10px 0;
                }
                
                .loading.active {
                    display: flex;
                }
                
                .spinner {
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                .error {
                    background-color: var(--vscode-inputValidation-errorBackground);
                    border: 1px solid var(--vscode-inputValidation-errorBorder);
                    color: var(--vscode-inputValidation-errorForeground);
                    padding: 10px;
                    border-radius: 4px;
                    margin: 10px 0;
                }
                
                .security-low { color: #4ade80; }
                .security-medium { color: #fbbf24; }
                .security-high { color: #f87171; }
                
                .icon::before {
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <span class="logo">⚡</span>
                <span class="title">Magneto AI</span>
                <span class="status" id="status">Checking...</span>
            </div>
            
            <div id="not-installed" style="display: none;">
                <div class="section">
                    <div class="section-title">Setup</div>
                    <p>Magneto AI is not installed on this system.</p>
                    <button onclick="initialize()">Initialize Project</button>
                </div>
            </div>
            
            <div id="main-panel">
                <div class="section">
                    <div class="section-title">Quick Actions</div>
                    <button onclick="analyzeProject()">🔍 Analyze Project</button>
                    <button onclick="refreshContext()">🔄 Refresh</button>
                    <button onclick="showTaskInput()">💡 Plan Task</button>
                </div>
                
                <div class="section" id="task-section" style="display: none;">
                    <div class="section-title">Task Planning</div>
                    <div class="input-group">
                        <textarea id="task-input" placeholder="Describe your task (e.g., Fix authentication bug, Add feature, etc.)"></textarea>
                    </div>
                    <button onclick="planTask()">Plan Task</button>
                    <button onclick="securityCheck()">🔒 Security Check</button>
                </div>
                
                <div class="section">
                    <div class="section-title">Performance Metrics</div>
                    <div id="token-graph-container"></div>
                    <button onclick="refreshTokenMetrics()" style="margin-top: 8px;">🔄 Refresh</button>
                </div>
                
                <div class="loading" id="loading">
                    <span class="spinner">⏳</span>
                    <span id="loading-text">Processing...</span>
                </div>
                
                <div id="result-area"></div>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                // Request status on load
                vscode.postMessage({ command: 'getStatus' });
                
                // Handle messages from extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    
                    switch (message.command) {
                        case 'status':
                            document.getElementById('status').textContent = 
                                message.isInstalled ? 'v' + message.version : 'Not installed';
                            if (!message.isInstalled) {
                                document.getElementById('not-installed').style.display = 'block';
                                document.getElementById('main-panel').style.display = 'none';
                            }
                            break;
                            
                        case 'loading':
                            document.getElementById('loading').classList.add('active');
                            document.getElementById('loading-text').textContent = message.message;
                            break;
                            
                        case 'planResult':
                            document.getElementById('loading').classList.remove('active');
                            showResult('Task Plan', JSON.stringify(message.plan, null, 2));
                            break;
                            
                        case 'securityResult':
                            document.getElementById('loading').classList.remove('active');
                            const check = message.check;
                            const riskClass = 'security-' + check.risk;
                            showResult('Security Check', 
                                'Risk: <span class="' + riskClass + '">' + check.risk.toUpperCase() + '</span>\\n' +
                                'Approval Required: ' + (check.approvalRequired ? 'Yes' : 'No') + '\\n' +
                                'Telepathy Level: ' + check.telepathyLevel + '\\n' +
                                'Reasons: ' + check.reasons.join(', ')
                            );
                            break;
                            
                        case 'analysisResult':
                            document.getElementById('loading').classList.remove('active');
                            showResult('Project Analysis', 'Analysis complete. Check .magneto/memory/ for results.');
                            break;
                            
                        case 'initialized':
                            document.getElementById('loading').classList.remove('active');
                            document.getElementById('not-installed').style.display = 'none';
                            document.getElementById('main-panel').style.display = 'block';
                            showResult('Success', 'Magneto initialized successfully!');
                            break;
                            
                        case 'refreshed':
                            document.getElementById('loading').classList.remove('active');
                            showResult('Success', 'Context refreshed.');
                            break;
                            
                        case 'error':
                            document.getElementById('loading').classList.remove('active');
                            showError(message.message);
                            break;
                            
                        case 'tokenGraphUpdate':
                            document.getElementById('token-graph-container').innerHTML = message.graph;
                            // Add styles if not already present
                            if (!document.getElementById('token-graph-styles')) {
                                const style = document.createElement('style');
                                style.id = 'token-graph-styles';
                                style.textContent = message.styles;
                                document.head.appendChild(style);
                            }
                            break;
                    }
                });
                
                function showTaskInput() {
                    const section = document.getElementById('task-section');
                    section.style.display = section.style.display === 'none' ? 'block' : 'none';
                }
                
                function planTask() {
                    const text = document.getElementById('task-input').value;
                    if (text) {
                        vscode.postMessage({ command: 'planTask', text });
                    }
                }
                
                function runTask() {
                    vscode.postMessage({ command: 'runTask' });
                }
                
                function securityCheck() {
                    const text = document.getElementById('task-input').value;
                    vscode.postMessage({ command: 'securityCheck', text });
                }
                
                function analyzeProject() {
                    vscode.postMessage({ command: 'analyzeProject' });
                }
                
                function initialize() {
                    vscode.postMessage({ command: 'initialize' });
                }
                
                function refreshContext() {
                    vscode.postMessage({ command: 'refresh' });
                }
                
                function refreshTokenMetrics() {
                    vscode.postMessage({ command: 'refreshTokenMetrics' });
                }
                
                function showResult(title, content) {
                    const area = document.getElementById('result-area');
                    area.innerHTML = '<div class="section-title">' + title + '</div><div class="result">' + content + '</div>';
                }
                
                function showError(message) {
                    const area = document.getElementById('result-area');
                    area.innerHTML = '<div class="error">' + message + '</div>';
                }
            </script>
        </body>
        </html>`;
    }
}
