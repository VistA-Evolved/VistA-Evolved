# VistA-Evolved System Audit

> Generated: 2026-03-04T13:56:31.751Z  
> HEAD: 7b4ee7dd  
> Node: v24.13.0 | pnpm: 10.29.2

## What Is Truly Wired End-to-End

| #   | Domain                | Status    | Evidence                                                                      |
| --- | --------------------- | --------- | ----------------------------------------------------------------------------- |
| 1   | AUTH_IAM              | **WIRED** | GET /auth/mfa/status, GET /auth/security-events                               |
| 2   | CPRS_UI               | **WIRED** | /cprs/admin/adapters, /cprs/admin/alignment                                   |
| 3   | ADMIN_PLATFORM        | **WIRED** | GET /admin/alignment/gates, GET /admin/alignment/score                        |
| 4   | AUDIT_COMPLIANCE      | **WIRED** | apps/api/src/lib/immutable-audit.ts, apps/api/src/services/imaging-audit.ts   |
| 5   | VISTA_RPC_COVERAGE    | partial   | uniqueRpcsUsed, registeredRpcs                                                |
| 6   | ORDERS_CPOE           | partial   | POST /vista/cprs/meds/quick-order, POST /vista/cprs/order-checks              |
| 7   | IMAGING               | partial   | GET /imaging/audit/events, GET /imaging/audit/export                          |
| 8   | INTEROP_HL7_HLO       | partial   | GET /vista/interop/hl7-links, GET /vista/interop/hl7-messages                 |
| 9   | RCM_CORE              | partial   | GET /rcm/accreditation, POST /rcm/accreditation                               |
| 10  | PAYER_INTEGRATIONS_PH | partial   | data/payers/ph_hmos.json, apps/api/src/rcm/connectors/philhealth-connector.ts |

## Local-Only / Mock / Integration Pending

| Domain              | Status              | Top Gap                                                                                                                                                                 |
| ------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PORTAL_PATIENT      | local_only          | Portal stores use write-through Map+PG (pg_backed). Hot cache resets on restart but DB is source of truth.                                                              |
| TELEHEALTH          | local_only          | Room store is pg_backed (write-through). Rooms are ephemeral (4h TTL) by design. Target: VistA SDEC APPOINTMENT STATUS for future scheduling linkage.                   |
| REPORTING           | local_only          | Report cache is in-memory                                                                                                                                               |
| SCHEDULING_SDMODULE | integration_pending | SDES RPCs callable but WorldVistA File 44 lacks resource/slot config. Target: SDES GET APPT TYPES, SDOE LIST ENCOUNTERS, SD W/L CREATE FILE. requestStore is pg_backed. |

## Durability Posture

- **SQLite tables:** 0
- **In-memory Map stores:** 503
- **High-risk (data loss on restart):** 52
- **Medium-risk:** 47
- **JSON seed/mutable stores:** 34

### High-Risk In-Memory Stores

| Store                | File                                                   | Data Type               |
| -------------------- | ------------------------------------------------------ | ----------------------- |
| adapters             | apps/api/src/adapters/adapter-loader.ts                | BaseAdapter             |
| offsets              | apps/api/src/audit-shipping/shipper.ts                 | AuditShipOffset         |
| result               | apps/api/src/audit-shipping/shipper.ts                 | IndexedLine             |
| tenantLines          | apps/api/src/audit-shipping/shipper.ts                 | IndexedLine             |
| orderSetStore        | apps/api/src/content-packs/pack-store.ts               | OrderSet                |
| labOrderStore        | apps/api/src/lab/lab-store.ts                          | LabOrder                |
| pharmOrderStore      | apps/api/src/pharmacy/pharmacy-store.ts                | PharmOrder              |
| packCache            | apps/api/src/platform/country-pack-loader.ts           | PackLoadResult          |
| ruleMap              | apps/api/src/rcm/claim-lifecycle/scrubber.ts           | ScrubRuleRow            |
| vaultProviders       | apps/api/src/rcm/connectors/clearinghouse-transport.ts | CredentialVaultProvider |
| batchStore           | apps/api/src/rcm/denials/denial-pipeline-hardener.ts   | RemittanceBatch         |
| stagingStore         | apps/api/src/rcm/denials/denial-pipeline-hardener.ts   | PostingStagingEntry     |
| processedRemittances | apps/api/src/rcm/edi/remit-processor.ts                | Remittance              |
| loaPacketCache       | apps/api/src/rcm/hmo-portal/hmo-portal-routes.ts       | LoaPacket               |
| claimPacketCache     | apps/api/src/rcm/hmo-portal/hmo-portal-routes.ts       | HmoClaimPacket          |

