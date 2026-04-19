#!/usr/bin/env node

import { Command } from 'commander';
import { logger } from './utils/logger';
import { initCommand } from './commands/init';
import { refreshCommand } from './commands/refresh';
import { doctorCommand } from './commands/doctor';
import { planCommand } from './commands/plan';
import { runCommand } from './commands/run';
import { mergeCommand } from './commands/merge';
import { generateCommand } from './commands/generate';
import { analyzeCommand } from './commands/analyze';
import { queryCommand, pathCommand } from './commands/query';
import { telepathyCommand } from './commands/telepathy';
import { 
  adapterListCommand, 
  adapterInstallCommand, 
  adapterRemoveCommand, 
  adapterConfigCommand, 
  adapterDoctorCommand 
} from './commands/adapter';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../package.json') as { version: string };

const program = new Command();

program
  .name('magneto')
  .description(
    'Magneto AI — AI reasoning framework & agent control plane.\n' +
    'Orchestrate multi-agent AI tasks with security guardrails,\n' +
    'power packs, and Copilot/OpenAI integration.'
  )
  .version(pkg.version)
  .hook('preAction', () => {
    logger.banner();
  })
  .addHelpText('after', `
Examples:
  $ magneto init                              Initialize Magneto AI in this project
  $ magneto init --with typescript nextjs     Init with power packs
  $ magneto init --adapter graphify           Init with Graphify adapter
  $ magneto doctor                            Validate setup
  $ magneto plan task.md                      Generate execution plan
  $ magneto plan task.json                    (also supports .json and .yaml)
  $ magneto run task.md --runner openai       Execute task via OpenAI
  $ magneto merge .magneto/cache --format md  Merge results as Markdown
  $ magneto generate task.md                 Generate scoped prompt for Windsurf/Copilot
  $ magneto analyze                           Analyze codebase and build memory

Environment variables:
  OPENAI_API_KEY                  Required for the OpenAI runner
  MAGNETO_COPILOT_CLOUD_ENDPOINT  Required for the Copilot Cloud runner
  MAGNETO_COPILOT_CLOUD_TOKEN     Required for the Copilot Cloud runner
  MAGNETO_MCP_PORT                MCP server port (default: 3100)

Documentation: https://github.com/rijuvashisht/Magneto#readme
`);

program
  .command('init')
  .description('Initialize Magneto AI in the current project. Scaffolds .magneto/, .github/agents/, and .vscode/mcp.json.')
  .option('--with <packs...>', 'Include power packs (typescript, nextjs, ai-platform, azure)')
  .option('--adapter <adapters...>', 'Include adapters (graphify)')
  .option('--force', 'Overwrite existing configuration', false)
  .addHelpText('after', `
Examples:
  $ magneto init
  $ magneto init --with typescript nextjs azure
  $ magneto init --with ai-platform --adapter graphify
  $ magneto init --force
`)
  .action(async (options) => {
    await initCommand(options);
  });

program
  .command('refresh')
  .description('Refresh Magneto AI configuration, re-detect power packs, and regenerate scaffolding.')
  .addHelpText('after', `
Example:
  $ magneto refresh
`)
  .action(async () => {
    await refreshCommand();
  });

program
  .command('doctor')
  .description('Validate Magneto AI setup and diagnose issues. Checks all required files and directories.')
  .addHelpText('after', `
Example:
  $ magneto doctor
`)
  .action(async () => {
    await doctorCommand();
  });

program
  .command('plan <taskFile>')
  .description('Generate an execution plan for a task file (.md, .yaml, or .json). Classifies the task, assigns roles, and evaluates security.')
  .option('--dry-run', 'Preview plan without saving to disk', false)
  .addHelpText('after', `
Examples:
  $ magneto plan tasks/checkout-mismatch.md
  $ magneto plan task.json --dry-run
`)
  .action(async (taskFile, options) => {
    await planCommand(taskFile, options);
  });

program
  .command('run <taskFile>')
  .description('Execute a task through the Magneto AI pipeline using a specified runner and execution mode.')
  .option('--runner <runner>', 'Runner: openai, copilot-local, copilot-cloud', 'openai')
  .option('--mode <mode>', 'Mode: observe, assist, execute, restricted', 'assist')
  .addHelpText('after', `
Runners:
  openai          Use OpenAI API (requires OPENAI_API_KEY)
  copilot-local   Delegate to GitHub Copilot via local MCP agents
  copilot-cloud   Use Copilot Cloud API endpoint

Modes:
  observe         Read-only analysis, no changes
  assist          Suggestions only, human applies changes (default)
  execute         Automated execution with guardrails
  restricted      Locked — requires approval for everything

Examples:
  $ magneto run task.json
  $ magneto run task.json --runner openai --mode execute
  $ magneto run task.json --runner copilot-local --mode observe
`)
  .action(async (taskFile, options) => {
    await runCommand(taskFile, options);
  });

program
  .command('merge <outputDir>')
  .description('Merge results from multiple agent output files into a single report.')
  .option('--format <format>', 'Output format: json, markdown', 'json')
  .addHelpText('after', `
Examples:
  $ magneto merge .magneto/cache
  $ magneto merge .magneto/cache --format markdown
`)
  .action(async (outputDir, options) => {
    await mergeCommand(outputDir, options);
  });

program
  .command('generate <taskFile>')
  .description('Generate a scoped, role-focused prompt from a task file. Paste into Windsurf or Copilot Chat for faster, cheaper AI-assisted development.')
  .option('--output <file>', 'Save prompt to a file instead of printing to console')
  .option('--role <role>', 'Generate prompt for a specific role (orchestrator, backend, tester, requirements)', 'all')
  .addHelpText('after', `
Examples:
  $ magneto generate tasks/implement-auth-flow.md
  $ magneto generate tasks/bug-fix.md --role backend
  $ magneto generate tasks/security-audit.md --output prompt.md
`)
  .action(async (taskFile, options) => {
    await generateCommand(taskFile, options);
  });

