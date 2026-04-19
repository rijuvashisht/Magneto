import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';
import { logger } from '../utils/logger';
import { resolveProjectRoot, isMagnetoProject, magnetoPath } from '../utils/paths';
import { fileExists, ensureDir, readJson, writeJson, deleteDir } from '../utils/fs';
import { loadAdapters } from '../core/adapter-loader';

export interface AdapterListOptions {
  verbose?: boolean;
}

export interface AdapterInstallOptions {
  apiKey?: string;
}

export interface AdapterRemoveOptions {
  force?: boolean;
}

export interface AdapterConfigOptions {
  set?: string;
  value?: string;
}

interface AdapterInfo {
  name: string;
  version: string;
  description: string;
  type: string;
  installed: boolean;
  configured: boolean;
  location?: string;
}

const AVAILABLE_ADAPTERS = ['claude', 'antigravity', 'manus', 'openclaw', 'graphify'];

const ADAPTER_FOLDERS: Record<string, string[]> = {
  claude: ['.claude'],
  antigravity: ['.agents'],
  manus: ['.magneto/adapters/manus'],
  openclaw: ['.openclaw'],
  graphify: ['.graphify-out'],
};

export async function adapterListCommand(options: AdapterListOptions): Promise<void> {
  const projectRoot = resolveProjectRoot();
  
  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto project. Run "magneto init" first.');
    return;
  }

  logger.info('Available adapters:\n');

  const adapters: AdapterInfo[] = [];
  
  for (const name of AVAILABLE_ADAPTERS) {
    const info = await getAdapterInfo(projectRoot, name);
    adapters.push(info);
  }

  // Display available adapters
  for (const adapter of adapters) {
    const statusIcon = adapter.installed ? '✓' : '○';
    const statusColor = adapter.installed ? logger.success : logger.info;
    const statusText = adapter.installed 
      ? (adapter.configured ? 'installed' : 'installed (needs config)')
      : 'available';
    
    statusColor.call(logger, `${statusIcon} ${adapter.name}`);
    logger.info(`  ${adapter.description}`);
    logger.info(`  Type: ${adapter.type} | Status: ${statusText}`);
    
    if (options.verbose && adapter.location) {
      logger.info(`  Location: ${adapter.location}`);
    }
    console.log('');
  }

  // Summary
  const installed = adapters.filter(a => a.installed).length;
  logger.info(`\n${installed}/${adapters.length} adapters installed`);
  logger.info('Run "magneto adapter install <name>" to install an adapter');
}

export async function adapterInstallCommand(
  name: string, 
  options: AdapterInstallOptions
): Promise<void> {
  const projectRoot = resolveProjectRoot();
  
  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto project. Run "magneto init" first.');
    return;
  }

  if (!AVAILABLE_ADAPTERS.includes(name)) {
    logger.error(`Unknown adapter: ${name}`);
    logger.info(`Available adapters: ${AVAILABLE_ADAPTERS.join(', ')}`);
    return;
  }

  const info = await getAdapterInfo(projectRoot, name);
  if (info.installed) {
    logger.warn(`Adapter "${name}" is already installed.`);
    logger.info(`Run "magneto adapter config ${name}" to reconfigure.`);
    return;
  }

  logger.info(`Installing adapter: ${name}...`);

  try {
    await loadAdapters(projectRoot, name);
    
    // For API-based adapters, prompt for API key if not provided
    if (name === 'manus') {
      const apiKey = options.apiKey || await promptForApiKey('Manus API key');
      if (apiKey) {
        await updateManusConfig(projectRoot, apiKey);
      }
    }

    logger.success(`\nAdapter "${name}" installed successfully!`);
    
    // Show next steps
    showNextSteps(name);
  } catch (error) {
    logger.error(`Failed to install adapter: ${error}`);
  }
}

