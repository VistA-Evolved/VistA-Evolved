# Phase 579 — W42-P8: Wire Stubs — Notes + Orders (Phase 4 partial)

> Wave 42: Production Remediation | Position 8 of 15
> Depends on: Phase 573 (RPC pool with DUZ-per-request), Phase 578 (problems/meds pattern)

---

## Objective

Wire 100 notes.ts stub routes to real TIU/ORWTIU RPCs and 100 orders.ts stub routes to real ORWDX/ORWOR RPCs. Replace every `{ ok: false, error: 'Not implemented' }` with actual RPC calls.

---

## Implementation Pattern

```typescript
server.get('/vista/notes/:action', async (request, reply) => {
  const session = await requireSession(request, reply);
  const dfn = (request.query as any)?.dfn;
  if (!dfn) return reply.status(400).send({ ok: false, error: 'dfn required' });
  try {
    const raw = await safeCallRpc('TIU RPC_NAME', [dfn], { tenantId: session.tenantId, duz: session.duz });
    const parsed = parseTiuResponse(raw);
    return reply.send({ ok: true, source: 'vista', data: parsed });
  } catch (err: any) {
    log.warn({ err, rpc: 'TIU RPC_NAME' }, 'RPC call failed');
    return reply.code(502).send({
      ok: false, source: 'vista', error: err?.message,
      rpcUsed: ['TIU RPC_NAME'], pendingTargets: []
    });
  }
});
```

---

## Notes (100 stubs) — TIU/ORWTIU RPCs

**File:** `apps/api/src/routes/notes.ts`

| RPC Family | Purpose |
|------------|---------|
| TIU CREATE RECORD | Create note |
| TIU SET DOCUMENT TEXT | Set note text |
| TIU SIGN RECORD | Sign note |
| TIU GET RECORD TEXT | Get note text |
| ORWTIU TEMPLATE GETITM | Template items |
| ORWTIU PERSONAL TITLE LIST | Title list |
| TIU DOCUMENTS BY CONTEXT | List notes by context |
| etc. | (remaining TIU/ORWTIU RPCs) |

---

## Orders (100 stubs) — ORWDX/ORWOR RPCs

**File:** `apps/api/src/routes/orders.ts`

| RPC Family | Purpose |
|------------|---------|
| ORWDX SAVE | Save order |
| ORWDXA DC | Discontinue |
| ORWDXA COMPLETE | Complete order |
| ORWDXC ACCEPT | Order check accept |
| ORWDXC DISPLAY | Order check display |
| ORWDXC SAVECHK | Save order check |
| ORWDX WRLST | Write list |
| ORWDLR DEF | Lab def |
| ORWOR* | Order entry helpers |
| etc. | (remaining ORWDX/ORWOR RPCs) |

**LOCK/UNLOCK**: Call `ORWDX LOCK` before ordering RPCs, `ORWDX UNLOCK` after (see AGENTS.md gotcha 17).

---

## Files to Create/Modify

- `apps/api/src/routes/notes.ts` — Wire all 100 stubs
- `apps/api/src/routes/orders.ts` — Wire all 100 stubs
- `apps/api/src/vista/rpcRegistry.ts` — Add any missing RPCs
- `apps/api/src/vista/rpcRegistry.ts` — Add any to RPC_EXCEPTIONS

---

## Key Patterns to Follow

1. **DUZ-per-request**: Pass `{ tenantId, duz }` to `safeCallRpc` from session.
2. **LOCK/UNLOCK**: All order writes must use ORWDX LOCK/UNLOCK cycle.
3. **TIU parsing**: TIU returns line-delimited or caret-delimited; parse per RPC.
4. **Order dialog helpers**: ORWDPS/ORWDX return structured data; implement parsers.
5. **LIST params**: Use `safeCallRpcWithList` for RPCs requiring LIST params.

---

## Acceptance Criteria

- [ ] All 100 notes routes call real RPCs (no "Not implemented")
- [ ] All 100 orders routes call real RPCs (no "Not implemented")
- [ ] All RPCs in registry or exceptions
- [ ] Order writes use LOCK/UNLOCK
- [ ] Phase 106 verifier Gate 3 passes
