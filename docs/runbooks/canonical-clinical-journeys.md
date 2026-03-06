# Canonical Clinical Journeys

## Purpose

This file defines the canonical route family and current truth status for the
highest-value clinician journeys. Use it when removing duplicate UI/API paths.

## Journeys

### Patient Search

- UI: `apps/web/src/app/cprs/`
- API: `/vista/default-patient-list`, `/vista/patients/search`
- Source of truth: VistA RPCs through `safeCallRpc`
- Status: real

### Problems

- UI consumer: CPRS data cache and clinical panels
- Canonical API: `/vista/problems`
- Current RPC: `ORQQPL PROBLEM LIST`
- Status: real
- Note: this route was converged away from `ORWCH PROBLEM LIST` because that
  path returned empty data in live VEHU verification.

### Orders Sign

- UI: `OrdersPanel`
- Canonical API: `/vista/cprs/orders/sign`
- Guardrails:
  - session required
  - CSRF required
  - idempotency supported
  - missing `esCode` returns structured blocker, not fake success
- Status: real blocker path verified; full clinical signing still depends on a
  valid VistA electronic signature code.

### Module / Capability Status

- Admin API: `/api/modules/status`
- Canonical behavior:
  - use PG entitlements when tenant rows exist
  - otherwise fall back to SKU defaults
- Status: real

### Medications

- UI currently still has compatibility-era fetch paths that need deeper
  convergence review.
- Status: partial

### Notes, Labs, Scheduling, Imaging, Portal Messaging

- These remain mixed maturity areas with real route families present, but they
  still need the same route-family convergence treatment that was started for
  Problems and Orders.
- Status: partial

## Verification Command

- `pnpm qa:runtime-truth`

Use the generated artifact to confirm the current live behavior before changing
client fetch paths or deprecating compatibility routes.
