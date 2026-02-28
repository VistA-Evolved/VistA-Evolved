# Phase 238 — OSS Reuse Audit + ADRs (Wave 6 P1)

## User Request
Audit existing repo functionality to ensure we are NOT rebuilding solved problems.
Lock decisions with Architecture Decision Records (ADRs) for:
HL7 engine, progressive delivery, metering, feature flags, secrets sync, DR/backup.

## Definition of Done
- 6 ADRs created in docs/decisions/
- WAVE6-MANIFEST.md created in docs/waves/
- Repo inventory documented
- Decision matrix JSON produced
- No code changes — decisions only

## Implementation Steps

### Step 1: Inventory existing repo functionality
Scan and document existing code for:
- HL7v2 (ZVEMIOP.m, vista-interop.ts, interop.ts, integration console UI)
- Release engineering (Helm, ArgoCD, canary scripts, rollout-fleet.ps1)
- Feature flags (module-registry.ts, module-guard.ts, capability-service.ts, tenant_feature_flag)
- Usage metering (analytics-store.ts, analytics-aggregator.ts, analytics-etl.ts)
- Secrets strategy (SOPS, credential-encryption.ts, VaultInterface)
- DR/backup (backup-restore.mjs, dr/backup.mjs, restore-verify.mjs, pg-backup.ts)

### Step 2: Write ADRs
Create 6 ADR files in docs/decisions/ with:
Context, Decision, Alternatives, Consequences, Security/PHI notes, Ops notes.

### Step 3: Create WAVE6-MANIFEST.md
List all 10 phases with status placeholders.

### Step 4: Generate evidence artifacts
- artifacts/evidence/phase238/wave6/p1-oss-audit/repo-inventory.md
- artifacts/evidence/phase238/wave6/p1-oss-audit/adr-links.txt
- artifacts/evidence/phase238/wave6/p1-oss-audit/decision-matrix.json

## Files Touched
- docs/decisions/ADR-hl7-engine-choice.md (new)
- docs/decisions/ADR-progressive-delivery-choice.md (new)
- docs/decisions/ADR-metering-choice.md (new)
- docs/decisions/ADR-feature-flags-choice.md (new)
- docs/decisions/ADR-secrets-sync-choice.md (new)
- docs/decisions/ADR-dr-backup-choice.md (new)
- docs/waves/WAVE6-MANIFEST.md (new)
- artifacts/evidence/phase238/wave6/p1-oss-audit/* (new)
