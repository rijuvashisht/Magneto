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

export interface MergedOutput {
  taskId: string;
  findings: Finding[];
  risks: Risk[];
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

  // Determine overall risk
  const overallRisk = determineOverallRisk(uniqueRisks);

  return {
    taskId,
    findings: uniqueFindings,
    risks: uniqueRisks,
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
