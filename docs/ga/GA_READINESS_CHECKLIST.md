# GA Readiness Checklist

> Single source of truth for VistA-Evolved General Availability readiness.
> Each gate must have evidence (file or script output) to pass.
> Run `scripts/ga-checklist.ps1` for automated PASS/FAIL verification.

## Gate Definitions

### G01 -- TLS Termination

| Field        | Value                                       |
| ------------ | ------------------------------------------- |
| Description  | All external endpoints served over TLS 1.2+ |
| Evidence     | `infra/tls/Caddyfile` exists                |
| Script Check | File existence: infra/tls/Caddyfile         |
| Wave Source  | Wave 11 / Phase 287                         |

### G02 -- DR Restore Validation

| Field        | Value                                                                |
| ------------ | -------------------------------------------------------------------- |
| Description  | Disaster recovery backup and restore tested within 30 days           |
| Evidence     | `scripts/backup-restore.mjs` exists and recent evidence in artifacts |
| Script Check | File existence: scripts/backup-restore.mjs                           |
| Wave Source  | Wave 15 / Phase 333                                                  |

### G03 -- Performance Budgets

| Field        | Value                                                          |
| ------------ | -------------------------------------------------------------- |
| Description  | Performance budgets defined and enforceable                    |
| Evidence     | `config/performance-budgets.json` exists with valid structure  |
| Script Check | File existence + JSON parse of config/performance-budgets.json |
| Wave Source  | Wave 12 / Phase 52                                             |

### G04 -- Security Certification Runner

| Field        | Value                                                |
| ------------ | ---------------------------------------------------- |
| Description  | Security certification runner exists and can execute |
| Evidence     | `scripts/verify-wave16-security.ps1` exists          |
| Script Check | File existence: scripts/verify-wave16-security.ps1   |
| Wave Source  | Wave 16 / Phase 345                                  |

### G05 -- Interop Certification Runner

| Field        | Value                                               |
| ------------ | --------------------------------------------------- |
| Description  | Interoperability certification runner exists        |
| Evidence     | `scripts/verify-wave18-ecosystem.ps1` exists        |
| Script Check | File existence: scripts/verify-wave18-ecosystem.ps1 |
| Wave Source  | Wave 18 / Phase 361                                 |

### G06 -- Department Packs Certification

| Field        | Value                                           |
| ------------ | ----------------------------------------------- |
| Description  | Department packs certification runner exists    |
| Evidence     | `scripts/verify-wave17-packs.ps1` exists        |
| Script Check | File existence: scripts/verify-wave17-packs.ps1 |
| Wave Source  | Wave 17 / Phase 353                             |

### G07 -- Scale Certification Runner

| Field        | Value                                               |
| ------------ | --------------------------------------------------- |
| Description  | Scale and performance certification runner exists   |
| Evidence     | `scripts/verify-wave19-analytics.ps1` exists        |
| Script Check | File existence: scripts/verify-wave19-analytics.ps1 |
| Wave Source  | Wave 19 / Phase 369                                 |

### G08 -- Audit Trail Integrity

| Field        | Value                                               |
| ------------ | --------------------------------------------------- |
| Description  | Immutable hash-chained audit trail is implemented   |
| Evidence     | `apps/api/src/lib/immutable-audit.ts` exists        |
| Script Check | File existence: apps/api/src/lib/immutable-audit.ts |
| Wave Source  | Phase 35                                            |

### G09 -- PHI Redaction

| Field        | Value                                             |
| ------------ | ------------------------------------------------- |
| Description  | Centralized PHI redaction in audit and logging    |
| Evidence     | `apps/api/src/lib/phi-redaction.ts` exists        |
| Script Check | File existence: apps/api/src/lib/phi-redaction.ts |
| Wave Source  | Phase 151                                         |

### G10 -- Policy Engine

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| Description  | Default-deny policy engine for authorization       |
| Evidence     | `apps/api/src/auth/policy-engine.ts` exists        |
| Script Check | File existence: apps/api/src/auth/policy-engine.ts |
| Wave Source  | Phase 35                                           |

