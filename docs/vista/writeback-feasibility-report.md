# VistA Write-Back Feasibility Report

> **Phase 427 (W26 P5) -- Generated from safe-harbor-v2.json + runtime matrix + codebase audit**
>
> This report is the gateway document for W27 (Inpatient/Pharmacy/Lab Deep Writeback).
> It grades every clinical domain by write-back readiness and identifies specific
> blockers that must be resolved before production write-back is enabled.

---

## Executive Summary

| Category | Count | Domains |
|----------|-------|---------|
| **READY** | 4 | Allergies, Vitals, Notes/TIU, Messaging |
| **PARTIAL** | 6 | Orders/CPOE, Problems, Medications, Labs, Scheduling, Consults |
| **BLOCKED** | 2 | Billing/RCM (IB/AR empty), Imaging (no native VistA write RPCs) |

**18 write RPCs** classified across 5 safety tiers (safe-harbor-v2.json).
**4 domains fully ready** for production write-back today.
**ClinicalEngineAdapter has zero write methods** -- all writes bypass the adapter layer.

---

## Domain-by-Domain Assessment

### 1. Allergies -- READY

| Aspect | Detail |
|--------|--------|
| Write RPCs | `ORWDAL32 SAVE ALLERGY` |
| Safety Tier | safe-harbor |
| Sandbox Tested | Yes (Phase 9) |
| Adapter Write | None -- route-direct via `safeCallRpcWithList` |
| Route Endpoint | `POST /vista/cprs/allergies/add` |
| Prerequisites | `ORWDAL32 ALLERGY MATCH` (reactant search) |
| Blockers | None |
| Notes | All 6 OREDITED fields mandatory. GMRAGNT format: `NAME^IEN;file_root`. BUG-007 fixed. |

### 2. Vitals -- READY

| Aspect | Detail |
|--------|--------|
| Write RPCs | `GMV ADD VM` |
| Safety Tier | safe-harbor |
| Sandbox Tested | Yes (Phase 8) |
| Adapter Write | None -- route-direct via `safeCallRpc` |
| Route Endpoint | `POST /vista/cprs/vitals/add` |
| Blockers | None |
| Notes | Date format: `YYYMMDD.HHMMSS` (FileMan). Param string is semicolon-delimited. |

### 3. Notes / TIU -- READY

| Aspect | Detail |
|--------|--------|
| Write RPCs | `TIU CREATE RECORD`, `TIU SET RECORD TEXT`, `TIU SET DOCUMENT TEXT`, `TIU SIGN RECORD`, `TIU LOCK/UNLOCK RECORD`, `TIU CREATE ADDENDUM RECORD` |
| Safety Tier | safe-harbor (CREATE, SET TEXT); supervised (SIGN, LOCK) |
| Sandbox Tested | Yes (Phase 60) -- full lifecycle |
| Adapter Write | None -- route-direct |
| Route Endpoints | `POST /vista/cprs/notes/create`, `POST /vista/cprs/notes/sign`, `POST /vista/cprs/notes/addendum`, `POST /vista/nursing/notes/create` |
| Blockers | None |
| Notes | Unsigned notes remain DRAFT until clinician signs (BUG-030/033). LOCK required before sign. DB-backed idempotency (Phase 154). |

### 4. Messaging (MailMan) -- READY

| Aspect | Detail |
|--------|--------|
| Write RPCs | `ZVE MAIL SEND`, `ZVE MAIL MANAGE` |
| Safety Tier | safe-harbor (custom VE RPCs) |
| Sandbox Tested | Yes |
| Adapter Write | Yes -- `MessagingAdapter.sendMessage()` |
| Blockers | Requires `install-vista-routines.ps1` provisioning |
| Notes | Only domain with adapter write support today. Custom ZVEMSGR.m routine. |

### 5. Orders / CPOE -- PARTIAL

| Aspect | Detail |
|--------|--------|
| Write RPCs | `ORWDX SAVE`, `ORWDXA DC`, `ORWDXA FLAG`, `ORWDXA VERIFY`, `ORWOR1 SIG`, `ORWDX LOCK/UNLOCK`, `ORWDXC SAVECHK` |
| Safety Tier | supervised (SAVE/DC/FLAG/VERIFY/SIG); infrastructure (LOCK/UNLOCK) |
| Sandbox Tested | All yes |
| Adapter Write | None -- route-direct |
| Route Endpoints | 9 POST routes in `orders-cpoe.ts` and `wave2-routes.ts` |
| Blockers | Requires LOCK/UNLOCK bracket (BUG-029). Unsigned orders invisible to standard read RPCs (BUG-030/033). esCode hashed in audit (Phase 154). |
| Gap | Needs clinical oversight workflow before production. Sign endpoint returns structured blockers. |

