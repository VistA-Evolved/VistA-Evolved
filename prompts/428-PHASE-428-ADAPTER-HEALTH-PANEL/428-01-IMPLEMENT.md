# Phase 428 -- Adapter Health Dashboard Panel (W26 P6)

## IMPLEMENT

### Goal

Add an admin dashboard panel showing adapter health, VistA runtime matrix,
and domain-level RPC coverage. Uses existing API endpoints (`/api/adapters/health`
and `/vista/runtime-matrix`) -- no new API routes needed.

### Steps

1. Create `apps/web/src/app/cprs/admin/adapters/page.tsx` with 3 tabs:
   - Adapter Health: per-adapter ok/error, implementation type, latency
   - Domain Matrix: read/write availability per clinical domain
   - RPC Coverage: filterable RPC list with available/missing status
2. Add "Adapter Health" nav entry in admin layout sidebar
3. Auto-refresh every 30s with manual refresh button

### Files Touched

- `apps/web/src/app/cprs/admin/adapters/page.tsx` (NEW)
- `apps/web/src/app/cprs/admin/layout.tsx` (MODIFIED -- nav entry)
- `prompts/428-PHASE-428-ADAPTER-HEALTH-PANEL/` (NEW)

### API Endpoints Consumed (pre-existing)

- `GET /api/adapters/health` -- adapter health checks (admin)
- `GET /vista/runtime-matrix` -- domain RPC availability (public)
