# Skill: Contradiction Resolution

## Purpose
Detect and resolve conflicting findings between agents or between code, tests, and requirements.

## Contradiction Types
1. **Code vs Requirement** — implementation doesn't match the spec
2. **Code vs Test** — test expects different behavior than code provides
3. **Requirement vs Test** — test validates against outdated requirement
4. **Agent vs Agent** — two agents disagree on the same finding

## Resolution Process
1. Identify the contradiction (what conflicts with what)
2. Gather evidence from each side (code, tests, requirements, commit history)
3. Determine which side is "stale" — often the requirement or test is outdated
4. Assess whether the deviation was intentional (check recent commits)
5. Produce a resolution decision:
   - Update the stale artifact (requirement, test, or code)
   - Escalate to human review if confidence is low
6. Report the contradiction with full context and recommended action

## Priority Rules
- Recent intentional code changes take priority over old specs
- If a requirement is explicitly documented and recent, code should match
- When in doubt, flag for human review rather than auto-resolving
