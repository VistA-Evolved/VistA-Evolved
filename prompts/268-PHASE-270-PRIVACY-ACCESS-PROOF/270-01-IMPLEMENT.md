# Phase 270 — Privacy & Access Controls Proof (W8-P5)

## User Request

Prove PHI is handled safely. PHI log redaction audits, DSAR/export evidence, access control proofs.

## Implementation Steps

1. Create `scripts/privacy/phi-audit.mjs` — comprehensive PHI grep + redaction proof
2. Create `scripts/privacy/dsar-evidence.mjs` — DSAR export flow evidence generator
3. Create `scripts/privacy/access-control-proof.mjs` — RBAC + break-glass + impersonation audit
4. Populate evidence with phi-grep.txt and dsar-export-evidence/

## Files Touched

- scripts/privacy/phi-audit.mjs (new)
- scripts/privacy/dsar-evidence.mjs (new)
- scripts/privacy/access-control-proof.mjs (new)
- evidence/wave-8/P5-privacy-access/ (new)
