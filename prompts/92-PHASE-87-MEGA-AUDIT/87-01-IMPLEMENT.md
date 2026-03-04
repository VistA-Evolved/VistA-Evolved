# Phase 87 — Mega Prompt Audit: IMPLEMENT

## User Request

Review every prompt (91 folders, 188 files) against a 3-layer verification guide:

1. **Sanity** — UI wired? Hardcoded data? Backend reachable?
2. **Feature Integrity** — UI→Backend→VistA flow intact? Dead UI? Unused backend?
3. **Regression** — Contracts aligned? No broken wiring?

## Implementation Steps

### Step 1: Naming Compliance (committed separately as 900078d)

- Fixed 32 prompt naming violations
- Created 11 missing VERIFY stubs
- Relocated verify reports from forbidden `docs/reports/` to `artifacts/verify/`

### Step 2: Systematic Prompt-vs-Code Audit

Audited all 91 prompts in batches:

- Prompts 01-08: 8/8 PASS
- Prompts 09-15: 7/7 PASS (2 issues)
- Prompts 16-22: 7/7 PASS (3 issues)
- Prompts 23-30: 8/8 PASS
- Prompts 31-38: 8/8 PASS (2 issues)
- Prompts 39-45: 7/7 PASS (1 issue)
- Prompts 46-53: 7/8 PASS, 1 FAIL (immutable-audit traceId)
- Prompts 54-60: 7/7 PASS
- Prompts 61-68: 8/8 PASS
- Prompts 69-76: 7/8 PASS, 1 FAIL (ImmunizationsPanel dead fetch)
- Prompts 77-84: 8/8 PASS (1 governance gap)
- Prompts 85-91: 7/7 PASS

**Overall: 89 PASS / 2 FAIL across 91 prompts**

### Step 3: Fix All Accumulated Issues

| #   | Severity | File                   | Fix                                                                          |
| --- | -------- | ---------------------- | ---------------------------------------------------------------------------- |
| 1   | **FAIL** | ImmunizationsPanel.tsx | Fixed dead fetch: added `API_BASE`, removed `/api/` prefix                   |
| 2   | **FAIL** | immutable-audit.ts     | Added `traceId` field to interface, hash computation, and `immutableAudit()` |
| 3   | Minor    | CPRSModals.tsx         | Replaced hardcoded `ws://localhost:3001` with `API_BASE`-derived WS URL      |
| 4   | Minor    | portal-sharing.ts      | Replaced `===` with `timingSafeEqual` for DOB/access-code comparison         |
| 5   | Minor    | RpcDebugPanel.tsx      | Wired orphaned component into new `/cprs/admin/rpc-debug` page               |
| 6   | Minor    | LabsPanel.tsx          | Replaced hardcoded `'current-user'` with session-derived `user.duz`          |
| 7   | Info     | admin/layout.tsx       | Added "RPC Debug" nav entry                                                  |

### Step 4: Build Verification

- `tsc --noEmit` on apps/api: 0 errors
- `tsc --noEmit` on apps/web: 0 errors
- `tsc --noEmit` on apps/portal: 0 errors

## Files Touched

- `apps/web/src/components/cprs/panels/ImmunizationsPanel.tsx` — EDIT (fix dead fetch)
- `apps/api/src/lib/immutable-audit.ts` — EDIT (add traceId)
- `apps/web/src/components/cprs/CPRSModals.tsx` — EDIT (derive WS URL)
- `apps/api/src/services/portal-sharing.ts` — EDIT (timingSafeEqual)
- `apps/web/src/components/cprs/panels/LabsPanel.tsx` — EDIT (session DUZ)
- `apps/web/src/components/cprs/panels/RpcDebugPanel.tsx` — unchanged (now consumed)
- `apps/web/src/app/cprs/admin/rpc-debug/page.tsx` — NEW (wire orphaned panel)
- `apps/web/src/app/cprs/admin/layout.tsx` — EDIT (add RPC Debug nav)

## Accepted Exceptions (not fixed)

- CoverSheetPanel local `fetchJson` bypasses `correlatedGet` — legacy pattern, low risk
- Missing `docs/security/sharing-threat-model.md` — doc gap, not code bug
- `rpcBroker.ts` dead stubs — historical artifacts, harmless
- Missing verify scripts for Phases 44-48, 78 — governance gaps, not code bugs
- `data/rcm/payer-rules/` dead comment in payer-rules.ts — code seeds work
