# Phase 64 -- Secure Messaging v1 Summary

## What Changed

- **Secure messaging service** (`secure-messaging.ts`): In-memory message store
  with MailMan RPC bridge. Uses `DSIC SEND MAIL MSG` for send,
  `ORQQXMB MAIL GROUPS` for mail group listing. Rate-limited (clinician
  60/hr, portal 10/hr). Read-inbox via local store only (MailMan read gap).
- **Messaging routes** (`routes/messaging/index.ts`): 10 REST endpoints for
  clinician inbox/sent/compose/read and portal send/inbox/health plus mail
  groups. PHI-safe audit (message bodies never logged).
- **Clinician messaging UI** (`cprs/messages/page.tsx`): 3-tab interface
  (inbox, sent, compose) with split-pane inbox, reply, mail group picker,
  priority selector, VistA sync status.
- **Portal messaging bridge**: Portal messages page now bridges to MailMan
  via `/messaging/portal/send`. Shows VistA sync status indicator.
- **Security**: 2 AUTH_RULES added, 3 immutable audit actions
  (`messaging.send`, `messaging.read`, `messaging.portal-send`).
- **Capabilities**: 5 messaging capabilities registered in capabilities.json.

## How to Test Manually

```bash
# With API running (npx tsx --env-file=.env.local src/index.ts in apps/api)
curl -b cookies.txt http://127.0.0.1:3001/messaging/mail-groups
curl -b cookies.txt http://127.0.0.1:3001/messaging/health
curl -b cookies.txt -X POST http://127.0.0.1:3001/messaging/compose \
  -H "Content-Type: application/json" \
  -d '{"subject":"Test","body":"Hello","recipients":[{"type":"user","identifier":"87"}]}'
```

## Verifier Output

```
scripts/verify-phase64-secure-messaging.ps1
```

15 gate groups (G64-01 through G64-15) covering file existence, route
registration, TSC clean, audit actions, auth rules, PHI safety, rate
limiting, capabilities, mail group caching, and dead-click checks.

## Follow-ups

1. Write `ZVEMSGR.m` for MailMan inbox read (replace local store)
2. Thread/reply support through MailMan (XMB basket threading)
3. Attachment support via XMXAPI binary
4. Full portal-to-VistA bidirectional sync
