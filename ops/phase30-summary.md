# Phase 30 — Summary

## What Changed

Phase 30 implements **telehealth video visit infrastructure** with a provider-agnostic
adapter architecture. The default provider is self-hostable Jitsi Meet.

### New Capabilities
- **Provider Adapter Pattern**: `TelehealthProvider` interface with JitsiProvider default
  and StubProvider for testing. New providers (Zoom, Twilio, WebEx) can be added by
  implementing the interface and registering in the factory.
- **Room Lifecycle Store**: In-memory room management (created → waiting → active → ended)
  with automatic 4-hour expiry and cleanup timer.
- **Device Check**: Client-side camera/microphone/WebRTC/browser detection with
  server-side validation and audit reporting.
- **Waiting Room**: Patient-side polling for provider readiness with live status updates.
- **Portal UI**: Full telehealth flow replacing placeholder — appointment list,
  device check, waiting room, video visit via embedded iframe.
- **Clinician Panel**: CPRS TelehealthPanel for room creation, join, end, and
  active room monitoring.
- **Security**: Opaque room IDs (no PHI), time-limited join URLs, Jitsi JWT auth
  support, recording disabled by default, portal audit trail integration.

### Files Created (8)
- `apps/api/src/telehealth/types.ts` — Provider interface, room/device/waiting types
- `apps/api/src/telehealth/providers/jitsi-provider.ts` — Jitsi Meet adapter
- `apps/api/src/telehealth/providers/index.ts` — Provider registry/factory
- `apps/api/src/telehealth/room-store.ts` — In-memory room lifecycle store
- `apps/api/src/telehealth/device-check.ts` — Device requirements + validation
- `apps/api/src/routes/telehealth.ts` — 13 REST endpoints (clinician + portal)
- `apps/web/src/components/cprs/panels/TelehealthPanel.tsx` — Clinician panel
- `docs/runbooks/phase30-telehealth.md` — Runbook

### Files Modified (8)
- `apps/api/src/index.ts` — Telehealth route registration + room cleanup
- `apps/api/src/middleware/security.ts` — Auth rules + graceful shutdown
- `apps/api/src/services/portal-audit.ts` — 4 new telehealth audit actions
- `apps/portal/src/app/dashboard/telehealth/page.tsx` — Replaced placeholder
- `apps/portal/src/lib/api.ts` — 5 new telehealth API functions
- `apps/web/src/components/cprs/panels/index.ts` — TelehealthPanel barrel export
- `apps/web/src/components/cprs/CPRSTabStrip.tsx` — Telehealth tab module mapping
- `apps/web/src/lib/contracts/data/tabs.json` — CT_TELEHEALTH tab entry
- `apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx` — Telehealth panel routing

## How to Test Manually

```bash
# 1. Start API
cd apps/api
npx tsx --env-file=.env.local src/index.ts

# 2. Health check
curl http://localhost:3001/telehealth/health
# Should return: { ok: true, provider: "Jitsi", healthy: true|false, ... }

# 3. Device requirements (public)
curl http://localhost:3001/telehealth/device-check/requirements
# Should return: { ok: true, requirements: { supportedBrowsers: [...], ... } }

# 4. Portal telehealth (requires portal session)
# Login via portal, navigate to Telehealth page

# 5. CPRS Telehealth tab
# Open patient chart, click Telehealth tab
```

## Verifier Output

TSC compilation: PASS (all 3 projects — api, web, portal)

## Follow-ups

1. Self-hosted Jitsi Docker Compose for production
2. Recording consent workflow (patient opt-in)
3. TURN server configuration for NAT traversal
4. VistA Scheduling RPC integration for appointment-linked rooms
5. Multi-party support (interpreter, caregiver roles)
6. Phase 30 VERIFY script (verification gates)
