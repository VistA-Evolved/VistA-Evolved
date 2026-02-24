# VistA-Evolved System Audit

> Generated: 2026-02-24T23:38:54.572Z  
> HEAD: c96fea7  
> Node: v24.13.0 | pnpm: 10.29.2

## What Is Truly Wired End-to-End

| # | Domain | Status | Evidence |
|---|--------|--------|----------|
| 1 | AUTH_IAM | **WIRED** | POST /portal/auth/login, POST /portal/auth/logout |
| 2 | CPRS_UI | **WIRED** | /cprs/admin/analytics, /cprs/admin/audit-viewer |
| 3 | ADMIN_PLATFORM | **WIRED** | GET /admin/audit-log, POST /admin/cache/invalidate |
| 4 | AUDIT_COMPLIANCE | **WIRED** | apps/api/src/lib/immutable-audit.ts, apps/api/src/services/imaging-audit.ts |
| 5 | VISTA_RPC_COVERAGE | partial | uniqueRpcsUsed, registeredRpcs |
| 6 | ORDERS_CPOE | partial | POST /vista/cprs/meds/quick-order, POST /vista/cprs/order-checks |
| 7 | IMAGING | partial | GET /imaging/audit/events, GET /imaging/audit/export |
| 8 | INTEROP_HL7_HLO | partial | GET /vista/interop/hl7-links, GET /vista/interop/hl7-messages |
| 9 | RCM_CORE | partial | GET /rcm/accreditation, POST /rcm/accreditation |
| 10 | PAYER_INTEGRATIONS_PH | partial | data/payers/ph_hmos.json, apps/api/src/rcm/connectors/philhealth-connector.ts |

## Local-Only / Mock / Integration Pending

| Domain | Status | Top Gap |
|--------|--------|---------|
| PORTAL_PATIENT | local_only | All portal stores are in-memory Maps |
| TELEHEALTH | local_only | Room store is in-memory, resets on restart |
| REPORTING | local_only | Report cache is in-memory |
| SCHEDULING_SDMODULE | integration_pending | SD scheduling RPCs named but sandbox data sparse |
| INTERNATIONALIZATION | planned | No i18n framework integrated |

## Durability Posture

- **SQLite tables:** 41
- **In-memory Map stores:** 171
- **High-risk (data loss on restart):** 49
- **Medium-risk:** 28
- **JSON seed/mutable stores:** 16

### High-Risk In-Memory Stores

| Store | File | Data Type |
|-------|------|-----------|
| adapters | apps/api/src/adapters/adapter-loader.ts | BaseAdapter |
| requestStore | apps/api/src/adapters/scheduling/vista-adapter.ts | WaitListEntry |
| bookingLocks | apps/api/src/adapters/scheduling/vista-adapter.ts | number |
| ruleMap | apps/api/src/rcm/claim-lifecycle/scrubber.ts | ScrubRuleRow |
| cases | apps/api/src/rcm/claims/claim-store.ts | ClaimCase |
| tenantIndex | apps/api/src/rcm/claims/claim-store.ts | Set |
| denialIndex | apps/api/src/rcm/claims/claim-store.ts | Set |
| allDenials | apps/api/src/rcm/claims/claim-store.ts | DenialRecord |
| claims | apps/api/src/rcm/domain/claim-store.ts | Claim |
| remittances | apps/api/src/rcm/domain/claim-store.ts | Remittance |
| tenantClaimIndex | apps/api/src/rcm/domain/claim-store.ts | Set |
| claimAckIndex | apps/api/src/rcm/edi/ack-status-processor.ts | string |
| statusUpdates | apps/api/src/rcm/edi/ack-status-processor.ts | ClaimStatusUpdate |
| claimStatusIndex | apps/api/src/rcm/edi/ack-status-processor.ts | string |
| claimIndex | apps/api/src/rcm/edi/pipeline.ts | string |

## VistA RPC Coverage

- **Unique RPCs used in code:** 76
- **RPCs in registry:** 138
- **Total call sites:** 151
- **Unregistered RPCs used:** 0
- **Unused registered RPCs:** 42

## API Inventory

- **Total endpoints:** 1196
- **By tag:** vista(539), rcm(348), other(92), admin(81), portal(79), infra(60), imaging(20), analytics(14), telehealth(13), scheduling(10), interop(10), iam(9), posture(4), auth(3)

