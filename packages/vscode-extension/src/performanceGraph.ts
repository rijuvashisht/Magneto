import * as vscode from 'vscode';
import { PerformanceMetricsService } from './performanceMetrics';

export class PerformanceGraphProvider {
  private metricsService: PerformanceMetricsService;

  constructor(metricsService: PerformanceMetricsService) {
    this.metricsService = metricsService;
  }

  async updateGraph(): Promise<string> {
    const durationData = this.metricsService.getDurationData();
    const compressionData = this.metricsService.getCompressionData();
    const improvementTrend = this.metricsService.getImprovementTrend();

    if (durationData.timestamps.length === 0) {
      return `
        <div class="no-data">
          <p>No performance metrics available yet.</p>
          <p>Run tasks with <code>magneto run task.md</code> to enable tracking.</p>
        </div>
      `;
    }

    return `
      <div class="performance-graph-container">
        <div class="graph-header">
          <h3>Performance Metrics</h3>
          <div class="metrics-summary">
            <div class="metric-badge">
              <span class="label">Avg Duration:</span>
              <span class="value">${durationData.avgDuration.toFixed(2)}s</span>
            </div>
            <div class="metric-badge">
              <span class="label">Compression:</span>
              <span class="value ${compressionData.avgCompressionRatio > 50 ? 'good' : 'medium'}">${compressionData.avgCompressionRatio.toFixed(1)}%</span>
            </div>
            <div class="metric-badge">
              <span class="label">Improvement:</span>
              <span class="value ${improvementTrend > 0 ? 'good' : 'neutral'}">${improvementTrend > 0 ? '+' : ''}${improvementTrend.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div class="chart-wrapper">
          <canvas id="durationChart"></canvas>
        </div>

        <div class="chart-wrapper">
          <canvas id="compressionChart"></canvas>
        </div>

        <div class="legend">
          <div class="legend-item">
            <div class="legend-color" style="background-color: #3b82f6;"></div>
            <span>Task Duration (seconds)</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background-color: #10b981;"></div>
            <span>Context Compression (%)</span>
          </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
        <script>
          (function() {
            const durationCtx = document.getElementById('durationChart');
            const compressionCtx = document.getElementById('compressionChart');
            
            if (!durationCtx || !compressionCtx) return;

            // Duration Chart
            new Chart(durationCtx, {
              type: 'line',
              data: {
                labels: ${JSON.stringify(durationData.timestamps)},
                datasets: [{
                  label: 'Task Duration (s)',
                  data: ${JSON.stringify(durationData.durations)},
                  borderColor: '#3b82f6',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  fill: true,
                  tension: 0.3,
                  pointRadius: 4,
                  pointHoverRadius: 6,
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    callbacks: {
                      label: function(context) {
                        return 'Duration: ' + context.parsed.y.toFixed(2) + 's';
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    display: true,
                    grid: { color: 'rgba(128, 128, 128, 0.2)' },
                    ticks: { color: '#888', font: { size: 10 } }
                  },
                  y: {
                    display: true,
                    beginAtZero: true,
                    grid: { color: 'rgba(128, 128, 128, 0.2)' },
                    ticks: { color: '#888' }
                  }
                }
              }
            });

            // Compression Chart
            new Chart(compressionCtx, {
              type: 'line',
              data: {
                labels: ${JSON.stringify(compressionData.timestamps)},
                datasets: [{
                  label: 'Compression %',
                  data: ${JSON.stringify(compressionData.compressionRatios)},
                  borderColor: '#10b981',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  fill: true,
                  tension: 0.3,
                  pointRadius: 4,
                  pointHoverRadius: 6,
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    callbacks: {
                      label: function(context) {
                        return 'Compression: ' + context.parsed.y.toFixed(1) + '%';
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    display: true,
                    grid: { color: 'rgba(128, 128, 128, 0.2)' },
                    ticks: { color: '#888', font: { size: 10 } }
                  },
                  y: {
                    display: true,
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(128, 128, 128, 0.2)' },
                    ticks: { color: '#888' }
                  }
                }
              }
            });
          })();
        </script>
      </div>
    `;
  }

  getStyles(): string {
    return `
      .performance-graph-container {
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

      .metric-badge .value.neutral {
        color: var(--vscode-foreground);
      }

      .chart-wrapper {
        position: relative;
        height: 200px;
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
