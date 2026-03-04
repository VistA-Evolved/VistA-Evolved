# Phase 97 — Top-5 HMO "LOA + Claim Packet + Portal Adapter Interface" (IMPLEMENT)

## User Request

Build enterprise-grade adapter interface for top-5 portal-capable PH HMOs
(Maxicare, MediCard, Intellicare, PhilCare, ValuCare). Includes LOA engine,
HMO claim packet builder, portal adapter interface (no credential storage),
and billing staff dashboard.

## Implementation Steps

### A) LOA Engine

- `apps/api/src/rcm/hmo-portal/loa-engine.ts` — Generate LOA request packets (PDF text, structured JSON, attachments)
- Specialty-aware templates by department
- Extends existing LoaRequest from Phase 94

### B) HMO Claim Packet

- `apps/api/src/rcm/hmo-portal/types.ts` — HmoClaimPacket, PortalAdapter interface, LOA packet types
- `apps/api/src/rcm/hmo-portal/hmo-packet-builder.ts` — Build HmoClaimPacket from existing Claim domain

### C) Portal Adapter Interface

- `apps/api/src/rcm/hmo-portal/portal-adapter.ts` — PortalAdapter base + manual-assisted mode
- `apps/api/src/rcm/hmo-portal/adapters/` — Per-HMO adapter stubs
- No credential storage — vaultRef pattern

### D) API Routes

- `apps/api/src/rcm/hmo-portal/hmo-portal-routes.ts` — Fastify plugin

### E) UI Dashboard

- `apps/web/src/app/cprs/admin/hmo-portal/page.tsx` — LOA queue, claim queue, status tracking, denials, exports

### F) Wiring

- Register in index.ts
- Add nav entry in layout.tsx

## Verification Steps

- `npx tsc --noEmit` in both apps
- Route wiring check
- No credential storage
- No fake success
- Compatible with Phase 94 LOA types and Phase 38 Claim domain

## Files Touched

- `apps/api/src/rcm/hmo-portal/types.ts` (new)
- `apps/api/src/rcm/hmo-portal/loa-engine.ts` (new)
- `apps/api/src/rcm/hmo-portal/hmo-packet-builder.ts` (new)
- `apps/api/src/rcm/hmo-portal/portal-adapter.ts` (new)
- `apps/api/src/rcm/hmo-portal/adapters/maxicare.ts` (new)
- `apps/api/src/rcm/hmo-portal/adapters/medicard.ts` (new)
- `apps/api/src/rcm/hmo-portal/adapters/intellicare.ts` (new)
- `apps/api/src/rcm/hmo-portal/adapters/philcare.ts` (new)
- `apps/api/src/rcm/hmo-portal/adapters/valucare.ts` (new)
- `apps/api/src/rcm/hmo-portal/hmo-portal-routes.ts` (new)
- `apps/web/src/app/cprs/admin/hmo-portal/page.tsx` (new)
- `apps/api/src/index.ts` (modified)
- `apps/web/src/app/cprs/admin/layout.tsx` (modified)
