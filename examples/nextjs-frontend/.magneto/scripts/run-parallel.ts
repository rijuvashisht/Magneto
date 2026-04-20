/**
 * run-parallel.ts — Executes multiple Magneto AI agents in parallel.
 *
 * Usage: npx tsx .magneto/scripts/run-parallel.ts <task.md>
 *
 * Reads: task file (.md with YAML frontmatter, .yaml, or .json) + magneto.config.json
 * Outputs: .magneto/output/<agentId>.json per agent
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const taskFile = process.argv[2];

if (!taskFile) {
  console.error('Usage: npx tsx run-parallel.ts <task.md>');
  process.exit(1);
}

// Parse task from .md (YAML frontmatter), .yaml, or .json
const rawContent = fs.readFileSync(taskFile, 'utf-8');
let task: any;
try {
  if (taskFile.endsWith('.json')) {
    task = JSON.parse(rawContent);
  } else {
    // Parse YAML frontmatter from .md or .yaml
    const fmMatch = rawContent.match(/^---
([sS]*?)
---/);
    const yamlLines = fmMatch ? fmMatch[1] : rawContent;
    const obj: Record<string, any> = {};
    let currentKey = '';
    for (const line of yamlLines.split('
')) {
      const kv = line.match(/^(w[w-]*):s*(.*)/);
      if (kv) { currentKey = kv[1]; obj[currentKey] = kv[2].trim() || []; }
      else if (line.trim().startsWith('- ') && Array.isArray(obj[currentKey])) {
        obj[currentKey].push(line.trim().slice(2));
      }
    }
    task = obj;
  }
} catch (e) {
  console.error('Failed to parse task file:', e);
  process.exit(1);
}
const configPath = path.join(PROJECT_ROOT, '.magneto', 'magneto.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const roles: string[] = config.roles || ['orchestrator', 'backend', 'tester', 'requirements'];

console.log(`Task: ${task.title}`);
console.log(`Roles: ${roles.join(', ')}`);
console.log('Starting parallel execution...\n');

const outputDir = path.join(PROJECT_ROOT, '.magneto', 'output');
fs.mkdirSync(outputDir, { recursive: true });

// Execute agents in parallel (simulated — replace with actual runner calls)
const agentPromises = roles.map(async (role) => {
  console.log(`[${role}] Starting analysis...`);

  // Simulated agent output — replace with actual OpenAI/Copilot runner calls
  const result = {
    agentId: `agent-${role}`,
    role,
    taskId: task.id,
    findings: [],
    risks: [],
    confidence: 0,
    executedAt: new Date().toISOString(),
    status: 'pending-implementation',
    note: `Replace this with actual ${role} agent execution via Magneto AI runner`,
  };

  const outPath = path.join(outputDir, `agent-${role}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`[${role}] Output → .magneto/output/agent-${role}.json`);

  return result;
});

Promise.all(agentPromises).then((results) => {
  console.log(`\nAll ${results.length} agents complete. Run merge-results.ts to combine.`);
});
