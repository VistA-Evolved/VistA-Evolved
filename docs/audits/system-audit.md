# VistA-Evolved System Audit

> Generated: 2026-02-27T02:10:42.000Z  
> HEAD: 63c810b  
> Node: v24.13.0 | pnpm: 10.29.2

## What Is Truly Wired End-to-End

| # | Domain | Status | Evidence |
|---|--------|--------|----------|
| 1 | AUTH_IAM | **WIRED** | POST /portal/auth/login, POST /portal/auth/logout |
| 2 | CPRS_UI | **WIRED** | /cprs/admin/analytics, /cprs/admin/audit-viewer |
| 3 | ADMIN_PLATFORM | **WIRED** | GET /admin/audit-log, GET /admin/break-glass/active |
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
| PORTAL_PATIENT | local_only | Portal stores use write-through Map+PG (pg_backed). Hot cache resets on restart but DB is source of truth. |
| TELEHEALTH | local_only | Room store is pg_backed (write-through). Rooms are ephemeral (4h TTL) by design. Target: VistA SDEC APPOINTMENT STATUS for future scheduling linkage. |
| REPORTING | local_only | Report cache is in-memory |
| SCHEDULING_SDMODULE | integration_pending | SDES RPCs callable but WorldVistA File 44 lacks resource/slot config. Target: SDES GET APPT TYPES, SDOE LIST ENCOUNTERS, SD W/L CREATE FILE. requestStore is pg_backed. |

## Durability Posture

- **SQLite tables:** 47
- **In-memory Map stores:** 177
- **High-risk (data loss on restart):** 33
- **Medium-risk:** 30
- **JSON seed/mutable stores:** 17

### High-Risk In-Memory Stores

| Store | File | Data Type |
|-------|------|-----------|
| adapters | apps/api/src/adapters/adapter-loader.ts | BaseAdapter |
| ruleMap | apps/api/src/rcm/claim-lifecycle/scrubber.ts | ScrubRuleRow |
| processedRemittances | apps/api/src/rcm/edi/remit-processor.ts | Remittance |
| loaPacketCache | apps/api/src/rcm/hmo-portal/hmo-portal-routes.ts | LoaPacket |
| claimPacketCache | apps/api/src/rcm/hmo-portal/hmo-portal-routes.ts | HmoClaimPacket |
| adapterRegistry | apps/api/src/rcm/loa/loa-adapter.ts | LoaAdapter |
| claimDrafts | apps/api/src/rcm/payerOps/philhealth-store.ts | PhilHealthClaimDraft |
| loaCases | apps/api/src/rcm/payerOps/store.ts | LOACase |
| credentials | apps/api/src/rcm/payerOps/store.ts | CredentialVaultEntry |
| payerGroups | apps/api/src/rcm/payments/aging-intelligence.ts | ClaimCase |
| underpaymentsByPayer | apps/api/src/rcm/payments/aging-intelligence.ts | number |
| bridges | apps/api/src/rcm/payments/export-bridge.ts | unknown |
| uploadCache | apps/api/src/rcm/payments/payment-routes.ts | string |
| batches | apps/api/src/rcm/payments/payment-store.ts | RemittanceBatch |
| lines | apps/api/src/rcm/payments/payment-store.ts | RemittanceLine |

## VistA RPC Coverage

- **Unique RPCs used in code:** 91
- **RPCs in registry:** 196
- **Total call sites:** 182
- **Unregistered RPCs used:** 0
- **Unused registered RPCs:** 70

## API Inventory

- **Total endpoints:** 1255
- **By tag:** vista(547), rcm(353), other(96), admin(92), portal(87), infra(60), scheduling(31), imaging(20), analytics(14), telehealth(13), iam(10), interop(10), posture(6), auth(3)

## UI Inventory

- **web:** 52 pages, 39 dead-click markers
- **portal:** 25 pages, 11 dead-click markers

## CI Enforcement Posture

- **Workflow files:** 8
- **ci-security.yml:** triggers=[push,schedule] gates=[secret-scan]
- **ci-verify.yml:** triggers=[push] gates=[evidence-gate,secret-scan,phi-leak-scan,unit-tests]
- **ci.yml:** triggers=[push] gates=[build]
- **codeql.yml:** triggers=[push,schedule] gates=[]
- **dr-nightly.yml:** triggers=[schedule,workflow_dispatch] gates=[]
- **qa-gauntlet.yml:** triggers=[pull_request,schedule,workflow_dispatch] gates=[gauntlet:fast,gauntlet:rc,evidence-gate]
- **quality-gates.yml:** triggers=[push,workflow_dispatch] gates=[evidence-gate,secret-scan,phi-leak-scan,typecheck,build]
- **verify.yml:** triggers=[push] gates=[secret-scan,typecheck,build]