### 6. Problems -- PARTIAL

| Aspect | Detail |
|--------|--------|
| Write RPCs | `ORQQPL ADD SAVE` (add), `ORQQPL EDIT SAVE` (edit) |
| Safety Tier | ADD = safe-harbor; EDIT = **blocked** |
| Sandbox Tested | ADD: yes; EDIT: no -- genuinely absent from WorldVistA Docker |
| Adapter Write | None -- route-direct |
| Route Endpoints | `POST /vista/cprs/problems/add`, `POST /vista/cprs/problems/edit` |
| Blockers | `ORQQPL EDIT SAVE` returns "doesn't exist" in sandbox. Edit requires production VistA. |
| Gap | Problem editing blocked. ADD is safe-harbor ready. |

### 7. Medications -- PARTIAL

| Aspect | Detail |
|--------|--------|
| Write RPCs | `ORWDXM AUTOACK` (quick-order med auto-acknowledge) |
| Safety Tier | experimental |
| Sandbox Tested | Yes, but output not fully validated |
| Adapter Write | None -- route-direct |
| Route Endpoints | `POST /vista/cprs/meds/quick-order` |
| Blockers | MAR/eMAR RPCs absent from sandbox: `PSB MED LOG`, `PSB ALLERGY`, `PSJBCMA`. Full medication management (administration, reconciliation) requires PSB/BCMA package. |
| Gap | Quick-order works experimentally. Full inpatient pharmacy workflow blocked without PSB. |

### 8. Labs -- PARTIAL

| Aspect | Detail |
|--------|--------|
| Write RPCs | `ORWLRR ACK` (acknowledge lab result) |
| Safety Tier | supervised |
| Sandbox Tested | Yes |
| Adapter Write | None -- route-direct |
| Route Endpoint | `POST /vista/cprs/labs/ack` |
| Blockers | ACK is low-risk (marks result as seen). Lab ORDER write goes via ORWDX SAVE (orders domain). No direct lab-specific write RPCs beyond ack. |
| Gap | Lab result write-back (new results from LIS) requires HL7 inbound path, not RPC. |

### 9. Imaging -- PARTIAL

| Aspect | Detail |
|--------|--------|
| Write RPCs | None direct. Imaging orders via `ORWDX SAVE`/`ORWDXM AUTOACK` (orders domain). |
| Adapter Write | `ImagingAdapter` is DICOMweb/Orthanc focused, not VistA imaging write. |
| Blockers | VistA Radiology RPCs (`ORWDXR NEW ORDER`, `RAD/NUC MED REGISTER`) not in sandbox. In-memory worklist (Phase 23) with documented 4-step migration plan. |
| Gap | Imaging orders work via CPOE. Direct VistA Imaging file writes blocked. |

### 10. Scheduling -- PARTIAL

| Aspect | Detail |
|--------|--------|
| Write RPCs | `SD W/L CREATE FILE`, `SDVW MAKE APPT API APP`, `SDES CREATE APPOINTMENTS`, `SDES CANCEL APPOINTMENT 2`, `SDES CHECKIN`, `SDES CHECKOUT` |
| Sandbox Tested | `SD W/L CREATE FILE`: attempted. SDES: installed but need `ZVESDSEED.m` for data. |
| Adapter Write | Yes -- `SchedulingAdapter.createAppointment()`, `cancelAppointment()` |
| Route Endpoints | 7 POST routes in `scheduling/` |
| Blockers | 80+ SDES RPCs callable but return empty without clinic/slot seeding. `getSchedulingMode()` returns `sdes_partial` or `request_only`. |
| Gap | Wait-list writes work. Direct booking pending SDES data validation. |

### 11. Consults -- PARTIAL

| Aspect | Detail |
|--------|--------|
| Write RPCs | `ORQQCN2 MED RESULTS` |
| Safety Tier | experimental |
| Sandbox Tested | Yes, but consult data sparse |
| Adapter Write | None -- route-direct |
| Route Endpoint | `POST /vista/cprs/consults/complete` |
| Blockers | Consult data sparse in sandbox. Consult orders also go through ORWDX SAVE. |
| Gap | RPC works but limited by sandbox data availability. |

### 12. Billing / RCM -- BLOCKED

