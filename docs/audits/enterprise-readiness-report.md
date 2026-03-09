# Enterprise Readiness Report

> Generated: 2026-03-09
> Status: Production-Ready with documented gaps

## Executive Summary

VistA Evolved is a full-stack TypeScript platform that modernizes VistA with
a React UI and Fastify API. After 721+ development phases, the system is
**substantially production-ready** across most domains. Three critical gaps
remain: SaaS tenant provisioning pipeline (now PG-backed), SaaS commercial
layer (marketing/Stripe), and clinical write RPC availability.

## 1. Working End-to-End (Proven)

### Clinical Workflows (25+ flows)
- Patient search, demographics, allergies (read/write), vitals (read/write)
- Problems, medications, notes (create/sign), labs, consults, surgery
- Orders (read/sign), reports, DC summaries, cover sheet
- Admin dashboard (29 parallel RPCs, 40+ KPIs)

### Admin Domains (12/12 complete)
- System Infrastructure, Facility Setup, Clinic Setup, Inpatient/Wards
- Pharmacy, Laboratory, Radiology, Billing/Revenue
- Inventory/IFCAP, Workforce, Quality/Compliance, Clinical App Setup
- Backed by 14 custom M routines, 68+ RPCs, 15 API route files, 14 UI pages

### Security Stack
- OIDC (Keycloak), RBAC (40 actions), ABAC, CSRF synchronizer tokens
- 3 hash-chained audit trails (general, imaging, RCM)
- PHI redaction (`sanitizeAuditDetail()`), envelope encryption
- SCIM 2.0, MFA framework, device fingerprinting
- Break-glass with patient-scoped time limits

### Revenue Cycle Management
- 9-state claim lifecycle FSM
- 8+ payer connectors (US, PH, AU, NZ, SG)
- X12 5010 serializer, PhilHealth eClaims 3.0
- 27 payer seed records across 7 data files
- Export-only safety mode by default

### Interoperability
- FHIR R4 gateway: 9 resources with US Core profiles
- HL7v2 engine: ADT, ORU, ORM, SIU message types
- HL7v2 -> FHIR R4 conversion bridge
- Bulk Data Access (NDJSON export/import)
- FHIR Subscriptions (rest-hook)

### Patient Portal
- 25+ pages, independent auth, kiosk mode
- Identity linking with staff-verified workflow
- Now PG-backed via `portal_patient_identity` table

### Module System
- 14 modules, 7 SKU profiles, 50+ capabilities
- DB-backed entitlements (Phase 109)
- Module guard middleware for route-level toggling

### Multi-Tenancy
- RLS on 100+ PG tables
- FORCE RLS in rc/prod mode
- Tenant-scoped session context
- 64 PG migrations

## 2. Fixed During This Audit

| Item | What Was Done |
| ---- | ------------- |
| README parameter mismatch | Changed `-Profile` to `-RuntimeLane` |
| Missing run-from-zero doc | Created `docs/runbooks/run-from-zero.md` |
| dev-up.ps1 optional services | Added `-IncludeImaging` and `-IncludeKeycloak` flags |
| local-vista-docker.md legacy-only | Updated to cover VEHU lane |
| verify-rc.ps1 missing lint gate | Added G07c ESLint gate |
| Missing `pnpm verify:all` | Added to package.json scripts |
| Provisioning in-memory only | Migrated to PG-backed with `tenant_catalog` table (v64) |
| Identity linking not persisted | Wired PG persistence for approved links |
| Missing ARCHITECTURE.md | Created comprehensive system overview |
| Missing ONBOARDING.md | Created new developer guide |

## 3. Remaining Gaps (Execution Plan)

### Critical (3)

1. **SaaS Tenant Provisioning Pipeline**
   - PG table created (v64), real provisioning steps implemented
   - Still needs: Docker-based VistA container allocation (set `PROVISIONING_MODE=docker`)
   - Effort: 1-2 sessions

2. **SaaS Commercial Layer**
   - No marketing site, Stripe integration, or self-service signup
   - ADR exists (`ADR-OSS-BILLING.md`) but no implementation
   - Effort: 3 sessions (marketing site + Stripe + signup wizard)

3. **Clinical Write RPCs**
   - 14 RPCs confirmed missing from VEHU File 8994
   - Problems (GMPL ADD SAVE), Lab orders (LR ORDER), eMAR (PSB MED LOG), ADT (DGPM)
   - Mitigation: All return `integration-pending` with exact VistA targets
   - Resolution: Install missing VistA packages or use production VistA instance

### Non-Critical (5)

4. **ONC Certification**: ~75% coverage; 5 blocking items documented
5. **Healthcare Facility Research**: Entity types defined but not validated against market
6. **Notion MCP Integration**: Not started; structure is Notion-friendly
7. **CDS Hooks**: Scaffold only
8. **C-CDA Export**: Parser exists; full export pipeline needed

## 4. Deliverables Produced

| Document | Location | Description |
| -------- | -------- | ----------- |
| Enterprise Readiness Report | `docs/audits/enterprise-readiness-report.md` | This document |
| VistA Brain Compliance | `docs/audits/vista-brain-compliance.md` | VistA usage audit |
| Reality Map | `docs/audits/reality-map.md` | UI->API->VistA wiring status |
| Certification Readiness | `docs/audits/certification-readiness.md` | ONC/MU gap analysis |
| RCM MVP Proof | `docs/audits/rcm-mvp-proof.md` | Revenue cycle capabilities |
| Interop MVP | `docs/architecture/interop-mvp.md` | FHIR/HL7 capabilities |
| Patient Identity Model | `docs/architecture/patient-identity.md` | Portal identity architecture |
| System Architecture | `docs/ARCHITECTURE.md` | Architecture overview |
| Developer Onboarding | `docs/ONBOARDING.md` | New team member guide |
| Run From Zero | `docs/runbooks/run-from-zero.md` | Cold start checklist |
| Prompts Playbook | `docs/prompts-playbook.md` | Prompt system guide |

## 5. Verification Commands

```powershell
# Full verification suite
pnpm verify:all

# Individual checks
pnpm lint:ci                           # ESLint
pnpm -C apps/api exec tsc --noEmit     # TypeScript API
pnpm -C apps/web exec tsc --noEmit     # TypeScript Web
pnpm qa:gauntlet:fast                  # QA gauntlet
pnpm verify:vista                      # VistA connectivity
.\scripts\verify-rc.ps1                # RC verification (15 gates)
```

## 6. Key Metrics

| Metric | Value |
| ------ | ----- |
| Total phases | 721+ |
| PG migrations | 64 |
| Registered RPCs | ~340 |
| Custom M routines | 14 |
| Admin domains | 12/12 |
| FHIR R4 resources | 9 |
| Payer seed records | 27 |
| RLS-protected tables | 100+ |
| Runbooks | 209 |
| Audit documents | 6 |
| API routes | 362+ |
| UI pages | 80+ |

## Conclusion

VistA Evolved is a comprehensive EHR modernization platform that correctly
delegates clinical logic to VistA while providing a modern web interface.
The system is production-ready for clinical reads, admin operations, security,
and multi-tenant isolation. The three remaining gaps (provisioning pipeline,
commercial layer, clinical write RPCs) are well-documented with clear
execution paths. No rebuild is needed -- the existing codebase is well-structured,
maintainable, and aligned with the VistA-first architecture.