export async function adapterRemoveCommand(
  name: string, 
  options: AdapterRemoveOptions
): Promise<void> {
  const projectRoot = resolveProjectRoot();
  
  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto project. Run "magneto init" first.');
    return;
  }

  const info = await getAdapterInfo(projectRoot, name);
  if (!info.installed) {
    logger.warn(`Adapter "${name}" is not installed.`);
    return;
  }

  if (!options.force) {
    const confirmed = await confirm(`Remove adapter "${name}"? This will delete all adapter files.`);
    if (!confirmed) {
      logger.info('Cancelled.');
      return;
    }
  }

  logger.info(`Removing adapter: ${name}...`);

  try {
    // Remove adapter-specific folders
    const folders = ADAPTER_FOLDERS[name] || [];
    for (const folder of folders) {
      const folderPath = path.join(projectRoot, folder);
      if (fileExists(folderPath)) {
        deleteDir(folderPath);
        logger.info(`  Removed: ${folder}`);
      }
    }

    // Remove from adapters directory (except for file-based adapters)
    if (name !== 'claude' && name !== 'antigravity' && name !== 'openclaw') {
      const adapterDir = magnetoPath(projectRoot, 'adapters', name);
      if (fileExists(adapterDir)) {
        deleteDir(adapterDir);
        logger.info(`  Removed: .magneto/adapters/${name}`);
      }
    }

    // Update magneto.config.json
    await removeFromConfig(projectRoot, name);

    logger.success(`\nAdapter "${name}" removed successfully.`);
  } catch (error) {
    logger.error(`Failed to remove adapter: ${error}`);
  }
}

export async function adapterConfigCommand(
  name: string, 
  options: AdapterConfigOptions
): Promise<void> {
  const projectRoot = resolveProjectRoot();
  
  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto project. Run "magneto init" first.');
    return;
  }

  const info = await getAdapterInfo(projectRoot, name);
  if (!info.installed) {
    logger.warn(`Adapter "${name}" is not installed.`);
    logger.info(`Run "magneto adapter install ${name}" first.`);
    return;
  }

  if (name === 'manus') {
    await configManus(projectRoot, options);
  } else if (name === 'claude' || name === 'antigravity' || name === 'openclaw') {
    logger.info(`Adapter "${name}" is file-based and does not require configuration.`);
    logger.info(`Files are located in: ${ADAPTER_FOLDERS[name]?.join(', ')}`);
  } else {
    logger.info(`No configuration options available for "${name}".`);
  }
}

export async function adapterDoctorCommand(): Promise<void> {
  const projectRoot = resolveProjectRoot();
  
  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto project. Run "magneto init" first.');
    return;
  }

  logger.info('Running adapter diagnostics...\n');

  const adapters = await getInstalledAdapters(projectRoot);
  
  if (adapters.length === 0) {
    logger.warn('No adapters installed.');
    logger.info('Run "magneto adapter list" to see available adapters.');
    return;
  }

  for (const name of adapters) {
    logger.info(`Checking ${name}...`);
    await diagnoseAdapter(projectRoot, name);
    console.log('');
  }
}

// Helper functions

async function getAdapterInfo(projectRoot: string, name: string): Promise<AdapterInfo> {
  const templatePath = path.join(
    projectRoot, 
    'src/templates/power-packs/adapters', 
    name, 
    'adapter.json'
  );
  
  let version = '1.0.0';
  let description = `${name} adapter`;
  let type = 'file-based';

  if (fileExists(templatePath)) {
    try {
      const template = readJson<{version?: string; description?: string; type?: string}>(templatePath);
      version = template.version || version;
      description = template.description || description;
      type = template.type || type;
    } catch {
      // Use defaults
    }
  }

  const folders = ADAPTER_FOLDERS[name] || [];
  const installed = folders.some(f => fileExists(path.join(projectRoot, f)));
  
  let configured = installed;
  let location: string | undefined;
  
  if (installed) {
    location = folders.find(f => fileExists(path.join(projectRoot, f)));
    
    // For API-based adapters, check if config is complete
    if (name === 'manus') {
      const configPath = magnetoPath(projectRoot, 'adapters', name, 'config.json');
      if (fileExists(configPath)) {
        try {
          const config = readJson<{apiKey?: string}>(configPath);
          configured = config.apiKey !== 'YOUR_MANUS_API_KEY' && !!config.apiKey;
        } catch {
          configured = false;
        }
      } else {
        configured = false;
      }
    }
  }

  return {
    name,
    version,
    description,
    type,
    installed,
    configured,
    location,
  };
}