## VistA RPC Coverage

- **Unique RPCs used in code:** 107
- **RPCs in registry:** 257
- **Total call sites:** 253
- **Unregistered RPCs used:** 4
- **Unused registered RPCs:** 114

## API Inventory

- **Total endpoints:** 1999
- **By tag:** other(647), vista(570), rcm(381), admin(162), infra(90), portal(90), analytics(45), scheduling(38), imaging(24), telehealth(13), iam(10), interop(10), posture(9), auth(8)

## UI Inventory

- **web:** 72 pages, 47 dead-click markers
- **portal:** 25 pages, 11 dead-click markers

## CI Enforcement Posture

- **Workflow files:** 18
- **cd-deploy.yml:** triggers=[push] gates=[]
- **ci-distro-build.yml:** triggers=[push,workflow_dispatch] gates=[]
- **ci-e2e-smoke.yml:** triggers=[pull_request] gates=[build]
- **ci-imaging-smoke.yml:** triggers=[pull_request] gates=[]
- **ci-pr-gates.yml:** triggers=[pull_request] gates=[gauntlet:fast,secret-scan,typecheck]
- **ci-security.yml:** triggers=[push,schedule] gates=[secret-scan]
- **ci-ui-parity-gate.yml:** triggers=[pull_request] gates=[]
- **ci-verify.yml:** triggers=[push] gates=[evidence-gate,secret-scan,phi-leak-scan,unit-tests]
- **ci.yml:** triggers=[push] gates=[typecheck,build]
- **codeql.yml:** triggers=[push,schedule] gates=[]
- **dr-nightly.yml:** triggers=[schedule,workflow_dispatch] gates=[]
- **perf-acceptance-gate.yml:** triggers=[schedule,workflow_dispatch] gates=[]
- **qa-gauntlet.yml:** triggers=[pull_request,schedule,workflow_dispatch] gates=[gauntlet:fast,gauntlet:rc,evidence-gate]
- **quality-gates.yml:** triggers=[push,workflow_dispatch] gates=[evidence-gate,secret-scan,phi-leak-scan,typecheck,build]
- **resilience-certification.yml:** triggers=[schedule,workflow_dispatch] gates=[unit-tests]
- **supply-chain-attest.yml:** triggers=[] gates=[]
- **supply-chain-security.yml:** triggers=[push,schedule,workflow_dispatch] gates=[]
- **verify.yml:** triggers=[push] gates=[secret-scan,typecheck,build]

## Known Gaps Summary

| Marker              | Files | Total Hits |
| ------------------- | ----- | ---------- |
| integration_pending | 118   | 494        |
| mock                | 12    | 46         |
| placeholder         | 92    | 237        |
| todo                | 7     | 13         |
| fixme               | 0     | 0          |
| local_only          | 4     | 6          |
| stub                | 62    | 1033       |
| not_implemented     | 14    | 429        |

## Top 20 Prioritized Next Build Items

