import * as http from 'http';
import { logger } from '../utils/logger';
import { handlePlanTask } from './tools/plan-task';
import { handleLoadContext } from './tools/load-context';
import { handleMergeResults } from './tools/merge-results';
import { handleSecurityCheck } from './tools/security-check';
import { handleQueryGraph } from './tools/query-graph';
import { handleTokenMetrics } from './tools/token-metrics';
import { handlePerformanceMetrics } from './tools/performance-metrics';

export interface MCPToolCall {
  tool: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolResult {
  success: boolean;
  data: unknown;
  error?: string;
}

const TOOLS_MANIFEST = {
  tools: [
    {
      name: 'plan_task',
      description: 'Generate an execution plan for a Magneto task',
      parameters: {
        type: 'object',
        properties: {
          taskFile: { type: 'string', description: 'Path to the task JSON file' },
          projectRoot: { type: 'string', description: 'Project root directory' },
        },
        required: ['taskFile'],
      },
    },
    {
      name: 'load_context',
      description: 'Load project context and classify a task',
      parameters: {
        type: 'object',
        properties: {
          taskFile: { type: 'string', description: 'Path to the task JSON file' },
          projectRoot: { type: 'string', description: 'Project root directory' },
        },
        required: ['taskFile'],
      },
    },
    {
      name: 'merge_results',
      description: 'Merge results from multiple agent outputs',
      parameters: {
        type: 'object',
        properties: {
          outputDir: { type: 'string', description: 'Directory containing agent output files' },
        },
        required: ['outputDir'],
      },
    },
    {
      name: 'security_check',
      description: 'Evaluate security constraints for a task',
      parameters: {
        type: 'object',
        properties: {
          taskFile: { type: 'string', description: 'Path to the task JSON file' },
          projectRoot: { type: 'string', description: 'Project root directory' },
        },
        required: ['taskFile'],
      },
    },
    {
      name: 'query_graph',
      description: 'Query the knowledge graph to find related code, files, and concepts. Returns a focused subgraph with nodes, edges, communities, and suggested follow-up questions. Use this to quickly locate relevant files before planning tasks.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search term to find nodes (file names, class names, function names, or concepts)' },
          projectRoot: { type: 'string', description: 'Project root directory (default: cwd)' },
          graphPath: { type: 'string', description: 'Path to graph.json (default: .magneto/memory/graph.json)' },
          budget: { type: 'number', description: 'Max token budget for results (default: 2000)' },
          dfs: { type: 'boolean', description: 'Use depth-first search instead of breadth-first (default: false)' },
        },
        required: ['query'],
      },
    },
    {
      name: 'token_metrics',
      description: 'Get token usage metrics with A/B comparison (with/without Magneto context compression). Returns session data, individual metrics, and summary statistics including compression ratio and cost savings.',
      parameters: {
        type: 'object',
        properties: {
          projectRoot: { type: 'string', description: 'Project root directory (default: cwd)' },
          sessionId: { type: 'string', description: 'Filter by specific session ID' },
          taskId: { type: 'string', description: 'Filter by specific task ID' },
          runner: { type: 'string', description: 'Filter by runner type (openai, cascade, etc.)' },
          limit: { type: 'number', description: 'Max number of recent metrics to return (default: 100)' },
        },
        required: [],
      },
    },
    {
      name: 'performance_metrics',
      description: 'Get performance metrics without requiring API keys. Tracks task completion time, context compression, and memory growth over time.',
      parameters: {
        type: 'object',
        properties: {
          projectRoot: { type: 'string', description: 'Project root directory (default: cwd)' },
          sessionId: { type: 'string', description: 'Filter by specific session ID' },
          taskId: { type: 'string', description: 'Filter by specific task ID' },
          limit: { type: 'number', description: 'Max number of recent metrics to return (default: 100)' },
        },
        required: [],
      },
    },
  ],
};

async function handleToolCall(call: MCPToolCall): Promise<MCPToolResult> {
  switch (call.tool) {
    case 'plan_task':
      return handlePlanTask(call.arguments);
    case 'load_context':
      return handleLoadContext(call.arguments);
    case 'merge_results':
      return handleMergeResults(call.arguments);
    case 'security_check':
      return handleSecurityCheck(call.arguments);
    case 'query_graph':
      return handleQueryGraph(call.arguments);
    case 'token_metrics':
      return handleTokenMetrics(call.arguments);
    case 'performance_metrics':
      return handlePerformanceMetrics(call.arguments);
    default:
      return { success: false, data: null, error: `Unknown tool: ${call.tool}` };
  }
}

export function startMCPServer(port: number = 3100): http.Server {
  const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Health check
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', version: '0.1.0' }));
      return;
    }

    // Tools manifest
    if (req.method === 'GET' && req.url === '/tools') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(TOOLS_MANIFEST));
      return;
    }

    // Tool execution
    if (req.method === 'POST' && req.url === '/execute') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', async () => {
        try {
          const call: MCPToolCall = JSON.parse(body);
          const result = await handleToolCall(call);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (err: any) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, data: null, error: err.message }));
        }
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  server.listen(port, () => {
    logger.info(`Magneto AI MCP server running on http://localhost:${port}`);
    logger.info('Available tools: plan_task, load_context, merge_results, security_check');
  });

  return server;
}

// Start server if run directly
if (require.main === module) {
  const port = parseInt(process.env.MAGNETO_MCP_PORT || '3100', 10);
  startMCPServer(port);
}
