import * as path from 'path';
import * as fs from 'fs';
import * as child_process from 'child_process';
import { logger } from '../utils/logger';
import { resolveProjectRoot, isMagnetoProject, magnetoPath } from '../utils/paths';
import { fileExists, ensureDir, readText, writeText } from '../utils/fs';

export interface TaskCreateOptions {
  priority?: 'high' | 'medium' | 'low';
  roles?: string[];
  edit?: boolean;
}

export interface TaskListOptions {
  type?: string;
  priority?: string;
  role?: string;
  sortBy?: 'name' | 'priority' | 'created';
}

export interface TaskDeleteOptions {
  force?: boolean;
}

interface TaskMetadata {
  name: string;
  description: string;
  type: string;
  priority: string;
  roles: string[];
  filePath: string;
  created?: string;
}

const VALID_TYPES = ['feature', 'bug', 'security', 'performance', 'test', 'refactor', 'docs', 'general'];
const VALID_ROLES = ['orchestrator', 'backend', 'tester', 'requirements', 'frontend', 'devops'];
const VALID_PRIORITIES = ['high', 'medium', 'low'];

const TEMPLATES: Record<string, string> = {
  feature: `---
name: {{name}}
description: {{description}}
type: feature
priority: {{priority}}
roles:
{{roles}}
---

# {{title}}

## Objective

Implement the feature described below.

## Requirements

- [ ] Analyze current codebase
- [ ] Design solution
- [ ] Implement changes
- [ ] Add tests
- [ ] Update documentation

## Acceptance Criteria

- [ ] Feature works as expected
- [ ] Tests pass
- [ ] No regressions
`,
  bug: `---
name: {{name}}
description: {{description}}
type: bug
priority: {{priority}}
roles:
{{roles}}
---

# {{title}}

## Bug Description

Describe the bug here.

## Steps to Reproduce

1. Step one
2. Step two
3. Step three

## Expected Behavior

What should happen.

## Actual Behavior

What actually happens.

## Acceptance Criteria

- [ ] Bug is fixed
- [ ] Root cause is addressed
- [ ] Tests added to prevent regression
`,
  security: `---
name: {{name}}
description: {{description}}
type: security
priority: high
roles:
{{roles}}
---

# {{title}}

## Security Issue

Describe the security vulnerability or concern.

## Risk Assessment

- **Severity**: High/Medium/Low
- **Attack Vector**: 
- **Impact**: 

## Remediation Steps

- [ ] Identify affected code
- [ ] Implement fix
- [ ] Add security tests
- [ ] Update security documentation
- [ ] Verify fix with security scan

## Acceptance Criteria

- [ ] Vulnerability is patched
- [ ] Security tests pass
- [ ] No new vulnerabilities introduced
`,
  performance: `---
name: {{name}}
description: {{description}}
type: performance
priority: {{priority}}
roles:
{{roles}}
---

# {{title}}

## Performance Issue

Describe the performance problem.

## Metrics

- Current: 
- Target: 

## Optimization Strategy

- [ ] Profile and identify bottlenecks
- [ ] Implement optimization
- [ ] Measure improvement
- [ ] Ensure no regressions

## Acceptance Criteria

- [ ] Performance target met
- [ ] No functional regressions
- [ ] Benchmarks updated
`,
  test: `---
name: {{name}}
description: {{description}}
type: test
priority: {{priority}}
roles:
  - tester
{{roles}}
---

# {{title}}

## Test Scope

What needs to be tested.

## Test Cases

- [ ] Test case 1
- [ ] Test case 2
- [ ] Edge case 1

## Coverage Goals

- Target coverage: XX%
- Critical paths: All covered

## Acceptance Criteria

- [ ] All test cases implemented
- [ ] Tests pass
- [ ] Coverage goals met
`,
  refactor: `---
name: {{name}}
description: {{description}}
type: refactor
priority: {{priority}}
roles:
{{roles}}
---

# {{title}}

## Refactoring Goal

Why this refactoring is needed.

## Scope

What code will be refactored.

## Plan

- [ ] Analyze current code
- [ ] Design new structure
- [ ] Implement incrementally
- [ ] Update tests
- [ ] Verify no regressions

## Acceptance Criteria

- [ ] Code is cleaner/more maintainable
- [ ] All tests pass
- [ ] No functional changes
- [ ] Performance maintained or improved
`,
  docs: `---
name: {{name}}
description: {{description}}
type: docs
priority: {{priority}}
roles:
{{roles}}
---

# {{title}}

## Documentation Need

What needs to be documented.

## Sections

- [ ] Overview
- [ ] Installation/Setup
- [ ] Usage
- [ ] Examples
- [ ] API reference

## Acceptance Criteria

- [ ] Documentation is complete
- [ ] Examples work
- [ ] Reviewed for clarity
`,
};

