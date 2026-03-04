# Pilot Mode & Feature Toggle Guide

> **Phase 273**: How to run VistA-Evolved in pilot mode with controlled feature rollout.

---

## Runtime Modes

Set via `PLATFORM_RUNTIME_MODE` environment variable:

| Mode   | PostgreSQL   | OIDC         | SQLite  | JSON Stores | Use Case                    |
| ------ | ------------ | ------------ | ------- | ----------- | --------------------------- |
| `dev`  | Optional     | Optional     | Allowed | Allowed     | Local development           |
| `test` | Optional     | Optional     | Allowed | Allowed     | CI/CD testing               |
| `rc`   | **Required** | **Required** | Blocked | Blocked     | Release candidate / staging |
| `prod` | **Required** | **Required** | Blocked | Blocked     | Production                  |

### Switching to Pilot Mode

For a pilot hospital deployment, use `rc` mode:

```bash
# .env.local for pilot
PLATFORM_RUNTIME_MODE=rc
PLATFORM_PG_URL=postgresql://user:pass@host:5432/vistaevolved
OIDC_ENABLED=true
OIDC_ISSUER=https://keycloak.yourdomain.com/realms/vista-evolved
OIDC_CLIENT_ID=vista-evolved-api
```

---

## Deploy SKU Profiles

Set via `DEPLOY_SKU` environment variable:

| SKU               | Active Modules                            | Use Case              |
| ----------------- | ----------------------------------------- | --------------------- |
| `FULL_SUITE`      | All 12 modules                            | Full deployment       |
| `CLINICIAN_ONLY`  | kernel, clinical, scheduling, imaging, ai | Clinician workstation |
| `PORTAL_ONLY`     | kernel, portal, intake, telehealth        | Patient portal        |
| `TELEHEALTH_ONLY` | kernel, telehealth                        | Telehealth-only site  |
| `RCM_ONLY`        | kernel, clinical, rcm                     | Revenue cycle only    |
| `IMAGING_ONLY`    | kernel, imaging                           | Imaging department    |
| `INTEROP_ONLY`    | kernel, interop                           | HL7/FHIR gateway      |

### Pilot Hospital Recommendation

Start with `CLINICIAN_ONLY` for the pilot:

```bash
DEPLOY_SKU=CLINICIAN_ONLY
```

This enables: kernel, clinical, scheduling, imaging, ai — covering the
core clinical workflow without portal, RCM, or interop complexity.

---

## Per-Tenant Module Overrides

Override the SKU defaults for a specific tenant:

```bash
# Enable additional modules for a specific tenant
curl -X POST http://API_URL/api/modules/override \
  -H "Content-Type: application/json" \
  -b admin-cookies.txt \
  -d '{
    "tenantId": "pilot-hospital-1",
    "modules": [
      { "moduleId": "clinical", "enabled": true },
      { "moduleId": "imaging", "enabled": true },
      { "moduleId": "portal", "enabled": false }
    ]
  }'

# Clear overrides (revert to SKU defaults)
curl -X POST http://API_URL/api/modules/override \
  -H "Content-Type: application/json" \
  -b admin-cookies.txt \
  -d '{ "tenantId": "pilot-hospital-1", "modules": null }'
```

---

## Feature Flags

Feature flags provide fine-grained control within modules:

```bash
# Set a feature flag for a tenant
curl -X POST http://API_URL/admin/modules/feature-flags \
  -H "Content-Type: application/json" \
  -b admin-cookies.txt \
  -d '{
    "tenantId": "pilot-hospital-1",
    "flagKey": "enable_ai_triage",
    "flagValue": "false",
    "moduleId": "ai"
  }'
```

### Pre-Defined Feature Flags

| Flag Key                      | Module     | Default | Description                                |
| ----------------------------- | ---------- | ------- | ------------------------------------------ |
| `enable_ai_triage`            | ai         | false   | AI-powered intake triage                   |
| `enable_telehealth_recording` | telehealth | false   | Call recording (requires consent workflow) |
| `enable_edi_submission`       | rcm        | false   | Live EDI claim submission                  |
| `enable_philhealth_api`       | rcm        | false   | PhilHealth eClaims API                     |
| `enable_break_glass`          | imaging    | true    | Emergency imaging access                   |
| `enable_audit_shipping`       | kernel     | false   | S3/MinIO audit offload                     |
| `enable_ohif_viewer`          | imaging    | false   | Embedded OHIF DICOM viewer                 |

---

## Adapter Selection

Control VistA vs stub backends per adapter type:

```bash
# Use VistA for clinical, stub for everything else
ADAPTER_CLINICAL_ENGINE=vista
ADAPTER_SCHEDULING=stub
ADAPTER_BILLING=stub
ADAPTER_IMAGING=stub
ADAPTER_MESSAGING=stub
```

### Pilot Hospital Configuration

```bash
# Pilot: VistA clinical + scheduling, stub for billing/imaging/messaging
ADAPTER_CLINICAL_ENGINE=vista
ADAPTER_SCHEDULING=vista
ADAPTER_BILLING=stub
ADAPTER_IMAGING=vista
ADAPTER_MESSAGING=stub
```

Stub adapters return `{ok: false, pending: true}` for all operations.
If a VistA adapter fails to load, it auto-falls back to stub.

---

## Capability Verification

Check what's actually enabled for a tenant:

```bash
# Check capabilities
curl -s http://API_URL/api/capabilities | jq .

# Check adapter health
curl -s http://API_URL/api/adapters/health | jq .

# Check module status
curl -s http://API_URL/api/modules | jq .
```

Expected output for `CLINICIAN_ONLY` pilot:

```json
{
  "clinical": { "status": "configured", "adapters": ["vista"] },
  "scheduling": { "status": "configured", "adapters": ["vista"] },
  "imaging": { "status": "configured", "adapters": ["vista"] },
  "ai": { "status": "pending", "adapters": ["stub"] },
  "portal": { "status": "disabled" },
  "rcm": { "status": "disabled" }
}
```

---

## Rollout Strategy

### Phase 1: Shadow Mode (Week 1)

- Deploy alongside existing system
- Users have both systems available
- Clinical data reads from VistA (shared source of truth)
- No writes through VistA-Evolved yet

### Phase 2: Parallel Run (Week 2-3)

- Selected users start writing through VistA-Evolved
- Each write verified against VistA (truth gate pattern)
- Both systems show same data

### Phase 3: Primary (Week 4+)

- VistA-Evolved becomes primary for enabled modules
- Legacy system available as fallback
- Monitor adoption metrics

### Rollback at Any Phase

- Set `DEPLOY_SKU=CLINICIAN_ONLY` with all stubs
- Users fall back to legacy system
- No data loss (VistA remains source of truth)
