import * as fs from 'fs';
import * as path from 'path';
import { TaskInput } from '../core/context';
import { logger } from './logger';

/**
 * Parse a task file in any supported format:
 *   - .md / .task.md  → Markdown with YAML frontmatter
 *   - .yaml / .yml    → YAML
 *   - .json           → JSON (legacy)
 *
 * Returns a TaskInput object regardless of source format.
 */
export function parseTaskFile(filePath: string): TaskInput {
  const ext = path.extname(filePath).toLowerCase();
  const content = fs.readFileSync(filePath, 'utf-8');

  if (ext === '.json') {
    return JSON.parse(content) as TaskInput;
  }

  if (ext === '.yaml' || ext === '.yml') {
    return parseYaml(content);
  }

  if (ext === '.md') {
    return parseMarkdownTask(content);
  }

  // Fallback: try JSON, then markdown
  try {
    return JSON.parse(content) as TaskInput;
  } catch {
    return parseMarkdownTask(content);
  }
}

/**
 * Parse Markdown with YAML frontmatter.
 *
 * Format:
 * ```
 * ---
 * id: NEXT-001
 * title: Implement auth flow
 * type: feature-implementation
 * scope:
 *   - src/app/api/auth/
 *   - src/middleware.ts
 * tags:
 *   - authentication
 * constraints:
 *   - Must use NextAuth.js v5
 * ---
 *
 * Add complete authentication using NextAuth.js...
 * ```
 */
function parseMarkdownTask(content: string): TaskInput {
  const trimmed = content.trim();

  if (!trimmed.startsWith('---')) {
    // No frontmatter — treat entire content as description
    logger.warn('No YAML frontmatter found. Using file content as description.');
    return {
      id: 'task-' + Date.now(),
      title: extractFirstHeading(trimmed) || 'Untitled Task',
      description: trimmed,
      type: 'general',
    };
  }

  // Split frontmatter from body
  const endIndex = trimmed.indexOf('---', 3);
  if (endIndex === -1) {
    logger.warn('Unclosed frontmatter. Treating entire file as YAML.');
    return parseYaml(trimmed.slice(3));
  }

  const frontmatter = trimmed.slice(3, endIndex).trim();
  const body = trimmed.slice(endIndex + 3).trim();

  const parsed = parseYaml(frontmatter);

  // Body becomes the description (or appends to existing description)
  if (body) {
    parsed.description = parsed.description
      ? parsed.description + '\n\n' + body
      : body;
  }

  return parsed;
}

/**
 * Lightweight YAML parser for flat task structures.
 * Handles: scalars, arrays (- item), and multiline strings.
 * No external dependency needed — task YAML is simple.
 */
function parseYaml(yaml: string): TaskInput {
  const result: Record<string, unknown> = {};
  const lines = yaml.split('\n');
  let currentKey = '';
  let currentArray: string[] | null = null;
  let multilineValue = '';
  let inMultiline = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (trimmed === '' || trimmed.startsWith('#')) {
      if (inMultiline) multilineValue += '\n';
      continue;
    }

    // Array item: "  - value"
    if (trimmed.startsWith('- ') && currentArray !== null) {
      if (inMultiline) {
        result[currentKey] = multilineValue.trim();
        inMultiline = false;
        multilineValue = '';
      }
      currentArray.push(trimmed.slice(2).trim().replace(/^["']|["']$/g, ''));
      continue;
    }

    // Key-value pair: "key: value"
    const kvMatch = trimmed.match(/^(\w[\w-]*)\s*:\s*(.*)/);
    if (kvMatch) {
      // Save previous array if any
      if (currentArray !== null) {
        result[currentKey] = currentArray;
        currentArray = null;
      }
      if (inMultiline) {
        result[currentKey] = multilineValue.trim();
        inMultiline = false;
        multilineValue = '';
      }

      currentKey = kvMatch[1];
      const value = kvMatch[2].trim();

      if (value === '' || value === '|' || value === '>') {
        // Could be array or multiline — check next line
        if (value === '|' || value === '>') {
          inMultiline = true;
          multilineValue = '';
        } else {
          // Peek ahead to see if it's an array
          const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
          if (nextLine.trim().startsWith('- ')) {
            currentArray = [];
          } else {
            result[currentKey] = '';
          }
        }
      } else {
        // Simple scalar value
        result[currentKey] = value.replace(/^["']|["']$/g, '');
      }
      continue;
    }

    // Continuation of multiline
    if (inMultiline) {
      multilineValue += (multilineValue ? '\n' : '') + line;
    }
  }

  // Flush final state
  if (currentArray !== null) {
    result[currentKey] = currentArray;
  }
  if (inMultiline) {
    result[currentKey] = multilineValue.trim();
  }

  return {
    id: String(result.id || 'task-' + Date.now()),
    title: String(result.title || 'Untitled Task'),
    description: String(result.description || ''),
    type: String(result.type || 'general'),
    scope: Array.isArray(result.scope) ? result.scope : undefined,
    tags: Array.isArray(result.tags) ? result.tags : undefined,
    constraints: Array.isArray(result.constraints) ? result.constraints : undefined,
  };
}

function extractFirstHeading(markdown: string): string | null {
  const match = markdown.match(/^#{1,3}\s+(.+)$/m);
  return match ? match[1].trim() : null;
}
