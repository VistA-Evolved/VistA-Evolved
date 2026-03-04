# Phase 75 IMPLEMENT -- Go-Live Evidence Pack v1

## User Request

Produce an investor/hospital-grade evidence pack without claiming "HIPAA compliant".
Focus: technical controls + reproducible drills + budgets + incident readiness.

## DoD

- A) Backup + restore drill runnable and produces artifact evidence
- B) Performance budgets enforced (p95 latency, error rate, memory growth)
- C) Security posture checklist mapped to technical controls (no legal claims)
- D) Evidence pack produced at /artifacts/evidence/phase75/\*\*

## Implementation Steps

### 1. Backup/Restore Drill (TypeScript wrappers)

- Create `scripts/ops/backup-drill-evidence.ts` -- runs Phase 62 backup drill, copies evidence to `/artifacts/evidence/phase75/backup/`
- Create `scripts/ops/restore-drill-evidence.ts` -- validates backup, copies evidence to `/artifacts/evidence/phase75/backup/`

### 2. Performance Budget Enforcement

- Create `scripts/ops/perf-budget-smoke.ts` -- runs Node.js HTTP smoke test against budgets from `config/performance-budgets.json`, outputs to `/artifacts/evidence/phase75/perf/`
- No k6 dependency required -- uses native Node.js fetch for portability

### 3. Security Posture ADR

- Create `docs/decisions/ADR-security-controls-v1.md` -- technical control matrix, NO legal claims
- Maps to: audit integrity, least privilege, session security, log redaction, SBOM existence

### 4. Evidence Pack Orchestrator

- Create `scripts/ops/generateEvidencePack.ts` -- runs sanity checks, perf smoke, backup/restore, SBOM, writes manifest
- Output: `/artifacts/evidence/phase75/manifest.json`

### 5. Verifier + Prompts

- `scripts/verify-phase75-evidence-pack.ps1`
- Update `scripts/verify-latest.ps1`
- Prompt files in `prompts/80-PHASE-75-GO-LIVE-EVIDENCE-PACK/`

## Files Touched

- `scripts/ops/backup-drill-evidence.ts` (new)
- `scripts/ops/restore-drill-evidence.ts` (new)
- `scripts/ops/perf-budget-smoke.ts` (new)
- `scripts/ops/generateEvidencePack.ts` (new)
- `docs/decisions/ADR-security-controls-v1.md` (new)
- `scripts/verify-phase75-evidence-pack.ps1` (new)
- `scripts/verify-latest.ps1` (update)
- `prompts/80-PHASE-75-GO-LIVE-EVIDENCE-PACK/80-01-IMPLEMENT.md` (new)
- `prompts/80-PHASE-75-GO-LIVE-EVIDENCE-PACK/80-99-VERIFY.md` (new)
