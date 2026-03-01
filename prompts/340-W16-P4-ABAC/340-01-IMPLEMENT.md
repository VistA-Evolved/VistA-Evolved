# Phase 340 — W16-P4 — Fine-Grained ABAC — IMPLEMENT

## Objective
Extend the existing policy engine with attribute-based access control (ABAC)
conditions, structured deny reasons, and environment-aware policy evaluation.

## What Changed
1. **`apps/api/src/auth/abac-engine.ts`** — ABAC policy engine extension
   - Attribute conditions: time-of-day, IP range, facility, sensitivity level
   - Structured deny reasons with remediation hints
   - Environment-aware policies (dev/staging/prod)
   - Composable policy rules (AND/OR combinators)
   - Integration with existing `evaluatePolicy()` as post-check

2. **`apps/api/src/auth/abac-attributes.ts`** — Attribute extractors
   - Request attribute extraction (IP, time, facility, user-agent)
   - Resource attribute extraction (sensitivity, owner, department)
   - Environment attribute extraction (runtime mode, feature flags)
   - Attribute normalization and validation

3. **Updated `policy-engine.ts`** — Added `evaluatePolicyWithAbac()` export
   that chains RBAC → ABAC evaluation

## Files Touched
- `apps/api/src/auth/abac-engine.ts` (NEW)
- `apps/api/src/auth/abac-attributes.ts` (NEW)
- `apps/api/src/auth/policy-engine.ts` (EDIT — add ABAC chain)
- `prompts/340-W16-P4-ABAC/` (NEW)
