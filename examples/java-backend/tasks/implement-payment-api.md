---
id: JAVA-001
title: Implement payment processing API with idempotency and retry logic
type: feature-implementation
scope:
  - src/main/java/com/example/api/web/controller/PaymentController.java
  - src/main/java/com/example/api/service/PaymentService.java
  - src/main/java/com/example/api/repository/PaymentRepository.java
  - src/main/java/com/example/api/domain/entity/Payment.java
  - src/main/java/com/example/api/web/dto/PaymentRequest.java
  - src/main/java/com/example/api/web/dto/PaymentResponse.java
  - src/main/java/com/example/api/config/StripeConfig.java
  - src/main/java/com/example/api/service/WebhookService.java
tags:
  - payment
  - stripe
  - api
  - idempotency
  - retry
  - webhook
constraints:
  - Must use BigDecimal for all monetary calculations — no double or float
  - Must implement idempotency keys (UUID) to prevent duplicate payments
  - Must retry transient Stripe errors with exponential backoff (max 3 retries)
  - Must handle Stripe webhook signature verification
  - Must annotate all write operations with @Transactional
  - Must include @PreAuthorize('hasRole(ADMIN)') on refund endpoints
  - Must validate all DTOs with Bean Validation (@NotNull, @Positive, etc.)
  - Must not log full credit card numbers — mask to last 4 digits
  - Must return proper HTTP status codes (201 for created, 409 for duplicate)
---

Build a complete payment processing API that integrates with Stripe. Must support
credit card and bank transfer payment methods.

## Requirements

- **Idempotency:** Every payment request includes a client-generated UUID. If the
  same UUID is sent twice, return the original response without charging again.
- **Retry logic:** Transient Stripe failures (5xx, network timeouts) are retried
  with exponential backoff: 1s → 2s → 4s, max 3 attempts.
- **Webhooks:** Handle `payment_intent.succeeded`, `payment_intent.failed`, and
  `charge.refunded` events. Verify webhook signatures before processing.
- **Money handling:** All amounts stored and calculated as BigDecimal. Never use
  `double` or `float` for monetary values.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST   | `/api/v1/payments` | Create a new payment |
| GET    | `/api/v1/payments/{id}` | Get payment by ID |
| POST   | `/api/v1/payments/{id}/refund` | Refund a payment (ADMIN only) |
| POST   | `/api/v1/webhooks/stripe` | Stripe webhook receiver |

## Context Budget

- **Max files:** 8
- **Max tokens:** 20,000
- **Note:** Scoped to payment layer only — saves ~80% context vs loading full project
