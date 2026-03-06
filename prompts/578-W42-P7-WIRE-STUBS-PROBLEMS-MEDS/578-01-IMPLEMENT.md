# Phase 578 — W42-P7: Wire Stubs — Problems + Meds (Phase 4 partial)

> Wave 42: Production Remediation | Position 7 of 15
> Depends on: Phase 573 (RPC pool with DUZ-per-request), Phase 576/577 (store migration)

---

## Context

Wave 42 production-remediation prompt. Use this section to capture execution context, dependencies, and prerequisites before changing code.

## Implementation Steps

1. Execute the objective and task sections below in order.
2. Keep changes deterministic and minimal.
3. Record any deviations from the stated approach in Decisions.

## Files Changed

List the source files, configs, scripts, docs, and tests changed while executing this prompt.

## Decisions

Record design choices, trade-offs, or scope trims made during execution.

## Evidence Captured

List the commands, runtime checks, artifacts, and logs that prove the work is complete.

---

## Objective

Wire 26 problems.ts stub routes to real ORQQPL RPCs and 60 meds.ts stub routes to real ORWPS/ORWDPS RPCs. Replace every `{ ok: false, error: 'Not implemented' }` with actual RPC calls.

---

## Implementation Pattern

```typescript
server.get('/vista/problems/:action', async (request, reply) => {
  const session = await requireSession(request, reply);
  const dfn = (request.query as any)?.dfn;
  if (!dfn) return reply.status(400).send({ ok: false, error: 'dfn required' });
  try {
    const raw = await safeCallRpc('ORQQPL RPC_NAME', [dfn], {
      tenantId: session.tenantId,
      duz: session.duz,
    });
    const parsed = parseRpcResponse(raw);
    return reply.send({ ok: true, source: 'vista', data: parsed });
  } catch (err: any) {
    log.warn({ err, rpc: 'ORQQPL RPC_NAME' }, 'RPC call failed');
    return reply.code(502).send({
      ok: false,
      source: 'vista',
      error: err?.message,
      rpcUsed: ['ORQQPL RPC_NAME'],
      pendingTargets: [],
    });
  }
});
```

---

## Problems (26 stubs) — ORQQPL RPCs

**File:** `apps/api/src/routes/problems.ts`

| RPC                 | Purpose                   |
| ------------------- | ------------------------- |
| ORQQPL PROBLEM LIST | List problems for patient |
| ORQQPL ADD SAVE     | Add new problem           |
| ORQQPL DELETE       | Delete problem            |
| ORQQPL EDIT SAVE    | Edit problem              |
| ORQQPL DETAIL       | Problem detail            |
| ORQQPL AUDIT        | Audit trail               |
| ORQQPL INIT USER    | Initialize user context   |
| GMPL CS SEARCH      | Search problems           |
| etc.                | (remaining ORQQPL RPCs)   |

Ensure all RPCs are in `RPC_REGISTRY` or `RPC_EXCEPTIONS` with domain and tag.

---

## Meds (60 stubs) — ORWPS/ORWDPS RPCs

**File:** `apps/api/src/routes/meds.ts`

| RPC Family        | Purpose                       |
| ----------------- | ----------------------------- |
| ORWPS ACTIVE      | Active medications            |
| ORWPS COVER       | Coverage list                 |
| ORWPS DETAIL      | Medication detail             |
| ORWDPS1 DSGP      | Order dialog helpers          |
| ORWDPS2 DAY2QTY   | Day supply                    |
| ORWDPS2 OISLCT    | Order selection               |
| ORWDPS32 VALROUTE | Route validation              |
| etc.              | (remaining ORWPS/ORWDPS RPCs) |

Many return structured data; implement RPC-specific parsers.

---

## Files to Create/Modify

- `apps/api/src/routes/problems.ts` — Wire all 26 stubs
- `apps/api/src/routes/meds.ts` — Wire all 60 stubs
- `apps/api/src/vista/rpcRegistry.ts` — Add any missing RPCs
- `apps/api/src/vista/rpcRegistry.ts` — Add any to RPC_EXCEPTIONS

---

## Key Patterns to Follow

1. **DUZ-per-request**: Pass `{ tenantId, duz }` to `safeCallRpc` from session.
2. **RPC registry**: Every RPC must be in registry or exceptions; Gate G3 fails otherwise.
3. **Parse responses**: ORQQPL/ORWPS return line-delimited or caret-delimited; parse per RPC spec.
4. **Empty vs error**: Empty array from VistA is valid; "Not implemented" is not.
5. **LIST params**: Use `safeCallRpcWithList` for RPCs requiring LIST params (e.g., GMPL CS SEARCH).

---

## Acceptance Criteria

- [ ] All 26 problems routes call real RPCs (no "Not implemented")
- [ ] All 60 meds routes call real RPCs (no "Not implemented")
- [ ] All RPCs in registry or exceptions
- [ ] Phase 106 verifier Gate 3 passes (no unregistered RPCs)
- [ ] Routes return real data or empty array in sandbox; never "Not implemented"
