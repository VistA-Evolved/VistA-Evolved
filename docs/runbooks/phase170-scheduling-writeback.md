# Phase 170 — Scheduling Writeback

## Overview

Enforces truth gates on all scheduling write operations. No appointment
is reported as "scheduled" to the UI unless VistA confirms via truth gate.

## Architecture

```
Staff Approve → status "approved" → Truth Gate → VistA confirms → "scheduled"
                                         ↓
                                  VistA NOT confirmed → stays "approved"
                                         ↓
                                  UI shows "approved", NEVER "scheduled"
```

## New Endpoints (Phase 170)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/scheduling/writeback/policy` | session | Current writeback policy |
| GET | `/scheduling/writeback/entries` | session | Tracked writeback entries |
| POST | `/scheduling/writeback/verify/:ref` | session | Enforce truth gate |
| GET | `/scheduling/writeback/readiness` | session | RPC availability for writeback |

## Scheduling Modes

| Mode | Description | VistA Write | Truth Gate |
|------|-------------|-------------|------------|
| `request_only` | Staff approval queue only | No | When available |
| `sdes_partial` | SDES installed, writeback not verified | No | Yes |
| `vista_direct` | Full SDES writeback | Yes | Mandatory |

## Status Contract

| Status | Meaning | UI Display |
|--------|---------|------------|
| `requested` | Patient submitted request | "Pending" |
| `pending_approval` | In staff queue | "Awaiting Approval" |
| `approved` | Staff approved, no VistA confirmation | "Approved" |
| `scheduled` | VistA confirmed (truth gate passed) | "Scheduled" |
| `failed` | Writeback attempt failed | "Error" |
| `integration_pending` | Infra not ready | "Integration Pending" |

**Critical Rule:** UI must **NEVER** display "scheduled" unless truth gate passed.

## VistA RPC Grounding

| RPC | Purpose | Status |
|-----|---------|--------|
| SDES GET APPT BY APPT IEN | Primary truth gate | Active (Phase 147) |
| SDOE LIST ENCOUNTERS FOR PAT | Fallback truth gate | Active |
| SDES CREATE APPOINTMENTS | Direct booking | Registered, not enabled |
| SDES CANCEL APPOINTMENT 2 | Cancel appointment | Registered, not enabled |
| SDES CHECKIN | Check-in | Registered, not enabled |
| SDES CHECKOUT | Check-out | Registered, not enabled |

## Data Stores

| Store | Type | Classification |
|-------|------|----------------|
| `writebackEntries` | `Map<string, WritebackEntry>` | critical |
| `cachedMode` | `SchedulingMode \| null` | cache (60s TTL) |

## Testing

```powershell
# Login
$r = Invoke-WebRequest -Uri http://127.0.0.1:3001/auth/login -Method POST `
  -ContentType "application/json" `
  -Body '{"accessCode":"PROV123","verifyCode":"PROV123!!"}' `
  -SessionVariable s -UseBasicParsing

# Check writeback policy
Invoke-WebRequest -Uri http://127.0.0.1:3001/scheduling/writeback/policy `
  -WebSession $s -UseBasicParsing

# Check readiness
Invoke-WebRequest -Uri http://127.0.0.1:3001/scheduling/writeback/readiness `
  -WebSession $s -UseBasicParsing

# Enforce truth gate on an appointment ref
Invoke-WebRequest -Uri http://127.0.0.1:3001/scheduling/writeback/verify/12345 `
  -Method POST -ContentType "application/json" `
  -Body '{"patientDfn":"3"}' `
  -WebSession $s -UseBasicParsing
```

## Gauntlet Gate

G27 checks: guard module, writeback routes, truth gate enforcement,
VistA RPC grounding, status contract, store policy, scheduling index wiring, runbook.
