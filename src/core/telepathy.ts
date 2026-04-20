/**
 * Telepathy Module — Automatic Task Understanding & Execution
 * 
 * This module enables Magneto to:
 * 1. Read tasks from external systems (Jira, GitHub Issues, etc.)
 * 2. Parse requirements documents from .magneto/memory/requirements/
 * 3. Auto-classify tasks and assign appropriate roles
 * 4. Auto-execute with appropriate telepathy level
 * 5. Work without manual configuration
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';
import { magnetoPath } from '../utils/paths';
import { fileExists, readText, listFiles, readJson } from '../utils/fs';

export interface ExternalTask {
  id: string;
  title: string;
  description: string;
  source: 'jira' | 'github' | 'azure-devops' | 'file';
  url?: string;
  labels?: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  metadata?: Record<string, unknown>;
}

export interface RequirementDoc {
  id: string;
  title: string;
  content: string;
  filePath: string;
  relatedTasks?: string[];
}

export interface AutoTaskConfig {
  title: string;
  description: string;
  type: 'feature-implementation' | 'bug-fix' | 'security-audit' | 'performance-review' | 'testing' | 'requirements-analysis' | 'code-review';
  roles: string[];
  scope: string[];
  estimatedComplexity: 'low' | 'medium' | 'high';
  telepathyLevel: 0 | 1 | 2 | 3;
  autoApprove: boolean;
  requirements: RequirementDoc[];
}

// === Task Completion Tracking ===

interface CompletedTaskEntry {
  id: string;
  title: string;
  completedAt: string;
  runner?: string;
}

function getCompletedTasksPath(projectRoot: string): string {
  return path.join(projectRoot, '.magneto', 'cache', 'completed-tasks.json');
}

/**
 * Load list of previously completed task IDs
 */
export function loadCompletedTasks(projectRoot: string): CompletedTaskEntry[] {
  const filePath = getCompletedTasksPath(projectRoot);
  if (!fileExists(filePath)) return [];
  try {
    return readJson<CompletedTaskEntry[]>(filePath) || [];
  } catch {
    return [];
  }
}

/**
 * Mark a task as completed so it won't be re-executed
 */
export function markTaskCompleted(projectRoot: string, taskId: string, title: string, runner?: string): void {
  const completed = loadCompletedTasks(projectRoot);
  // Don't duplicate
  if (completed.some(t => t.id === taskId)) return;
  completed.push({ id: taskId, title, completedAt: new Date().toISOString(), runner });
  const filePath = getCompletedTasksPath(projectRoot);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(completed, null, 2), 'utf-8');
}

/**
 * Check if a task has already been completed
 */
export function isTaskCompleted(projectRoot: string, taskId: string): boolean {
  const completed = loadCompletedTasks(projectRoot);
  return completed.some(t => t.id === taskId);
}

/**
 * Reset a single task or all completed tasks
 */
export function resetCompletedTasks(projectRoot: string, taskId?: string): void {
  if (!taskId) {
    // Reset all
    const filePath = getCompletedTasksPath(projectRoot);
    if (fileExists(filePath)) fs.unlinkSync(filePath);
    return;
  }
  const completed = loadCompletedTasks(projectRoot).filter(t => t.id !== taskId);
  const filePath = getCompletedTasksPath(projectRoot);
  fs.writeFileSync(filePath, JSON.stringify(completed, null, 2), 'utf-8');
}

/**
 * Auto-discover tasks from requirements folder and external sources
 */
export async function discoverTasks(projectRoot: string): Promise<ExternalTask[]> {
  const tasks: ExternalTask[] = [];

  // 1. Check for Jira adapter configuration
  const jiraTasks = await discoverJiraTasks(projectRoot);
  tasks.push(...jiraTasks);

  // 2. Check for GitHub Issues adapter
  const githubTasks = await discoverGitHubTasks(projectRoot);
  tasks.push(...githubTasks);

  // 3. Read requirements documents from memory/requirements/
  const reqTasks = await discoverRequirementTasks(projectRoot);
  tasks.push(...reqTasks);

  // 4. Check for task files in .magneto/tasks/
  const fileTasks = await discoverFileTasks(projectRoot);
  tasks.push(...fileTasks);

  logger.info(`Telepathy: Discovered ${tasks.length} tasks`);
  return tasks;
}

