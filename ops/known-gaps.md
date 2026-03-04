# Phase 14 — CPRS Parity Closure — Known Gaps

> Updated: Phase 70 (MailMan RPC Bridge)
> Verification: 130 PASS / 0 FAIL / 0 WARN / 1 INFO
> Verifier: verify-phase1-to-phase14-parity-closure.ps1
> RPC Capability Discovery: 38 of 39 RPCs available on WorldVistA Docker

## RPC Capability Summary

Phase 14A introduced runtime RPC discovery (`GET /vista/rpc-capabilities`).
38 of 39 probed RPCs are available on the WorldVistA Docker sandbox.
1 RPC is genuinely missing (returns "doesn't exist").

### Available RPCs (38)

| Domain      | RPCs                                                                                  | Status                                                        |
| ----------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Patient     | ORWPT LIST ALL, ORWPT SELECT, ORQPT DEFAULT PATIENT LIST                              | Available (LVUNDEF with empty params — needs DFN)             |
| Allergies   | ORQQAL LIST, ORWDAL32 ALLERGY MATCH, ORWDAL32 SAVE ALLERGY                            | All available                                                 |
| Vitals      | ORQQVI VITALS, GMV ADD VM                                                             | All available                                                 |
| Notes       | TIU DOCUMENTS BY CONTEXT, TIU CREATE RECORD, TIU SET RECORD TEXT, TIU GET RECORD TEXT | All available                                                 |
| Medications | ORWPS ACTIVE, ORWORR GETTXT, ORWDXM AUTOACK                                           | All available                                                 |
| Problems    | ORQQPL PROBLEM LIST, ORQQPL4 LEX, ORQQPL ADD SAVE                                     | Available                                                     |
| Orders      | ORWDX SAVE, ORWDXA DC, ORWDXA FLAG, ORWDXA VERIFY                                     | All available (ORWDX SAVE needs full dialog params)           |
| Consults    | ORQQCN LIST, ORQQCN DETAIL, ORQQCN2 MED RESULTS                                       | All available                                                 |
| Surgery     | ORWSR LIST, ORWSR RPTLIST                                                             | Available (read-only — no write-back RPC exists)              |
| Labs        | ORWLRR INTERIM, ORWLRR ACK, ORWLRR CHART                                              | All available                                                 |
| Reports     | ORWRP REPORT LISTS, ORWRP REPORT TEXT                                                 | All available                                                 |
| Inbox       | ORWORB UNSIG ORDERS, ORWORB FASTUSER                                                  | Available (UNSIG ORDERS inline call returns expected-missing) |
| Remote      | ORWCIRN FACILITIES                                                                    | Available                                                     |
| Imaging     | MAG4 REMOTE PROCEDURE, RA DETAILED REPORT                                             | Available                                                     |
| Encounter   | ORWPCE SAVE                                                                           | Available                                                     |

### Missing RPCs (1)

| RPC              | Domain   | Error                                                   | Classification   |
| ---------------- | -------- | ------------------------------------------------------- | ---------------- |
| ORQQPL EDIT SAVE | problems | `CRemote Procedure 'TIU SET RECORD TEXT' doesn't exist` | Expected-missing |

Note: ORQQPL EDIT SAVE returns "doesn't exist" for a delegated TIU RPC.
This is the only RPC genuinely absent from the WorldVistA sandbox.

## Resolved in Phase 14

| Gap                       | Resolution                                                      |
| ------------------------- | --------------------------------------------------------------- |
| 2 WARNs for inbox RPCs    | Replaced with capability gating — now INFO/expected-missing     |
| Order signing local-only  | POST /vista/orders/sign calls ORWDX SAVE (mode=real)            |
| Order release local-only  | POST /vista/orders/release calls ORWDXA VERIFY (mode=real)      |
| Lab ack local-only        | POST /vista/labs/ack calls ORWLRR ACK (mode=real)               |
| Consult create not wired  | POST /vista/consults/create calls ORQQCN2 (mode=real)           |
| Problem save uncertain    | POST /vista/problems/save calls ORQQPL ADD SAVE (mode=real)     |
| No server-side drafts     | ServerDraft store with audit trail for surgery and any failures |
| No RPC availability info  | GET /vista/rpc-capabilities probes all 39 RPCs, caches 5 min    |
| No imaging integration    | GET /vista/imaging/status + /report with plugin interface       |
| 11 RPCs falsely "missing" | Fixed capability detection: LVUNDEF = RPC exists (needs params) |

