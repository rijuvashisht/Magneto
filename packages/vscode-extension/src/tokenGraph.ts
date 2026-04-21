import * as vscode from 'vscode';
import { TokenMetricsService, TokenMetric } from './tokenMetrics';

export class TokenGraphProvider {
    private metricsService: TokenMetricsService;
    private chartData: {
        withMagneto: Array<{ timestamp: string; tokens: number }>;
        withoutMagneto: Array<{ timestamp: string; tokens: number }>;
    } = { withMagneto: [], withoutMagneto: [] };

    constructor(metricsService: TokenMetricsService) {
        this.metricsService = metricsService;
    }

    async updateGraph(): Promise<string> {
        this.chartData = this.metricsService.getCompressionData();
        return this.generateGraphHtml();
    }

    private generateGraphHtml(): string {
        const { withMagneto, withoutMagneto } = this.chartData;
        const costData = this.metricsService.getCostData();
        const compressionRatio = this.metricsService.getCompressionRatio();

        if (withMagneto.length === 0 && withoutMagneto.length === 0) {
            return `
                <div class="no-data">
                    <p>No token metrics available yet.</p>
                    <p>Run tasks with <code>magneto run task.md --track-tokens</code> to enable tracking.</p>
                </div>
            `;
        }

        const labels = this.generateLabels(withMagneto, withoutMagneto);
        const magnetoData = this.alignData(withMagneto, labels.length);
        const baselineData = this.alignData(withoutMagneto, labels.length);

        return `
            <div class="token-graph-container">
                <div class="graph-header">
                    <h3>Token Usage Comparison</h3>
                    <div class="metrics-summary">
                        <div class="metric-badge">
                            <span class="label">Compression:</span>
                            <span class="value ${compressionRatio > 50 ? 'good' : 'medium'}">${compressionRatio.toFixed(1)}%</span>
                        </div>
                        <div class="metric-badge">
                            <span class="label">Savings:</span>
                            <span class="value">$${costData.savings.toFixed(2)}</span>
                        </div>
                        <div class="metric-badge">
                            <span class="label">Total Cost:</span>
                            <span class="value">$${costData.totalCost.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="chart-wrapper">
                    <canvas id="tokenChart"></canvas>
                </div>

                <div class="legend">
                    <div class="legend-item">
                        <div class="legend-color" style="background-color: #3b82f6;"></div>
                        <span>With Magneto</span>
                        <span class="legend-value">${costData.costWithMagneto.toFixed(2)} tokens</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background-color: #ef4444;"></div>
                        <span>Without Magneto</span>
                        <span class="legend-value">${costData.costWithoutMagneto.toFixed(2)} tokens</span>
                    </div>
                </div>

                <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
                <script>
                    (function() {
                        const ctx = document.getElementById('tokenChart');
                        if (!ctx) return;

                        new Chart(ctx, {
                            type: 'line',
                            data: {
                                labels: ${JSON.stringify(labels)},
                                datasets: [
                                    {
                                        label: 'With Magneto',
                                        data: ${JSON.stringify(magnetoData)},
                                        borderColor: '#3b82f6',
                                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                        fill: true,
                                        tension: 0.3,
                                        pointRadius: 4,
                                        pointHoverRadius: 6,
                                    },
                                    {
                                        label: 'Without Magneto',
                                        data: ${JSON.stringify(baselineData)},
                                        borderColor: '#ef4444',
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        fill: true,
                                        tension: 0.3,
                                        pointRadius: 4,
                                        pointHoverRadius: 6,
                                    }
                                ]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                interaction: {
                                    intersect: false,
                                    mode: 'index',
                                },
                                plugins: {
                                    legend: {
                                        display: false,
                                    },
                                    tooltip: {
                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                        titleColor: '#fff',
                                        bodyColor: '#fff',
                                        callbacks: {
                                            label: function(context) {
                                                return context.dataset.label + ': ' + context.parsed.y.toLocaleString() + ' tokens';
                                            }
                                        }
                                    }
                                },
                                scales: {
                                    x: {
                                        display: true,
                                        grid: {
                                            color: 'rgba(128, 128, 128, 0.2)',
                                        },
                                        ticks: {
                                            color: '#888',
                                            maxRotation: 45,
                                            minRotation: 45,
                                            font: {
                                                size: 10
                                            }
                                        }
                                    },
                                    y: {
                                        display: true,
                                        beginAtZero: true,
                                        grid: {
                                            color: 'rgba(128, 128, 128, 0.2)',
                                        },
                                        ticks: {
                                            color: '#888',
                                            callback: function(value) {
                                                return value.toLocaleString();
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    })();
                </script>
            </div>
        `;
    }

    private generateLabels(
        withMagneto: Array<{ timestamp: string; tokens: number }>,
        withoutMagneto: Array<{ timestamp: string; tokens: number }>
    ): string[] {
        const allTimestamps = new Set([
            ...withMagneto.map(m => m.timestamp),
            ...withoutMagneto.map(m => m.timestamp)
        ]);

        return Array.from(allTimestamps)
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
            .map(ts => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }

    private alignData(
        data: Array<{ timestamp: string; tokens: number }>,
        targetLength: number
    ): number[] {
        const result = new Array(targetLength).fill(0);
        
        for (const item of data) {
            const index = this.chartData.withMagneto
                .concat(this.chartData.withoutMagneto)
                .map(m => m.timestamp)
                .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
                .indexOf(item.timestamp);
            
            if (index !== -1 && index < targetLength) {
                result[index] = item.tokens;
            }
        }

        return result;
    }

    getStyles(): string {
        return `
            .token-graph-container {
                padding: 16px;
                background-color: var(--vscode-editor-background);
                border-radius: 8px;
            }

            .graph-header {
                margin-bottom: 16px;
            }

            .graph-header h3 {
                margin: 0 0 12px 0;
                font-size: 16px;
                font-weight: 600;
                color: var(--vscode-foreground);
            }

            .metrics-summary {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
            }

            .metric-badge {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 12px;
                background-color: var(--vscode-editor-inactiveSelectionBackground);
                border-radius: 16px;
                font-size: 12px;
            }

            .metric-badge .label {
                color: var(--vscode-descriptionForeground);
            }

            .metric-badge .value {
                font-weight: 600;
                color: var(--vscode-foreground);
            }

            .metric-badge .value.good {
                color: #4ade80;
            }

            .metric-badge .value.medium {
                color: #fbbf24;
            }

            .chart-wrapper {
                position: relative;
                height: 250px;
                margin-bottom: 16px;
            }

            .legend {
                display: flex;
                gap: 24px;
                justify-content: center;
                flex-wrap: wrap;
            }

            .legend-item {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 12px;
                color: var(--vscode-foreground);
            }

            .legend-color {
                width: 12px;
                height: 12px;
                border-radius: 3px;
            }

            .legend-value {
                font-weight: 600;
                margin-left: 4px;
            }

            .no-data {
                text-align: center;
                padding: 40px 20px;
                color: var(--vscode-descriptionForeground);
            }

            .no-data p {
                margin: 8px 0;
            }

            .no-data code {
                background-color: var(--vscode-textCodeBlock-background);
                padding: 2px 6px;
                border-radius: 3px;
                font-family: var(--vscode-editor-font-family);
            }
        `;
    }
}
