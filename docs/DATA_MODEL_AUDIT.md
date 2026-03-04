# Data Model Audit — VistA-Evolved

> Generated: Phase P1-2 — Comprehensive audit of ALL data models for
> duplicates, conflicts, inconsistencies, and orphans.
>
> **Updated: Phase P1-3** — Consolidated Patient, clinical types, UserRole,
> and SupportedLocale into `@vista-evolved/shared-types` package.

---

## Methodology

Scanned every `.ts` file in the monorepo for exported `type`, `interface`,
`enum`, Zod schemas, and Drizzle `pgTable` definitions. Cross-referenced
API ↔ Web ↔ Portal ↔ Packages for duplicate names and overlapping fields.

**Totals found:**

| Category | Count |
|----------|-------|
| TypeScript types (string unions, aliases) | ~76 |
| TypeScript interfaces | ~234+ |
| TypeScript classes (with state/domain logic) | ~50 |
| Zod validation schemas | ~42 |
| Drizzle PG tables | ~112 |
| **Total domain model definitions** | **~514** |

---

## 1. DUPLICATES FOUND

### 1.1 HIGH Severity — Must Fix

| # | Duplicate Set | Locations | Issue | Canonical Recommendation |
|---|---------------|-----------|-------|--------------------------|
| D-01 | `UserRole` vs `PolicyRole` | `auth/session-store.ts` → `'provider'\|'nurse'\|'pharmacist'\|'clerk'\|'admin'\|'billing'\|'support'`; `auth/policy-engine.ts` → `'provider'\|'nurse'\|'pharmacist'\|'clerk'\|'admin'\|'patient'\|'support'` | 86% identical. `billing` missing from PolicyRole, `patient` missing from UserRole. Accidental drift. | Create single `type UserRole` in `auth/roles.ts` with all 8 values: `'provider'\|'nurse'\|'pharmacist'\|'clerk'\|'admin'\|'billing'\|'support'\|'patient'`. Both files import from there. |
| D-02 | `ConsentCategory` (×2) + `ConsentRecord` (×2) | `telehealth/consent-posture.ts` → `'telehealth_video'\|'telehealth_recording'\|'telehealth_data_sharing'`; `services/consent-engine.ts` → `'treatment'\|'payment'\|'operations'\|'research'\|...` | Same exported name, **zero value overlap**. Namespace collision. Any file needing both gets import conflicts. | Rename telehealth variants to `TelehealthConsentCategory` and `TelehealthConsentRecord`. Keep `ConsentCategory`/`ConsentRecord` for the regulatory consent engine. |
| D-03 | `ModuleId` (×2) | `config/tenant-config.ts` → 13 CPRS tab slugs (`'cover'\|'problems'\|'meds'\|...`); `modules/module-registry.ts` → `string` (12 system modules: `kernel`, `clinical`, `portal`...) | Same exported name, different granularity (AGENTS.md #80 acknowledges this). Import ambiguity. | Rename to `TabModuleId` (tenant-config) and `SystemModuleId` (module-registry). Both files import their own. |
| D-04 | Three audit entry types | `lib/immutable-audit.ts` → `ImmutableAuditEntry` (seq, hash, prevHash, actorId, actorRoles[]); `services/imaging-audit.ts` → `ImagingAuditEntry` (seq, hash, prevHash, actorDuz, actorRole); `rcm/audit/rcm-audit.ts` → `RcmAuditEntry` (seq, hash, previousHash, userId) | Parallel hash-chain construction. Field naming inconsistency: `prevHash` vs `previousHash`, `actorDuz` vs `actorId` vs `userId`. ~300 lines of structural duplication. | Extract `HashChainedAuditEntry<TAction>` base interface in `lib/audit-base.ts` with: `seq, hash, prevHash, timestamp, action: TAction, detail`. Domain entries extend it with domain-specific fields. Standardize `prevHash` (not `previousHash`). |
| D-05 | ~~Clinical types (×2 in web)~~ ✅ DONE P1-3 | `apps/web/src/lib/chart-types.ts` → re-exports from `@vista-evolved/shared-types`; `apps/web/src/stores/data-cache.tsx` → imports from `@vista-evolved/shared-types` | **Consolidated.** Both files now import canonical types from `shared/src/clinical/`. | `@vista-evolved/shared-types` is the single source. |
| D-06 | ~~`PatientDemographics` (×3)~~ ✅ DONE P1-3 | All 3 locations now import from `@vista-evolved/shared-types` via `PatientDemographics` alias (→ `PatientSummary`). | **Consolidated.** `chart-types.ts`, `patient-context.tsx`, and `patient-search/page.tsx` all import the canonical type. | `@vista-evolved/shared-types` → `PatientSummary` (with `PatientDemographics` alias). |
| D-07 | ~~`UserRole` (web ↔ API)~~ ✅ DONE P1-3 | `apps/web/src/stores/session-context.tsx` → re-exports from `@vista-evolved/shared-types`; `apps/api/src/auth/session-store.ts` → re-exports from `@vista-evolved/shared-types` | **Consolidated.** Both files import the canonical type from `shared/src/auth/user-role.ts`. | `@vista-evolved/shared-types` → `UserRole`. |
| D-08 | ~~`SupportedLocale` (×3)~~ ✅ DONE P1-3 | `apps/web/src/lib/i18n.ts`, `apps/portal/src/lib/i18n.ts`, `apps/api/src/platform/pg/repo/pg-user-locale-repo.ts` → all now import from `@vista-evolved/locale-utils` | **Consolidated.** All 3 app-local definitions replaced with imports from `packages/locale-utils`. | `@vista-evolved/locale-utils` → `SupportedLocale` + `SUPPORTED_LOCALES`. |
| D-09 | `PgBackupPayload` (×2) | `jobs/registry.ts` (Zod-inferred); `jobs/tasks/pg-backup.ts` (interface) | Same name, same domain, separate definitions. | Keep Zod-inferred version in `registry.ts` as canonical. Import in `pg-backup.ts` instead of re-declaring. |

### 1.2 MEDIUM Severity — Track for Future Refactor

| # | Duplicate Set | Locations | Issue | Recommendation |
|---|---------------|-----------|-------|----------------|
| D-10 | `Appointment` (×2 in API) | `services/portal-appointments.ts` → 18 fields (patient-facing); `adapters/scheduling/interface.ts` → 12 fields (VistA-facing) | Same name, same domain, different layers. `scheduledAt` vs `dateTime`, `clinicName` vs `clinic`. | Create shared `AppointmentBase` with common fields (`id, patientDfn, status, duration, reason`). Extend to `PortalAppointment` and `VistaAppointment`. |
| D-11 | `AuditAction` vs `ImmutableAuditAction` | `lib/audit.ts` → ~85 actions; `lib/immutable-audit.ts` → ~90 actions | Overlapping action strings (`auth.login`, `security.*`) with different vocabularies (`clinical.*` vs `write.*`). | Create shared action category registry. Domain modules register their actions. Both audit systems consume it. |
| D-12 | `BreakGlassSession` vs `BreakGlassRequest` | `services/imaging-authz.ts` → full session (10 fields); `auth/privacy-segmentation.ts` → request DTO (5 fields) | Different lifecycle stages (request vs session), but `BreakGlass*` prefix suggests unified domain. | Acceptable while break-glass remains domain-split. If unified, imaging session becomes canonical, privacy request feeds into it. |
| D-13 | `SessionUser` (web) vs `SessionData` (API) | `apps/web/src/stores/session-context.tsx` → subset; `apps/api/src/auth/session-store.ts` → full | Web declares a subset of the API session shape. Manual sync required. | Auto-generate web session type from API `SessionData` via shared package. |
| D-14 | Tenant config types (web ↔ API) | `apps/web/src/stores/tenant-context.tsx` → `ModuleId, UIDefaults, NoteTemplate, TenantData`; `apps/api/src/config/tenant-config.ts` → same types | Web re-declares API tenant config types. | Import from shared package or auto-generate. |
| D-15 | `PortalSessionData` vs `SessionData` | `routes/portal-auth.ts`; `auth/session-store.ts` | Portal has its own session shape (patient-scoped) vs EHR session (provider-scoped). | Intentionally different (patient vs provider). Document the distinction. No merge. |
| D-16 | Portal page-local types (~30) | `apps/portal/src/app/dashboard/*/page.tsx` — each page declares local interfaces that mirror API response shapes | Non-exported, file-local types. Impossible to share even within the portal. | Consolidate into `apps/portal/src/types/` with one file per domain. Import in pages. |
| D-17 | `Appointment` in portal | `apps/portal/src/app/dashboard/telehealth/page.tsx` → subset of API `TelehealthRoom` + `Appointment` | File-local, subset of API types. | See D-16: consolidate portal types. |

### 1.3 LOW Severity — Naming Conventions

| # | Issue | Locations | Recommendation |
|---|-------|-----------|----------------|
| D-18 | Unprefixed generic names in service-lines | ED: `BedStatus`; OR: `CasePriority`; ICU: `FlowsheetCategory`, `FlowsheetEntry`, `IoType`, `IoSource`, `IoRecord`; Radiology: `ReportStatus`, `PeerReview` | Prefix with domain: `EdBedStatus`, `OrCasePriority`, `IcuFlowsheetCategory`, `IcuIoType`, `RadReportStatus`, `RadPeerReview`. |
| D-19 | `BedStatus` (ED) vs `IcuBedStatus` (ICU) | `service-lines/ed/types.ts`; `service-lines/icu/types.ts` | ED uses plain `BedStatus`, ICU uses `IcuBedStatus`. Inconsistent prefixing. Rename ED's to `EdBedStatus`. |
| D-20 | `prevHash` vs `previousHash` | `imaging-audit.ts` + `immutable-audit.ts` use `prevHash`; `rcm-audit.ts` uses `previousHash` | Standardize to `prevHash` everywhere (shorter, majority usage). |

---

## 2. CANONICAL MODEL MAP

### 2.1 Intentional TS ↔ PG Duplication Pairs (BY DESIGN)

These are intentional — TypeScript interfaces define canonical domain shapes,
Drizzle `pgTable` schemas define persistence with `tenantId` + JSON serialization.
**Do not merge.** Keep in sync manually or via codegen.

| TS Interface | PG Table | Domain | Sync Risk |
|-------------|----------|--------|-----------|
| `Claim` (rcm/domain/claim.ts) | `pgRcmClaim` | RCM | Fields must match; JSON blob for `lines[]` |
| `Payer` (rcm/domain/payer.ts) | `payer` | Payer mgmt | Direct column mapping |
| `Remittance` (rcm/domain/remit.ts) | `pgRcmRemittance` | RCM | JSON blob for `serviceLines[]` |
| `PipelineEntry` (rcm/edi/pipeline.ts) | `pgEdiPipelineEntry` | EDI | Status enum alignment |
| `DenialCase` (rcm/denials/types.ts) | `denialCase` | Denials | Status enum alignment |
| `PaymentRecord` (rcm/reconciliation/types.ts) | `paymentRecord` | Recon | Direct column mapping |
| `SessionData` (auth/session-store.ts) | `pgAuthSession` | Auth | JSON for permissions map |
| `TelehealthRoom` (telehealth/types.ts) | `pgTelehealthRoom` | Telehealth | Status enum alignment |
| `WorklistItem` (services/imaging-worklist.ts) | `pgImagingWorkItem` | Imaging | Status enum alignment |
| `EdVisit` (service-lines/ed/types.ts) | `pgEdVisit` | ED | JSON blob for assessments |
| `OrCase` (service-lines/or/types.ts) | `pgOrCase` | OR | Status enum alignment |
| `IcuAdmission` (service-lines/icu/types.ts) | `pgIcuAdmission` | ICU | Status enum alignment |
| `RadOrder` (radiology/types.ts) | `pgRadiologyOrder` | Radiology | Status enum alignment |
| `RadReport` (radiology/types.ts) | `pgRadReport` | Radiology | Status enum alignment |

### 2.2 Canonical Sources by Domain

| Domain | Canonical Source | Consumers | Notes |
|--------|-----------------|-----------|-------|
| **Auth / Roles** | `auth/session-store.ts` | policy-engine, security, routes, web app | Should become `auth/roles.ts` after D-01 |
| **Clinical Records** | `adapters/types.ts` | All clinical routes, web panels | `PatientRecord`, `AllergyRecord`, `VitalRecord`, `NoteRecord`, `MedicationRecord`, `ProblemRecord`, `LabResult`, `EncounterRecord` |
| **Scheduling** | `adapters/scheduling/interface.ts` | Scheduling routes, portal | `Appointment`, `TimeSlot`, `ClinicInfo`, `ProviderInfo` |
| **RCM Claims** | `rcm/domain/claim.ts` | RCM routes, EDI pipeline, connectors | `Claim`, `ClaimStatus`, `ClaimLine` |
| **RCM Payers** | `rcm/domain/payer.ts` + `payer-registry/registry.ts` | RCM routes, connectors, validation | `Payer`, `PayerStatus`, `IntegrationMode` |
| **RCM EDI** | `rcm/edi/types.ts` + `rcm/edi/pipeline.ts` | EDI routes, connectors | `EdiClaim837`, `PipelineEntry`, `PipelineStage` |
| **RCM Denials** | `rcm/denials/types.ts` | Denial routes, work queues | `DenialCase`, `DenialAction`, `DenialStatus` |
| **RCM Recon** | `rcm/reconciliation/types.ts` | Recon routes, ETL | `PaymentRecord`, `ReconciliationMatch` |
| **Imaging** | `services/imaging-worklist.ts` + `services/imaging-devices.ts` | Imaging routes, proxy | `WorklistItem`, `DicomDevice` |
| **Imaging Authz** | `services/imaging-authz.ts` | Imaging routes, security | `ImagingPermission`, `BreakGlassSession` |
| **Telehealth** | `telehealth/types.ts` | Telehealth routes, portal | `TelehealthRoom`, `RoomParticipant`, `TelehealthProvider` |
| **Intake** | `intake/types.ts` | Intake routes, portal, brain | `IntakeSession`, `IntakePack`, `QuestionnaireItem` |
| **Intake Brain** | `intake/brain/types.ts` | Brain routes, brain providers | `IntakeBrainPlugin`, `BrainSessionState` |
| **ED** | `service-lines/ed/types.ts` | ED routes | `EdVisit`, `EdBed`, `TriageAssessment` |
| **OR** | `service-lines/or/types.ts` | OR routes | `OrCase`, `OrRoom`, `OrBlock` |
| **ICU** | `service-lines/icu/types.ts` | ICU routes | `IcuAdmission`, `IcuBed`, `FlowsheetEntry` |
| **Radiology** | `radiology/types.ts` | Radiology routes | `RadOrder`, `RadReport`, `ReadingWorklistItem` |
| **Modules** | `modules/module-registry.ts` + `modules/capability-service.ts` | Module guard, capability routes | `ModuleDefinition`, `SkuProfile`, `ResolvedCapability` |
| **Tenant Config** | `config/tenant-config.ts` | Tenant routes, web app | `TenantConfig`, `FeatureFlags`, `UIDefaults` |
| **Audit (general)** | `lib/audit.ts` | General audit logging | `AuditEvent`, `AuditAction` |
| **Audit (immutable)** | `lib/immutable-audit.ts` | Compliance trail | `ImmutableAuditEntry`, `ImmutableAuditAction` |
| **Platform** | `platform/pg/pg-schema.ts` | All PG repos, migrations | 112 Drizzle table defs |
| **Validation** | `lib/validation.ts` | All route handlers | 17 Zod schemas for request bodies/queries |
| **Jobs** | `jobs/registry.ts` | Job scheduler, task runners | `JobName`, payload Zod schemas |
| **Policy** | `auth/policy-engine.ts` | IAM routes, security middleware | `PolicyDecision`, `PolicyUser` |
| **OIDC** | `auth/oidc-provider.ts` + `auth/jwt-validator.ts` | Auth routes, IdP integration | `OidcConfig`, `OidcTokenClaims`, `JwtPayload` |
| **ABAC** | `auth/abac-engine.ts` + `auth/abac-attributes.ts` | Policy engine, route handlers | `AbacContext`, `AbacPolicy`, `AbacCondition` |
| **Encryption** | `auth/envelope-encryption.ts` + `auth/key-provider.ts` | Secrets routes, key management | `KeyProvider`, `EncryptedEnvelope` |
| **SIEM** | `auth/siem-sink.ts` + `auth/security-alerts.ts` | SIEM routes, alerting | `SiemEvent`, `AlertRule` |
| **Event Bus** | `services/event-bus.ts` | Cross-domain event propagation | `DomainEvent`, `EventConsumer` |
| **Facility** | `services/facility-service.ts` | Facility routes | `Facility`, `Department`, `Location` |
| **Compliance** | `services/compliance-matrix.ts` | Compliance routes | `ComplianceRequirement`, `ComplianceMatrix` |

---

## 3. MODELS WITH NO CONFLICTS

The following models have **unique, non-duplicated definitions** with clear
ownership and no naming collisions:

### Auth/IAM (unique)
- `OidcConfig`, `OidcTokenClaims`, `OidcDiscovery` — `auth/oidc-provider.ts`
- `JwtPayload`, `JwtHeader`, `JwksKey` — `auth/jwt-validator.ts`
- `PolicyDecision`, `PolicyContext`, `PolicyUser` — `auth/policy-engine.ts`
- `AbacContext`, `AbacPolicy`, `AbacCondition`, `AbacResult` — `auth/abac-engine.ts`
- `DeviceFingerprint`, `SessionInfo`, `SecurityEvent` — `auth/session-security.ts`
- `AssuranceLevel`, `StepUpChallenge`, `StepUpResult` — `auth/step-up-auth.ts`
- `MfaEnrollment`, `MfaEnrollmentStatus` — `auth/mfa-enforcement.ts`
- `ScimUser`, `ScimListResponse`, `ScimPatchOp` — `auth/scim-server.ts`
- `KeyProvider`, `EncryptedEnvelope`, `RotationPlan` — `auth/key-provider.ts` + `envelope-encryption.ts`
- `TenantSecurityPolicy` — `auth/tenant-security-policy.ts`
- `SensitivityCategory`, `SensitivityTag` — `auth/privacy-segmentation.ts`
- `SiemEvent`, `SiemConfig`, `AlertRule` — `auth/siem-sink.ts` + `security-alerts.ts`
- `IdpType`, `IdentityResult` — `auth/idp/types.ts`
- `DeptRoleTemplate` — `auth/dept-role-templates.ts`

### Clinical Adapters (unique)
- `PatientRecord`, `AllergyRecord`, `VitalRecord`, `NoteRecord` — `adapters/types.ts`
- `MedicationRecord`, `ProblemRecord`, `LabResult`, `EncounterRecord` — `adapters/types.ts`
- `WardRecord`, `MovementRecord`, `WriteResult` — `adapters/types.ts`
- `InpatientMedOrder`, `MAREntry`, `BarcodeScanResult` — `adapters/types.ts`
- `PharmacyVerifyRequest`, `PharmacyVerifyResult` — `adapters/types.ts`

### Scheduling (unique)
- `TimeSlot`, `ClinicInfo`, `ProviderInfo`, `EncounterDetail` — `adapters/scheduling/interface.ts`
- `WaitListEntry`, `AppointmentRequest`, `CprsAppointment` — `adapters/scheduling/interface.ts`
- `LifecycleEntry`, `SchedulingMode`, `SdesAvailSlot` — `adapters/scheduling/interface.ts`
- `TruthGateResult`, `AppointmentType`, `CancelReason` — `adapters/scheduling/interface.ts`
- `WritebackStatus`, `WritebackResult`, `WritebackPolicy` — `routes/scheduling/writeback-guard.ts`

### RCM (unique)
- `ClaimType`, `ClaimLine`, `ClaimStatus` — `rcm/domain/claim.ts`
- `PayerEndpoint`, `IntegrationMode` — `rcm/domain/payer.ts`
- `RemitStatus`, `RemitServiceLine`, `NormalizedRemittance` — `rcm/domain/remit.ts`
- `EdiClaim837`, `EdiRemittance835`, `EdiTransaction` — `rcm/edi/types.ts`
- `PipelineStage`, `PipelineEntry` — `rcm/edi/pipeline.ts`
- `ValidationEdit`, `ValidationResult`, `ValidationCategory` — `rcm/validation/engine.ts`
- `ConnectorResult`, `RcmConnector` — `rcm/connectors/types.ts`
- `DenialStatus`, `DenialAction`, `DenialAttachment` — `rcm/denials/types.ts`
- `ReconciliationMatch`, `UnderpaymentCase` — `rcm/reconciliation/types.ts`
- `ClaimDraft`, `ScrubRule`, `ScrubResult` — PG-only via Drizzle tables

### Imaging (unique)
- `WorklistItem`, `WorklistItemStatus` — `services/imaging-worklist.ts`
- `DicomDevice`, `DeviceStatus` — `services/imaging-devices.ts`
- `ImagingPermission` — `services/imaging-authz.ts`
- `ImagingAuditAction` — `services/imaging-audit.ts`
- `TenantImagingConfig` — `config/imaging-tenant.ts`

### Telehealth (unique)
- `RoomStatus`, `ParticipantRole`, `RoomParticipant` — `telehealth/types.ts`
- `TelehealthProvider`, `DeviceCheckResult` — `telehealth/types.ts`
- `WaitingRoomState` — `telehealth/types.ts`
- `BrowserRequirement`, `IceServer`, `DeviceRequirements` — `telehealth/device-check.ts`
- `ParticipantConnectionState`, `SessionMetrics` — `telehealth/session-hardening.ts`
- `EncounterLink`, `LinkageStatus` — `telehealth/encounter-link.ts`

### Intake (unique)
- `IntakeSession`, `IntakeContext`, `IntakeEvent` — `intake/types.ts`
- `IntakePack`, `QuestionnaireItem`, `NextQuestionResult` — `intake/types.ts`
- `SummaryResult`, `FilingTarget`, `FilingResult` — `intake/types.ts`
- `KioskResumeToken` — `intake/types.ts`
- `IntakeBrainPlugin`, `BrainSessionState`, `BrainDecisionAudit` — `intake/brain/types.ts`

### Service Lines (unique)
- `EdVisit`, `EdBed`, `TriageAssessment`, `EdDisposition` — `service-lines/ed/types.ts`
- `OrCase`, `OrRoom`, `OrBlock`, `OrMilestone`, `AnesthesiaRecord` — `service-lines/or/types.ts`
- `IcuAdmission`, `IcuBed`, `VentSettings`, `SeverityScore` — `service-lines/icu/types.ts`
- `ServiceLine`, `ServiceLinePermission`, `ServiceLineRole` — `service-lines/rbac.ts`

### Radiology (unique)
- `RadOrder`, `RadReport`, `ReadingWorklistItem` — `radiology/types.ts`
- `DoseRegistryEntry`, `RadCriticalAlert`, `RadDashboardStats` — `radiology/types.ts`
- `RadWritebackPosture` — `radiology/types.ts`

### Platform/Infra (unique)
- `RuntimeMode` — `platform/runtime-mode.ts`
- `StoreBackend`, `ResolvedStore` — `platform/store-resolver.ts`
- `StoreClassification`, `DurabilityStatus`, `StoreEntry` — `platform/store-policy.ts`
- `DomainEvent`, `EventConsumer`, `DlqEntry` — `services/event-bus.ts`
- `Facility`, `Department`, `Location` — `services/facility-service.ts`
- `ComplianceRequirement`, `ComplianceMatrix` — `services/compliance-matrix.ts`
- `AnalyticsPermission` — `config/analytics-config.ts`

### Modules/Capabilities (unique — after D-03 rename)
- `ModuleDefinition`, `SkuProfile`, `ModuleDataStore` — `modules/module-registry.ts`
- `CapabilityStatus`, `CapabilityDefinition`, `ResolvedCapability` — `modules/capability-service.ts`

### Jobs (unique — after D-09 fix)
- `JobName` — `jobs/registry.ts`
- `JobRunLogEntry`, `ValidateResult` — `jobs/governance.ts`
- `QueueHealth` — `jobs/backpressure.ts`

### Validation Schemas (unique — all in `lib/validation.ts`)
- `LoginBodySchema`, `PatientSearchQuerySchema`, `DfnQuerySchema`
- `AllergyAddSchema`, `VitalsAddSchema`, `NoteCreateSchema`
- `MedicationAddSchema`, `ProblemSaveSchema`, `OrderSignSchema`
- `OrderReleaseSchema`, `LabAckSchema`, `ConsultCreateSchema`
- `SurgeryCreateSchema`, `DraftQuerySchema`, `AuditQuerySchema`
- `ReportTextQuerySchema`, `DfnWithDateQuerySchema`

### Order Checks (unique)
- `OrderCheckSeverity`, `OrderCheckCategory`, `OrderCheckFinding` — `routes/cprs/order-check-types.ts`
- `OrderCheckSession`, `PreSignCheckResult` — `routes/cprs/order-check-types.ts`

---

## 4. ORPHANED MODELS

Models defined but with no detected consumers, or models whose only import
is from their own barrel `index.ts`.

| Model | File | Status |
|-------|------|--------|
| `NextQuestionProvider` (interface) | `intake/types.ts` | Defined but brain plugins implement their own; no direct `implements` found |
| `SummaryProvider` (interface) | `intake/types.ts` | Same as above — brain plugins use `IntakeBrainPlugin.finalizeSummary()` instead |
| `RadWritebackPosture` | `radiology/types.ts` | Defined for future VistA writeback; not yet consumed by any route |
| `AutoEndCandidate` | `telehealth/session-hardening.ts` | Defined for session auto-end; timer checks inline, type not referenced externally |
| `ConsentRequirement` | `telehealth/consent-posture.ts` | Defined but consent flow uses `ConsentCategory[]` directly |
| `ProbeEncounterResult` | `telehealth/encounter-link.ts` | Defined for VistA encounter probe; not yet consumed (encounter linking is pending) |
| `EdBoardMetrics` | `service-lines/ed/types.ts` | Defined for real-time ED board; no route returns this type yet |
| `OrBoardMetrics` | `service-lines/or/types.ts` | Defined for OR board display; no route returns this type yet |
| `IcuMetrics` | `service-lines/icu/types.ts` | Defined for ICU dashboard; no route returns this type yet |
| `AnesthesiaType`, `AnesthesiaRecord` | `service-lines/or/types.ts` | Defined for OR anesthesia tracking; not yet wired to routes |
| `DlqEntry` | `services/event-bus.ts` | Dead-letter queue entry; defined but DLQ viewer not yet implemented |
| `ComplianceMatrix`, `ComplianceRequirement` | `services/compliance-matrix.ts` | Compliance framework scaffolded but no routes consume yet |
| `FacilityType`, `Facility`, `Department`, `Location` | `services/facility-service.ts` | Facility model scaffolded; route returns stubbed data |
| `WebModuleDefinition` | `apps/web/src/modules/registry.ts` | Client-side module registry; defined but module guard uses API-side only |

---

## 5. STRUCTURAL RECOMMENDATIONS

### 5.1 Create `packages/types` shared package

A new `packages/types/` package would eliminate the most painful cross-app
duplications (D-05, D-06, D-07, D-08, D-13, D-14). It would export:

- `UserRole` (after D-01 unification)
- `SessionUser` (subset of `SessionData` for web consumption)
- `PatientDemographics`, `Patient`
- `SupportedLocale` (replace 3 local definitions)
- `ModuleId` variants (after D-03 rename)
- Clinical record shapes (`Allergy`, `Vital`, `Note`, `Medication`, `Problem`)
- `TenantConfig`, `UIDefaults`, `FeatureFlags`

Estimated LOC saved: ~200 lines of duplicate type declarations.

### 5.2 Extract `HashChainedAuditEntry<T>` base interface

```typescript
// lib/audit-base.ts
export interface HashChainedAuditEntry<TAction extends string = string> {
  seq: number;
  hash: string;
  prevHash: string;
  timestamp: string;
  action: TAction;
  tenantId?: string;
  detail?: Record<string, unknown>;
}
```

Imaging, RCM, and Immutable audit entries extend this with domain-specific
fields (actor shapes, domain IDs). Standardizes `prevHash` naming, reduces
structural duplication, ensures new audit trails follow the same pattern.

### 5.3 Consolidate portal page-local types

Move all ~30 portal page-local interfaces into `apps/portal/src/types/` with
one file per domain (`appointments.ts`, `consents.ts`, `telehealth.ts`, etc.).
Pages import from there. Enables type reuse across portal pages.

### 5.4 Prefix service-line generic types

Apply domain prefixes to all generic type names in service-line modules:
- ED: `BedStatus` → `EdBedStatus`
- OR: `CasePriority` → `OrCasePriority`
- ICU: `FlowsheetCategory` → `IcuFlowsheetCategory`, `IoType` → `IcuIoType`
- Radiology: `ReportStatus` → `RadReportStatus`, `PeerReview` → `RadPeerReview`

---

## 6. STATISTICS

| Metric | Value |
|--------|-------|
| Total domain model definitions scanned | ~514 |
| HIGH severity duplicates | 9 (D-01 through D-09) |
| MEDIUM severity duplicates | 8 (D-10 through D-17) |
| LOW severity naming issues | 3 (D-18 through D-20) |
| Intentional TS↔PG pairs | 14 |
| Models with no conflicts | ~300+ |
| Orphaned / dead models | 14 |
| Estimated LOC of pure type duplication | ~400 |
| Domains scanned | 28 |
| Files scanned | 50+ type-defining files |

---

## Appendix: Files Touched in This Audit

**Read/analyzed (API):**
- `apps/api/src/auth/` — session-store.ts, policy-engine.ts, oidc-provider.ts, jwt-validator.ts, abac-engine.ts, abac-attributes.ts, session-security.ts, step-up-auth.ts, mfa-enforcement.ts, scim-server.ts, key-provider.ts, envelope-encryption.ts, rotation-manager.ts, tenant-security-policy.ts, privacy-segmentation.ts, siem-sink.ts, security-alerts.ts, idp/types.ts, dept-role-templates.ts, biometric/types.ts
- `apps/api/src/adapters/` — types.ts, scheduling/interface.ts, clinical-engine/, billing/, imaging/, messaging/
- `apps/api/src/rcm/` — domain/claim.ts, domain/payer.ts, domain/remit.ts, domain/claim-store.ts, edi/types.ts, edi/pipeline.ts, validation/engine.ts, connectors/types.ts, denials/types.ts, reconciliation/types.ts, audit/rcm-audit.ts
- `apps/api/src/services/` — imaging-worklist.ts, imaging-devices.ts, imaging-authz.ts, imaging-audit.ts, portal-appointments.ts, consent-engine.ts, facility-service.ts, event-bus.ts, compliance-matrix.ts
- `apps/api/src/telehealth/` — types.ts, device-check.ts, session-hardening.ts, encounter-link.ts, consent-posture.ts
- `apps/api/src/intake/` — types.ts, brain/types.ts
- `apps/api/src/modules/` — module-registry.ts, capability-service.ts
- `apps/api/src/config/` — tenant-config.ts, analytics-config.ts, imaging-tenant.ts
- `apps/api/src/platform/` — pg/pg-schema.ts, runtime-mode.ts, store-resolver.ts, store-policy.ts
- `apps/api/src/lib/` — audit.ts, immutable-audit.ts, validation.ts
- `apps/api/src/service-lines/` — ed/types.ts, or/types.ts, icu/types.ts, rbac.ts
- `apps/api/src/radiology/` — types.ts
- `apps/api/src/routes/` — scheduling/writeback-guard.ts, cprs/order-check-types.ts, portal-auth.ts
- `apps/api/src/jobs/` — registry.ts, governance.ts, backpressure.ts, tasks/pg-backup.ts

**Read/analyzed (Web):**
- `apps/web/src/lib/` — chart-types.ts, vista-panel-wiring.ts, contracts/types.ts, theme-tokens.ts, fetch-with-correlation.ts, i18n.ts
- `apps/web/src/stores/` — data-cache.tsx, session-context.tsx, patient-context.tsx, tenant-context.tsx, cprs-ui-state.tsx
- `apps/web/src/actions/` — actionRegistry.ts
- `apps/web/src/modules/` — registry.ts

**Read/analyzed (Portal):**
- `apps/portal/src/app/dashboard/` — telehealth/page.tsx, appointments/page.tsx, consents/page.tsx, refills/page.tsx, proxy/page.tsx, records/page.tsx, tasks/page.tsx, account/page.tsx, documents/page.tsx, intake/page.tsx, intake/[id]/page.tsx, activity/page.tsx, sharing/page.tsx, immunizations/page.tsx
- `apps/portal/src/lib/` — api.ts, i18n.ts

**Read/analyzed (Packages):**
- `packages/locale-utils/src/` — index.ts, audit-keys.ts
