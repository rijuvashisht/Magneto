# Skill: Final Decision Merge

## Purpose
Combine findings from all agents into a single coherent decision.

## Process
1. Collect all agent outputs (findings, risks, confidence scores)
2. Deduplicate findings by content — keep higher confidence version
3. Deduplicate risks by description — keep higher severity version
4. Detect contradictions between agents (see contradiction-resolution skill)
5. Calculate weighted confidence (higher-confidence agents weighted more)
6. Determine overall risk level
7. Produce final merged output with decision and recommended actions

## Merge Rules
- Findings from multiple agents on the same topic increase confidence
- Contradicting findings trigger contradiction resolution
- Final risk = highest severity found across all agents
- Overall confidence = weighted average favoring high-confidence agents
