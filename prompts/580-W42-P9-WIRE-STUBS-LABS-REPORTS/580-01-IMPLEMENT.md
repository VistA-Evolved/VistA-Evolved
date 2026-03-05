# Phase 580 — W42-P9: Wire Stubs — Labs + Reports (Phase 4 partial)

> Wave 42: Production Remediation | Position 9 of 15
> Depends on: Phase 573 (RPC pool with DUZ-per-request), Phase 578/579 (stub wiring pattern)

---

## Objective

Wire 37 labs.ts stub routes to real ORWLRR/ORWDLR RPCs and 39 reports.ts stub routes to real ORWRP RPCs. Replace every `{ ok: false, error: 'Not implemented' }` with actual RPC calls.

---

## Implementation Pattern

```typescript
server.get('/vista/labs/:action', async (request, reply) => {
  const session = await requireSession(request, reply);
  const dfn = (request.query as any)?.dfn;
  if (!dfn) return reply.status(400).send({ ok: false, error: 'dfn required' });
  try {
    const raw = await safeCallRpc('ORWLRR RPC_NAME', [dfn], {
      tenantId: session.tenantId,
      duz: session.duz,
    });
    const parsed = parseLabResponse(raw);
    return reply.send({ ok: true, source: 'vista', data: parsed });
  } catch (err: any) {
    log.warn({ err, rpc: 'ORWLRR RPC_NAME' }, 'RPC call failed');
    return reply.code(502).send({
      ok: false,
      source: 'vista',
      error: err?.message,
      rpcUsed: ['ORWLRR RPC_NAME'],
      pendingTargets: [],
    });
  }
});
```

---

## Labs (37 stubs) — ORWLRR/ORWDLR RPCs

**File:** `apps/api/src/routes/labs.ts`

| RPC Family       | Purpose                        |
| ---------------- | ------------------------------ |
| ORWLRR CHART     | Lab chart                      |
| ORWLRR GRID      | Lab grid                       |
| ORWLRR INTERIM   | Interim results                |
| ORWDLR32 ABBSPEC | Abbreviated specimen           |
| ORWDLR32 ALLSURG | All surgery                    |
| LR ORDER         | Lab order (write)              |
| etc.             | (remaining ORWLRR/ORWDLR RPCs) |

**Note:** LR ORDER may return empty in sandbox (no lab data); wiring is still required.

---

## Reports (39 stubs) — ORWRP RPCs

**File:** `apps/api/src/routes/reports.ts`

| RPC Family            | Purpose                   |
| --------------------- | ------------------------- |
| ORWRP REPORT TEXT     | Report text               |
| ORWRP REPORT LISTS    | Report lists              |
| ORWRP2 HS COMPONENTS  | Health summary components |
| ORWRP2 HS FILE        | File report               |
| ORWRP2 HS REPORT TEXT | Report text               |
| etc.                  | (remaining ORWRP RPCs)    |

All read-only; return raw text or parsed structure.

---

## Files to Create/Modify

- `apps/api/src/routes/labs.ts` — Wire all 37 stubs
- `apps/api/src/routes/reports.ts` — Wire all 39 stubs
- `apps/api/src/vista/rpcRegistry.ts` — Add any missing RPCs
- `apps/api/src/services/clinical-reports.ts` — May already use ORWRP; verify consistency

---

## Key Patterns to Follow

1. **DUZ-per-request**: Pass `{ tenantId, duz }` to `safeCallRpc` from session.
2. **Lab parsing**: ORWLRR returns grid/chart format; parse per RPC spec.
3. **Report parsing**: ORWRP returns text; may need HS component parsing for structured reports.
4. **Cache**: clinical-reports.ts caches ORWRP results (30s TTL); ensure cache key includes dfn/reportId.
5. **Empty sandbox**: Lab/report data may be sparse in WorldVistA; empty array is valid.

---

## Acceptance Criteria

- [ ] All 37 labs routes call real RPCs (no "Not implemented")
- [ ] All 39 reports routes call real RPCs (no "Not implemented")
- [ ] All RPCs in registry or exceptions
- [ ] Phase 106 verifier Gate 3 passes
- [ ] clinical-reports.ts cache aligned with new reports routes
