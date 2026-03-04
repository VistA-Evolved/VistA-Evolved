# Phase 65 — Immunizations v1 (VistA-First) + Portal View

## Mission

Close the portal-plan immunizations gap by implementing real immunization history
using VistA's existing ORQQPX IMMUN LIST RPC. Add support via PX SAVE DATA only
if safe and available in the sandbox.

## Steps

1. Inventory existing code and Vivian RPCs (artifact only)
2. Build immu-plan.json from Vivian + live catalog
3. Register immunization RPCs in rpcRegistry.ts
4. Create GET /vista/immunizations?dfn=X endpoint
5. Create POST /vista/immunizations?dfn=X (add, if supported)
6. Add ImmunizationsPanel.tsx to clinician CPRS
7. Add /portal/dashboard/immunizations page
8. Register actions in actionRegistry.ts
9. Add capability entries in config/capabilities.json
10. Wire portal-pdf immunization formatter to real data

## Verification

- See 71-99-VERIFY.md
