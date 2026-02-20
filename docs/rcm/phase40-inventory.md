# Phase 40 — RCM Inventory (Step A)

**Date:** 2026-02-20

## 1. Existing Billing/Claims Code

### Domain Layer (`apps/api/src/rcm/domain/`)
| File | Purpose |
|------|---------|
| claim.ts | Claim entity (40+ fields), 10-state FSM, `createDraftClaim()`, `transitionClaim()` |
| claim-store.ts | In-memory claim + remittance store with CRUD + stats |
| payer.ts | Payer entity, IntegrationMode (6 modes), PayerFilter, `matchesPayer()` |
| remit.ts | Remittance/EOB types: RemitStatus, RemitAdjustment, RemitServiceLine |

### EDI Layer (`apps/api/src/rcm/edi/`)
| File | Purpose |
|------|---------|
| types.ts (347 lines) | All X12 transaction set types (837P/I, 835, 270-278, 999/997/TA1), PipelineEntry, 10 pipeline stages |
| pipeline.ts | EDI pipeline orchestration, `buildClaim837FromDomain()`, `buildEligibilityInquiry270()`, `buildClaimStatusInquiry276()` |
| x12-serializer.ts (401 lines) | X12 5010 wire format: `serialize837()`, `serialize270()`, `exportX12Bundle()` |
| ph-eclaims-serializer.ts | PhilHealth CF1-CF4 bundle generator: `buildPhilHealthBundle()` |

### Connectors (`apps/api/src/rcm/connectors/`)
| File | Purpose |
|------|---------|
| types.ts | RcmConnector interface, ConnectorResult, registry (register/get/list) |
| clearinghouse-connector.ts | US EDI clearinghouse (X12 5010), 12 tx sets |
| philhealth-connector.ts | PhilHealth eClaims, government_portal mode |
| sandbox-connector.ts | Simulated transport for dev/testing, all modes/tx sets |
| portal-batch-connector.ts | HMO portal/batch upload |

### Validation (`apps/api/src/rcm/validation/`)
| File | Purpose |
|------|---------|
| engine.ts (523 lines) | 18+ validation rules across 6 categories (syntax, code_set, business_rule, timely_filing, payer_specific, authorization) |

### Payer Registry (`apps/api/src/rcm/payer-registry/`)
| File | Purpose |
|------|---------|
| registry.ts | In-memory payer catalog, loads from `data/payers/*.json` |

### Audit (`apps/api/src/rcm/audit/`)
| File | Purpose |
|------|---------|
| rcm-audit.ts | Hash-chained PHI-safe audit trail, 30 action types, max 20K entries |

### Routes
| File | Endpoint Count |
|------|---------------|
| rcm-routes.ts (740 lines) | ~28 endpoints under /rcm/* |
| vista-rcm.ts | 7 endpoints under /vista/rcm/* (3 LIVE, 3 INTEGRATION-PENDING, 1 capability map) |

### Data Files
| File | Content |
|------|---------|
| data/payers/us_core.json | 12 US payers (Medicare A/B, Medicaid, TRICARE, CHAMPVA, BCBS, UHC, Aetna, Cigna, Humana, Kaiser, Workers Comp) |
| data/payers/ph_hmos.json | 15 PH payers (PhilHealth + 14 HMOs) |
| data/vista/capability-map-billing.json | Machine-readable VistA billing capability map |

### VistA M Routines
| File | Purpose |
|------|---------|
| services/vista/ZVEBILP.m | VistA billing probe (IB/PRCA/PCE globals) |
| services/vista/ZVEBILR.m | VistA billing RPC probe (85 RPCs found) |

### UI
| File | Purpose |
|------|---------|
| apps/web/src/app/cprs/admin/rcm/page.tsx (677 lines) | 5 tabs: Claims, Payers, Connectors, VistA Billing, Audit |

## 2. VistA IB/Encounter/Charge RPCs Already Discovered

**85 billing-related RPCs** catalogued in ZVEBILR.m:
- ORWPCE (55 RPCs) — PCE encounter data, visit coding, diagnosis, procedure
- IBD (12 RPCs) — Insurance/billing definitions
- IBCN (2 RPCs) — Insurance company data
- IBARXM (3 RPCs) — Pharmacy billing
- SD W/L (14 RPCs) — Scheduling/wait list
- IBO/DGBT (2 RPCs) — Billing/outpatient
- 3 LIVE in /vista/rcm/*: ORWPCE VISIT (encounters), IBCN INSURANCE QUERY (insurance), ORWPCE4 LEX (ICD search)

## 3. Auth/Session and Audit
- Session: httpOnly cookies, `requireSession()` in route handlers
- Auth rules: `/rcm/` routes caught by session catch-all in security.ts
- Admin routes: `requireRole(session, 'admin')` for sensitive ops
- RCM audit: separate hash-chained trail (rcm-audit.ts), PHI sanitized
- General audit: immutable-audit.ts (separate chain)
- Imaging audit: imaging-audit.ts (separate chain)

## 4. Identified Gaps for Superseding Phase 40

| Gap | Description |
|-----|-------------|
| PH HMO expansion | Only 14 of 27 Insurance Commission HMOs seeded |
| AU/SG/NZ payers | No data files for these jurisdictions |
| OfficeAlly connector | No dedicated connector (covered by generic clearinghouse) |
| Availity connector | No dedicated connector |
| Stedi connector | No dedicated connector |
| VistA binding points | No `vistaBindings/` module for building claims from VistA encounters |
| Job queue abstraction | No formal job queue interface (in-memory or pluggable) |
| PayerCatalogImporter | CSV import exists in routes but no formal interface |
| ConnectorCapability matrix | No explicit capability matrix type |
| 999/277CA ack tracking | Pipeline has stages but no explicit ack tracking on Claim entity |

## 5. Module Placement

New code goes into existing `apps/api/src/rcm/` tree:
- `apps/api/src/rcm/connectors/` — New connectors (officeally, availity, stedi)
- `apps/api/src/rcm/vistaBindings/` — VistA encounter → claim mapping
- `apps/api/src/rcm/jobs/` — Job queue abstraction
- `apps/api/src/rcm/importers/` — PayerCatalogImporter interface + CSV/JSON importers
- `data/payers/au_core.json` — Australian payers
- `data/payers/sg_core.json` — Singapore payers  
- `data/payers/nz_core.json` — New Zealand payers
- `data/payers/ph_hmos.json` — Expanded to 27+ HMOs