/**
 * Auto-classify a task and generate full configuration
 */
export async function autoClassifyTask(
  projectRoot: string,
  externalTask: ExternalTask
): Promise<AutoTaskConfig> {
  logger.info(`Telepathy: Auto-classifying task "${externalTask.title}"`);

  // 1. Use graph query to understand the codebase context
  const graphContext = await queryGraphContext(projectRoot, externalTask);

  // 2. Classify task type based on title/description
  const taskType = classifyTaskType(externalTask);

  // 3. Assign appropriate roles
  const roles = assignRoles(taskType, externalTask);

  // 4. Determine scope from graph + requirements
  const scope = await determineScope(projectRoot, externalTask, graphContext);

  // 5. Find related requirements documents
  const requirements = await findRelatedRequirements(projectRoot, externalTask);

  // 6. Calculate complexity and telepathy level
  const complexity = estimateComplexity(externalTask, scope.length);
  const telepathyLevel = calculateTelepathyLevel(taskType, complexity, externalTask.priority);

  // 7. Determine if auto-approval is safe
  const autoApprove = canAutoApprove(taskType, complexity, externalTask);

  return {
    title: externalTask.title,
    description: externalTask.description,
    type: taskType,
    roles,
    scope,
    estimatedComplexity: complexity,
    telepathyLevel,
    autoApprove,
    requirements,
  };
}

/**
 * Execute task with automatic configuration (Telepathy Level 2+)
 */
export async function executeWithTelepathy(
  projectRoot: string,
  autoConfig: AutoTaskConfig,
  dryRun: boolean = false
): Promise<void> {
  logger.info(`Telepathy: Executing "${autoConfig.title}" (Level ${autoConfig.telepathyLevel})`);

  // Build the execution context
  const context = {
    projectRoot,
    classification: autoConfig.type,
    roles: autoConfig.roles,
    scope: autoConfig.scope,
    requirements: autoConfig.requirements,
    telepathyLevel: autoConfig.telepathyLevel,
  };

  if (dryRun) {
    logger.info('Telepathy: [DRY RUN] Would execute with config:');
    console.log(JSON.stringify(context, null, 2));
    return;
  }

  // Auto-execute based on telepathy level
  switch (autoConfig.telepathyLevel) {
    case 0:
      // Level 0: Manual - just generate prompts, don't execute
      logger.info('Telepathy Level 0: Generate prompts only');
      await generatePromptsOnly(projectRoot, autoConfig);
      break;

    case 1:
      // Level 1: Assisted - generate plan, wait for approval
      logger.info('Telepathy Level 1: Generate plan, requires approval');
      await generatePlan(projectRoot, autoConfig);
      break;

    case 2:
      // Level 2: Semi-autonomous - execute low-risk tasks
      logger.info('Telepathy Level 2: Semi-autonomous execution');
      if (autoConfig.autoApprove) {
        await executeAutonomous(projectRoot, autoConfig);
      } else {
        await generatePlan(projectRoot, autoConfig);
      }
      break;

    case 3:
      // Level 3: Full telepathy - execute with minimal oversight
      logger.info('Telepathy Level 3: Full autonomous execution');
      await executeAutonomous(projectRoot, autoConfig);
      break;
  }
}

// === Private Helper Functions ===

async function discoverJiraTasks(projectRoot: string): Promise<ExternalTask[]> {
  const adapterConfigPath = magnetoPath(projectRoot, 'adapters', 'jira', 'config.json');
  if (!fileExists(adapterConfigPath)) {
    return [];
  }

  try {
    // This would integrate with Jira API in real implementation
    logger.debug('Checking Jira adapter for tasks...');
    // const jiraConfig = readJson(adapterConfigPath);
    // return fetchJiraIssues(jiraConfig);
    return []; // Placeholder
  } catch (error) {
    logger.warn('Failed to read Jira tasks:', error);
    return [];
  }
}

async function discoverGitHubTasks(projectRoot: string): Promise<ExternalTask[]> {
  const adapterConfigPath = magnetoPath(projectRoot, 'adapters', 'github', 'config.json');
  if (!fileExists(adapterConfigPath)) {
    return [];
  }

  try {
    logger.debug('Checking GitHub adapter for issues...');
    return []; // Placeholder
  } catch (error) {
    logger.warn('Failed to read GitHub issues:', error);
    return [];
  }
}

