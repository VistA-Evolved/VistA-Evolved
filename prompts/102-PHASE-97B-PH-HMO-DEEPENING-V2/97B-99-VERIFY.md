# Phase 97B — PH HMO Deepening Pack v2 (ALL IC HMOs) + LOA/Claim Packet Ops (VERIFY)

## Verification Gates

### Gate 1: TypeScript Compilation

- `npx tsc --noEmit` passes in `apps/api/`
- `npx tsc --noEmit` passes in `apps/web/` (via `next build`)

### Gate 2: Schema Integrity

- `payer` table has `payerType` column
- `STANDARD_CAPABILITY_KEYS` includes operational keys (>=15 keys)
- ph-hmo-registry.json has `payerType` for all 27 HMOs

### Gate 3: Adapter Manifest

- GET `/rcm/hmo/manifest` returns all 27 HMOs
- Each entry has: payerId, payerType, adapterStatus, capabilities
- Top-5 show adapterStatus = "portal_adapter_available"
- Others show adapterStatus = "manual_only"

### Gate 4: LOA Templates

- Per-HMO LOA template config exists for all 27 HMOs
- Templates include required fields and specialty rules
- LOA packet generation works for non-top-5 HMOs

### Gate 5: Claim Packet Config

- Per-HMO claim packet config exists for all 27 HMOs
- VistA-first field annotations present
- Claim packet generation works for non-top-5 HMOs

### Gate 6: Contracting Hub

- GET/POST/PATCH contracting task routes work
- Tasks persisted in SQLite via existing payerTask table
- Tasks scoped by payerId

### Gate 7: Market Dashboard

- GET `/rcm/hmo/market-summary` returns summary
- Includes: total HMOs, by payerType, by integration status, capability coverage

### Gate 8: UI Pages

- PH Market Dashboard page renders
- Contracting Hub page renders
- Nav entries present in admin layout

### Gate 9: QA Flows

- 16-hmo-adapter-manifest.json validates
- 17-contracting-hub.json validates

### Gate 10: No Regressions

- Existing verifiers pass (96B, 86, 95B)
- No new console.log statements
- No credential storage
- No fake success

## Verification Command

```powershell
cd apps/api; npx tsc --noEmit
cd apps/web; npx next build
```
