# Phase 70 — VERIFY: MailMan RPC Bridge (ZVEMSGR.m)

## Verification Gates

### Gate 1 — ZVEMSGR.m Routine Exists

- `services/vista/ZVEMSGR.m` exists and has FOLDERS, LIST, GETMSG, SEND, MANAGE entrypoints

### Gate 2 — RPC Registration

- 5 RPCs registered in rpcRegistry.ts: ZVE MAIL FOLDERS, LIST, GET, SEND, MANAGE
- All 5 in RPC_EXCEPTIONS with Phase 70 reason

### Gate 3 — API Endpoints

- GET /messaging/folders returns VistA baskets
- GET /messaging/mail-list?folderId=1 returns messages
- GET /messaging/mail-get?ien=<N> returns message detail
- POST /messaging/mail-manage with action=markread works
- POST /messaging/compose sends via ZVE MAIL SEND

### Gate 4 — No DSIC Dependency

- `DSIC SEND MAIL MSG` removed from rpcRegistry
- `sendViaMailMan` uses ZVE MAIL SEND, not DSIC

### Gate 5 — Local Store is Fallback Only

- `messageStore` renamed to `fallbackCache`
- VistA is the primary data path
- Local cache only used when VistA is unreachable

### Gate 6 — UI Shows VistA Source

- Clinician messages page shows "VistA MailMan" or "Local fallback"
- Folder selector visible when VistA folders available
- Message detail displays VistA IEN

### Gate 7 — Action Registry Updated

- All messaging actions reference ZVE MAIL RPCs
- No pendingNote about ZVEMSGR.m

### Gate 8 — TypeScript Compiles

- `npx tsc --noEmit` passes for api and web workspaces

### Gate 9 — No PHI in Logs

- Message bodies never logged
- Audit entries contain metadata only (subject length, recipient count)

### Gate 10 — Immutable Audit

- `messaging.manage` added to ImmutableAuditAction type

## Manual Test Procedure

1. Start VistA Docker: `cd services/vista && docker compose up -d`
2. Start API: `cd apps/api && npx tsx --env-file=.env.local src/index.ts`
3. Login via web UI
4. Navigate to Messages tab
5. Verify folder list shows VistA baskets (IN, WASTE, etc.)
6. Click a message — verify header, body, recipients from VistA
7. Compose and send a test message
8. Verify message appears in folder list
9. Check `/messaging/health` shows phase: 70 and all ZVE MAIL RPCs