| Aspect | Detail |
|--------|--------|
| Write RPCs | `ORWPCE SAVE` (encounter/PCE write-back only) |
| Safety Tier | supervised |
| Sandbox Tested | PCE: yes. IB/AR: no -- globals empty. |
| Adapter Write | `BillingAdapter.submitClaim()` and `getEligibility()` both return stub/pending. |
| Route Endpoints | Read-only VistA: `/vista/rcm/encounters`, `/vista/rcm/insurance`. Write-pending: charges, claims-status, ar-status. |
| Blockers | IB/PRCA/AR subsystems empty in sandbox: `^IB(350)=0`, `^DGCR(399)=0`, `^PRCA(430)=0`. 85 billing RPCs callable but return empty. `CLAIM_SUBMISSION_ENABLED=false` default. |
| Gap | External RCM pipeline functional (X12/PhilHealth) but decoupled from VistA. Native billing write-back requires populated IB subsystem. |

---

## Cross-Cutting Findings

### 1. Adapter Layer Gap

The `ClinicalEngineAdapter` interface has **zero write methods**. All clinical
domain writes (allergies, vitals, notes, problems, orders, labs) bypass the
adapter layer entirely and call `safeCallRpc` directly from route handlers.

**Recommendation**: W27 should add write methods to the adapter
interface so that stub adapters can simulate writes in non-VistA environments,
and so that the adapter layer provides a uniform write boundary.

### 2. LOCK/UNLOCK Discipline

Any route that writes orders, signs documents, or modifies clinical data
requiring VistA record-level locking MUST bracket with `ORWDX LOCK` /
`ORWDX UNLOCK`. Forgetting UNLOCK leaves the patient locked for other
providers (BUG-029).

### 3. Unsigned Record Visibility

Unsigned orders and notes do not appear in standard read RPCs (BUG-030/033).
Write-back implementations must query both signed and unsigned contexts and
merge results for complete display.

### 4. Idempotency

All CPRS write routes now use DB-backed idempotency (Phase 154) via the
`idempotency_key` PG table. New write routes added in W27 must use
`idempotencyGuard()` middleware.

### 5. Production Safety Guards

| Guard | Default | Override |
|-------|---------|----------|
| `CLAIM_SUBMISSION_ENABLED` | `false` | Export-only mode |
| X12 `usageIndicator` | `'T'` (test) | Requires explicit `'P'` |
| Demo claims | Permanently blocked | Cannot submit to real payers |
| `PLATFORM_RUNTIME_MODE` | `dev` | `rc`/`prod` require PG + OIDC |

### 6. Sandbox Limitations (WorldVistA Docker)

| Subsystem | Data Available | RPCs Callable |
|-----------|---------------|---------------|
| Allergies | Yes | Yes |
| Vitals | Yes | Yes |
| Orders | Yes (limited) | Yes |
| Problems | Yes | ADD only |
| Notes/TIU | Yes | Yes |
| Labs | Yes (read) | ACK only |
| Meds | Yes (read) | Quick-order only |
| Scheduling | Empty (needs seed) | 80+ installed |
| Imaging | Empty | Order via CPOE |
| Billing/RCM | Empty | 85 callable |
| Consults | Sparse | Yes |

---

## W27 Readiness Matrix

The following table maps W27 phases (431-438) to the domains they will target,
with pre-requisite status.

| W27 Phase | Target Domain | Pre-Req Status | Key Dependency |
|-----------|--------------|----------------|----------------|
| 431 | Inpatient ADT writes | PARTIAL | SDES + DGPM RPCs; seed required |
| 432 | Pharmacy/MAR write-back | BLOCKED (sandbox) | PSB/BCMA package absent |
| 433 | Lab result HL7 inbound | PARTIAL | LIS interface via HL7/HLO |
| 434 | Order-check enhancement | PARTIAL | ORWDXC SAVECHK + validation rules |
| 435 | Clinical adapter write methods | GAP | Add write methods to adapter interface |
| 436 | Write-back audit trail | READY | Extend immutable-audit.ts |
| 437 | Supervised-mode UI | READY | Clinical review before commit |
| 438 | W27 integrity audit | READY | Standard QA gates |

---

## Appendix: RPC Tier Distribution

Source: `data/vista/rpc-safe-harbor-v2.json`

| Tier | Count | RPCs |
|------|-------|------|
| safe-harbor | 7 | ORWDAL32 SAVE ALLERGY, GMV ADD VM, TIU CREATE RECORD, TIU SET RECORD TEXT, ORQQPL ADD SAVE, ZVE MAIL SEND, ZVE MAIL MANAGE |
| supervised | 6 | ORWDX SAVE, ORWDXA DC, ORWDXA FLAG, ORWDXA VERIFY, ORWOR1 SIG, ORWPCE SAVE |
| experimental | 2 | ORWDXM AUTOACK, ORQQCN2 MED RESULTS |
| blocked | 1 | ORQQPL EDIT SAVE |
| infrastructure | 2 | ORWDX LOCK, ORWDX UNLOCK |
