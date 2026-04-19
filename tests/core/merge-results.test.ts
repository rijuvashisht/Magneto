import { mergeResults, AgentOutput } from '../../src/core/merge-results';

describe('mergeResults', () => {
  it('should merge multiple agent outputs', () => {
    const outputs: AgentOutput[] = [
      {
        agentId: 'agent-backend',
        role: 'backend',
        taskId: 'task-001',
        findings: [
          { source: 'backend', content: 'SQL injection risk in user query', confidence: 0.9 },
        ],
        risks: [
          { severity: 'high', description: 'Unparameterized SQL query', source: 'backend' },
        ],
        confidence: 0.85,
      },
      {
        agentId: 'agent-tester',
        role: 'tester',
        taskId: 'task-001',
        findings: [
          { source: 'tester', content: 'Missing test for edge case', confidence: 0.7 },
        ],
        risks: [
          { severity: 'medium', description: 'Low test coverage on auth module', source: 'tester' },
        ],
        confidence: 0.75,
      },
    ];

    const result = mergeResults(outputs);

    expect(result.taskId).toBe('task-001');
    expect(result.findings).toHaveLength(2);
    expect(result.risks).toHaveLength(2);
    expect(result.agentCount).toBe(2);
    expect(result.overallRisk).toBe('high');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.mergedAt).toBeDefined();
  });

  it('should deduplicate findings by content', () => {
    const outputs: AgentOutput[] = [
      {
        findings: [
          { source: 'agent-a', content: 'Missing error handling', confidence: 0.6 },
        ],
        confidence: 0.6,
      },
      {
        findings: [
          { source: 'agent-b', content: 'Missing error handling', confidence: 0.8 },
        ],
        confidence: 0.8,
      },
    ];

    const result = mergeResults(outputs);
    expect(result.findings).toHaveLength(1);
    // Should keep the higher confidence one
    expect(result.findings[0].confidence).toBe(0.8);
  });

  it('should deduplicate risks by description, keeping highest severity', () => {
    const outputs: AgentOutput[] = [
      {
        risks: [
          { severity: 'medium', description: 'Open port vulnerability', source: 'a' },
        ],
      },
      {
        risks: [
          { severity: 'high', description: 'Open port vulnerability', source: 'b' },
        ],
      },
    ];

    const result = mergeResults(outputs);
    expect(result.risks).toHaveLength(1);
    expect(result.risks[0].severity).toBe('high');
  });

  it('should return low risk when no risks are present', () => {
    const outputs: AgentOutput[] = [
      { findings: [], risks: [], confidence: 0.9 },
    ];

    const result = mergeResults(outputs);
    expect(result.overallRisk).toBe('low');
  });

  it('should return critical risk when any critical risk exists', () => {
    const outputs: AgentOutput[] = [
      {
        risks: [
          { severity: 'critical', description: 'Data breach vulnerability', source: 'sec' },
          { severity: 'low', description: 'Minor style issue', source: 'lint' },
        ],
      },
    ];

    const result = mergeResults(outputs);
    expect(result.overallRisk).toBe('critical');
  });

  it('should handle empty outputs array', () => {
    const result = mergeResults([]);
    expect(result.findings).toHaveLength(0);
    expect(result.risks).toHaveLength(0);
    expect(result.confidence).toBe(0);
    expect(result.agentCount).toBe(0);
    expect(result.overallRisk).toBe('low');
  });

  it('should calculate combined confidence with weighted average', () => {
    const outputs: AgentOutput[] = [
      { confidence: 0.9 },
      { confidence: 0.7 },
      { confidence: 0.5 },
    ];

    const result = mergeResults(outputs);
    // Higher confidences are weighted more
    expect(result.confidence).toBeGreaterThan(0.6);
    expect(result.confidence).toBeLessThanOrEqual(1.0);
  });
});
