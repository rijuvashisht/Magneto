---
id: NEXT-001
title: Implement NextAuth.js authentication flow with role-based access
type: feature-implementation
scope:
  - src/app/api/auth/
  - src/middleware.ts
  - src/lib/auth.ts
  - src/components/auth/
  - src/app/(protected)/
  - src/types/next-auth.d.ts
tags:
  - auth
  - nextauth
  - rbac
  - oauth
  - middleware
  - security
constraints:
  - Must use NextAuth.js v5 (Auth.js)
  - Must support Google and GitHub OAuth providers
  - Must implement RBAC with at least 3 roles: admin, editor, viewer
  - Must protect all /dashboard/* routes via middleware
  - Must not store sensitive tokens in localStorage
  - Must handle token refresh without user interruption
  - Must include CSRF protection
---

Add complete authentication using NextAuth.js with Google and GitHub OAuth providers.
Implement role-based access control (RBAC) for admin, editor, and viewer roles.
Protect API routes and pages with middleware.
Add session persistence and token refresh logic.

## Acceptance Criteria

- Users can sign in with Google or GitHub
- Admin users see the admin panel; editors can edit content; viewers are read-only
- Unauthenticated users are redirected to `/login` when accessing `/dashboard/*`
- Sessions persist across page reloads
- Tokens refresh silently in the background

## Context Budget

- **Max files:** 12
- **Max tokens:** 25,000
- **Note:** Scoped to auth-related files only — saves ~70% context vs full-project scan
