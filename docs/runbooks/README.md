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

## Phase 20 — VistA-First Grounding

Phase 20 is a **documentation + governance phase** (no new endpoints/UI).
Grounding documents live in `docs/` (not in `runbooks/`):

| Document | Purpose |
|----------|---------|
| [../vista-capability-matrix.md](../vista-capability-matrix.md) | Full screen→VistA package→RPC→FileMan mapping |
| [../interop-grounding.md](../interop-grounding.md) | HL7/HLO file architecture → Interop Monitor binding |
| [../imaging-grounding.md](../imaging-grounding.md) | VistA Imaging files → OHIF/Orthanc build strategy |
| [../reporting-grounding.md](../reporting-grounding.md) | Clinical vs. platform reporting separation |
| [../fhir-posture.md](../fhir-posture.md) | VistA-first, FHIR-second interop strategy |
| [../octo-analytics-plan.md](../octo-analytics-plan.md) | Platform telemetry architecture |
| [../ai-gateway-plan.md](../ai-gateway-plan.md) | Governed clinical AI integration plan |

## Rule
If someone gets stuck twice on the same thing, write a runbook.
