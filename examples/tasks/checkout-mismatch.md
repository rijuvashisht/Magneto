---
id: checkout-mismatch-001
title: Checkout Price Mismatch Investigation
type: bug-fix
scope:
  - src/services/checkout.ts
  - src/services/cart.ts
  - src/services/pricing.ts
  - src/services/coupon.ts
  - src/services/tax.ts
  - tests/checkout.test.ts
tags:
  - bug
  - checkout
  - pricing
  - critical
  - production
constraints:
  - Must not change the tax calculation API contract
  - Must maintain backward compatibility with existing coupons
  - Fix must include regression tests
  - No changes to database schema
---

Users are reporting that the final checkout price does not match the cart total
displayed on the cart page. The discrepancy appears to be related to **tax calculation
and coupon application order**.

## Steps to Reproduce

1. Add items to cart totaling $100.00
2. Apply coupon code `SAVE20` (20% off)
3. Proceed to checkout
4. Expected total: $96.00 (($100 - $20) × 1.2 tax)
5. Actual total: $100.00 (tax applied before coupon)

## Investigation Areas

- Is the coupon applied before or after tax in `checkout.ts` vs `cart.ts`?
- Does `pricing.ts` have a consistent calculation order?
- Are there rounding issues in `tax.ts`?
