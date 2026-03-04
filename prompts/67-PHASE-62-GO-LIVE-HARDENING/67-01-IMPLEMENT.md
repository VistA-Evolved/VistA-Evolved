# Phase 62 -- GO-LIVE HARDENING PACK v1

## User Request

Make the system pass a credible hospital security/reliability review baseline:
backup/restore drills, tenant isolation proof, tamper-evident audit integrity,
incident response runbooks, performance/load gates, SBOM, security evidence pack.

## Implementation Steps

### A: Inventory artifact (artifacts/phase62/inventory.json)

### B: Backup/restore drill scripts + runbook

### C: Tenant isolation middleware + proof tests

### D: Audit chain verifier script (scripts/security/verifyAuditChain.ts)

### E: Incident response runbooks (3 max)

### F: Performance/load gates (k6 script with budgets)

### G: SBOM generation (CycloneDX, artifact only)

### H: Security baseline ADR (docs/decisions/ADR-security-baseline-v1.md)

### I: Verifier script

## Files Touched

- apps/api/src/middleware/tenant-context.ts (new)
- apps/api/src/lib/tenant-cache.ts (new)
- scripts/ops/backup-drill.ps1 (new)
- scripts/ops/restore-drill.ps1 (new)
- scripts/security/verify-audit-chain.ts (new)
- scripts/load/phase62-smoke.js (new)
- scripts/ops/generate-sbom.ps1 (new)
- scripts/ops/generate-evidence-pack.ps1 (new)
- docs/runbooks/backup-restore.md (new)
- docs/runbooks/incident-response.md (new)
- docs/runbooks/security-triage.md (new)
- docs/runbooks/audit-integrity.md (new)
- docs/decisions/ADR-security-baseline-v1.md (new)
- scripts/verify-phase62-hardening.ps1 (new)
- config/performance-budgets.json (update if needed)
