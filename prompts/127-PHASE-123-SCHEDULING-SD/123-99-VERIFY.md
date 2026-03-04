# Phase 123 — VERIFY: SCHEDULING SD\* INTEGRATION PACK

## Verification Gates

### G1: RPC Registry Consistency

- All scheduling RPCs in RPC_REGISTRY or RPC_EXCEPTIONS
- No unregistered RPCs in scheduling adapter code
- New RPCs: SDOE GET GENERAL DATA, SDOE GET PROVIDERS, SDOE GET DIAGNOSES,
  SD W/L CREATE FILE, SD W/L RETRIVE FULL DATA

### G2: TypeScript Clean

- `pnpm -C apps/api exec tsc --noEmit` — 0 errors
- `pnpm -C apps/web exec tsc --noEmit` — 0 errors
- `pnpm -C apps/portal exec tsc --noEmit` — 0 errors

### G3: Route Inventory

- All new endpoints respond to requests
- GET /scheduling/encounters/:ien/detail — returns encounter or empty-state
- GET /scheduling/encounters/:ien/providers — returns providers or empty-state
- GET /scheduling/waitlist — returns waitlist entries or empty-state
- All responses include vistaGrounding metadata

### G4: Write Path Verification

- POST /scheduling/appointments/request attempts SD W/L CREATE FILE
- Graceful fallback to in-memory if RPC unavailable
- Response indicates which path was used

### G5: Capability Config

- config/capabilities.json updated for scheduling capabilities
- scheduling.appointments.create status updated
- scheduling.waitlist.read added
- scheduling.encounter.detail added

### G6: Interface Contract

- SchedulingAdapter interface updated with new methods
- Vista adapter implements all methods
- Stub adapter has matching stubs

### G7: Empty-State Handling

- Every read endpoint returns structured empty-state when no data
- No 500 errors on empty VistA responses
- Error messages identify target RPC + VistA package

## Manual Test Commands

```bash
# Health check
curl http://127.0.0.1:3001/scheduling/health

# Clinics (read, live)
curl -b cookies.txt http://127.0.0.1:3001/scheduling/clinics

# Providers (read, live)
curl -b cookies.txt http://127.0.0.1:3001/scheduling/providers

# Encounter detail (new)
curl -b cookies.txt http://127.0.0.1:3001/scheduling/encounters/1/detail

# Waitlist (new)
curl -b cookies.txt http://127.0.0.1:3001/scheduling/waitlist
```
