---
id: NEXT-002
title: Analyze and optimize Next.js bundle size for production
type: performance-review
scope:
  - src/components/
  - src/app/
  - next.config.js
  - package.json
tags:
  - performance
  - bundle
  - optimization
  - code-splitting
  - lazy-loading
constraints:
  - Must not break existing functionality or tests
  - Must maintain SSR compatibility for critical pages
  - Must keep LCP under 2.5 seconds on 3G
  - Must use next/dynamic for heavy components
  - Must verify no unused dependencies remain after optimization
  - Must document all changes for the team
---

The production bundle has grown to 450KB (gzipped). Identify the largest contributors,
implement code splitting and dynamic imports for heavy components (charts, rich-text
editor, date pickers). Evaluate tree-shaking effectiveness and remove unused dependencies.

**Target:** Reduce initial bundle to under 200KB gzipped.

## What to Investigate

- Run `next build` and analyze the bundle output
- Identify top 5 largest imports by size
- Check for barrel file re-exports that break tree-shaking
- Look for components imported at the top level that are only used in specific routes

## Context Budget

- **Max files:** 20
- **Max tokens:** 30,000
- **Note:** Focuses on component imports and config — no need to load API routes or tests initially
