# Phase 113B -- IMPLEMENT: Hardening (RCM Audit Persistence + CI Evidence Gate + Prompts Tree)

## User Request

Comprehensive hardening-only phase to close gaps identified in Phase 113 preflight audit.
No new features -- strictly structural integrity, data durability, and CI enforcement.

## Deliverables

### A. RCM Audit JSONL File Sink (HIGH)
- Add `appendFileSync` JSONL persistence to `rcm-audit.ts`
- Pattern: follow `payer-audit.ts` (same repo)
- Hash-chain continuity: `recoverLastHash()` reads last line on startup
- Env var `RCM_AUDIT_FILE` for path override, default `logs/rcm-audit.jsonl`
- In-memory ring buffer (20K) remains for fast queries

### B. Evidence Gate CI Wiring (HIGH)
- Wire `evidence-gate.mjs` into 3 GitHub Actions workflows:
  - `ci-verify.yml`: standard mode on every PR
  - `qa-gauntlet.yml`: standard on PR smoke, strict on nightly
  - `quality-gates.yml`: standard mode after security scans

### C. Evidence Staleness Check (MED)
- Add Gate 6 (`checkStaleness`) to `evidence-gate.mjs`
- Threshold: 180 days based on `lastVerifiedAt` field
- Standard mode: WARN on stale/missing timestamps
- Strict mode: FAIL on stale/missing timestamps

### D. Prompts Tree Repair (HIGH)
- Create `115-PHASE-111-CLAIM-LIFECYCLE-SCRUBBER/` folder, move flat 111-* files
- Create `116-PHASE-112-EVIDENCE-GATING/` folder, move flat 112-* files
- Canonical `110-99-VERIFY.md` (91 lines, detailed 3-tier) replaces shorter folder version
- Remove flat duplicates from prompts/ root

### E. Prompts-Tree Health Gate (NEW)
- New `scripts/qa-gates/prompts-tree-health.mjs`
- 5 checks: duplicate-flat, orphan-flat, naming-convention, impl-verify-pair, phase-mismatch
- FAIL on critical drift (duplicate flat files), WARN on convention violations
- Wire into all 3 CI workflows alongside evidence gate

### F. Verify Scripts
- `verify-latest.ps1` delegates to Phase 113B
- New `verify-phase113b-hardening.ps1` with ~35 gates covering all deliverables

## Files Touched

- `apps/api/src/rcm/audit/rcm-audit.ts` -- JSONL file sink + hash recovery
- `scripts/qa-gates/evidence-gate.mjs` -- Gate 6 staleness check
- `scripts/qa-gates/prompts-tree-health.mjs` -- NEW
- `.github/workflows/ci-verify.yml` -- evidence + health gates
- `.github/workflows/qa-gauntlet.yml` -- evidence (standard + strict) + health gates
- `.github/workflows/quality-gates.yml` -- evidence + health gates
- `scripts/verify-latest.ps1` -- delegate to 113B
- `scripts/verify-phase113b-hardening.ps1` -- NEW
- `prompts/115-PHASE-111-CLAIM-LIFECYCLE-SCRUBBER/` -- moved from flat
- `prompts/116-PHASE-112-EVIDENCE-GATING/` -- moved from flat
- `prompts/114-PHASE-110-RCM-CREDENTIAL-VAULT-LOA/110-99-VERIFY.md` -- canonical version

## Verification

Run `scripts/verify-phase113b-hardening.ps1` -- ~35 gates, all must PASS.
