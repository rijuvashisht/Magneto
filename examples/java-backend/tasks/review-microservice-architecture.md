---
id: JAVA-003
title: Review microservice architecture and inter-service communication
type: architecture-review
scope:
  - src/main/java/com/example/api/service/
  - src/main/java/com/example/api/client/
  - src/main/java/com/example/api/config/
  - src/main/java/com/example/api/domain/
  - src/main/java/com/example/api/event/
tags:
  - architecture
  - microservices
  - decomposition
  - domain-driven-design
  - circuit-breaker
constraints:
  - Must map all inter-service REST calls and identify tight coupling
  - Must verify circuit breaker is configured for all external service calls
  - Must check for distributed transaction anti-patterns (2PC, saga without compensation)
  - Must identify domain logic in the wrong service boundary
  - Must verify that services communicate via DTOs, not shared entities
  - Must check for N+1 query patterns in cross-service data aggregation
  - Must propose incremental migration steps — no big-bang rewrite
  - Must validate that each service can be deployed independently
---

The monolith is being decomposed into microservices. Review current service boundaries
for the order, payment, user, and notification domains.

## Review Areas

### Service Boundaries
- Are the 4 domain boundaries (order, payment, user, notification) correctly drawn?
- Is there domain logic that has leaked across boundaries?
- Can each service own its own database schema?

### Communication Patterns
- Where is synchronous REST used vs async messaging?
- Are there cascading failure risks from synchronous chains?
- Is a circuit breaker (Resilience4j, Hystrix) configured for all external calls?

### Data Consistency
- How are distributed transactions handled? (Saga, outbox, or 2PC?)
- Are there eventual consistency issues that could affect the user experience?
- Is there an event store or event log for debugging?

### Deployment Independence
- Can each service be built, tested, and deployed independently?
- Are there shared libraries that create deployment coupling?
- Is there a service registry / discovery mechanism?

## Context Budget

- **Max files:** 20
- **Max tokens:** 35,000
- **Note:** Service and domain layers only — web layer excluded for architecture focus