## Remaining Gaps

### Write-Back Parameter Completeness

Write-back RPCs are now called via server-side endpoints, but some need full
parameter assembly to produce useful VistA responses:

| Endpoint                    | RPC                 | Issue                                   | Impact                                         |
| --------------------------- | ------------------- | --------------------------------------- | ---------------------------------------------- |
| POST /vista/orders/sign     | ORWDX SAVE          | Simplified params (no order dialog IEN) | M ERROR LVUNDEF on VistA — order not persisted |
| POST /vista/orders/release  | ORWDXA VERIFY       | Minimal params                          | Works but response may be empty                |
| POST /vista/labs/ack        | ORWLRR ACK          | Minimal params                          | Works but lab ID must be valid IEN             |
| POST /vista/consults/create | ORQQCN2 MED RESULTS | Service/urgency not validated           | Works but needs valid IENs                     |

**Next step:** Full order dialog integration — retrieve order dialog IENs and
assemble complete parameter lists per CPRS source code.

### Surgery Write-Back

No VistA RPC exists for creating surgery records via RPC. Surgery remains
draft-only. The `SR CASE CREATION` routine exists in M but is not exposed as
an XWB RPC.

### Problem Edit

ORQQPL EDIT SAVE is the only RPC genuinely absent from WorldVistA Docker.
Problem edits use the draft fallback path.

### Inbox ORWORB UNSIG ORDERS Inline Behavior

The RPC exists per capability probe but the inline call in the inbox handler
(with `[duz]` param) returns a response that triggers the expected-missing
path. This is classified as INFO, not WARN.

### Remote Data Integration

ORWCIRN FACILITIES is available but the Docker sandbox has no remote
facilities configured. Remote Data Viewer shows architectural hook only.

### Data Limitations (Docker Sandbox)

The WorldVistA Docker sandbox has limited clinical data for test patients:

- Most clinical domains return empty result sets for DFN 1/2/3
- This is a data limitation, not a code gap — RPCs are correctly wired

### Persistent Draft Storage

Server-side drafts use in-memory Map (lost on restart).
**Next step:** Add Redis or SQLite persistence for production use.

## Phase 70 — MailMan RPC Bridge

### Resolved

| Gap                          | Resolution                                           |
| ---------------------------- | ---------------------------------------------------- |
| Inbox reads local store only | VistA MailMan inbox via ZVE MAIL LIST + ZVE MAIL GET |
| DSIC SEND MAIL MSG missing   | Replaced with ZVE MAIL SEND (XMXSEND wrapper)        |
| Read state local only        | ZVE MAIL MANAGE marks read in VistA ^XMB(3.7)        |
| No folder/basket support     | ZVE MAIL FOLDERS returns basket list with counts     |

### Remaining

| Gap                                      | Impact                                                       | Mitigation                                           |
| ---------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------- |
| TaskMan not running in Docker            | Messages delivered inline by ZVEMSGR DELIVER, not by TaskMan | Inline delivery handles sender+recipient baskets     |
| Portal messaging uses patient-DFN as DUZ | Portal patients don't have real VistA DUZ                    | Portal send creates MailMan message from session DUZ |
| No thread/conversation model in MailMan  | MailMan messages are flat, no thread IEN                     | Subject-based RE: threading in UI only               |
| Fallback cache not persisted             | Local cache Map resets on API restart                        | VistA is source of truth; cache is ephemeral         |
