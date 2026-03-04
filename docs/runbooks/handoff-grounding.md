# Shift Handoff -- VistA Grounding Document

## CRHD Package (Shift Handoff Tool)

The Clinical Reminders Handoff/Discharge (CRHD) package provides 58 RPCs
for structured shift handoff in VistA. **None are installed in the
WorldVistA Docker sandbox.**

### Key CRHD RPCs (Migration Targets)

| RPC Name              | Purpose                       |
| --------------------- | ----------------------------- |
| CRHD HANDOFF SAVE     | Save handoff document         |
| CRHD HANDOFF GET      | Retrieve handoff document     |
| CRHD HANDOFF SUBMIT   | Submit handoff for acceptance |
| CRHD HANDOFF ACCEPT   | Accept submitted handoff      |
| CRHD HANDOFF LIST     | List handoffs by ward/date    |
| CRHD HANDOFF DELETE   | Delete draft handoff          |
| CRHD GET PATIENT INFO | Get patient clinical summary  |
| CRHD GET TEAM INFO    | Get care team members         |
| CRHD GET WARD LIST    | List wards for handoff        |

### CRHD Data Model

CRHD uses TIU DOCUMENT CLASS for persistence:

- SBAR fields map to structured TIU note sections
- Risk flags map to Clinical Reminders
- Todos map to Orders (consult/procedure)
- Handoff status stored in custom CRHD subtree

## Currently Used VistA RPCs

These RPCs are available in the sandbox and provide ward patient data:

| RPC Name            | File/Global   | Purpose               |
| ------------------- | ------------- | --------------------- |
| ORQPT WARD PATIENTS | ^DPT (File 2) | List patients on ward |
| ORWPS ACTIVE        | ^PS(55)       | Active medications    |
| ORQQAL LIST         | ^GMR(120.8)   | Allergy list          |

## In-Memory Store Design

Current implementation uses `Map<string, HandoffReport>` with:

- UUID-based report IDs
- 4-state lifecycle: draft -> submitted -> accepted -> archived
- Per-patient SBAR notes, risk flags, and todos
- Creator/acceptor DUZ tracking
- Timestamps for all state transitions

### Migration Plan (4 Steps)

1. **Install CRHD**: Deploy CRHD KIDS build to VistA instance
2. **Wire RPCs**: Replace store CRUD with CRHD RPC calls
3. **Map fields**: SBAR -> TIU sections, flags -> reminders, todos -> orders
4. **Preserve API**: Keep REST endpoints identical; only backend changes

## VistA File References

| File Number | Name                    | Usage                           |
| ----------- | ----------------------- | ------------------------------- |
| 2           | PATIENT                 | Patient demographics            |
| 55          | PHARMACY PATIENT        | Active medications              |
| 120.8       | ADVERSE REACTION        | Allergy/adverse reaction list   |
| 8925        | TIU DOCUMENT            | Clinical notes (CRHD target)    |
| 8925.1      | TIU DOCUMENT DEFINITION | Document class definitions      |
| 811.9       | REMINDER DEFINITION     | Clinical reminders (risk flags) |

## Integration-Pending Responses

All API endpoints include:

```json
{
  "pendingTargets": [
    "CRHD HANDOFF SAVE",
    "CRHD HANDOFF GET",
    "CRHD HANDOFF SUBMIT",
    "CRHD HANDOFF ACCEPT",
    "TIU CREATE RECORD"
  ],
  "vistaGrounding": {
    "package": "CRHD (Clinical Reminders Handoff/Discharge)",
    "availableInSandbox": false,
    "rpcCount": 58,
    "installedCount": 0,
    "migrationNotes": "CRHD KIDS build required..."
  }
}
```

This ensures no silent no-ops -- every response declares what VistA targets
will be used when CRHD is available.
