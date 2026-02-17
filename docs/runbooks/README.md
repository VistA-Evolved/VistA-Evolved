# Runbooks

Runbooks are step-by-step operational guides for developers.

## What will live here
- Local setup (Docker, Node, YottaDB/VistA)
- Troubleshooting common failures (bridge issues, RPC issues, container issues)
- Developer workflows (branching, testing, releases)
- Deployment notes (later)

## Phase 10 — CPRS Extract

| Subphase | Runbook | Command |
|----------|---------|---------|
| 10A — Inventory Extraction | [cprs-inventory-extraction.md](cprs-inventory-extraction.md) | `pnpm run cprs:extract` |
| 10B — Contract Generation | [cprs-contract-generation.md](cprs-contract-generation.md) | `pnpm run cprs:extract` (then validate) |
| 10C — Replica Shell (Web UI) | [cprs-replica-shell.md](cprs-replica-shell.md) | `pnpm -C apps/web build` |
| 10D — API Scaffold Generator | [cprs-api-scaffold-generator.md](cprs-api-scaffold-generator.md) | `pnpm run cprs:generate-stubs` |

## Phase 15 — Enterprise Hardening

| Phase | Runbook |
|-------|--------|
| 15 — Enterprise Hardening Baseline | [enterprise-hardening-phase15.md](enterprise-hardening-phase15.md) |
| 15B — VistA-first Security | [enterprise-hardening-phase15b.md](enterprise-hardening-phase15b.md) |

## Phase 16 — Production Readiness

| Topic | Runbook |
|-------|--------|
| Production Deployment | [prod-deploy-phase16.md](prod-deploy-phase16.md) |
| Observability | [observability-phase16.md](observability-phase16.md) |
| Backup & Restore | [backup-restore-phase16.md](backup-restore-phase16.md) |
| Incident Response | [incident-response-phase16.md](incident-response-phase16.md) |

## Phase 17 — Multi-Tenant Control Plane

| Topic | Runbook |
|-------|--------|
| Multi-Tenant Admin & RBAC | [multitenant-control-plane-phase17.md](multitenant-control-plane-phase17.md) |

## Phase 18 — Interop + Imaging Platform Integration

| Topic | Runbook |
|-------|--------|
| Integration Registry, Imaging & Device Onboarding | [interop-imaging-phase18.md](interop-imaging-phase18.md) |

## Phase 19 — Reporting + Export Governance

| Topic | Runbook |
|-------|--------|
| Reporting, Export Governance & Ops Analytics | [vista-reporting-export-governance.md](vista-reporting-export-governance.md) |

## Rule
If someone gets stuck twice on the same thing, write a runbook.
