# Phase 315 — Compliance Evidence Mapping — Evidence

## Requirement Count

| Framework | Requirements | Implemented | Partial | Planned | N/A |
|-----------|-------------|-------------|---------|---------|-----|
| HIPAA | 12 | 8 | 2 | 1 | 1 |
| DPA_PH | 6 | 5 | 0 | 1 | 0 |
| DPA_GH | 5 | 4 | 0 | 1 | 0 |
| **Total** | **23** | **17** | **2** | **3** | **1** |

## Category Distribution

| Category | Count |
|----------|-------|
| access-control | 3 |
| audit | 1 |
| authentication | 1 |
| breach | 3 |
| consent | 2 |
| contracts | 1 |
| data-minimization | 1 |
| data-transfer | 2 |
| encryption | 2 |
| integrity | 1 |
| patient-rights | 3 |
| retention | 1 |
| security | 2 |

## Evidence Artifacts Referenced

| Artifact | Times Referenced |
|----------|-----------------|
| policy-engine.ts | 3 |
| immutable-audit.ts | 3 |
| consent-engine.ts | 3 |
| rpcBrokerClient.ts | 2 |
| oidc-provider.ts | 2 |
| data-residency.ts | 3 |
| phi-redaction.ts | 1 |
| imaging-authz.ts | 1 |
| module-guard.ts | 1 |
| rcm-audit.ts | 1 |

## Route Inventory

| Method | Path | Description |
|--------|------|-------------|
| GET | /compliance/matrix | Full matrix |
| GET | /compliance/summary | All framework summaries |
| GET | /compliance/summary/:fw | Single framework |
| GET | /compliance/requirements | Filter by category/status |
| GET | /compliance/categories | Unique categories |
| GET | /compliance/evidence | All evidence artifacts |
| GET | /compliance/gaps | Planned + partial items |
