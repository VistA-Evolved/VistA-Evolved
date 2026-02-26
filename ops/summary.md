# Phase 139 — Scheduling Lifecycle + Clinic Resources + Portal Integration

## What Changed

### New API Endpoints (6)
- POST `/scheduling/appointments/:id/checkin` -- lifecycle transition to checked_in
- POST `/scheduling/appointments/:id/checkout` -- lifecycle transition to completed
- POST `/scheduling/requests/:id/approve` -- admin approve scheduling request
- POST `/scheduling/requests/:id/reject` -- admin reject scheduling request
- GET `/scheduling/clinic/:ien/preferences` -- read clinic scheduling config
- PUT `/scheduling/clinic/:ien/preferences` -- upsert clinic scheduling config

### Data Model
- **PG migration v16**: `clinic_preferences` table (tenant_id, clinic_ien, timezone, slot_duration, etc.)
- **RLS**: `clinic_preferences` added to `applyRlsPolicies()` tenant tables
- **pg-clinic-preferences-repo.ts**: New CRUD repo for clinic preferences

### Audit + Capabilities
- **immutable-audit.ts**: +5 actions (scheduling.checkin/checkout/approve/reject/clinic_preferences)
- **capabilities.json**: +5 capabilities (scheduling.checkin/checkout/request.approve/reject/clinic.preferences)

### UI Enhancement
- **Admin scheduling page**: Approve/Reject buttons in Request Queue, Check In/Out in Lifecycle
- **Portal appointments**: New status colors (booked, checked_in, approved, rejected), check-in notification

### Tooling
- **scripts/vista/inventory-scheduling.mjs**: Read-only scheduling RPC/capability inventory

## How to Test Manually

```bash
curl -X POST http://localhost:3001/scheduling/appointments/test-1/checkin \
  -H 'Content-Type: application/json' -b cookies.txt \
  -d '{"patientDfn":"3","clinicName":"Primary Care"}'

curl http://localhost:3001/scheduling/clinic/44/preferences -b cookies.txt
```

## Follow-ups
- Wire SDOE UPDATE ENCOUNTER for real VistA check-in/check-out writeback
- Migrate in-memory request store to full PG-backed request queue
- Add scheduling notification hooks (email/SMS on approve/reject)
- Clinic preferences: operating hours builder UI