## UI Inventory

- **web:** 48 pages, 36 dead-click markers
- **portal:** 23 pages, 10 dead-click markers

## CI Enforcement Posture

- **Workflow files:** 7
- **ci-security.yml:** triggers=[push,schedule] gates=[secret-scan]
- **ci-verify.yml:** triggers=[push] gates=[evidence-gate,secret-scan,phi-leak-scan,unit-tests]
- **ci.yml:** triggers=[push] gates=[build]
- **codeql.yml:** triggers=[push,schedule] gates=[]
- **qa-gauntlet.yml:** triggers=[pull_request,schedule,workflow_dispatch] gates=[gauntlet:fast,gauntlet:rc,evidence-gate]
- **quality-gates.yml:** triggers=[push,workflow_dispatch] gates=[evidence-gate,secret-scan,phi-leak-scan,typecheck,build]
- **verify.yml:** triggers=[push] gates=[secret-scan,typecheck,build]

## Known Gaps Summary

| Marker | Files | Total Hits |
|--------|-------|------------|
| integration_pending | 60 | 319 |
| mock | 2 | 2 |
| placeholder | 74 | 197 |
| todo | 1 | 1 |
| fixme | 0 | 0 |
| local_only | 3 | 5 |
| stub | 42 | 966 |
| not_implemented | 13 | 424 |

## Top 20 Prioritized Next Build Items

| # | Severity | Domain | Gap | Key File |
|---|----------|--------|-----|----------|
| 1 | high | SCHEDULING_SDMODULE | SD scheduling RPCs named but sandbox data sparse | apps/api/src/routes/scheduling |
| 2 | high | PORTAL_PATIENT | All portal stores are in-memory Maps | apps/api/src/portal-iam/access-log-store.ts |
| 3 | high | TELEHEALTH | Room store is in-memory, resets on restart | apps/api/src/telehealth/room-store.ts |
| 4 | high | IMAGING | Imaging worklist/ingest are in-memory | apps/api/src/services/imaging-worklist.ts |
| 5 | high | RCM_CORE | Claim store is in-memory Map | apps/api/src/rcm/domain/claim-store.ts |
| 6 | high | PAYER_INTEGRATIONS_PH | PhilHealth API not tested with live endpoint | apps/api/src/rcm/connectors/philhealth-connector.ts |
| 7 | high | PAYER_INTEGRATIONS_US | Clearinghouse connector scaffold, no live integration | apps/api/src/rcm/connectors/clearinghouse-connector.ts |
| 8 | high | MULTI_TENANCY | RLS policies gated by PLATFORM_PG_RLS_ENABLED | apps/api/src/posture/tenant-posture.ts |
| 9 | high | MULTI_TENANCY | SQLite tables lack tenant isolation | apps/api/src/platform/db/schema.ts |
| 10 | high | DATABASE_POSTURE | 49 high-risk in-memory stores lose data on restart | apps/api/src/adapters/adapter-loader.ts |
| 11 | med | AUTH_IAM | OIDC is opt-in, not default | apps/api/src/auth/oidc-provider.ts |
| 12 | med | CPRS_UI | Multiple admin pages may have placeholder content |  |
| 13 | med | ORDERS_CPOE | Order signing workflow may be incomplete in sandbox | apps/api/src/routes/cprs/orders-cpoe.ts |
| 14 | med | PORTAL_PATIENT | Portal auth is separate from VistA auth | apps/api/src/routes/portal-auth.ts |
| 15 | med | IMAGING | Orthanc integration requires external Docker service | services/imaging/docker-compose.yml |
| 16 | med | INTEROP_HL7_HLO | Custom M routines must be installed in Docker | services/vista/ZVEMIOP.m |
| 17 | med | AI_GOVERNANCE | AI model integration is scaffold only |  |
| 18 | med | AUDIT_COMPLIANCE | Audit JSONL files are append-only but not externally replicated | apps/api/src/lib/immutable-audit.ts |
| 19 | low | AUTH_IAM | Passkey data delegated to Keycloak (not available in sandbox) | apps/api/src/auth/biometric/passkeys-provider.ts |
| 20 | low | VISTA_RPC_COVERAGE | 42 registered RPCs not called in code |  |

---
*This audit is auto-generated by `pnpm audit:system`. Do not edit manually.*