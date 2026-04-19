import { logger } from '../utils/logger';

export interface Finding {
  source: string;
  content: string;
  confidence: number;
  category?: string;
}

export interface Risk {
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source: string;
  mitigation?: string;
}

export interface AgentOutput {
  agentId?: string;
  role?: string;
  taskId?: string;
  findings?: Finding[];
  risks?: Risk[];
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface Contradiction {
  type: 'code-vs-requirement' | 'code-vs-test' | 'requirement-vs-test' | 'agent-vs-agent';
  sides: { source: string; claim: string; confidence?: number }[];
  resolution?: {
    decision: string;
    action: string[];
    staleArtifact?: string;
    confidence: number;
    requiresHumanReview: boolean;
  };
}

export interface MergedOutput {
  taskId: string;
  findings: Finding[];
  risks: Risk[];
  contradictions: Contradiction[];
  confidence: number;
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  agentCount: number;
  mergedAt: string;
}

export function mergeResults(outputs: AgentOutput[]): MergedOutput {
  logger.debug(`Merging ${outputs.length} agent outputs`);

  const allFindings: Finding[] = [];
  const allRisks: Risk[] = [];
  const confidences: number[] = [];
  let taskId = '';

  for (const output of outputs) {
    if (output.taskId && !taskId) {
      taskId = output.taskId;
    }

    if (output.findings) {
      allFindings.push(...output.findings);
    }

    if (output.risks) {
      allRisks.push(...output.risks);
    }

    if (output.confidence !== undefined) {
      confidences.push(output.confidence);
    }
  }

  // Deduplicate findings by content
  const uniqueFindings = deduplicateFindings(allFindings);

  // Deduplicate risks by description
  const uniqueRisks = deduplicateRisks(allRisks);

  // Calculate combined confidence
  const combinedConfidence = calculateCombinedConfidence(confidences);

  // Detect contradictions between agents
  const contradictions = detectContradictions(allFindings, outputs);

  // Determine overall risk
  const overallRisk = determineOverallRisk(uniqueRisks);

  return {
    taskId,
    findings: uniqueFindings,
    risks: uniqueRisks,
    contradictions,
    confidence: combinedConfidence,
    overallRisk,
    agentCount: outputs.length,
    mergedAt: new Date().toISOString(),
  };
}

function deduplicateFindings(findings: Finding[]): Finding[] {
  const seen = new Map<string, Finding>();

  for (const finding of findings) {
    const key = finding.content.toLowerCase().trim();
    const existing = seen.get(key);

    if (!existing || finding.confidence > existing.confidence) {
      seen.set(key, finding);
    }
  }

  return Array.from(seen.values());
}

function deduplicateRisks(risks: Risk[]): Risk[] {
  const seen = new Map<string, Risk>();
  const severityOrder: Record<string, number> = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3,
  };

  for (const risk of risks) {
    const key = risk.description.toLowerCase().trim();
    const existing = seen.get(key);

    if (!existing || severityOrder[risk.severity] > severityOrder[existing.severity]) {
      seen.set(key, risk);
    }
  }

  return Array.from(seen.values());
}

