# Phase 340 — W16-P4 — Fine-Grained ABAC — NOTES

## Key Decisions
- **ABAC is post-RBAC**: RBAC must allow first, then ABAC adds restrictions
- **Composable rules**: AND/OR combinators for complex conditions
- **Structured deny**: includes `{ code, reason, remediation, attributes }` for UI
- **Environment-aware**: policies can differ per runtime mode
- **No breaking change**: existing `evaluatePolicy()` unchanged; new `evaluatePolicyWithAbac()` adds ABAC chain
