# VistA-Evolved — Product Modularity Architecture v1

> **Phase 37C** — Defines module boundaries, adapter interfaces, capability
> registry, and SKU deploy profiles for productized delivery.

---

## 1. Architecture Layers

```
┌──────────────────────────────────────────────────────────┐
│                      SKU Profiles                         │
│  (FULL, CLINICIAN, PORTAL, TELEHEALTH, RCM, IMAGING...)  │
├──────────────────────────────────────────────────────────┤
│                    Module Registry                        │
│  enable/disable modules per tenant, drives route guards   │
├──────────────────────────────────────────────────────────┤
│                  Capability Registry                      │
│  action → status (live/pending/disabled) + adapter ref    │
├──────────────────────────────────────────────────────────┤
│                   Adapter Layer                           │
│  clinical | scheduling | billing | imaging | messaging    │
│     VistA impl (default)  ←→  ExternalStub (fallback)    │
├──────────────────────────────────────────────────────────┤
│                  Platform Kernel                          │
│  auth, audit, security, config, observability, RPC broker │
└──────────────────────────────────────────────────────────┘
```

### Platform Kernel (always active)
- Authentication (VistA RPC + OIDC + Portal IAM)
- Authorization (policy engine, RBAC)
- Audit (immutable hash-chain + imaging audit)
- Observability (metrics, tracing, health probes)
- Session management + tenant config
- RPC Broker client + circuit breaker + resilience

### Modules (toggleable per tenant)
Each module is a named unit with:
- A unique `moduleId`
- Route prefix patterns
- Required capabilities
- Required adapters
- Dependencies on other modules (or kernel)

### Adapters (swappable per module)
Each adapter type has:
- A TypeScript interface
- A VistA implementation (default)
- An ExternalStub implementation (safe fallback)
- Registration in the adapter loader

---

## 2. Module Definitions

| Module ID | Name | Route Prefixes | Depends On | Default Adapter |
|-----------|------|----------------|------------|-----------------|
| `kernel` | Platform Kernel | `/health`, `/ready`, `/version`, `/metrics`, `/auth`, `/admin`, `/audit` | — | — |
| `clinical` | Clinician CPRS Shell | `/vista/*` (clinical routes) | kernel | clinical-engine |
| `portal` | Patient Portal | `/portal/*` | kernel | clinical-engine |
| `telehealth` | Telehealth / Video Visits | `/telehealth/*`, `/portal/telehealth/*` | kernel | telehealth |
| `imaging` | Imaging / PACS | `/imaging/*`, `/vista/imaging/*` | kernel, clinical | imaging |
| `analytics` | Analytics & Reports | `/analytics/*`, `/reports/*` | kernel | — |
| `interop` | Interop / HL7 / HLO | `/vista/interop/*`, `/admin/registry/*` | kernel | messaging |
| `intake` | Intake OS / Questionnaires | `/intake/*`, `/kiosk/*` | kernel | — |
| `ai` | AI Gateway | `/ai/*`, `/portal/ai/*` | kernel | — |
| `iam` | IAM / OIDC / Biometrics | `/iam/*` | kernel | — |
| `rcm` | Revenue Cycle Management | (future routes) | kernel, clinical | billing |
| `scheduling` | Scheduling | (future routes) | kernel | scheduling |

---

## 3. Adapter Interfaces

| Adapter Type | Interface | VistA Impl | Methods |
|-------------|-----------|------------|---------|
| `clinical-engine` | `ClinicalEngineAdapter` | `VistaClinicalAdapter` | searchPatients, getPatient, getAllergies, getVitals, getNotes, getMedications, getProblems, getLabs, getReports |
| `scheduling` | `SchedulingAdapter` | `VistaSchedulingAdapter` | listAppointments, createAppointment, cancelAppointment, getAvailableSlots |
| `billing` | `BillingAdapter` | `VistaBillingAdapter` | getClaims, submitClaim, getEOB, getEligibility |
| `imaging` | `ImagingAdapter` | `VistaImagingAdapter` | getStudies, getStudyMetadata, getViewerUrl, submitOrder, getWorklist |
| `messaging` | `MessagingAdapter` | `VistaMessagingAdapter` | sendHL7, getHL7Status, getQueueDepth, listInterfaces |

Each adapter interface also has an `ExternalStubAdapter` that returns
`{ ok: false, error: 'Module not configured', pending: true }` for every method.

---

## 4. Capability Registry

Capabilities are canonical action names mapped to:
- **status**: `live` | `pending` | `disabled`
- **module**: which module owns this capability
- **adapter**: which adapter type provides it
- **targetRpc**: the VistA RPC name (if VistA-backed)
- **targetPackage**: the VistA package namespace

The capability service resolves effective capabilities for a tenant by
intersecting: module enablement + adapter availability + RPC probe results.

UI reads `/api/capabilities` and renders:
- `live` → normal interactive behavior
- `pending` → "Integration pending" badge with target RPC info
- `disabled` → hidden from navigation

---

## 5. SKU Profiles

| SKU | Modules Enabled | Target Customer |
|-----|-----------------|-----------------|
| `FULL_SUITE` | all modules | VA Medical Centers, large health systems |
| `CLINICIAN_ONLY` | kernel, clinical, analytics | Small clinics, specialty practices |
| `PORTAL_ONLY` | kernel, portal, intake | Patient engagement companies |
| `TELEHEALTH_ONLY` | kernel, telehealth, portal | Rural health, telehealth startups |
| `RCM_ONLY` | kernel, rcm, analytics | Revenue cycle companies |
| `IMAGING_ONLY` | kernel, imaging, clinical | Radiology groups, imaging centers |
| `INTEROP_ONLY` | kernel, interop, analytics | HIE organizations |

SKU is set via `DEPLOY_SKU` environment variable. It pre-seeds the default
tenant's enabled modules on startup.

---

## 6. Module Toggle Enforcement

### API Side
1. Fastify `onRequest` hook checks the request path against module route patterns
2. If the module is disabled for the requesting tenant → 404 response
3. Module guard runs AFTER auth but BEFORE route handler
4. Kernel routes are always allowed

### UI Side
1. `/api/modules/status` endpoint returns enabled modules for current session
2. Navigation component filters tabs/links by enabled modules
3. Disabled module pages show "Module not enabled for this facility" message

---

## 7. Module Isolation Rules

- No module may import from another module's internal files
- All cross-module communication goes through:
  - Adapter interfaces (for backend integration)
  - Capability registry (for feature discovery)
  - Event bus (future: for async module coordination)
- Disabling a module must NOT cause import errors or crashes
- Each module registers its routes via a registration function that the
  main server calls only if the module is enabled

---

## 8. Migration Path

### Phase 37C (this phase)
- Module registry + manifest files
- Capability registry service
- Adapter interfaces + VistA + Stub implementations
- Module guard middleware
- SKU env var support
- Verifier

### Future phases
- Database-backed tenant config (replace in-memory Map)
- OPA sidecar for policy evaluation
- Adapter marketplace (third-party adapter registration)
- Module marketplace (community modules)
- Per-module billing metering
