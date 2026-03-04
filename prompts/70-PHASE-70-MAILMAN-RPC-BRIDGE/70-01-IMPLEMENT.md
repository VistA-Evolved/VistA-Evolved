# Phase 70 — IMPLEMENT: MailMan RPC Bridge (ZVEMSGR.m) + Real Inbox/Sent + Remove Local Store

## User Request

Replace the Phase 64 in-memory messaging store with a VistA MailMan-backed
implementation using custom ZVEMSGR.m routine installed in the VistA Docker
container.

## Implementation Steps

### Step 0 — Inventory & Discovery

- Audit `secure-messaging.ts`, `messaging/index.ts`, `actionRegistry.ts`,
  `rpcRegistry.ts`, portal messaging page, clinician messages page
- Map all Phase 64 endpoints, local store patterns, DSIC dependency

### Step 1 — MailMan API Inspection in Container

- Probe XMXAPI, XMXMBOX, XMXMSGS, XMXSEND routines
- Confirm ^XMB(3.7) mailbox and ^XMB(3.9) message globals exist
- Discover TaskMan not running — messages created but not delivered
- Map SENDMSG^XMXSEND body array requirements

### Step 2 — ZVEMSGR.m Design & Build

- Create `services/vista/ZVEMSGR.m` with 5 RPC entrypoints:
  - FOLDERS: list baskets with total/new counts
  - LIST: list messages in a basket (IEN^subj^fromDUZ^name^date^dir^isNew)
  - GETMSG: read header + body + recipients
  - SEND: compose via SENDMSG^XMXSEND + inline DELIVER to bypass TaskMan
  - MANAGE: mark read / delete / move
- Use ^TMP("ZVEMSGB",$J) for body (XMXSEND indirection fix)
- Inline DELIVER for TaskMan-less sandbox

### Step 3 — RPC Registration

- Create `services/vista/ZVEMSIN.m` installer
- Register 5 RPCs in File 8994: ZVE MAIL FOLDERS, LIST, GET, SEND, MANAGE
- Add all to OR CPRS GUI CHART context (IEN 8552)
- Test with `ZVEMSGT.m` — all gates pass

### Step 4 — API Layer

- Rewrite `secure-messaging.ts`:
  - Replace DSIC SEND MAIL MSG with ZVE MAIL SEND
  - Add `listFolders()`, `listMessages()`, `getVistaMessage()`, `manageMessage()`
  - Keep local Map as fallback cache (VistA unreachable)
  - `sendViaMailMan()` now uses ZVE MAIL SEND with LIST params
- Add new routes in `messaging/index.ts`:
  - GET /messaging/folders
  - GET /messaging/mail-list
  - GET /messaging/mail-get
  - POST /messaging/mail-manage
- Update `rpcRegistry.ts`: add 5 ZVE MAIL RPCs + exceptions
- Add `messaging.manage` to `ImmutableAuditAction` type

### Step 5 — UI Wiring

- Update clinician messages page (`cprs/messages/page.tsx`):
  - Add VistA folder selector (baskets with counts)
  - Primary path: fetch from `/messaging/mail-list`, detail from `/messaging/mail-get`
  - Fallback: legacy `/messaging/inbox` when VistA unavailable
  - Show source indicator (VistA MailMan / Local fallback)
- Update action registry: all messaging actions reference ZVE MAIL RPCs

### Step 6 — Verification

- TypeScript compiles clean
- API starts without errors
- VistA RPCs callable through API endpoints
- UI shows VistA MailMan messages

### Step 7 — Artifacts

- Prompt files: 70-01-IMPLEMENT.md, 70-99-VERIFY.md
- Known-gaps update

## Files Touched

| Path                                        | Action                            |
| ------------------------------------------- | --------------------------------- |
| `services/vista/ZVEMSGR.m`                  | NEW — MailMan RPC bridge routine  |
| `services/vista/ZVEMSIN.m`                  | NEW — RPC installer               |
| `services/vista/ZVEMSGT.m`                  | NEW — Test script (not committed) |
| `apps/api/src/services/secure-messaging.ts` | REWRITTEN — VistA-backed core     |
| `apps/api/src/routes/messaging/index.ts`    | UPDATED — 4 new VistA endpoints   |
| `apps/api/src/vista/rpcRegistry.ts`         | UPDATED — 5 ZVE MAIL RPCs         |
| `apps/api/src/lib/immutable-audit.ts`       | UPDATED — messaging.manage action |
| `apps/web/src/app/cprs/messages/page.tsx`   | UPDATED — VistA folder/message UI |
| `apps/web/src/actions/actionRegistry.ts`    | UPDATED — ZVE MAIL RPCs           |

## Verification Steps

See `70-99-VERIFY.md`