export async function taskCreateCommand(
  type: string,
  title: string,
  options: TaskCreateOptions
): Promise<void> {
  const projectRoot = resolveProjectRoot();

  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto project. Run "magneto init" first.');
    return;
  }

  if (!VALID_TYPES.includes(type)) {
    logger.error(`Invalid task type: ${type}`);
    logger.info(`Valid types: ${VALID_TYPES.join(', ')}`);
    return;
  }

  const name = slugify(title);
  const fileName = `${name}.md`;
  const filePath = magnetoPath(projectRoot, 'tasks', fileName);

  if (fileExists(filePath)) {
    logger.warn(`Task file already exists: ${filePath}`);
    logger.info('Use a different title or delete the existing task first.');
    return;
  }

  const priority = options.priority || 'medium';
  const roles = options.roles || getDefaultRoles(type);

  // Validate roles
  const invalidRoles = roles.filter(r => !VALID_ROLES.includes(r));
  if (invalidRoles.length > 0) {
    logger.error(`Invalid roles: ${invalidRoles.join(', ')}`);
    logger.info(`Valid roles: ${VALID_ROLES.join(', ')}`);
    return;
  }

  // Generate task content from template
  const template = TEMPLATES[type] || TEMPLATES.general;
  const content = template
    .replace(/\{\{name\}\}/g, name)
    .replace(/\{\{title\}\}/g, title)
    .replace(/\{\{description\}\}/g, title)
    .replace(/\{\{priority\}\}/g, priority)
    .replace(/\{\{roles\}\}/g, roles.map(r => `  - ${r}`).join('\n'));

  // Write task file
  ensureDir(path.dirname(filePath));
  writeText(filePath, content);

  logger.success(`Task created: ${fileName}`);
  logger.info(`Location: ${filePath}`);
  logger.info(`Type: ${type} | Priority: ${priority} | Roles: ${roles.join(', ')}`);

  if (options.edit) {
    // Try to open in default editor
    const editor = process.env.EDITOR || 'code';
    try {
      child_process.spawn(editor, [filePath], { detached: true, stdio: 'ignore' });
      logger.info(`Opening in ${editor}...`);
    } catch {
      logger.info(`Edit the file with: ${editor} ${filePath}`);
    }
  }

  logger.info('\nNext steps:');
  logger.info(`  magneto plan ${filePath}    # Generate execution plan`);
  logger.info(`  magneto task validate ${filePath}  # Validate task file`);
}

export async function taskListCommand(options: TaskListOptions): Promise<void> {
  const projectRoot = resolveProjectRoot();

  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto project. Run "magneto init" first.');
    return;
  }

  const tasksDir = magnetoPath(projectRoot, 'tasks');

  if (!fileExists(tasksDir)) {
    logger.warn('No tasks directory found.');
    logger.info('Create your first task: magneto task create feature "My Feature"');
    return;
  }

  const taskFiles = fs.readdirSync(tasksDir)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(tasksDir, f));

  if (taskFiles.length === 0) {
    logger.warn('No tasks found.');
    logger.info('Create your first task: magneto task create feature "My Feature"');
    return;
  }

  // Parse all tasks
  let tasks: TaskMetadata[] = [];
  for (const filePath of taskFiles) {
    const metadata = parseTaskFile(filePath);
    if (metadata) {
      tasks.push(metadata);
    }
  }

  // Apply filters
  if (options.type) {
    tasks = tasks.filter(t => t.type === options.type);
  }
  if (options.priority) {
    tasks = tasks.filter(t => t.priority === options.priority);
  }
  if (options.role) {
    tasks = tasks.filter(t => t.roles.includes(options.role!));
  }

  // Sort
  const sortBy = options.sortBy || 'name';
  tasks.sort((a, b) => {
    if (sortBy === 'priority') {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
    }
    return a.name.localeCompare(b.name);
  });

  // Display
  logger.info(`\nFound ${tasks.length} tasks:\n`);
  
  // Table header
  const nameWidth = Math.max(20, ...tasks.map(t => t.name.length));
  const typeWidth = 12;
  const priorityWidth = 8;
  
  logger.info(`${pad('Name', nameWidth)} ${pad('Type', typeWidth)} ${pad('Priority', priorityWidth)} Roles`);
  logger.info('-'.repeat(nameWidth + typeWidth + priorityWidth + 30));

  for (const task of tasks) {
    const priorityColor = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
    const rolesStr = task.roles.slice(0, 3).join(', ') + (task.roles.length > 3 ? '...' : '');
    logger.info(
      `${pad(task.name, nameWidth)} ` +
      `${pad(task.type, typeWidth)} ` +
      `${pad(priorityColor + ' ' + task.priority, priorityWidth)} ` +
      `${rolesStr}`
    );
  }

  console.log('');
  logger.info('Run "magneto task show <name>" for details');
  logger.info('Run "magneto plan tasks/<name>.md" to create execution plan');
}

