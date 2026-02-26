# Phase 139 — VERIFY: Scheduling Lifecycle + Clinic Resources + Portal Integration

## Verification Gates

### Gate 1 — TypeScript Build
- `pnpm -C apps/api exec tsc --noEmit` exits 0
- `pnpm -C apps/web exec next build` exits 0

### Gate 2 — Vitest
- All existing tests PASS

### Gate 3 — Immutable Audit Actions
- scheduling.checkin, scheduling.checkout, scheduling.approve, scheduling.reject, scheduling.clinic_preferences in type union

### Gate 4 — PG Migration v16
- clinic_preferences table created with tenant_id, RLS-ready

### Gate 5 — New API Endpoints
- POST /scheduling/appointments/:id/checkin returns lifecycle transition
- POST /scheduling/appointments/:id/checkout returns lifecycle transition
- POST /scheduling/requests/:id/approve returns updated request
- POST /scheduling/requests/:id/reject returns updated request
- GET /scheduling/clinic/:ien/preferences returns clinic config
- PUT /scheduling/clinic/:ien/preferences returns updated config

### Gate 6 — Capabilities
- 5 new scheduling capabilities in capabilities.json

### Gate 7 — Admin UI Actions
- Request Queue tab has approve/reject buttons
- Check-in action available in lifecycle view

### Gate 8 — Portal Appointments
- Real VistA data shown when available, pending label when not

### Gate 9 — Gauntlet
- FAST: 4+ PASS, 0 FAIL
- RC: 15+ PASS, 0 FAIL