## Known Gaps Summary

| Marker | Files | Total Hits |
|--------|-------|------------|
| integration_pending | 67 | 346 |
| mock | 2 | 2 |
| placeholder | 77 | 208 |
| todo | 1 | 1 |
| fixme | 0 | 0 |
| local_only | 4 | 6 |
| stub | 45 | 984 |
| not_implemented | 14 | 433 |

## Top 20 Prioritized Next Build Items

| # | Severity | Domain | Gap | Key File |
|---|----------|--------|-----|----------|
| 1 | med | AUTH_IAM | OIDC is opt-in, not default | apps/api/src/auth/oidc-provider.ts |
| 2 | med | CPRS_UI | Multiple admin pages may have placeholder content |  |
| 3 | med | ORDERS_CPOE | Order signing workflow may be incomplete in sandbox | apps/api/src/routes/cprs/orders-cpoe.ts |
| 4 | med | SCHEDULING_SDMODULE | SDES RPCs callable but WorldVistA File 44 lacks resource/slot config. Target: SDES GET APPT TYPES, SDOE LIST ENCOUNTERS, SD W/L CREATE FILE. requestStore is pg_backed. | apps/api/src/routes/scheduling |
| 5 | med | PORTAL_PATIENT | Portal auth is separate from VistA auth | apps/api/src/routes/portal-auth.ts |
| 6 | med | IMAGING | Orthanc integration requires external Docker service | services/imaging/docker-compose.yml |
| 7 | med | INTEROP_HL7_HLO | Custom M routines must be installed in Docker | services/vista/ZVEMIOP.m |
| 8 | med | PAYER_INTEGRATIONS_PH | PhilHealth eClaims 3.0 connector is simulation scaffold. Blocked by: facility accreditation, TLS client cert (PKI), API access enrollment. Target: PhilHealth eClaims 3.0 REST /api/v3. | apps/api/src/rcm/connectors/philhealth-connector.ts |
| 9 | med | PAYER_INTEGRATIONS_US | Clearinghouse connector is simulation scaffold. Blocked by: vendor contract (Change Healthcare/Availity/WayStar), SFTP credentials, sender/receiver ID enrollment. Target: vendor SFTP/API. | apps/api/src/rcm/connectors/clearinghouse-connector.ts |
| 10 | med | AI_GOVERNANCE | AI model integration is scaffold only |  |
| 11 | med | AUDIT_COMPLIANCE | Audit JSONL files are append-only but not externally replicated | apps/api/src/lib/immutable-audit.ts |
| 12 | med | DATABASE_POSTURE | 33 Map stores flagged high-risk. Critical stores (claims, portal, imaging, telehealth, scheduling) are pg_backed via write-through. Remaining are rebuildable caches or ephemeral by design. | apps/api/src/adapters/adapter-loader.ts |
| 13 | low | AUTH_IAM | Passkey data delegated to Keycloak (not available in sandbox) | apps/api/src/auth/biometric/passkeys-provider.ts |
| 14 | low | VISTA_RPC_COVERAGE | 70 registered RPCs not called in code |  |
| 15 | low | PORTAL_PATIENT | Portal stores use write-through Map+PG (pg_backed). Hot cache resets on restart but DB is source of truth. | apps/api/src/portal-iam/access-log-store.ts |
| 16 | low | TELEHEALTH | Room store is pg_backed (write-through). Rooms are ephemeral (4h TTL) by design. Target: VistA SDEC APPOINTMENT STATUS for future scheduling linkage. | apps/api/src/telehealth/room-store.ts |
| 17 | low | IMAGING | Imaging worklist/ingest are pg_backed (Phase 128 write-through + rehydration). Target: VistA ORWDXR NEW ORDER, RAD/NUC MED REGISTER for native storage. | apps/api/src/services/imaging-worklist.ts |
| 18 | low | RCM_CORE | Claim store is pg_backed since Phase 126 (rcm_claim + rcm_remittance tables). Map is write-through cache. Target: VistA ^IB/^PRCA for production billing. | apps/api/src/rcm/domain/claim-store.ts |
| 19 | low | RCM_CORE | CLAIM_SUBMISSION_ENABLED=false by default (intentional safety gate) | apps/api/src/rcm/edi/pipeline.ts |
| 20 | low | REPORTING | Report cache is in-memory | apps/api/src/routes/reporting.ts |

---
*This audit is auto-generated by `pnpm audit:system`. Do not edit manually.*