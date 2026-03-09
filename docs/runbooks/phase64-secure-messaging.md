# Phase 64 -- Secure Messaging v1 (MailMan-Backed) + Portal Messaging Posture

## Overview

Clinician-to-clinician secure messaging backed by VistA MailMan RPCs, plus
portal-to-clinic messaging posture that bridges to MailMan when available.

## Current Posture

- Clinician MailMan routes are backed by the `ZVE MAIL *` RPC family.
- Portal inbox remains portal-scoped because patient MailMan basket identity is
   not provably bound in this lane.
- Portal send is VistA-first when a clinic mail group is supplied or configured.
- Portal send is local-mode when no VistA group is configured or the MailMan
   path is unavailable.
- Phase 591 hardened the patient Sent history so a just-sent message appears
   immediately in Sent for both local-mode and VistA-backed sends.

## VistA RPCs Used

| RPC                   | Routine   | Auth       | Purpose                        |
| --------------------- | --------- | ---------- | ------------------------------ |
| `ZVE MAIL FOLDERS`    | ZVEMSGR.m | SESSION    | List MailMan baskets           |
| `ZVE MAIL LIST`       | ZVEMSGR.m | SESSION    | List MailMan message metadata  |
| `ZVE MAIL GET`        | ZVEMSGR.m | SESSION    | Read MailMan message           |
| `ZVE MAIL SEND`       | ZVEMSGR.m | SESSION    | Send MailMan message           |
| `ZVE MAIL MANAGE`     | ZVEMSGR.m | SESSION    | Mark read / delete / move      |
| `ORQQXMB MAIL GROUPS` | ORQQXQA.m | RESTRICTED | List mail groups               |

### Portal Inbox Limitation

Patients do not have a proven MailMan basket identity binding in this lane, so
the portal inbox remains portal-scoped. Clinician MailMan inbox and send are
live through `ZVEMSGR.m`, but patient inbox read continues to use the durable
portal store with explicit local-mode labeling.

## Architecture

```
Clinician UI (cprs/messages)
  |
  v
GET /messaging/inbox        -- local store (VistA read gap)
GET /messaging/sent         -- local store
GET /messaging/message/:id  -- local store
POST /messaging/compose     -- local store + DSIC SEND MAIL MSG
GET /messaging/mail-groups  -- ORQQXMB MAIL GROUPS (5-min cache)

Portal UI (dashboard/messages)
  |
  v
POST /portal/mailman/send   -- VistA MailMan primary, durable local mirror
GET /portal/mailman/inbox   -- portal-scoped inbox with source label
GET /portal/messages/sent   -- durable patient sent history, including MailMan mirrors
```

## Security Constraints

1. **No PHI in logs or audit.** Message bodies are never logged. The
   `sanitizeForAudit()` helper passes only `subjectLength` and
   `recipientCount` to the immutable audit trail.
2. **RBAC:** Clinician endpoints require `"session"` auth (DUZ present).
   Portal endpoints use `"none"` auth at the middleware level but perform
   their own session check in-handler.
3. **Rate limiting:** Clinician = 60 messages/hour, Portal = 10 messages/hour.
   Per-sender, in-memory counters (reset on API restart).
4. **Immutable audit actions:** `messaging.send`, `messaging.read`,
   `messaging.portal-send`.

## MailMan LIST Parameter Format

```
ARR("SUBJ")   = "Subject line"
ARR("TEXT",1)  = "First line of body"
ARR("TEXT",2)  = "Second line of body"
ARR("REC",1)   = "87"           -- DUZ of recipient
ARR("REC",2)   = "G.SURGERY"   -- Mail group
ARR("FLAGS")   = ""             -- Optional flags
ARR("FROM")    = "87"           -- Sender DUZ
```

Recipients support prefixes: plain DUZ, `G.groupname`, `I:DUZ` (info copy),
`C:G.group` (CC to group).

## API Endpoints