program
  .command('analyze')
  .description('Analyze the codebase, build structured memory, and generate a knowledge graph with community detection and interactive visualization.')
  .option('--depth <n>', 'Max directory depth to scan', '5')
  .option('--include <dirs...>', 'Only analyze these directories')
  .option('--exclude <dirs...>', 'Exclude additional directories')
  .option('--deep', 'Shell to graphify for multimodal extraction (PDFs, images, video). Requires: pip install graphifyy')
  .option('--no-viz', 'Skip interactive HTML visualization')
  .addHelpText('after', `
Examples:
  $ magneto analyze
  $ magneto analyze --depth 3
  $ magneto analyze --include src lib
  $ magneto analyze --exclude tests fixtures
  $ magneto analyze --deep             # multimodal via graphify
  $ magneto analyze --no-viz           # skip HTML, just JSON + report

Outputs:
  .magneto/memory/root-summary.md       Project overview + token savings
  .magneto/memory/file-index.md         All files with signatures
  .magneto/memory/dependencies.md       Import/dependency map
  .magneto/memory/modules/*.md          Per-directory summaries
  .magneto/memory/graph.json            Knowledge graph (queryable)
  .magneto/memory/graph-report.md       God nodes, communities, suggested questions
  .magneto/memory/graph.html            Interactive visualization (open in browser)
`)
  .action(async (options) => {
    await analyzeCommand(options);
  });

program
  .command('query <text>')
  .description('Search the knowledge graph. Returns a focused subgraph matching the query with node details and connections.')
  .option('--graph <path>', 'Path to graph.json (default: .magneto/memory/graph.json)')
  .option('--budget <n>', 'Max token budget for results (default: 2000)')
  .option('--dfs', 'Use depth-first search instead of breadth-first')
  .addHelpText('after', `
Examples:
  $ magneto query "auth flow"
  $ magneto query "what connects auth to payments" --dfs
  $ magneto query "SecurityEngine" --budget 500
`)
  .action(async (text, options) => {
    await queryCommand(text, options);
  });

program
  .command('path <nodeA> <nodeB>')
  .description('Find the shortest path between two nodes in the knowledge graph.')
  .option('--graph <path>', 'Path to graph.json (default: .magneto/memory/graph.json)')
  .addHelpText('after', `
Examples:
  $ magneto path "SecurityEngine" "initCommand"
  $ magneto path "context.ts" "merge-results.ts"
`)
  .action(async (nodeA, nodeB, options) => {
    await pathCommand(nodeA, nodeB, options);
  });

program
  .command('telepathy')
  .description('Automatic task discovery and execution. Discovers tasks from Jira, GitHub, requirements folder; auto-classifies and executes with appropriate telepathy level.')
  .option('--dry-run', 'Show what would be done without executing')
  .option('--auto', 'Auto-approve and execute all compatible tasks')
  .option('--source <type>', 'Task source filter (all|jira|github|requirements|tasks)', 'all')
  .addHelpText('after', `
Examples:
  $ magneto telepathy              # Discover and classify tasks
  $ magneto telepathy --dry-run    # Preview without executing
  $ magneto telepathy --auto       # Auto-execute compatible tasks
  $ magneto telepathy --source jira # Only Jira tasks

How it works:
  1. Discovers tasks from configured sources
  2. Auto-classifies (feature/bug/security/performance)
  3. Assigns roles based on task type
  4. Determines telepathy level (0-3) based on risk
  5. Auto-executes (Level 2-3) or generates plan (Level 0-1)

Telepathy Levels:
  Level 0: Manual — Generate prompts only
  Level 1: Assisted — Generate plan, require approval
  Level 2: Semi-auto — Execute low-risk tasks
  Level 3: Full auto — Execute with minimal oversight
`)
  .action(async (options) => {
    await telepathyCommand(options);
  });

const adapter = program
  .command('adapter')
  .description('Manage Magneto AI adapters for Claude, Antigravity, Manus, OpenClaw, and Graphify.');

adapter
  .command('list')
  .description('List available and installed adapters')
  .option('--verbose', 'Show detailed information')
  .action(async (options) => {
    await adapterListCommand(options);
  });

adapter
  .command('install <name>')
  .description('Install an adapter: claude, antigravity, manus, openclaw, graphify')
  .option('--api-key <key>', 'API key for adapters that require it (e.g., Manus)')
  .addHelpText('after', `
Examples:
  $ magneto adapter install claude
  $ magneto adapter install manus --api-key=your_key_here
  $ magneto adapter install antigravity
`)
  .action(async (name, options) => {
    await adapterInstallCommand(name, options);
  });

adapter
  .command('remove <name>')
  .description('Remove an installed adapter')
  .option('--force', 'Skip confirmation prompt', false)
  .action(async (name, options) => {
    await adapterRemoveCommand(name, options);
  });

adapter
  .command('config <name>')
  .description('Configure an adapter (especially for API-based adapters like Manus)')
  .option('--set <key>', 'Set a specific config key (e.g., sync.autoPushTasks)')
  .option('--value <val>', 'Value to set')
  .addHelpText('after', `
Examples:
  $ magneto adapter config manus                    # Interactive configuration
  $ magneto adapter config manus --set apiKey --value xxx
  $ magneto adapter config manus --set sync.autoPushTasks --value true
`)
  .action(async (name, options) => {
    await adapterConfigCommand(name, options);
  });

adapter
  .command('doctor')
  .description('Validate all installed adapters are correctly configured')
  .action(async () => {
    await adapterDoctorCommand();
  });

program.parse(process.argv);
