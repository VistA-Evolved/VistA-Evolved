# Phase 70 — MailMan RPC Bridge Runbook

## Overview

Phase 70 replaces the Phase 64 in-memory message store with VistA MailMan
integration via the custom `ZVEMSGR.m` routine.

## Architecture

```
Browser → Fastify API → safeCallRpc("ZVE MAIL *") → XWB Broker → VistA
                                                                   ↓
                                                            ZVEMSGR.m
                                                                   ↓
                                                     XMXSEND / XMXMBOX / ^XMB
```

## VistA RPCs

| RPC              | File 8994 IEN | Purpose                             |
| ---------------- | ------------- | ----------------------------------- |
| ZVE MAIL FOLDERS | 3113          | List baskets with counts            |
| ZVE MAIL LIST    | 3114          | List messages in basket             |
| ZVE MAIL GET     | 3115          | Read message header+body+recipients |
| ZVE MAIL SEND    | 3116          | Send via XMXSEND + inline delivery  |
| ZVE MAIL MANAGE  | 3117          | Mark read / delete / move           |

## API Endpoints

| Method | Path                            | RPC              |
| ------ | ------------------------------- | ---------------- |
| GET    | /messaging/folders              | ZVE MAIL FOLDERS |
| GET    | /messaging/mail-list?folderId=1 | ZVE MAIL LIST    |
| GET    | /messaging/mail-get?ien=3268    | ZVE MAIL GET     |
| POST   | /messaging/mail-manage          | ZVE MAIL MANAGE  |
| POST   | /messaging/compose              | ZVE MAIL SEND    |
| GET    | /messaging/health               | (diagnostic)     |

## Installing RPCs in a Fresh Container

```powershell
# Copy routines into container
docker cp services/vista/ZVEMSGR.m wv:/tmp/
docker cp services/vista/ZVEMSIN.m wv:/tmp/

# Install into VistA
docker exec -it wv su - wv -c "cp /tmp/ZVEMSGR.m /home/wv/r/ && cp /tmp/ZVEMSIN.m /home/wv/r/"
docker exec -it wv su - wv -c "mumps -r ZVEMSIN"
```

## Known Limitations

1. **TaskMan not running**: ZVEMSGR.m has inline DELIVER that manually
   inserts messages into baskets. In production VistA with TaskMan,
   this is handled automatically.

2. **Body array**: Must use `^TMP("ZVEMSGB",$J)` global temp because
   XMXSEND's MOVEBODY can't see local arrays via indirection.

3. **No thread model**: MailMan messages are flat. Thread view is
   subject-based (RE: prefix matching) in the UI only.

4. **Portal patients**: Don't have real VistA DUZ. Portal send uses
   the session DUZ (provider) as the MailMan sender.

5. **Route layer must not wrap `safeCallRpc*` with extra broker lifecycle calls**:
   the secure-messaging service already uses the resilient broker path with
   `withBrokerLock()`. Adding manual `connect()` / `disconnect()` in route
   handlers can reintroduce mount-time races on pages like `/cprs/messages`
   where folders and inbox are fetched in parallel.

6. **`/cprs/messages` is a protected CPRS surface**: unauthenticated access
   should redirect to `/cprs/login?redirect=%2Fcprs%2Fmessages` before any
   MailMan fetches run. Do not let the page spam protected endpoints and settle
   into an inline `Authentication required` / empty-inbox posture.

## Troubleshooting

### Messages not appearing in inbox

1. Check if DUZ 87 has a mailbox: `W $D(^XMB(3.7,87))` in MUMPS
2. If 0, create: `D CRE8MBOX^XMXMBOX(87)` or send a test message (SEND creates mailbox)
3. Check basket: `ZW ^XMB(3.7,87,2,1,1)` — should show message IENs
4. If `/cprs/messages` intermittently shows `VistA MailMan unavailable` while
   direct curl calls still succeed, inspect the route layer for duplicate
   `connect()` / `disconnect()` wrappers around service functions that already
   call `safeCallRpc` or `safeCallRpcWithList`.
5. If `/cprs/messages` shows `Authentication required` inline instead of the
   login form, inspect the page for missing `useSession()` / router gating and
   ensure protected fetches wait for session readiness.

### Send returns error

1. Check body is not empty (minimum 1 line)
2. Check recipient format: plain DUZ or `G.groupname`
3. Check subject is 3-65 chars

### "ACCESS^Message not in your mailbox"

This is correct behavior — ZVEMSGR enforces that only the mailbox owner
can read messages. The logged-in DUZ must match the mailbox DUZ.
