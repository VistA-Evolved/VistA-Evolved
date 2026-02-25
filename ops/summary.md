# Phase 131 VERIFY (Scheduling Depth) -- Summary

## What Changed

### 1. safeCallRpc auto-connect (Critical fix)
`safeCallRpc` and `safeCallRpcWithList` in `rpc-resilience.ts` did not call
`connect()` before `callRpc()`. This meant any route using the resilient RPC
wrappers (scheduling adapter, etc.) would fail with "Not connected" unless a
legacy route had already established the broker connection. Fixed by adding
`await connect()` inside `withBrokerLock()` before each RPC call. `connect()`
is idempotent -- returns immediately if already connected.

### 2. Lifecycle transition tenant_id (Medium fix)
`POST /scheduling/lifecycle/transition` was not passing `request.session.tenantId`
to `insertLifecycleEntry()`, always defaulting to `"default"`. Now passes the
session's tenant_id.

### 3. Scheduling in CPRS navigation (Medium fix)
The scheduling page at `/cprs/scheduling` was unreachable from the CPRS UI --
no menu item, no tab strip entry, no sidebar link. Added "Scheduling" to the
Tools menu in `CPRSMenuBar.tsx`.

### 4. Phase 131 capabilities registered
Added 6 missing scheduling capabilities to `config/capabilities.json`:
`scheduling.lifecycle.read`, `scheduling.lifecycle.transition`,
`scheduling.appointments.cprs`, `scheduling.referenceData`, `scheduling.posture`.

### 5. Phase-index gate fix
Phase 131 was listed as a duplicate in the phase-index-gate. Added to KNOWN_DUPES
(99-PHASE-131-132-VERIFY folder also extracts phase ID 131).

## Scheduling Endpoint Verification (VistA UP)

| Endpoint | Result |
|----------|--------|
| GET /scheduling/health | ok:true, adapter=vista-rpc-sdoe-phase131 |
| GET /scheduling/clinics | ok:true, data:[] (sandbox empty) |
| GET /scheduling/providers | ok:true, data:[] (sandbox empty) |
| GET /scheduling/appointments?dfn=3 | ok:true, data:[] |
| GET /scheduling/appointments/cprs?dfn=3 | ok:true, data:[] |
| GET /scheduling/slots | ok:false, pending (SDEC not installed) |
| GET /scheduling/reference-data | ok:true, pending (M FUNCTIONs empty) |
| GET /scheduling/posture | ok:true, 18 RPCs: 10 avail, 5 callable, 3 not installed |
| GET /scheduling/lifecycle | ok:true, PG-backed |
| POST /scheduling/lifecycle/transition | ok:true, persists to PG |
| GET /scheduling/waitlist | ok:true, 0 entries |

## Postgres Persistence Verified
- Created lifecycle entry (PERSIST-TEST-131A)
- Restarted API server
- Read back entry -- persisted across restart

## Gauntlet RC
12 PASS, 0 FAIL, 1 WARN (pre-existing secret scan)

## Regression Check
All existing endpoints verified: health, allergies, problems, meds, vitals,
notes, labs, RCM, imaging audit, capabilities -- no regressions.
