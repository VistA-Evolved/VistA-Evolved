# PH HMO Payer Documentation

This directory contains evidence-backed documentation for Philippine
HMO integrations in VistA-Evolved RCM.

## Files

| File | Description |
|------|-------------|
| [canonical-sources.md](canonical-sources.md) | Insurance Commission source references and evidence methodology |
| [payer-capabilities-schema.md](payer-capabilities-schema.md) | Schema documentation for the PH HMO registry capability model |

## Canonical Data Source

All 27 IC-licensed HMOs are sourced from:

**Insurance Commission of the Philippines**
- [List of HMOs with Certificate of Authority as of 31 December 2025](https://www.insurance.gov.ph/list-of-hmos-with-certificate-of-authority-as-of-31-december-2025/)

## Registry Location

- Canonical registry JSON: `data/payers/ph-hmo-registry.json`
- Lightweight seed (Phase 38): `data/payers/ph_hmos.json`
- TypeScript types + loader: `apps/api/src/rcm/payers/ph-hmo-registry.ts`
- Adapter (LOA/claim packets): `apps/api/src/rcm/payers/ph-hmo-adapter.ts`
- API routes: `apps/api/src/rcm/payers/ph-hmo-routes.ts`
- UI console: `apps/web/src/app/cprs/admin/ph-hmo-console/page.tsx`

## VistA-First Principle

All billing data is grounded in VistA IB/AR/PCE subsystems.
The PH HMO registry is orchestration metadata -- it helps billing
staff navigate HMO-specific workflows but does NOT replace VistA
as the authoritative billing ledger.
