# Phase 30 VERIFY -- Telehealth gates

## User request
PHASE 30 VERIFY -- Telehealth gates

G30-0 regression: verify-latest green
G30-1 join flow: patient can device-check + join; clinician can join
G30-2 audit: join/leave events logged PHI-safe
G30-3 security: links expire; no PHI in URLs; CSRF/rate limits ok
G30-4 UI audit: 0 dead clicks in telehealth flow
G30-5 provider swap: switching provider config falls back safely if provider not configured

Deliver verify-phase1-to-phase30.ps1; update verify-latest only if green.

## Implementation steps
1. Read existing verify-phase1-to-phase29.ps1 + verify-latest.ps1 for patterns
2. Inventory all Phase 30 files (types, providers, room-store, device-check, routes, UI, docs)
3. Build verify-phase1-to-phase30.ps1 with gates G30-0 through G30-5
4. Run the script
5. Fix any failures, rerun until clean
6. Update verify-latest.ps1 to delegate to phase30
7. Commit

## Verification steps
- All gates pass (PASS count, 0 FAIL)
- verify-latest.ps1 delegates to phase30

## Files touched
- scripts/verify-phase1-to-phase30.ps1 (new)
- scripts/verify-latest.ps1 (updated)
- prompts/32-PHASE-30-TELEHEALTH/32-02-telehealth-VERIFY.md (this file)
