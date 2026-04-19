#!/usr/bin/env node

import { Command } from 'commander';
import { logger } from './utils/logger';
import { initCommand } from './commands/init';
import { refreshCommand } from './commands/refresh';
import { doctorCommand } from './commands/doctor';
import { planCommand } from './commands/plan';
import { runCommand } from './commands/run';
import { mergeCommand } from './commands/merge';

const program = new Command();

program
  .name('magneto')
  .description(
    'Magneto AI — AI reasoning framework & agent control plane.\n' +
    'Orchestrate multi-agent AI tasks with security guardrails,\n' +
    'power packs, and Copilot/OpenAI integration.'
  )
  .version('0.1.0')
  .hook('preAction', () => {
    logger.banner();
  })
  .addHelpText('after', `
Examples:
  $ magneto init                              Initialize Magneto AI in this project
  $ magneto init --with typescript nextjs     Init with power packs
  $ magneto init --adapter graphify           Init with Graphify adapter
  $ magneto doctor                            Validate setup
  $ magneto plan task.json                    Generate execution plan
  $ magneto run task.json --runner openai     Execute task via OpenAI
  $ magneto merge .magneto/cache --format md  Merge results as Markdown

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
  .description('Generate an execution plan for a task JSON file. Classifies the task, assigns roles, and evaluates security.')
  .option('--dry-run', 'Preview plan without saving to disk', false)
  .addHelpText('after', `
Examples:
  $ magneto plan examples/tasks/checkout-mismatch.json
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

program.parse(process.argv);