async function getInstalledAdapters(projectRoot: string): Promise<string[]> {
  const installed: string[] = [];
  
  for (const name of AVAILABLE_ADAPTERS) {
    const info = await getAdapterInfo(projectRoot, name);
    if (info.installed) {
      installed.push(name);
    }
  }
  
  return installed;
}

async function diagnoseAdapter(projectRoot: string, name: string): Promise<void> {
  const folders = ADAPTER_FOLDERS[name] || [];
  
  for (const folder of folders) {
    const folderPath = path.join(projectRoot, folder);
    if (fileExists(folderPath)) {
      logger.success(`  ✓ ${folder} exists`);
    } else {
      logger.error(`  ✗ ${folder} missing`);
    }
  }

  // Type-specific checks
  if (name === 'manus') {
    const configPath = magnetoPath(projectRoot, 'adapters', name, 'config.json');
    if (fileExists(configPath)) {
      try {
        const config = readJson<{apiKey?: string}>(configPath);
        if (config.apiKey && config.apiKey !== 'YOUR_MANUS_API_KEY') {
          logger.success('  ✓ API key configured');
        } else {
          logger.warn('  ⚠ API key not set (run "magneto adapter config manus")');
        }
      } catch {
        logger.error('  ✗ Config file is invalid JSON');
      }
    } else {
      logger.error('  ✗ Config file missing');
    }
  }

  // Check adapter.json in .magneto/adapters
  const adapterJsonPath = magnetoPath(projectRoot, 'adapters', name, 'adapter.json');
  if (fileExists(adapterJsonPath)) {
    logger.success('  ✓ adapter.json exists');
  }
}

async function configManus(
  projectRoot: string, 
  options: AdapterConfigOptions
): Promise<void> {
  const configPath = magnetoPath(projectRoot, 'adapters', 'manus', 'config.json');
  
  if (!fileExists(configPath)) {
    logger.error('Manus config file not found. Try reinstalling the adapter.');
    return;
  }

  try {
    const config = readJson<{
      apiKey?: string;
      baseUrl?: string;
      version?: string;
      projectId?: string | null;
      sync?: {
        autoPushTasks?: boolean;
        autoPullResults?: boolean;
        includeGraph?: boolean;
      };
    }>(configPath);

    logger.info('Current Manus configuration:\n');
    logger.info(`  API Key: ${config.apiKey ? '********' : 'Not set'}`);
    logger.info(`  Base URL: ${config.baseUrl || 'https://api.manus.ai'}`);
    logger.info(`  Version: ${config.version || 'v2'}`);
    logger.info(`  Project ID: ${config.projectId || 'Not set'}`);
    logger.info(`  Auto-push tasks: ${config.sync?.autoPushTasks ? 'Yes' : 'No'}`);
    logger.info(`  Auto-pull results: ${config.sync?.autoPullResults ? 'Yes' : 'No'}`);
    logger.info(`  Include graph: ${config.sync?.includeGraph ? 'Yes' : 'No'}`);

    console.log('');
    
    // If --set and --value provided, update directly
    if (options.set && options.value !== undefined) {
      // Handle nested properties like sync.autoPushTasks
      const keys = options.set.split('.');
      let target: Record<string, unknown> = config;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in target) || typeof target[key] !== 'object') {
          target[key] = {};
        }
        target = target[key] as Record<string, unknown>;
      }
      
      const finalKey = keys[keys.length - 1];
      
      // Parse value
      let parsedValue: unknown = options.value;
      if (options.value === 'true') parsedValue = true;
      else if (options.value === 'false') parsedValue = false;
      else if (/^\d+$/.test(options.value)) parsedValue = parseInt(options.value, 10);
      
      target[finalKey] = parsedValue;
      writeJson(configPath, config);
      logger.success(`Updated ${options.set} = ${options.value}`);
      return;
    }

    // Interactive configuration
    logger.info('Enter new values (press Enter to keep current):\n');
    
    const apiKey = await promptForInput('API Key', config.apiKey, true);
    if (apiKey) {
      config.apiKey = apiKey;
    }

    const projectId = await promptForInput('Project ID', config.projectId || '');
    config.projectId = projectId || null;

    const autoPush = await promptForBoolean('Auto-push tasks', config.sync?.autoPushTasks || false);
    if (!config.sync) config.sync = {};
    config.sync.autoPushTasks = autoPush;

    const autoPull = await promptForBoolean('Auto-pull results', config.sync?.autoPullResults || false);
    config.sync.autoPullResults = autoPull;

    writeJson(configPath, config);
    logger.success('\nConfiguration saved!');
  } catch (error) {
    logger.error(`Failed to read config: ${error}`);
  }
}

