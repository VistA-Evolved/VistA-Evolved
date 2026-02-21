# Phase 70 — MailMan RPC Bridge — Summary

## What Changed

### New VistA Routine: ZVEMSGR.m
- 5 RPC entrypoints for MailMan integration:
  - **FOLDERS**: Lists baskets (IN, WASTE, custom) with total/new counts
  - **LIST**: Lists messages in a basket with metadata
  - **GETMSG**: Reads full message (header + body + recipients)
  - **SEND**: Sends via SENDMSG^XMXSEND with inline delivery (TaskMan bypass)
  - **MANAGE**: Mark read, delete, move between baskets
- Inline DELIVER routine handles basket insertion since TaskMan is not running
- Body stored via `^TMP("ZVEMSGB",$J)` global temp (XMXSEND indirection fix)
- Access control: validates DUZ on every call, checks mailbox ownership

### RPC Registration
- 5 RPCs registered: ZVE MAIL FOLDERS (3113), LIST (3114), GET (3115), SEND (3116), MANAGE (3117)
- All added to OR CPRS GUI CHART context (sub-IENs 2155-2159)

### API Layer Rewrite
- `secure-messaging.ts` rewritten from Phase 64 local-store to VistA-backed
- DSIC SEND MAIL MSG dependency removed (routine missing in sandbox)
- New endpoints: `/messaging/folders`, `/messaging/mail-list`, `/messaging/mail-get`, `/messaging/mail-manage`
- Local Map demoted to fallback cache (VistA unreachable scenario)
- `messaging.manage` added to immutable audit action type

### UI Updates
- Clinician messages page shows VistA folder selector
- Primary path: VistA MailMan messages with IEN, source indicator
- Fallback: local cache when VistA unavailable
- Action registry: all messaging actions reference ZVE MAIL RPCs

## How to Test Manually

1. Ensure VistA Docker is running: `docker ps | findstr wv`
2. Start API: `cd apps/api && npx tsx --env-file=.env.local src/index.ts`
3. Login as PROV123/PROV123!!
4. Navigate to Messages tab
5. Check: folder selector shows IN, WASTE baskets
6. Check: messages list shows VistA MailMan messages
7. Click a message: verify header, body, recipients from VistA
8. Compose and send a test message
9. Verify: `curl http://localhost:3001/messaging/health` shows `phase: 70`

## Follow-ups

- Thread model for MailMan (conversation view from subject RE: chain)
- Portal patient DUZ mapping (currently uses patient-DFN placeholder)
- TaskMan-aware delivery when running in production VistA
- Message deletion in MailMan (soft vs hard delete semantics)
