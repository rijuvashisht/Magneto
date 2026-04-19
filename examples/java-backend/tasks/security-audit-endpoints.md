---
id: JAVA-002
title: Security audit of all REST API endpoints
type: security-audit
scope:
  - src/main/java/com/example/api/web/controller/
  - src/main/java/com/example/api/security/
  - src/main/java/com/example/api/config/SecurityConfig.java
  - src/main/java/com/example/api/config/CorsConfig.java
  - src/main/java/com/example/api/web/dto/
tags:
  - security
  - audit
  - endpoints
  - auth
  - injection
  - cors
  - owasp
constraints:
  - Must check every @RestController for @PreAuthorize annotations
  - Must identify endpoints that accept user input without @Valid annotation
  - Must flag any raw SQL queries or string-concatenated queries
  - Must check for sensitive fields (password, token, ssn) in response DTOs
  - Must verify CORS is not configured with wildcard (*) origins in production
  - Must check that all DELETE endpoints require ADMIN role
  - Must verify rate limiting is configured for authentication endpoints
  - Must flag any endpoint that returns stack traces in error responses
  - Must cross-reference with OWASP Top 10 (2021)
---

Audit all REST endpoints for security vulnerabilities. Check for missing authentication
annotations, SQL injection vectors in query parameters, mass assignment via unvalidated
DTOs, missing rate limiting, CORS misconfiguration, and sensitive data exposure in responses.

## OWASP Top 10 Checklist

1. **A01 Broken Access Control** — missing @PreAuthorize, insecure direct object refs
2. **A02 Cryptographic Failures** — sensitive data in responses, weak hashing
3. **A03 Injection** — SQL injection, JPQL injection, command injection
4. **A04 Insecure Design** — missing rate limits, no input validation
5. **A05 Security Misconfiguration** — wildcard CORS, debug mode, stack traces
6. **A06 Vulnerable Components** — check dependency versions
7. **A07 Auth Failures** — weak session management, missing MFA hooks
8. **A08 Data Integrity** — unsigned webhooks, unverified redirects
9. **A09 Logging Failures** — missing audit logs for auth events
10. **A10 SSRF** — user-controlled URLs passed to HTTP clients

## Expected Output

For each finding, provide:
- **Severity:** Critical / High / Medium / Low
- **Location:** File and line number
- **Description:** What the vulnerability is
- **Fix:** Recommended remediation

## Context Budget

- **Max files:** 15
- **Max tokens:** 30,000
- **Note:** Focused on controllers, security config, and DTOs — entity and repository layers excluded
