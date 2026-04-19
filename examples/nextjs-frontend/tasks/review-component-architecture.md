---
id: NEXT-003
title: Review and standardize component architecture patterns
type: architecture-review
scope:
  - src/components/
  - src/hooks/
  - src/stores/
  - src/context/
  - src/types/
tags:
  - architecture
  - components
  - state-management
  - design-system
  - patterns
constraints:
  - Must audit all shared/common components for consistent prop interfaces
  - Must identify prop drilling chains deeper than 3 levels
  - Must flag components over 200 lines as candidates for decomposition
  - Must check for circular dependencies between component modules
  - Must validate that all components follow the project naming convention
  - Must not suggest wholesale rewrites — prefer incremental migration paths
---

The dashboard has grown to 80+ components with inconsistent patterns: some use prop
drilling, others use context, a few use Zustand. State management is fragmented.

Review the component hierarchy, identify pattern violations, and propose a standardized
architecture. Check for component contract violations where props don't match the
design system spec.

## Key Questions

1. Which state management pattern should be standardized? (Context vs Zustand vs both)
2. Which components violate the design system prop contracts?
3. Where are the deepest prop drilling chains and how should they be refactored?
4. Are there circular dependency cycles in the component graph?

## Context Budget

- **Max files:** 25
- **Max tokens:** 35,000
- **Note:** Component-focused scope — API routes, middleware, and config excluded