async function updateManusConfig(projectRoot: string, apiKey: string): Promise<void> {
  const configPath = magnetoPath(projectRoot, 'adapters', 'manus', 'config.json');
  
  if (fileExists(configPath)) {
    try {
      const config = readJson<{apiKey?: string}>(configPath);
      config.apiKey = apiKey;
      writeJson(configPath, config);
      logger.success('API key saved to config');
    } catch (error) {
      logger.warn(`Failed to save API key: ${error}`);
    }
  }
}

async function removeFromConfig(projectRoot: string, name: string): Promise<void> {
  const configPath = magnetoPath(projectRoot, 'magneto.config.json');
  
  if (!fileExists(configPath)) return;
  
  try {
    const config = readJson<{adapters?: string[]}>(configPath);
    if (config.adapters) {
      config.adapters = config.adapters.filter(a => a !== name);
      writeJson(configPath, config);
    }
  } catch {
    // Ignore errors
  }
}

function showNextSteps(name: string): void {
  console.log('');
  logger.info('Next steps:');
  
  switch (name) {
    case 'claude':
      logger.info('  1. Open Claude Code in this project');
      logger.info('  2. Type /magneto to see available commands');
      logger.info('  3. Try: /magneto analyze');
      break;
    case 'antigravity':
      logger.info('  1. Open Google Antigravity IDE');
      logger.info('  2. Type /magneto-analyze to analyze codebase');
      logger.info('  3. Type /magneto-query "<text>" to query graph');
      break;
    case 'manus':
      logger.info('  1. Get your API key from https://open.manus.im/');
      logger.info('  2. Run: magneto adapter config manus');
      logger.info('  3. Sync tasks: magneto adapter sync manus --push');
      break;
    case 'openclaw':
      logger.info('  1. Restart your OpenClaw gateway');
      logger.info('  2. The Magneto skill will be auto-loaded');
      break;
    case 'graphify':
      logger.info('  1. Install Graphify: pip install graphifyy');
      logger.info('  2. Run: magneto analyze --deep');
      break;
  }
}

// Prompt utilities

function promptForApiKey(label: string): Promise<string | null> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    rl.question(`${label} (or press Enter to skip): `, (answer) => {
      rl.close();
      resolve(answer.trim() || null);
    });
  });
}

function promptForInput(label: string, currentValue: string | null | undefined, mask = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    const display = mask && currentValue ? '********' : (currentValue || 'empty');
    rl.question(`${label} [${display}]: `, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function promptForBoolean(label: string, currentValue: boolean): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    rl.question(`${label} [${currentValue ? 'Y/n' : 'y/N'}]: `, (answer) => {
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      if (trimmed === '') {
        resolve(currentValue);
      } else {
        resolve(trimmed === 'y' || trimmed === 'yes');
      }
    });
  });
}

function confirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    rl.question(`${message} [y/N]: `, (answer) => {
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      resolve(trimmed === 'y' || trimmed === 'yes');
    });
  });
}