function calculateCombinedConfidence(confidences: number[]): number {
  if (confidences.length === 0) return 0;

  // Weighted average with higher confidence getting more weight
  const sorted = [...confidences].sort((a, b) => b - a);
  let weightedSum = 0;
  let totalWeight = 0;

  for (let i = 0; i < sorted.length; i++) {
    const weight = 1 / (i + 1); // Decreasing weights
    weightedSum += sorted[i] * weight;
    totalWeight += weight;
  }

  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

function detectContradictions(findings: Finding[], outputs: AgentOutput[]): Contradiction[] {
  const contradictions: Contradiction[] = [];

  // Group findings by normalized topic keywords (first 5 significant words)
  const topicGroups = new Map<string, Finding[]>();
  for (const f of findings) {
    const words = f.content
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 5)
      .sort()
      .join(' ');
    if (!words) continue;
    const group = topicGroups.get(words) || [];
    group.push(f);
    topicGroups.set(words, group);
  }

  // Findings from different agents on the same topic = potential contradiction
  for (const [, group] of topicGroups) {
    if (group.length < 2) continue;
    const sources = new Set(group.map((g) => g.source));
    if (sources.size < 2) continue;

    // Check if confidence levels diverge significantly (>0.3 gap)
    const confidences = group.map((g) => g.confidence).sort((a, b) => b - a);
    const maxGap = confidences[0] - confidences[confidences.length - 1];

    if (maxGap > 0.3) {
      contradictions.push({
        type: 'agent-vs-agent',
        sides: group.map((g) => ({
          source: g.source,
          claim: g.content,
          confidence: g.confidence,
        })),
      });
    }
  }

  // Check for role-based contradictions (e.g., tester says "test passes" but backend says "code is wrong")
  const roleFindings = new Map<string, Finding[]>();
  for (const output of outputs) {
    if (output.role && output.findings) {
      roleFindings.set(output.role, output.findings);
    }
  }

  const testerFindings = roleFindings.get('tester') || [];
  const requirementsFindings = roleFindings.get('requirements') || [];
  const backendFindings = roleFindings.get('backend') || [];

  // Look for code-vs-requirement contradictions
  for (const req of requirementsFindings) {
    for (const be of backendFindings) {
      const reqLower = req.content.toLowerCase();
      const beLower = be.content.toLowerCase();
      // If both discuss same topic but with opposing signals
      const sharedWords = getSharedKeywords(reqLower, beLower);
      if (sharedWords.length >= 2) {
        const hasConflictSignal =
          (reqLower.includes('should') && beLower.includes('does not')) ||
          (reqLower.includes('required') && beLower.includes('missing')) ||
          (reqLower.includes('reject') && beLower.includes('allow')) ||
          (reqLower.includes('stale') || beLower.includes('stale')) ||
          (reqLower.includes('outdated') || beLower.includes('outdated'));

        if (hasConflictSignal) {
          contradictions.push({
            type: 'code-vs-requirement',
            sides: [
              { source: req.source, claim: req.content, confidence: req.confidence },
              { source: be.source, claim: be.content, confidence: be.confidence },
            ],
          });
        }
      }
    }
  }

  // Look for code-vs-test contradictions
  for (const test of testerFindings) {
    for (const be of backendFindings) {
      const testLower = test.content.toLowerCase();
      const beLower = be.content.toLowerCase();
      const sharedWords = getSharedKeywords(testLower, beLower);
      if (sharedWords.length >= 2) {
        const hasConflictSignal =
          (testLower.includes('fail') && beLower.includes('correct')) ||
          (testLower.includes('expects') && beLower.includes('changed')) ||
          (testLower.includes('stale') || beLower.includes('drift'));

        if (hasConflictSignal) {
          contradictions.push({
            type: 'code-vs-test',
            sides: [
              { source: test.source, claim: test.content, confidence: test.confidence },
              { source: be.source, claim: be.content, confidence: be.confidence },
            ],
          });
        }
      }
    }
  }

  logger.debug(`Detected ${contradictions.length} contradictions`);
  return contradictions;
}

function getSharedKeywords(a: string, b: string): string[] {
  const wordsA = new Set(a.split(/\s+/).filter((w) => w.length > 3));
  const wordsB = new Set(b.split(/\s+/).filter((w) => w.length > 3));
  return [...wordsA].filter((w) => wordsB.has(w));
}

function determineOverallRisk(risks: Risk[]): 'low' | 'medium' | 'high' | 'critical' {
  if (risks.length === 0) return 'low';

  const hasCritical = risks.some((r) => r.severity === 'critical');
  const hasHigh = risks.some((r) => r.severity === 'high');
  const hasMedium = risks.some((r) => r.severity === 'medium');

  if (hasCritical) return 'critical';
  if (hasHigh) return 'high';
  if (hasMedium) return 'medium';
  return 'low';
}
