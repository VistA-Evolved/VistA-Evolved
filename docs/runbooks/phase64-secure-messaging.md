# Phase 64 -- Secure Messaging v1 (MailMan-Backed) + Portal Messaging Posture

## Overview

Clinician-to-clinician secure messaging backed by VistA MailMan RPCs, plus
portal-to-clinic messaging posture that bridges to MailMan when available.

## VistA RPCs Used

| RPC                   | Routine   | Auth       | Purpose                 |
| --------------------- | --------- | ---------- | ----------------------- |
| `DSIC SEND MAIL MSG`  | DSICXM.m  | AGREEMENT  | Send message via XMXAPI |
| `ORQQXMB MAIL GROUPS` | ORQQXQA.m | RESTRICTED | List mail groups        |

### Read-Inbox Gap

MailMan has **no standard RPC** for reading inbox messages. `^XMB(3.9)` basket
entries require direct global access. Phase 64 uses a local in-memory store
for inbox display. Full read sync requires a custom `ZVEMSGR.m` wrapper
routine (migration target).

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
POST /messaging/portal/send -- local store + DSIC SEND MAIL MSG bridge
GET /messaging/portal/inbox -- local store (filtered by DFN)
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

1. **Read inbox:** Write `ZVEMSGR.m` M routine that reads `^XMB(3.9,DUZ,...)`
   baskets and exposes via RPC. Install in VistA and replace local store reads.
2. **Full sync:** On login, call ZVEMSGR to populate local store from VistA.
   On compose, write-through to MailMan and local store.
3. **Attachments:** MailMan supports binary via XMXAPI. Add multipart upload
   endpoint and bridge to MailMan attachment support.

## Manual Testing

```bash
# List mail groups
curl -b cookies.txt http://127.0.0.1:3001/messaging/mail-groups

# Send a message
curl -b cookies.txt -X POST http://127.0.0.1:3001/messaging/compose \
  -H "Content-Type: application/json" \
  -d '{"subject":"Test Message","body":"Hello from Phase 64","recipients":[{"type":"user","identifier":"87"}]}'

# Check inbox
curl -b cookies.txt http://127.0.0.1:3001/messaging/inbox

# Health check
curl -b cookies.txt http://127.0.0.1:3001/messaging/health
```

## Verification

```powershell
.\scripts\verify-phase64-secure-messaging.ps1
```