export async function taskValidateCommand(taskFile: string): Promise<void> {
  const projectRoot = resolveProjectRoot();

  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto project. Run "magneto init" first.');
    return;
  }

  // Resolve file path
  let filePath = taskFile;
  if (!filePath.endsWith('.md')) {
    filePath += '.md';
  }
  if (!path.isAbsolute(filePath)) {
    filePath = magnetoPath(projectRoot, 'tasks', filePath);
  }

  if (!fileExists(filePath)) {
    logger.error(`Task file not found: ${filePath}`);
    return;
  }

  logger.info(`Validating: ${path.basename(filePath)}\n`);

  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const content = readText(filePath);
    
    // Check for frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      errors.push('Missing YAML frontmatter (should start with ---)');
    } else {
      const frontmatter = frontmatterMatch[1];
      
      // Parse frontmatter
      const nameMatch = frontmatter.match(/name:\s*(.+)/);
      const descMatch = frontmatter.match(/description:\s*(.+)/);
      const typeMatch = frontmatter.match(/type:\s*(.+)/);
      const priorityMatch = frontmatter.match(/priority:\s*(.+)/);
      const rolesMatch = frontmatter.match(/roles:\s*\n((?:\s+-\s*.+\n?)*)/);

      if (!nameMatch) {
        errors.push('Missing required field: name');
      }
      if (!descMatch) {
        errors.push('Missing required field: description');
      }
      if (!typeMatch) {
        errors.push('Missing required field: type');
      } else if (!VALID_TYPES.includes(typeMatch[1].trim())) {
        errors.push(`Invalid type: "${typeMatch[1].trim()}". Valid: ${VALID_TYPES.join(', ')}`);
      }
      if (!priorityMatch) {
        warnings.push('Missing field: priority (defaults to medium)');
      } else if (!VALID_PRIORITIES.includes(priorityMatch[1].trim())) {
        errors.push(`Invalid priority: "${priorityMatch[1].trim()}". Valid: ${VALID_PRIORITIES.join(', ')}`);
      }
      if (!rolesMatch) {
        warnings.push('Missing field: roles (will use defaults)');
      } else {
        const roles = rolesMatch[1].match(/-\s*(\w+)/g)?.map(r => r.replace('- ', '')) || [];
        const invalidRoles = roles.filter(r => !VALID_ROLES.includes(r));
        if (invalidRoles.length > 0) {
          errors.push(`Invalid roles: ${invalidRoles.join(', ')}. Valid: ${VALID_ROLES.join(', ')}`);
        }
      }
    }

    // Check for body content
    const bodyMatch = content.match(/---\n[\s\S]*?\n---\n([\s\S]*)/);
    if (!bodyMatch || bodyMatch[1].trim().length < 10) {
      warnings.push('Task body is very short. Consider adding more details.');
    }

  } catch (error) {
    errors.push(`Failed to read file: ${error}`);
  }

  // Report results
  if (errors.length === 0 && warnings.length === 0) {
    logger.success('✓ Task file is valid');
  } else {
    if (errors.length > 0) {
      logger.error(`\n✗ ${errors.length} error(s):`);
      for (const error of errors) {
        logger.error(`  - ${error}`);
      }
    }
    if (warnings.length > 0) {
      logger.warn(`\n⚠ ${warnings.length} warning(s):`);
      for (const warning of warnings) {
        logger.warn(`  - ${warning}`);
      }
    }
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

export async function taskDeleteCommand(
  taskFile: string,
  options: TaskDeleteOptions
): Promise<void> {
  const projectRoot = resolveProjectRoot();

  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto project. Run "magneto init" first.');
    return;
  }

  // Resolve file path
  let filePath = taskFile;
  if (!filePath.endsWith('.md')) {
    filePath += '.md';
  }
  if (!path.isAbsolute(filePath)) {
    filePath = magnetoPath(projectRoot, 'tasks', filePath);
  }

  if (!fileExists(filePath)) {
    logger.error(`Task file not found: ${filePath}`);
    return;
  }

  const taskName = path.basename(filePath, '.md');

  // Confirm deletion
  if (!options.force) {
    const rl = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    const answer = await new Promise<string>((resolve) => {
      rl.question(`Delete task "${taskName}"? [y/N]: `, resolve);
    });
    rl.close();
    
    if (answer.trim().toLowerCase() !== 'y') {
      logger.info('Cancelled.');
      return;
    }
  }

  // Delete task file
  fs.unlinkSync(filePath);
  logger.success(`Deleted: ${taskName}.md`);

  // Clean up associated cache files
  const cacheDir = magnetoPath(projectRoot, 'cache');
  const cacheFiles = [
    path.join(cacheDir, `prompt-${taskName}.md`),
    path.join(cacheDir, `result-${taskName}.json`),
    path.join(cacheDir, `plan-${taskName}.md`),
  ];

  for (const cacheFile of cacheFiles) {
    if (fileExists(cacheFile)) {
      fs.unlinkSync(cacheFile);
      logger.info(`  Also removed: ${path.basename(cacheFile)}`);
    }
  }
}

