# Phase 30 — Telehealth Provider Adapters + Device Check + Waiting Room

## User Request

PHASE 30 -- TELEHEALTH (provider adapter architecture) + device check + waiting room

A) Provider interface

- TelehealthProvider:
  - createRoom(appointmentId, participants)
  - joinUrl(roomId, role)
  - endRoom(roomId)
- Implement JitsiProvider as default (self-hostable, embed-capable)
- Create stubs for other providers (no hardcoding)

B) UX

- Patient portal:
  - upcoming appointment -> "Test device" -> waiting room -> join
- Clinician side (CPRS shell):
  - appointment list -> join room
- Device check:
  - camera/mic permissions check
  - network check
  - echo test
- Waiting room:
  - display consent + privacy
  - show "provider will join shortly"

C) Security + compliance posture

- Meeting links are short-lived and bound to session
- No PHI in meeting URL
- Audit events: room created/joined/ended
- Optional recording is OFF by default; if enabled later, document consent workflow

D) Reuse reference code

- Review reference/ottehr ehr main telehealth patterns
- Review reference/All In One Telehealth Platform -AIOTP- patterns
- Reuse only if license permits; record in THIRD_PARTY_NOTICES

E) Docs

- docs/runbooks/phase30-telehealth.md

## Implementation Steps

1. Create prompt file
2. Inventory existing telehealth, appointment, and portal patterns
3. Create TelehealthProvider interface + JitsiProvider + stubs
4. Create room store + audit events
5. Create device check service
6. Create telehealth API routes
7. Create portal UI: device check, waiting room, join pages
8. Create clinician panel (TelehealthPanel or extend existing)
9. Wire into index.ts
10. TSC compile check
11. Documentation + ops artifacts
12. Commit

## Verification

- TSC clean across api, web, portal
- All routes registered
- Provider adapter pattern (no hardcoded provider)
- Device check permissions flow
- Waiting room consent display
- Audit events for room lifecycle
- No PHI in URLs
- Recording OFF by default

## Files Touched

See ops/phase30-summary.md after implementation.