async function discoverRequirementTasks(projectRoot: string): Promise<ExternalTask[]> {
  const requirementsDir = magnetoPath(projectRoot, 'memory', 'requirements');
  if (!fileExists(requirementsDir)) {
    return [];
  }

  const tasks: ExternalTask[] = [];
  const files = listFiles(requirementsDir, /\.md$/);

  for (const file of files) {
    try {
      // Use full path by joining with requirements directory
      const fullPath = path.join(requirementsDir, file);
      
      // Check if file exists before reading
      if (!fs.existsSync(fullPath)) {
        logger.debug(`Skipping missing file: ${fullPath}`);
        continue;
      }
      
      const content = readText(fullPath);
      const title = extractTitle(content) || path.basename(file, '.md');
      
      tasks.push({
        id: `req-${path.basename(file, '.md')}`,
        title,
        description: content.substring(0, 500),
        source: 'file',
        metadata: { filePath: fullPath },
      });
    } catch (err: any) {
      // Log warning for files that can't be parsed
      logger.warn(`Failed to parse requirement file "${file}": ${err.message}`);
    }
  }

  logger.debug(`Found ${tasks.length} requirement documents`);
  return tasks;
}

async function discoverFileTasks(projectRoot: string): Promise<ExternalTask[]> {
  const tasksDir = magnetoPath(projectRoot, 'tasks');
  if (!fileExists(tasksDir)) {
    return [];
  }

  const tasks: ExternalTask[] = [];
  const files = listFiles(tasksDir, /\.md$/);

  for (const file of files) {
    try {
      // Use full path by joining with tasks directory
      const fullPath = path.join(tasksDir, file);
      
      // Check if file exists before reading
      if (!fs.existsSync(fullPath)) {
        logger.debug(`Skipping missing file: ${fullPath}`);
        continue;
      }
      
      const content = readText(fullPath);
      const title = extractTitle(content) || path.basename(file, '.md');
      
      tasks.push({
        id: `task-${path.basename(file, '.md')}`,
        title,
        description: content.substring(0, 500),
        source: 'file',
        metadata: { filePath: fullPath },
      });
    } catch (err: any) {
      // Log warning for files that can't be parsed
      logger.warn(`Failed to parse task file "${file}": ${err.message}`);
    }
  }

  return tasks;
}

async function queryGraphContext(projectRoot: string, task: ExternalTask): Promise<any> {
  // Query the knowledge graph for relevant context
  const searchTerms = extractSearchTerms(task);
  
  try {
    const results = await queryGraph(projectRoot, searchTerms[0] || 'main', 1000, false);
    return results;
  } catch (error) {
    logger.warn('Graph query failed:', error);
    return null;
  }
}

function classifyTaskType(task: ExternalTask): AutoTaskConfig['type'] {
  const titleLower = task.title.toLowerCase();
  const descLower = task.description.toLowerCase();
  const combined = `${titleLower} ${descLower}`;

  // Bug fix detection
  if (/\b(bug|fix|error|crash|broken|issue|defect)\b/.test(combined)) {
    return 'bug-fix';
  }

  // Security detection
  if (/\b(security|vulnerability|auth|permission|cve|xss|sql injection)\b/.test(combined)) {
    return 'security-audit';
  }

  // Performance detection
  if (/\b(performance|slow|optimize|speed|memory|cpu|latency)\b/.test(combined)) {
    return 'performance-review';
  }

  // Testing detection
  if (/\b(test|testing|coverage|spec|assertion|qa)\b/.test(combined)) {
    return 'testing';
  }

  // Requirements detection
  if (/\b(requirement|spec|documentation|acceptance|criteria)\b/.test(combined)) {
    return 'requirements-analysis';
  }

  // Code review detection
  if (/\b(review|refactor|cleanup|pr|pull request)\b/.test(combined)) {
    return 'code-review';
  }

  // Default to feature implementation
  return 'feature-implementation';
}

function assignRoles(taskType: AutoTaskConfig['type'], task: ExternalTask): string[] {
  const baseRoles = ['orchestrator'];

  switch (taskType) {
    case 'feature-implementation':
      return [...baseRoles, 'backend', 'tester', 'requirements'];
    case 'bug-fix':
      return [...baseRoles, 'backend', 'tester'];
    case 'security-audit':
      return [...baseRoles, 'backend', 'tester'];
    case 'performance-review':
      return [...baseRoles, 'backend'];
    case 'testing':
      return [...baseRoles, 'tester'];
    case 'requirements-analysis':
      return [...baseRoles, 'requirements'];
    case 'code-review':
      return [...baseRoles, 'backend', 'tester'];
    default:
      return baseRoles;
  }
}