export async function taskShowCommand(taskFile: string): Promise<void> {
  const projectRoot = resolveProjectRoot();

  if (!isMagnetoProject(projectRoot)) {
    logger.error('Not a Magneto project. Run "magneto init" first.');
    return;
  }

  // Resolve file path
  let filePath = taskFile;
  if (!filePath.endsWith('.md')) {
    filePath += '.md';
  }
  if (!path.isAbsolute(filePath)) {
    filePath = magnetoPath(projectRoot, 'tasks', filePath);
  }

  if (!fileExists(filePath)) {
    logger.error(`Task file not found: ${filePath}`);
    return;
  }

  const metadata = parseTaskFile(filePath);
  if (!metadata) {
    logger.error('Failed to parse task file');
    return;
  }

  // Display task details
  logger.info('\n' + '='.repeat(60));
  logger.info(`Task: ${metadata.name}`);
  logger.info('='.repeat(60));
  
  logger.info(`\n📋 Description:`);
  logger.info(`  ${metadata.description}`);
  
  logger.info(`\n🏷️  Type: ${metadata.type}`);
  logger.info(`⚡ Priority: ${metadata.priority}`);
  logger.info(`👥 Roles: ${metadata.roles.join(', ')}`);
  
  logger.info(`\n📁 File: ${metadata.filePath}`);

  // Preview body
  try {
    const content = readText(filePath);
    const bodyMatch = content.match(/---\n[\s\S]*?\n---\n([\s\S]*)/);
    if (bodyMatch) {
      const body = bodyMatch[1].trim();
      const previewLines = body.split('\n').slice(0, 15);
      logger.info(`\n📝 Preview:`);
      for (const line of previewLines) {
        logger.info(`  ${line}`);
      }
      if (body.split('\n').length > 15) {
        logger.info('  ... (truncated)');
      }
    }
  } catch {
    // Ignore preview errors
  }

  logger.info('\n' + '='.repeat(60));
  logger.info('Next steps:');
  logger.info(`  magneto plan ${metadata.filePath}`);
  logger.info(`  magneto task validate ${metadata.name}`);
}

// Helper functions

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
}

function getDefaultRoles(type: string): string[] {
  const defaults: Record<string, string[]> = {
    feature: ['orchestrator', 'backend'],
    bug: ['orchestrator', 'backend', 'tester'],
    security: ['orchestrator', 'backend', 'tester'],
    performance: ['orchestrator', 'backend'],
    test: ['tester'],
    refactor: ['orchestrator', 'backend'],
    docs: ['requirements'],
  };
  return defaults[type] || ['orchestrator'];
}

function parseTaskFile(filePath: string): TaskMetadata | null {
  try {
    const content = readText(filePath);
    
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return null;
    }

    const frontmatter = frontmatterMatch[1];
    
    const nameMatch = frontmatter.match(/name:\s*(.+)/);
    const descMatch = frontmatter.match(/description:\s*(.+)/);
    const typeMatch = frontmatter.match(/type:\s*(.+)/);
    const priorityMatch = frontmatter.match(/priority:\s*(.+)/);
    const rolesMatch = frontmatter.match(/roles:\s*\n((?:\s+-\s*.+\n?)*)/);

    const roles = rolesMatch 
      ? (rolesMatch[1].match(/-\s*(\w+)/g) || []).map(r => r.replace('- ', ''))
      : [];

    return {
      name: nameMatch?.[1].trim() || path.basename(filePath, '.md'),
      description: descMatch?.[1].trim() || 'No description',
      type: typeMatch?.[1].trim() || 'general',
      priority: priorityMatch?.[1].trim() || 'medium',
      roles,
      filePath,
    };
  } catch {
    return null;
  }
}

function pad(str: string, width: number): string {
  return str.length >= width ? str : str + ' '.repeat(width - str.length);
}
