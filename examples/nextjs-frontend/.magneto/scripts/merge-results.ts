/**
 * merge-results.ts — Merges all agent outputs into a final decision.
 *
 * Usage: npx tsx .magneto/scripts/merge-results.ts
 *
 * Reads: .magneto/output/agent-*.json
 * Outputs: .magneto/output/merged-result.json
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const outputDir = path.join(PROJECT_ROOT, '.magneto', 'output');

if (!fs.existsSync(outputDir)) {
  console.error('No output directory found. Run run-parallel.ts first.');
  process.exit(1);
}

const agentFiles = fs.readdirSync(outputDir).filter((f) => f.startsWith('agent-') && f.endsWith('.json'));

if (agentFiles.length === 0) {
  console.error('No agent output files found.');
  process.exit(1);
}

console.log(`Merging ${agentFiles.length} agent outputs...\n`);

interface Finding { source: string; content: string; confidence: number; }
interface Risk { severity: string; description: string; source: string; }
interface Contradiction { type: string; sides: { source: string; claim: string }[]; }

const allFindings: Finding[] = [];
const allRisks: Risk[] = [];
const contradictions: Contradiction[] = [];
const confidences: number[] = [];
let taskId = '';

for (const file of agentFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(outputDir, file), 'utf-8'));
  console.log(`  Loading: ${file} (role: ${data.role})`);

  if (data.taskId && !taskId) taskId = data.taskId;
  if (data.findings) allFindings.push(...data.findings);
  if (data.risks) allRisks.push(...data.risks);
  if (data.confidence) confidences.push(data.confidence);
}

// Deduplicate findings
const uniqueFindings = new Map<string, Finding>();
for (const f of allFindings) {
  const key = f.content.toLowerCase().trim();
  const existing = uniqueFindings.get(key);
  if (!existing || f.confidence > existing.confidence) {
    uniqueFindings.set(key, f);
  }
}

// Deduplicate risks
const severityOrder: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const uniqueRisks = new Map<string, Risk>();
for (const r of allRisks) {
  const key = r.description.toLowerCase().trim();
  const existing = uniqueRisks.get(key);
  if (!existing || (severityOrder[r.severity] || 0) > (severityOrder[existing.severity] || 0)) {
    uniqueRisks.set(key, r);
  }
}

// Detect contradictions (findings from different agents with opposing conclusions)
const findingsByTopic = new Map<string, Finding[]>();
for (const f of allFindings) {
  const words = f.content.toLowerCase().split(/\s+/).slice(0, 5).join(' ');
  const group = findingsByTopic.get(words) || [];
  group.push(f);
  findingsByTopic.set(words, group);
}

for (const [, group] of findingsByTopic) {
  if (group.length > 1) {
    const sources = new Set(group.map((g) => g.source));
    if (sources.size > 1) {
      contradictions.push({
        type: 'agent-vs-agent',
        sides: group.map((g) => ({ source: g.source, claim: g.content })),
      });
    }
  }
}

// Calculate confidence
const avgConfidence = confidences.length > 0
  ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100) / 100
  : 0;

// Determine overall risk
const risks = Array.from(uniqueRisks.values());
let overallRisk = 'low';
if (risks.some((r) => r.severity === 'critical')) overallRisk = 'critical';
else if (risks.some((r) => r.severity === 'high')) overallRisk = 'high';
else if (risks.some((r) => r.severity === 'medium')) overallRisk = 'medium';

const merged = {
  taskId,
  findings: Array.from(uniqueFindings.values()),
  risks,
  contradictions,
  confidence: avgConfidence,
  overallRisk,
  agentCount: agentFiles.length,
  mergedAt: new Date().toISOString(),
};

const outPath = path.join(outputDir, 'merged-result.json');
fs.writeFileSync(outPath, JSON.stringify(merged, null, 2));
console.log(`\nMerged result → .magneto/output/merged-result.json`);
console.log(`  Findings: ${merged.findings.length}`);
console.log(`  Risks: ${merged.risks.length}`);
console.log(`  Contradictions: ${merged.contradictions.length}`);
console.log(`  Overall risk: ${merged.overallRisk}`);
console.log(`  Confidence: ${merged.confidence}`);
