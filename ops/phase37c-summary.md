# Phase 37C Summary -- Product Modularity

## What Changed

Phase 37C introduces formal module boundaries, adapter interfaces, a capability registry, deploy profiles (SKUs), and module toggle enforcement across the VistA-Evolved platform.

### New Infrastructure

| Layer | Files | Purpose |
|-------|-------|---------|
| **Config Manifests** | `config/modules.json`, `config/skus.json`, `config/capabilities.json` | Declarative definitions for 12 modules, 7 SKU profiles, 50+ capabilities |
| **Module Registry** | `apps/api/src/modules/module-registry.ts` | Loads modules + SKUs, resolves enabled modules per tenant, route-to-module mapping |
| **Capability Service** | `apps/api/src/modules/capability-service.ts` | Resolves effective capability status (live/pending/disabled) per tenant |
| **Adapter Layer** | `apps/api/src/adapters/` (16 files) | 5 adapter types (clinical-engine, scheduling, billing, imaging, messaging), each with interface + VistA + stub implementations |
| **Adapter Loader** | `apps/api/src/adapters/adapter-loader.ts` | Central registry, env-var driven selection, health checks |
| **Module Guard** | `apps/api/src/middleware/module-guard.ts` | Fastify onRequest hook blocking routes for disabled modules |
| **API Routes** | `apps/api/src/routes/module-capability-routes.ts` | REST endpoints for module status, capability resolution, adapter health |
| **Architecture Doc** | `docs/architecture/product-modularity-v1.md` | Full architecture specification |

### 12 Modules Defined

kernel, clinical, portal, telehealth, imaging, analytics, interop, intake, ai, iam, rcm, scheduling

### 7 SKU Profiles

| SKU | Modules |
|-----|---------|
| FULL_SUITE | All 12 |
| CLINICIAN_ONLY | kernel + clinical + analytics |
| PORTAL_ONLY | kernel + portal + intake |
| TELEHEALTH_ONLY | kernel + telehealth + portal |
| RCM_ONLY | kernel + clinical + rcm + analytics |
| IMAGING_ONLY | kernel + clinical + imaging |
| INTEROP_ONLY | kernel + interop + analytics |

### 5 Adapter Types

Each adapter has a VistA implementation and a stub fallback:
- **clinical-engine** -- patient search, allergies, vitals, notes, meds, problems, labs, reports
- **scheduling** -- appointments, available slots
- **billing** -- claims, EOB, eligibility
- **imaging** -- studies, metadata, viewer URLs, orders, worklist
- **messaging** -- HL7 messages, stats, outbound send, link status

### Env Vars

| Variable | Default | Purpose |
|----------|---------|---------|
| `DEPLOY_SKU` | `FULL_SUITE` | Active SKU profile |
| `ADAPTER_CLINICAL_ENGINE` | `vista` | Clinical adapter variant |
| `ADAPTER_SCHEDULING` | `vista` | Scheduling adapter variant |
| `ADAPTER_BILLING` | `vista` | Billing adapter variant |
| `ADAPTER_IMAGING` | `vista` | Imaging adapter variant |
| `ADAPTER_MESSAGING` | `vista` | Messaging adapter variant |

## How to Test Manually

```bash
# 1. Start API with default SKU (full suite)
cd apps/api
npx tsx --env-file=.env.local src/index.ts

# 2. Login and get session
curl -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" \
  -d '{"accessCode":"PROV123","verifyCode":"PROV123!!"}' -c cookies.txt

# 3. Check module status (admin)
curl -b cookies.txt http://127.0.0.1:3001/api/modules/status

# 4. Check resolved capabilities
curl -b cookies.txt http://127.0.0.1:3001/api/capabilities

# 5. Check capability summary
curl -b cookies.txt http://127.0.0.1:3001/api/capabilities/summary

# 6. Check adapter health
curl -b cookies.txt http://127.0.0.1:3001/api/adapters/health

# 7. Test SKU restriction (set DEPLOY_SKU=PORTAL_ONLY, clinical routes should 403)
DEPLOY_SKU=PORTAL_ONLY npx tsx --env-file=.env.local src/index.ts
curl -b cookies.txt http://127.0.0.1:3001/vista/allergies?dfn=3
# Expected: 403 Module not enabled

# 8. Test adapter stub mode
ADAPTER_CLINICAL_ENGINE=stub npx tsx --env-file=.env.local src/index.ts
curl -b cookies.txt http://127.0.0.1:3001/api/adapters/list
# Expected: clinical-engine shows isStub=true
```

## Verifier Output

```
Phase 37C Verification: PASS=65, FAIL=0, WARN=0
```

## Live Boot Verification (2026-02-19)

All 7 live gates passed with actual API server boots:

| Gate | Description | Result |
|------|-------------|--------|
| G37C-0 | Static regression (65 gates) | **PASS** |
| G37C-1 | TELEHEALTH_ONLY blocks CPRS | **PASS** |
| G37C-2 | PORTAL_ONLY blocks clinician | **PASS** |
| G37C-3 | CLINICIAN_ONLY blocks portal | **PASS** |
| G37C-4 | Adapter swap to stub | **PASS** |
| G37C-5 | Capability registry resolution | **PASS** |
| G37C-6 | Disabled modules don't leak | **PASS** |

Full evidence: `docs/verify/phase37c-verify-report.md`

## Follow-ups

1. **UI capability-driven rendering** -- Web/portal should call `/api/capabilities` and hide/badge features based on effective status
2. **Per-tenant module override UI** -- Admin console tab for managing tenant module overrides
3. **Adapter hot-swap** -- Runtime adapter replacement without restart (foundation in `setAdapter()`)
4. **Docker Compose SKU profiles** -- `docker-compose.sku-portal.yml` override files for each SKU
5. **Integration tests** -- API-level tests proving module guard blocks disabled routes and passes enabled ones