| Method | Path                          | Auth    | Purpose          |
| ------ | ----------------------------- | ------- | ---------------- |
| GET    | `/messaging/inbox`            | session | Clinician inbox  |
| GET    | `/messaging/sent`             | session | Clinician sent   |
| GET    | `/messaging/message/:id`      | session | Read message     |
| GET    | `/messaging/thread/:threadId` | session | Thread view      |
| POST   | `/messaging/message/:id/read` | session | Mark as read     |
| POST   | `/messaging/compose`          | session | Compose + send   |
| GET    | `/messaging/mail-groups`      | session | List mail groups |
| POST   | `/messaging/portal/send`      | none\*  | Portal send      |
| GET    | `/messaging/portal/inbox`     | none\*  | Portal inbox     |
| GET    | `/messaging/health`           | session | Service health   |

\*Portal routes perform own session validation in handler.

## Files Changed

| File                                              | Change                  |
| ------------------------------------------------- | ----------------------- |
| `apps/api/src/services/secure-messaging.ts`       | NEW -- core service     |
| `apps/api/src/routes/messaging/index.ts`          | NEW -- 10 endpoints     |
| `apps/api/src/lib/immutable-audit.ts`             | EDIT -- 3 audit actions |
| `apps/api/src/middleware/security.ts`             | EDIT -- 2 AUTH_RULES    |
| `apps/api/src/index.ts`                           | EDIT -- wire routes     |
| `apps/web/src/app/cprs/messages/page.tsx`         | NEW -- clinician UI     |
| `apps/portal/src/app/dashboard/messages/page.tsx` | EDIT -- MailMan bridge  |
| `config/capabilities.json`                        | EDIT -- 5 capabilities  |

## Migration Path

1. Add a real patient-to-MailMan identity binding if portal inbox must become
   VistA-readable instead of portal-scoped.
2. Keep write-through mirroring from `/portal/mailman/send` to the portal store
   so Sent history remains truthful even when transport is VistA-first.
3. Attachments remain disabled by default and still need a production storage +
   MailMan delivery strategy before being enabled broadly.

## Manual Testing

```powershell
# Clinician: discover live mail groups
Set-Content -Path clinician-login.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c clinician-cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@clinician-login.json" | Out-Null
curl.exe -s -b clinician-cookies.txt http://127.0.0.1:3001/messaging/mail-groups

# Portal: local-mode send still appears immediately in Sent
Set-Content -Path portal-login.json -Value '{"username":"patient1","password":"Patient1!"}' -NoNewline -Encoding ASCII
Set-Content -Path portal-send.json -Value '{"subject":"Portal sent mirror proof","body":"Verify that a freshly sent portal message appears immediately in Sent history.","category":"general"}' -NoNewline -Encoding ASCII
curl.exe -s -c portal-cookies.txt -X POST http://127.0.0.1:3001/portal/auth/login -H "Content-Type: application/json" -d "@portal-login.json"
curl.exe -s -b portal-cookies.txt -X POST http://127.0.0.1:3001/portal/mailman/send -H "Content-Type: application/json" -d "@portal-send.json"
curl.exe -s -b portal-cookies.txt http://127.0.0.1:3001/portal/messages/sent

# Portal: VistA MailMan send mirrored into Sent when a live clinic group is provided
Set-Content -Path portal-send-vista.json -Value '{"subject":"Portal VistA MailMan proof","body":"Verify VistA MailMan send plus mirrored sent history.","category":"general","clinicGroup":"TEST"}' -NoNewline -Encoding ASCII
curl.exe -s -b portal-cookies.txt -X POST http://127.0.0.1:3001/portal/mailman/send -H "Content-Type: application/json" -d "@portal-send-vista.json"
curl.exe -s -b portal-cookies.txt http://127.0.0.1:3001/portal/messages/sent

Remove-Item clinician-login.json,clinician-cookies.txt,portal-login.json,portal-send.json,portal-send-vista.json,portal-cookies.txt -ErrorAction SilentlyContinue
```

## Verification

```powershell
.\scripts\verify-phase64-secure-messaging.ps1
```
