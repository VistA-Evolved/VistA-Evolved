# Phase 30: Telehealth — Provider Adapter Architecture

## Overview

Phase 30 implements a **provider-agnostic telehealth system** with:
- **Provider adapter pattern** (no hardcoded vendor)
- **Self-hostable Jitsi Meet** as default provider
- **Device check** (camera, microphone, WebRTC, browser compatibility)
- **Waiting room** with live status polling
- **No PHI** in meeting URLs, room names, or tokens
- **Recording OFF** by default (consent workflow for future enablement)

## Architecture

```
TelehealthProvider interface
    |
    +-- JitsiProvider (default, self-hostable)
    +-- StubProvider  (testing / template)
    +-- [ZoomProvider, TwilioProvider] (future stubs)
    |
Room Store (in-memory lifecycle)
    created -> waiting -> active -> ended
    |
    auto-expire after 4h
    |
Routes
    /telehealth/*           (clinician, session auth)
    /portal/telehealth/*    (patient, portal session)
    |
UI
    Portal: device check -> waiting room -> video visit (iframe)
    CPRS:   TelehealthPanel (create room, join, manage)
```

## Configuration

| Env Variable | Default | Description |
|---|---|---|
| `TELEHEALTH_PROVIDER` | `jitsi` | Provider adapter name |
| `JITSI_BASE_URL` | `https://meet.jit.si` | Jitsi instance URL |
| `JITSI_APP_ID` | (empty) | Jitsi app ID for JWT auth |
| `JITSI_APP_SECRET` | (empty) | Jitsi secret for JWT signing |
| `JITSI_JOIN_TTL_SECONDS` | `3600` | Join URL validity |
| `TELEHEALTH_ROOM_TTL_MS` | `14400000` | Max room lifetime (4h) |
| `TELEHEALTH_TURN_URL` | (empty) | Self-hosted TURN server |
| `TELEHEALTH_TURN_USERNAME` | (empty) | TURN username |
| `TELEHEALTH_TURN_CREDENTIAL` | (empty) | TURN credential |

## API Endpoints

### Clinician Routes (session auth)

| Method | Path | Description |
|---|---|---|
| POST | `/telehealth/rooms` | Create room for appointment |
| GET | `/telehealth/rooms` | List active rooms |
| GET | `/telehealth/rooms/:roomId` | Get room status |
| POST | `/telehealth/rooms/:roomId/join` | Join room (get video URL) |
| POST | `/telehealth/rooms/:roomId/end` | End room |
| GET | `/telehealth/rooms/:roomId/waiting` | Get waiting room state |
| GET | `/telehealth/device-check/requirements` | Device requirements |
| GET | `/telehealth/health` | Provider health check |

### Patient Routes (portal session)

| Method | Path | Description |
|---|---|---|
| GET | `/portal/telehealth/appointment/:id/room` | Get room for appointment |
| POST | `/portal/telehealth/rooms/:roomId/join` | Patient join |
| GET | `/portal/telehealth/rooms/:roomId/waiting` | Waiting room state |
| GET | `/portal/telehealth/device-check` | Device requirements |
| POST | `/portal/telehealth/device-check/report` | Submit device check |

## Room Lifecycle

1. **Created** — Clinician creates room via POST `/telehealth/rooms`
2. **Waiting** — Patient or provider joins; waiting room shows status
3. **Active** — Both parties connected
4. **Ended** — Clinician ends room or room auto-expires (4h)

## Security

- Room IDs are opaque hex tokens (`ve-{randomBytes(12)}`)
- No patient names, DFN, or medical info in URLs
- Join URLs are time-limited (default 1 hour)
- Jitsi JWT auth available when `JITSI_APP_SECRET` is set
- Portal audit trail: `portal.telehealth.room.created`, `portal.telehealth.joined`, `portal.telehealth.ended`, `portal.telehealth.device.check`
- Recording is disabled by default via Jitsi config overrides

## Device Check Flow

1. Patient clicks "Prepare for Visit"
2. Client-side check runs: camera, microphone, speaker, browser, WebRTC
3. Results displayed with pass/fail for each capability
4. Report submitted to server for audit
5. Patient proceeds to waiting room

## Self-Hosting Jitsi

For production, deploy Jitsi Meet with JWT auth:

```bash
# docker-compose.yml for Jitsi
# See https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-docker

# Set env vars:
JITSI_BASE_URL=https://meet.yourdomain.com
JITSI_APP_ID=vista-evolved
JITSI_APP_SECRET=your-secret-here
```

## Adding a New Provider

1. Create `apps/api/src/telehealth/providers/<name>-provider.ts`
2. Implement `TelehealthProvider` interface
3. Add to registry in `providers/index.ts`
4. Set `TELEHEALTH_PROVIDER=<name>` in `.env.local`

## Testing

```bash
# Health check
curl http://localhost:3001/telehealth/health

# Create room (requires clinician session)
curl -X POST http://localhost:3001/telehealth/rooms \
  -H "Content-Type: application/json" \
  -d '{"appointmentId":"test-123"}' \
  --cookie "ehr_session=..."

# Device requirements (public)
curl http://localhost:3001/telehealth/device-check/requirements
```

## Files Changed

| File | Action |
|---|---|
| `apps/api/src/telehealth/types.ts` | New — Provider interface, room types |
| `apps/api/src/telehealth/providers/jitsi-provider.ts` | New — Jitsi adapter |
| `apps/api/src/telehealth/providers/index.ts` | New — Provider registry |
| `apps/api/src/telehealth/room-store.ts` | New — Room lifecycle store |
| `apps/api/src/telehealth/device-check.ts` | New — Device check service |
| `apps/api/src/routes/telehealth.ts` | New — All telehealth routes |
| `apps/api/src/index.ts` | Modified — Route registration |
| `apps/api/src/middleware/security.ts` | Modified — Auth rules + shutdown |
| `apps/api/src/services/portal-audit.ts` | Modified — Telehealth audit actions |
| `apps/portal/src/app/dashboard/telehealth/page.tsx` | Replaced — Full telehealth UI |
| `apps/portal/src/lib/api.ts` | Modified — Telehealth API functions |
| `apps/web/src/components/cprs/panels/TelehealthPanel.tsx` | New — Clinician panel |
| `apps/web/src/components/cprs/panels/index.ts` | Modified — Barrel export |
| `apps/web/src/components/cprs/CPRSTabStrip.tsx` | Modified — Tab module map |
| `apps/web/src/lib/contracts/data/tabs.json` | Modified — Telehealth tab |
| `apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx` | Modified — Panel routing |
