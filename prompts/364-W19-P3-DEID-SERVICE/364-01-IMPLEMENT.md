# Phase 364 — W19-P3: De-Identification & Pseudonymization Service

## Implementation Steps

1. Create `apps/api/src/analytics/deid-service.ts`.
2. Implement pseudonymization with tenant-scoped HMAC-SHA256.
3. Implement direct identifier redaction (name, SSN, DOB, MRN, etc.).
4. Implement free-text redaction for inline PHI patterns.
5. Per-tenant deid config (`strict` default, `pseudonymized`, `raw`).
6. Implement denylist scan as post-step verification.
7. Document as "engineering tool; consult compliance for policy".

## Files Touched

- `apps/api/src/analytics/deid-service.ts`
- `apps/api/src/analytics/deid-types.ts`
- `apps/api/src/routes/analytics-extract-routes.ts` (add deid endpoints)
