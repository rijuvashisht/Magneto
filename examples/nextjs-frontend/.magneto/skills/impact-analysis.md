# Skill: Impact Analysis

## Purpose
Determine the blast radius of a code change across the system.

## Process
1. Identify all files directly modified by the change
2. Trace dependencies — what imports or calls the modified code
3. Check for affected tests, requirements, and documentation
4. Assess risk level based on the number of affected components
5. Flag cross-domain impacts (e.g., backend change affecting frontend)

## Output
- List of directly affected files
- List of transitively affected components
- Risk assessment (low/medium/high/critical)
- Recommended review scope