async function determineScope(
  projectRoot: string,
  task: ExternalTask,
  graphContext: any
): Promise<string[]> {
  // Use graph context to determine relevant files
  if (graphContext && graphContext.seeds) {
    return graphContext.seeds.map((s: any) => s.id).filter((id: string) => id.includes('/'));
  }
  return [];
}

async function findRelatedRequirements(
  projectRoot: string,
  task: ExternalTask
): Promise<RequirementDoc[]> {
  const requirementsDir = magnetoPath(projectRoot, 'memory', 'requirements');
  if (!fileExists(requirementsDir)) {
    return [];
  }

  const docs: RequirementDoc[] = [];
  const files = listFiles(requirementsDir, /\.md$/);

  for (const file of files) {
    const content = readText(file);
    const title = extractTitle(content) || path.basename(file, '.md');
    
    // Check if requirement is related to task (simple keyword matching)
    const taskTerms = extractSearchTerms(task);
    const isRelated = taskTerms.some(term => 
      content.toLowerCase().includes(term.toLowerCase()) ||
      title.toLowerCase().includes(term.toLowerCase())
    );

    if (isRelated) {
      docs.push({
        id: path.basename(file, '.md'),
        title,
        content,
        filePath: file,
      });
    }
  }

  return docs;
}

function estimateComplexity(task: ExternalTask, scopeSize: number): 'low' | 'medium' | 'high' {
  const desc = task.description.toLowerCase();
  
  // High complexity indicators
  if (/\b(architecture|refactor|redesign|migration|epic)\b/.test(desc) || scopeSize > 20) {
    return 'high';
  }

  // Medium complexity indicators  
  if (/\b(feature|implement|add|create|integration)\b/.test(desc) || scopeSize > 5) {
    return 'medium';
  }

  return 'low';
}

function calculateTelepathyLevel(
  taskType: AutoTaskConfig['type'],
  complexity: 'low' | 'medium' | 'high',
  priority?: string
): 0 | 1 | 2 | 3 {
  // Critical priority = always manual (Level 1)
  if (priority === 'critical') {
    return 1;
  }

  // Security = semi-autonomous (Level 2)
  if (taskType === 'security-audit') {
    return 2;
  }

  // Low complexity, low risk = full telepathy (Level 3)
  if (complexity === 'low' && (taskType === 'testing' || taskType === 'code-review')) {
    return 3;
  }

  // Medium complexity = semi-autonomous (Level 2)
  if (complexity === 'medium') {
    return 2;
  }

  // High complexity or unknown = assisted (Level 1)
  return 1;
}

function canAutoApprove(
  taskType: AutoTaskConfig['type'],
  complexity: 'low' | 'medium' | 'high',
  task: ExternalTask
): boolean {
  // Never auto-approve critical priority
  if (task.priority === 'critical') {
    return false;
  }

  // Never auto-approve high complexity
  if (complexity === 'high') {
    return false;
  }

  // Never auto-approve security or production changes
  if (taskType === 'security-audit' || taskType === 'requirements-analysis') {
    return false;
  }

  // Can auto-approve low complexity testing or code review
  if (complexity === 'low' && (taskType === 'testing' || taskType === 'code-review')) {
    return true;
  }

  return false;
}

// Local implementation of graph query for telepathy
async function queryGraph(
  projectRoot: string,
  query: string,
  budget: number,
  dfs: boolean
): Promise<any> {
  // Read the graph.json file if it exists
  const graphPath = magnetoPath(projectRoot, 'memory', 'graph.json');
  if (!fileExists(graphPath)) {
    logger.debug('No graph.json found for telepathy query');
    return null;
  }

  try {
    const graph = readJson<any>(graphPath);
    
    // Simple keyword matching on node labels
    const queryLower = query.toLowerCase();
    const matchingNodes = graph.nodes.filter((node: any) => 
      node.label?.toLowerCase().includes(queryLower) ||
      node.id?.toLowerCase().includes(queryLower)
    );

    // Return simplified result
    return {
      query,
      seeds: matchingNodes.slice(0, 10),
      totalMatches: matchingNodes.length,
    };
  } catch (error) {
    logger.warn('Failed to query graph:', error);
    return null;
  }
}