### G11 -- Module Guard

| Field        | Value                                                   |
| ------------ | ------------------------------------------------------- |
| Description  | SKU-based module guard middleware                       |
| Evidence     | `apps/api/src/middleware/module-guard.ts` exists        |
| Script Check | File existence: apps/api/src/middleware/module-guard.ts |
| Wave Source  | Phase 37C                                               |

### G12 -- Data Plane Posture

| Field        | Value                                                      |
| ------------ | ---------------------------------------------------------- |
| Description  | Production data plane posture checks implemented           |
| Evidence     | `apps/api/src/posture/data-plane-posture.ts` exists        |
| Script Check | File existence: apps/api/src/posture/data-plane-posture.ts |
| Wave Source  | Phase 125                                                  |

### G13 -- RCM Audit Trail

| Field        | Value                                                |
| ------------ | ---------------------------------------------------- |
| Description  | Revenue cycle management audit trail with hash chain |
| Evidence     | `apps/api/src/rcm/audit/rcm-audit.ts` exists         |
| Script Check | File existence: apps/api/src/rcm/audit/rcm-audit.ts  |
| Wave Source  | Phase 38                                             |

### G14 -- Observability Stack

| Field        | Value                                                                             |
| ------------ | --------------------------------------------------------------------------------- |
| Description  | OTel tracing + Prometheus metrics + structured logging                            |
| Evidence     | `apps/api/src/telemetry/tracing.ts` AND `apps/api/src/telemetry/metrics.ts` exist |
| Script Check | File existence: both telemetry files                                              |
| Wave Source  | Phase 36                                                                          |

### G15 -- OIDC / IAM

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| Description  | OIDC authentication provider and IAM routes        |
| Evidence     | `apps/api/src/auth/oidc-provider.ts` exists        |
| Script Check | File existence: apps/api/src/auth/oidc-provider.ts |
| Wave Source  | Phase 35                                           |

### G16 -- Release Train Governance

| Field        | Value                                                          |
| ------------ | -------------------------------------------------------------- |
| Description  | Release calendar, change approval, rollback procedures         |
| Evidence     | `apps/api/src/services/release-train-service.ts` exists        |
| Script Check | File existence: apps/api/src/services/release-train-service.ts |
| Wave Source  | Wave 20 / Phase 371                                            |

### G17 -- Support Ops

| Field        | Value                                                        |
| ------------ | ------------------------------------------------------------ |
| Description  | Support ticket hooks, diagnostics, SLA timers                |
| Evidence     | `apps/api/src/services/support-ops-service.ts` exists        |
| Script Check | File existence: apps/api/src/services/support-ops-service.ts |
| Wave Source  | Wave 20 / Phase 373                                          |

### G18 -- Data Rights Operations

| Field        | Value                                                        |
| ------------ | ------------------------------------------------------------ |
| Description  | Retention, deletion, legal hold workflows                    |
| Evidence     | `apps/api/src/services/data-rights-service.ts` exists        |
| Script Check | File existence: apps/api/src/services/data-rights-service.ts |
| Wave Source  | Wave 20 / Phase 375                                          |

### G19 -- Trust Center Documentation

| Field        | Value                                                 |
| ------------ | ----------------------------------------------------- |
| Description  | Trust center index and security posture documentation |
| Evidence     | `docs/trust-center/TRUST_CENTER.md` exists            |
| Script Check | File existence: docs/trust-center/TRUST_CENTER.md     |
| Wave Source  | Wave 20 / Phase 377                                   |

---

## Running the Checklist

```powershell
# From repo root
.\scripts\ga-checklist.ps1

# With verbose output
.\scripts\ga-checklist.ps1 -Verbose
```

## Evidence Policy

- Evidence files must exist at the documented paths
- Script outputs are captured to `artifacts/ga-checklist/` (gitignored)
- Re-run checklist after each wave to track readiness progression
- All 19 gates must PASS for GA readiness declaration