| #   | Severity | Domain                | Gap                                                                                                                                                                                          | Key File                                               |
| --- | -------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 1   | med      | AUTH_IAM              | OIDC is opt-in, not default                                                                                                                                                                  | apps/api/src/auth/oidc-provider.ts                     |
| 2   | med      | CPRS_UI               | Multiple admin pages may have placeholder content                                                                                                                                            |                                                        |
| 3   | med      | VISTA_RPC_COVERAGE    | 4 RPCs used but not in registry                                                                                                                                                              | ORWDX LOCK ORDER                                       |
| 4   | med      | ORDERS_CPOE           | Order signing workflow may be incomplete in sandbox                                                                                                                                          | apps/api/src/routes/cprs/orders-cpoe.ts                |
| 5   | med      | SCHEDULING_SDMODULE   | SDES RPCs callable but WorldVistA File 44 lacks resource/slot config. Target: SDES GET APPT TYPES, SDOE LIST ENCOUNTERS, SD W/L CREATE FILE. requestStore is pg_backed.                      | apps/api/src/routes/scheduling                         |
| 6   | med      | PORTAL_PATIENT        | Portal auth is separate from VistA auth                                                                                                                                                      | apps/api/src/routes/portal-auth.ts                     |
| 7   | med      | IMAGING               | Orthanc integration requires external Docker service                                                                                                                                         | services/imaging/docker-compose.yml                    |
| 8   | med      | INTEROP_HL7_HLO       | Custom M routines must be installed in Docker                                                                                                                                                | services/vista/ZVEMIOP.m                               |
| 9   | med      | PAYER_INTEGRATIONS_PH | PhilHealth eClaims 3.0 connector is simulation scaffold. Blocked by: facility accreditation, TLS client cert (PKI), API access enrollment. Target: PhilHealth eClaims 3.0 REST /api/v3.      | apps/api/src/rcm/connectors/philhealth-connector.ts    |
| 10  | med      | PAYER_INTEGRATIONS_US | Clearinghouse connector is simulation scaffold. Blocked by: vendor contract (Change Healthcare/Availity/WayStar), SFTP credentials, sender/receiver ID enrollment. Target: vendor SFTP/API.  | apps/api/src/rcm/connectors/clearinghouse-connector.ts |
| 11  | med      | AI_GOVERNANCE         | AI model integration is scaffold only                                                                                                                                                        |                                                        |
| 12  | med      | AUDIT_COMPLIANCE      | Audit JSONL files are append-only but not externally replicated                                                                                                                              | apps/api/src/lib/immutable-audit.ts                    |
| 13  | med      | DATABASE_POSTURE      | 52 Map stores flagged high-risk. Critical stores (claims, portal, imaging, telehealth, scheduling) are pg_backed via write-through. Remaining are rebuildable caches or ephemeral by design. | apps/api/src/adapters/adapter-loader.ts                |
| 14  | low      | AUTH_IAM              | Passkey data delegated to Keycloak (not available in sandbox)                                                                                                                                | apps/api/src/auth/biometric/passkeys-provider.ts       |
| 15  | low      | VISTA_RPC_COVERAGE    | 114 registered RPCs not called in code                                                                                                                                                       |                                                        |
| 16  | low      | PORTAL_PATIENT        | Portal stores use write-through Map+PG (pg_backed). Hot cache resets on restart but DB is source of truth.                                                                                   | apps/api/src/portal-iam/access-log-store.ts            |
| 17  | low      | TELEHEALTH            | Room store is pg_backed (write-through). Rooms are ephemeral (4h TTL) by design. Target: VistA SDEC APPOINTMENT STATUS for future scheduling linkage.                                        | apps/api/src/telehealth/room-store.ts                  |
| 18  | low      | IMAGING               | Imaging worklist/ingest are pg_backed (Phase 128 write-through + rehydration). Target: VistA ORWDXR NEW ORDER, RAD/NUC MED REGISTER for native storage.                                      | apps/api/src/services/imaging-worklist.ts              |
| 19  | low      | RCM_CORE              | Claim store is pg_backed since Phase 126 (rcm_claim + rcm_remittance tables). Map is write-through cache. Target: VistA ^IB/^PRCA for production billing.                                    | apps/api/src/rcm/domain/claim-store.ts                 |
| 20  | low      | RCM_CORE              | CLAIM_SUBMISSION_ENABLED=false by default (intentional safety gate)                                                                                                                          | apps/api/src/rcm/edi/pipeline.ts                       |

---

_This audit is auto-generated by `pnpm audit:system`. Do not edit manually._