async function generatePromptsOnly(projectRoot: string, config: AutoTaskConfig): Promise<void> {
  logger.info(`Generating prompts for: ${config.title}`);

  // Build a scoped prompt from the task config
  const prompt = buildScopedPrompt(config);
  const safeTitle = config.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50);
  const promptPath = path.join(projectRoot, '.magneto', 'cache', `prompt-${safeTitle}.md`);

  fs.mkdirSync(path.dirname(promptPath), { recursive: true });
  fs.writeFileSync(promptPath, prompt, 'utf-8');

  logger.success(`Prompt written: ${promptPath}`);

  // Auto-detect agent environment and hand off
  const { detectAgentEnvironment } = require('../runners/types');
  const detectedRunner = detectAgentEnvironment(projectRoot);

  if (detectedRunner) {
    logger.info(`Detected agent environment: ${detectedRunner}`);
    await handoffToRunner(projectRoot, config, detectedRunner, prompt, promptPath);
  } else {
    logger.info('No agent environment detected. Prompt saved to:');
    logger.info(`  ${promptPath}`);
    logger.info('');
    logger.info('To hand off manually:');
    logger.info('  - Open the prompt file in your IDE (Cascade/Copilot will auto-read)');
    logger.info('  - Or run: magneto run --runner cascade');
  }
}

async function generatePlan(projectRoot: string, config: AutoTaskConfig): Promise<void> {
  logger.info(`Generating execution plan for: ${config.title}`);

  const plan = {
    id: `plan-${Date.now()}`,
    title: config.title,
    type: config.type,
    roles: config.roles,
    scope: config.scope,
    telepathyLevel: config.telepathyLevel,
    steps: buildPlanSteps(config),
    generatedAt: new Date().toISOString(),
  };

  const safeTitle = config.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50);
  const planPath = path.join(projectRoot, '.magneto', 'cache', `plan-${safeTitle}.json`);
  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf-8');

  logger.success(`Plan written: ${planPath}`);

  // Also generate a prompt from the plan
  await generatePromptsOnly(projectRoot, config);
}

async function executeAutonomous(projectRoot: string, config: AutoTaskConfig): Promise<void> {
  logger.info(`Executing autonomously: ${config.title}`);

  // 1. Generate the prompt
  const prompt = buildScopedPrompt(config);
  const safeTitle = config.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50);
  const promptPath = path.join(projectRoot, '.magneto', 'cache', `prompt-${safeTitle}.md`);

  fs.mkdirSync(path.dirname(promptPath), { recursive: true });
  fs.writeFileSync(promptPath, prompt, 'utf-8');

  // 2. Detect runner and hand off
  const { detectAgentEnvironment } = require('../runners/types');
  const detectedRunner = detectAgentEnvironment(projectRoot);
  const runnerType = detectedRunner || 'cascade'; // Default to cascade

  logger.info(`Auto-executing via: ${runnerType}`);
  await handoffToRunner(projectRoot, config, runnerType, prompt, promptPath);
}

/**
 * Build a scoped prompt from task config with all context
 */
function buildScopedPrompt(config: AutoTaskConfig): string {
  const sections: string[] = [];

  sections.push(`# Magneto AI Task: ${config.title}\n`);
  sections.push(`> Auto-generated by Magneto Telepathy (Level ${config.telepathyLevel}). Execute this task.\n`);

  // Task
  sections.push(`## Task\n`);
  sections.push(`- **Title:** ${config.title}`);
  sections.push(`- **Type:** ${config.type}`);
  sections.push(`- **Description:** ${config.description}`);
  sections.push(`- **Complexity:** ${config.estimatedComplexity}`);
  sections.push('');

  // Roles
  sections.push(`## Assigned Roles\n`);
  for (const role of config.roles) {
    sections.push(`- **${role}**`);
  }
  sections.push('');

  // Scope
  if (config.scope.length > 0) {
    sections.push(`## Scoped Files\n`);
    sections.push('```');
    for (const file of config.scope) {
      sections.push(file);
    }
    sections.push('```');
    sections.push('');
  }

  // Requirements context
  if (config.requirements.length > 0) {
    sections.push(`## Related Requirements\n`);
    for (const req of config.requirements) {
      sections.push(`### ${req.title}\n`);
      sections.push(req.content.substring(0, 500));
      sections.push('');
    }
  }

  // Instructions
  sections.push(`## Instructions\n`);
  sections.push(`1. Read the task description carefully`);
  sections.push(`2. Act in roles: ${config.roles.join(', ')}`);
  if (config.scope.length > 0) {
    sections.push(`3. Focus on scoped files listed above`);
  }
  sections.push(`4. Follow .magneto/memory/decisions.md for project conventions`);
  sections.push(`5. Write tests if tester role is assigned`);
  sections.push(`6. Provide a summary of changes when complete`);
  sections.push('');

  return sections.join('\n');
}

