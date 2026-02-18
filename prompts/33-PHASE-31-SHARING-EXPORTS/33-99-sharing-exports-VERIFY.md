# Phase 31 VERIFY -- Sharing + Exports + SHC Gates

## User Request

```
PHASE 31 VERIFY -- Sharing gates

G31-0: regression (verify-latest green)
G31-1: share code (TTL enforced, one-time redeem, 3 wrong DOB lockout, audit logs)
G31-2: export (PDF works, JSON schema validated)
G31-3: security (no PHI in share links, brute-force protections)
G31-4: SHC lane (credential validates)

Deliverable: verify-phase1-to-phase31.ps1; update verify-latest only if green
```

## Implementation Steps

1. Inventory all Phase 31 source files (portal-sharing.ts, portal-pdf.ts, portal-shc.ts, portal-audit.ts, portal-core.ts routes, existing verify scripts)
2. Create prompt file `33-99-sharing-exports-VERIFY.md`
3. Build `scripts/verify-phase1-to-phase31.ps1` with behavioral gates:
   - G31-0: Regression -- delegate to verify-phase1-to-phase30.ps1
   - G31-1: Share code -- TTL constants (60min default, 24h max), MAX_ACCESS_ATTEMPTS=3 lockout, oneTimeRedeem auto-revoke, curated sections, audit trail calls
   - G31-2: Export -- PDF builder %PDF-1.4, JSON schema fields (version, format, sections, metadata), 7 section formatters
   - G31-3: Security -- no raw DFN in share preview, IP masking, section curation enforcement, locked state after max attempts, CAPTCHA stub
   - G31-4: SHC -- feature flag, FHIR Bundle with Patient+Immunization, JWS 3-part format, shc:/ numeric encoding, VC types, devMode flag, CVX coding
4. Run verifier, fix issues until green
5. Update verify-latest.ps1 to point to verify-phase1-to-phase31.ps1
6. Commit

## Verification Steps

- Run `.\scripts\verify-phase1-to-phase31.ps1 -SkipPlaywright -SkipE2E`
- All gates PASS, 0 FAIL, 0 WARN (regression may WARN if Docker not running)

## Files Touched

- `prompts/33-PHASE-31-SHARING-EXPORTS/33-99-sharing-exports-VERIFY.md` (this file)
- `scripts/verify-phase1-to-phase31.ps1` (main deliverable)
- `scripts/verify-latest.ps1` (updated pointer)
