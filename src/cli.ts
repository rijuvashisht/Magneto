#!/usr/bin/env node

import { Command } from 'commander';
import { logger } from './utils/logger';
import { initCommand } from './commands/init';
import { refreshCommand } from './commands/refresh';
import { detectCommand } from './commands/detect';
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
import {
  taskCreateCommand,
  taskListCommand,
  taskValidateCommand,
  taskDeleteCommand,
  taskShowCommand,
} from './commands/task';

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
  .option('--with <packs...>', 'Include power packs (typescript, python, nextjs, fastapi, spring-boot, ai-platform, azure)')
  .option('--adapter <adapters...>', 'Include adapters (graphify)')
  .option('--force', 'Overwrite existing configuration', false)
  .option('--no-suggest', 'Skip auto-detection prompt for matching power packs')
  .option('--auto-install', 'Auto-install all detected power packs without prompting (CI mode)', false)
  .addHelpText('after', `
Examples:
  $ magneto init
  $ magneto init --with typescript nextjs azure
  $ magneto init --with ai-platform --adapter graphify
  $ magneto init --auto-install        # CI: auto-install detected packs
  $ magneto init --no-suggest          # skip detection prompt
  $ magneto init --force
`)
  .action(async (options) => {
    await initCommand(options);
  });

program
  .command('detect')
  .description('Detect the project stack (languages, frameworks, clouds) and recommend power packs without modifying the project.')
  .option('--json', 'Output as JSON', false)
  .option('--min-confidence <n>', 'Minimum confidence threshold (0..1)', parseFloat)
  .addHelpText('after', `
Examples:
  $ magneto detect
  $ magneto detect --json
  $ magneto detect --min-confidence 0.8
`)
  .action(async (options) => {
    await detectCommand({
      json: options.json,
      minConfidence: options.minConfidence,
    });
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
  .option('--runner <runner>', 'Runner: openai, copilot-local, copilot-cloud, ollama', 'openai')
  .option('--mode <mode>', 'Mode: observe, assist, execute, restricted', 'assist')
  .option('--interactive', 'Execute with interactive approval for each step', false)
  .option('--approve-each', 'Pause for approval at each execution stage', false)
  .option('--diff', 'Show diff view before each step', false)
  .option('--rollback-on-fail', 'Auto-rollback on step failure', false)
  .option('--auto-approve-low-risk', 'Auto-approve steps with low risk level', false)
  .option('--stream', 'Enable real-time streaming output', false)
  .option('--watch', 'Watch mode with live updates', false)
  .option('--stream-format <format>', 'Stream format: text, json, sse', 'text')
  .option('--with-memory', 'Load relevant memories for context', false)
  .option('--save-memory', 'Save execution results to memory', false)
  .option('--checkpoint-auto', 'Enable automatic checkpoints', false)
  .option('--resume <checkpointId>', 'Resume from checkpoint', '')
  .option('--decompose', 'Force task decomposition', false)
  .option('--no-decompose', 'Disable automatic decomposition', false)
  .option('--max-sub-agents <n>', 'Maximum sub-agents to spawn', parseInt)
  .option('--coordination <mode>', 'Coordination mode: sequential, parallel, hybrid', 'hybrid')
  .option('--watch-sub-agents', 'Monitor sub-agent progress', false)
  .option('--track-tokens', 'Track token usage with A/B testing (with/without Magneto)', false)
  .addHelpText('after', `
Runners:
  openai          Use OpenAI API (requires OPENAI_API_KEY)
  copilot-local   Delegate to GitHub Copilot via local MCP agents
  copilot-cloud   Use Copilot Cloud API endpoint
  ollama          Use local Ollama (no API key, no data egress; OLLAMA_HOST + OLLAMA_MODEL)

Modes:
  observe         Read-only analysis, no changes
  assist          Suggestions only, human applies changes (default)
  execute         Automated execution with guardrails
  restricted      Locked — requires approval for everything

Interactive Options:
  --interactive           Execute with step-by-step approval
  --approve-each          Pause at each stage for approval
  --diff                  Show diff before each step
  --rollback-on-fail      Auto-rollback failed steps
  --auto-approve-low-risk Auto-approve low risk steps

Streaming Options:
  --stream                Enable real-time streaming output
  --watch                 Watch mode with live updates
  --stream-format         Stream output format (text/json/sse)

Examples:
  $ magneto run task.json
  $ magneto run task.json --runner openai --mode execute
  $ magneto run task.json --runner copilot-local --mode observe
  $ magneto run task.json --interactive
  $ magneto run task.json --approve-each --diff
  $ magneto run task.json --interactive --auto-approve-low-risk
  $ magneto run task.json --stream
  $ magneto run task.json --stream --stream-format json
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
  .option('--force', 'Re-run all tasks even if already completed')
  .option('--reset', 'Clear completed task history')
  .option('--source <type>', 'Task source filter (all|jira|github|requirements|tasks)', 'all')
  .addHelpText('after', `
Examples:
  $ magneto telepathy              # Discover and classify tasks
  $ magneto telepathy --dry-run    # Preview without executing
  $ magneto telepathy --auto       # Auto-execute compatible tasks
  $ magneto telepathy --force      # Re-run all including completed
  $ magneto telepathy --reset      # Clear completion history
  $ magneto telepathy --source jira # Only Jira tasks

How it works:
  1. Discovers tasks from configured sources
  2. Skips templates and already-completed tasks
  3. Auto-classifies (feature/bug/security/performance)
  4. Assigns roles based on task type
  5. Determines telepathy level (0-3) based on risk
  6. Auto-executes (Level 2-3) or generates plan (Level 0-1)
  7. Marks tasks as completed after processing

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

const task = program
  .command('task')
  .description('Manage Magneto AI task files (.magneto/tasks/)')
  .argument('[description]', 'Quick-create a feature task with this description')
  .option('--type <type>', 'Task type for quick-create (feature, bug, etc.)', 'feature')
  .option('--priority <level>', 'Priority for quick-create: high, medium, low', 'medium')
  .addHelpText('after', `
Quick Create:
  $ magneto task "Add OAuth login"                    # Creates a feature task
  $ magneto task "Fix checkout bug" --type bug         # Creates a bug task
  $ magneto task "Audit endpoints" --type security     # Creates a security task

Subcommands:
  create, list, validate, delete, show
`)
  .action(async (description, options) => {
    if (description) {
      const type = options.type || 'feature';
      await taskCreateCommand(type, description, { priority: options.priority });
    }
  });

task
  .command('create <type> <title>')
  .description('Create a new task from template')
  .option('--priority <level>', 'Priority: high, medium, low', 'medium')
  .option('--roles <roles...>', 'Agent roles (orchestrator, backend, tester, etc.)')
  .option('--edit', 'Open in editor after creation', false)
  .addHelpText('after', `
Task Types:
  feature      New feature implementation
  bug          Bug fix
  security     Security audit or fix
  performance  Performance optimization
  test         Test implementation
  refactor     Code refactoring
  docs         Documentation

Examples:
  $ magneto task create feature "Add OAuth login"
  $ magneto task create bug "Fix checkout error" --priority high
  $ magneto task create security "Audit API endpoints" --roles orchestrator backend
  $ magneto task create test "Add unit tests" --edit
`)
  .action(async (type, title, options) => {
    await taskCreateCommand(type, title, options);
  });

task
  .command('list')
  .description('List all tasks with optional filters')
  .option('--type <type>', 'Filter by type (feature, bug, etc.)')
  .option('--priority <priority>', 'Filter by priority (high, medium, low)')
  .option('--role <role>', 'Filter by role')
  .option('--sort-by <field>', 'Sort by: name, priority', 'name')
  .action(async (options) => {
    await taskListCommand(options);
  });

task
  .command('validate <taskFile>')
  .description('Validate a task file against the schema')
  .action(async (taskFile) => {
    await taskValidateCommand(taskFile);
  });

task
  .command('delete <taskFile>')
  .description('Delete a task file')
  .option('--force', 'Skip confirmation', false)
  .action(async (taskFile, options) => {
    await taskDeleteCommand(taskFile, options);
  });

task
  .command('show <taskFile>')
  .description('Display task details')
  .action(async (taskFile) => {
    await taskShowCommand(taskFile);
  });

// Memory commands
import {
  memoryListCommand,
  memoryShowCommand,
  memorySearchCommand,
  memoryDeleteCommand,
  memoryPruneCommand,
  memoryExportCommand,
  memoryImportCommand,
  memoryStatsCommand,
} from './commands/memory';

const memory = program
  .command('memory')
  .description('Manage agent memories');

memory
  .command('list')
  .description('List all memories')
  .option('--task <taskId>', 'Filter by task ID')
  .option('--type <type>', 'Filter by memory type')
  .option('--limit <n>', 'Limit number of results', parseInt)
  .action(async (options) => {
    await memoryListCommand(options);
  });

memory
  .command('show <id>')
  .description('Show memory details')
  .action(async (id) => {
    await memoryShowCommand(id);
  });

memory
  .command('search <query>')
  .description('Search memories')
  .option('--limit <n>', 'Limit number of results', parseInt)
  .action(async (query, options) => {
    await memorySearchCommand(query, options);
  });

memory
  .command('delete <id>')
  .description('Delete a memory')
  .option('--force', 'Confirm deletion', false)
  .action(async (id, options) => {
    await memoryDeleteCommand(id, options);
  });

memory
  .command('prune')
  .description('Prune old memories')
  .option('--strategy <strategy>', 'Pruning strategy: lru, importance, age, hybrid', 'hybrid')
  .option('--max-age <days>', 'Delete memories older than N days', parseInt)
  .option('--min-importance <score>', 'Delete memories with importance below score', parseFloat)
  .option('--keep-checkpoints', 'Keep checkpoint memories', true)
  .option('--dry-run', 'Show what would be deleted without deleting', false)
  .action(async (options) => {
    await memoryPruneCommand(options);
  });

memory
  .command('export')
  .description('Export memories to JSON')
  .option('--output <file>', 'Output file (default: stdout)')
  .option('--project <id>', 'Filter by project ID')
  .action(async (options) => {
    await memoryExportCommand(options);
  });

memory
  .command('import <file>')
  .description('Import memories from JSON file (use - for stdin)')
  .option('--dry-run', 'Validate without importing', false)
  .action(async (file, options) => {
    await memoryImportCommand(file, options);
  });

memory
  .command('stats')
  .description('Show memory statistics')
  .action(async () => {
    await memoryStatsCommand();
  });

// Checkpoint commands
import {
  checkpointListCommand,
  checkpointShowCommand,
  checkpointDeleteCommand,
  checkpointClearCommand,
  checkpointStatsCommand,
} from './commands/checkpoint';

const checkpoint = program
  .command('checkpoint')
  .description('Manage execution checkpoints');

checkpoint
  .command('list')
  .description('List all checkpoints')
  .option('--task <taskId>', 'Filter by task ID')
  .action(async (options) => {
    await checkpointListCommand(options);
  });

checkpoint
  .command('show <id>')
  .description('Show checkpoint details')
  .action(async (id) => {
    await checkpointShowCommand(id);
  });

checkpoint
  .command('delete <id>')
  .description('Delete a checkpoint')
  .option('--force', 'Confirm deletion', false)
  .action(async (id, options) => {
    await checkpointDeleteCommand(id, options);
  });

checkpoint
  .command('clear')
  .description('Clear all checkpoints (or for a specific task)')
  .option('--task <taskId>', 'Only clear checkpoints for this task')
  .option('--force', 'Confirm deletion', false)
  .action(async (options) => {
    await checkpointClearCommand(options);
  });

checkpoint
  .command('stats')
  .description('Show checkpoint statistics')
  .action(async () => {
    await checkpointStatsCommand();
  });

// Graph commands
import {
  graphBuildCommand,
  graphQueryCommand,
  graphShowCommand,
  graphPathCommand,
  graphNeighborsCommand,
  graphStatsCommand,
  graphCommunitiesCommand,
  graphGodNodesCommand,
  graphExportCommand,
  graphViewCommand,
} from './commands/graph';

const graph = program
  .command('graph')
  .description('Knowledge graph operations');

graph
  .command('build')
  .description('Build knowledge graph from codebase')
  .option('--watch', 'Watch mode, auto-rebuild on changes', false)
  .option('--incremental', 'Incremental update', false)
  .action(async (options) => {
    await graphBuildCommand(options);
  });

graph
  .command('query <search>')
  .description('Search the knowledge graph')
  .option('--type <types>', 'Filter by node types (comma-separated)')
  .option('--file <path>', 'Filter by file path')
  .option('--limit <n>', 'Limit results', parseInt)
  .action(async (search, options) => {
    await graphQueryCommand(search, options);
  });

graph
  .command('show <file>')
  .description('Show graph nodes for a file')
  .action(async (file) => {
    await graphShowCommand(file);
  });

graph
  .command('path <from> <to>')
  .description('Find path between two nodes')
  .action(async (from, to) => {
    await graphPathCommand(from, to);
  });

graph
  .command('neighbors <node>')
  .description('Show neighborhood of a node')
  .option('--depth <n>', 'Neighborhood depth', parseInt, 1)
  .action(async (node, options) => {
    await graphNeighborsCommand(node, options);
  });

graph
  .command('stats')
  .description('Show graph statistics')
  .action(async () => {
    await graphStatsCommand();
  });

graph
  .command('communities')
  .description('Show detected communities')
  .action(async () => {
    await graphCommunitiesCommand();
  });

graph
  .command('god-nodes')
  .description('Show highly connected nodes')
  .action(async () => {
    await graphGodNodesCommand();
  });

graph
  .command('export')
  .description('Export graph to various formats')
  .option('--format <format>', 'Export format: json, dot', 'json')
  .option('--output <file>', 'Output file path')
  .action(async (options) => {
    await graphExportCommand(options);
  });

graph
  .command('view')
  .description('Open interactive graph viewer')
  .action(async () => {
    await graphViewCommand();
  });

program.parse(process.argv);