/**
 * Build plan steps from task config
 */
function buildPlanSteps(config: AutoTaskConfig): Array<{ step: number; action: string; role: string }> {
  const steps: Array<{ step: number; action: string; role: string }> = [];
  let stepNum = 1;

  if (config.roles.includes('requirements')) {
    steps.push({ step: stepNum++, action: 'Analyze requirements and acceptance criteria', role: 'requirements' });
  }
  if (config.roles.includes('orchestrator')) {
    steps.push({ step: stepNum++, action: 'Decompose task and plan execution order', role: 'orchestrator' });
  }
  if (config.roles.includes('backend')) {
    steps.push({ step: stepNum++, action: 'Implement code changes', role: 'backend' });
  }
  if (config.roles.includes('frontend')) {
    steps.push({ step: stepNum++, action: 'Implement UI changes', role: 'frontend' });
  }
  if (config.roles.includes('tester')) {
    steps.push({ step: stepNum++, action: 'Write and run tests', role: 'tester' });
  }

  return steps;
}

/**
 * Hand off to the appropriate runner (Cascade, Copilot, Gemini, etc.)
 */
async function handoffToRunner(
  projectRoot: string,
  config: AutoTaskConfig,
  runnerType: string,
  prompt: string,
  promptPath: string
): Promise<void> {
  // For Cascade/Windsurf: write to .windsurf/workflows/
  if (runnerType === 'cascade') {
    const windsurfDir = path.join(projectRoot, '.windsurf', 'workflows');
    const safeTitle = config.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50);
    const workflowPath = path.join(windsurfDir, `magneto-${safeTitle}.md`);

    if (fs.existsSync(path.join(projectRoot, '.windsurf'))) {
      fs.mkdirSync(windsurfDir, { recursive: true });
      fs.writeFileSync(workflowPath, `---\ndescription: ${config.title}\n---\n\n${prompt}`, 'utf-8');
      logger.success(`Windsurf workflow: ${workflowPath}`);
    }
  }

  // For Copilot: write to .github/copilot-instructions.md
  if (runnerType === 'copilot-local') {
    const copilotPath = path.join(projectRoot, '.github', 'copilot-instructions.md');
    if (fs.existsSync(path.join(projectRoot, '.github'))) {
      fs.writeFileSync(copilotPath, prompt, 'utf-8');
      logger.success(`Copilot instructions: ${copilotPath}`);
    }
  }

  logger.info('');
  logger.info('═══════════════════════════════════════════════════');
  logger.info(`  MAGNETO → ${runnerType.toUpperCase()} HANDOFF`);
  logger.info('═══════════════════════════════════════════════════');
  logger.info(`  Task:   ${config.title}`);
  logger.info(`  Type:   ${config.type}`);
  logger.info(`  Roles:  ${config.roles.join(', ')}`);
  logger.info(`  Prompt: ${promptPath}`);
  logger.info(`  Agent:  ${runnerType}`);
  logger.info('═══════════════════════════════════════════════════');
  logger.info('');
}

function extractSearchTerms(task: ExternalTask): string[] {
  const combined = `${task.title} ${task.description}`;
  // Extract meaningful keywords
  const words = combined.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .filter(w => !['this', 'that', 'with', 'from', 'have', 'will', 'your', 'they', 'their', 'what', 'when', 'where', 'which', 'while', 'about', 'would', 'could', 'should'].includes(w));
  
  return [...new Set(words)].slice(0, 5); // Top 5 unique keywords
}

function extractTitle(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}
