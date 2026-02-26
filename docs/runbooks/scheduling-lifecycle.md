# Scheduling Lifecycle + Clinic Resources + Portal (Phase 139)

> VistA-first scheduling lifecycle management with check-in/out, request
> triage, clinic preferences, and portal integration.

---

## Overview

Phase 139 adds six new scheduling endpoints and a clinic preferences table
on top of the existing Phases 63/123/131 scheduling infrastructure:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/scheduling/appointments/:id/checkin` | POST | Transition to `checked_in` |
| `/scheduling/appointments/:id/checkout` | POST | Transition to `completed` |
| `/scheduling/requests/:id/approve` | POST | Approve pending request |
| `/scheduling/requests/:id/reject` | POST | Reject pending request |
| `/scheduling/clinic/:ien/preferences` | GET | Read clinic scheduling config |
| `/scheduling/clinic/:ien/preferences` | PUT | Update clinic scheduling config |

Total scheduling endpoints: **25** (19 existing + 6 new).

---

## Prerequisites

- API running (`npx tsx --env-file=.env.local src/index.ts`)
- PostgreSQL configured (`PLATFORM_PG_URL` in `.env.local`)
- Migration v16 applied (auto-runs on startup)

---

## VistA Grounding

| Action | Target RPC | Sandbox Status |
|--------|-----------|----------------|
| Check-in | `SDOE UPDATE ENCOUNTER` | integration_pending |
| Check-out | `SDOE UPDATE ENCOUNTER` | integration_pending |
| Approve/Reject | N/A (local triage) | live |
| Clinic prefs | N/A (overlay config) | live |

Check-in and check-out record lifecycle transitions in Postgres. VistA
writeback via `SDOE UPDATE ENCOUNTER` is the migration target when moving
from sandbox to production. The lifecycle record includes
`vistaGrounding.status: "integration_pending"` in the response.

---

## Data Model

### clinic_preferences (PG migration v16)

```sql
CREATE TABLE IF NOT EXISTS clinic_preferences (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL DEFAULT 'default',
  clinic_ien    TEXT NOT NULL,
  clinic_name   TEXT NOT NULL,
  timezone      TEXT NOT NULL DEFAULT 'America/New_York',
  slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
  max_daily_slots       INTEGER NOT NULL DEFAULT 20,
  display_config TEXT,       -- JSON
  operating_hours TEXT,      -- JSON
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
```

RLS is enforced via `tenant_id` (added to `applyRlsPolicies()`).

---

## Lifecycle State Machine

```
requested -> waitlisted -> booked -> checked_in -> completed
                                  \-> cancelled
                                  \-> no_show
```

Valid transitions are enforced by `isValidTransition()` in
`pg-scheduling-lifecycle-repo.ts`. The check-in endpoint transitions
`booked -> checked_in`, and check-out transitions `checked_in -> completed`.

---

## Audit Actions (immutable-audit.ts)

| Action | Trigger |
|--------|---------|
| `scheduling.checkin` | POST checkin |
| `scheduling.checkout` | POST checkout |
| `scheduling.approve` | POST approve |
| `scheduling.reject` | POST reject |
| `scheduling.clinic_preferences` | PUT preferences |

---

## Capabilities (capabilities.json)

Five new entries added:
- `scheduling.checkin` (configured, targets SDOE UPDATE ENCOUNTER)
- `scheduling.checkout` (configured, targets SDOE UPDATE ENCOUNTER)
- `scheduling.request.approve` (live)
- `scheduling.request.reject` (live)
- `scheduling.clinic.preferences` (live)

---

## UI Changes

### Admin Scheduling Page (`apps/web/src/app/cprs/scheduling/page.tsx`)

- **Request Queue tab**: Approve / Reject buttons on pending requests
- **Lifecycle tab**: Check In / Check Out buttons on `booked` / `checked_in` entries
- Both columns render conditionally based on current state

### Portal Appointments Page (`apps/portal/src/app/dashboard/appointments/page.tsx`)

- Added status colors for `booked`, `checked_in`, `approved`, `rejected`
- Shows "You are checked in" message when status is `checked_in`
- Hides cancel/reschedule buttons when checked in or completed

---

## Manual Testing

```bash
# 1. Check-in
curl -X POST http://localhost:3001/scheduling/appointments/APT-001/checkin \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{"patientDfn":"3","clinicName":"Primary Care"}'

# 2. Check-out
curl -X POST http://localhost:3001/scheduling/appointments/APT-001/checkout \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{"patientDfn":"3","clinicName":"Primary Care"}'

# 3. Approve request
curl -X POST http://localhost:3001/scheduling/requests/REQ-001/approve \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{}'

# 4. Read clinic preferences
curl http://localhost:3001/scheduling/clinic/44/preferences \
  -b cookies.txt

# 5. Set clinic preferences
curl -X PUT http://localhost:3001/scheduling/clinic/44/preferences \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{"clinicName":"Primary Care","slotDurationMinutes":20,"maxDailySlots":30}'
```

---

## Files Changed

| File | Change |
|------|--------|
| `apps/api/src/routes/scheduling/index.ts` | +6 endpoints |
| `apps/api/src/platform/pg/pg-schema.ts` | +pgClinicPreferences |
| `apps/api/src/platform/pg/pg-migrate.ts` | +migration v16 + RLS |
| `apps/api/src/platform/pg/repo/pg-clinic-preferences-repo.ts` | New repo |
| `apps/api/src/lib/immutable-audit.ts` | +5 audit actions |
| `config/capabilities.json` | +5 capabilities |
| `apps/web/src/app/cprs/scheduling/page.tsx` | +approve/reject/checkin/checkout UI |
| `apps/portal/src/app/dashboard/appointments/page.tsx` | +lifecycle status display |
| `scripts/vista/inventory-scheduling.mjs` | New inventory script |
