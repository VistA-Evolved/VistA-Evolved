# Phase 280 — Wave 10 Manifest + Phase-ID Resolver + OSS Decision ADRs

## Implementation Steps

1. Compute BASE_PHASE by scanning /prompts folder prefixes (max + 1)
2. Create WAVE_10_MANIFEST.md with resolved phase IDs 280–285
3. Create ADR-OSS-BILLING.md in docs/decisions/
4. Create ADR-OSS-FEATURE-FLAGS.md in docs/decisions/
5. Create evidence directory with prompts-scan outputs

## Files Touched

- `prompts/WAVE_10_MANIFEST.md` — Wave manifest with phase IDs
- `prompts/280-PHASE-282-WAVE10-MANIFEST/280-01-IMPLEMENT.md` — This file
- `prompts/280-PHASE-282-WAVE10-MANIFEST/280-99-VERIFY.md` — Verification
- `prompts/280-PHASE-282-WAVE10-MANIFEST/280-NOTES.md` — Notes
- `docs/decisions/ADR-OSS-BILLING.md` — Billing ADR
- `docs/decisions/ADR-OSS-FEATURE-FLAGS.md` — Feature flags ADR
- `evidence/wave-10/280/prompts-scan.json` — Prefix scan
- `evidence/wave-10/280/prompts-scan.txt` — Folder listing
