# Agent & Developer Onboarding — VistA-Evolved

> **This file exists so AI coding agents and new developers can find critical
> context _fast_ without repeating hours of investigation.**

---

## 1. Credentials — Where They Live

| What | Path | Notes |
|------|------|-------|
| **Credentials at runtime** | `apps/api/.env.local` | Git-ignored. Copy from `.env.example`. |
| **Template / schema** | `apps/api/.env.example` | Committed — shows which vars are needed. |
| **Config loader** | `apps/api/src/vista/config.ts` | Reads env vars; has full credential docs in header comment. |
| **Runbook with creds** | `docs/runbooks/vista-rpc-default-patient-list.md` | Lists all 3 built-in Docker accounts. |

### WorldVistA Docker default accounts

From the [Docker Hub page](https://hub.docker.com/r/worldvista/worldvista-ehr):

| Access Code | Verify Code | User |
|-------------|-------------|------|
| PROV123 | PROV123!! | PROVIDER,CLYDE WV (DUZ 87) |
| PHARM123 | PHARM123!! | PHARMACIST,LINDA WV |
| NURSE123 | NURSE123!! | NURSE,HELEN WV |

---

## 2. XWB RPC Broker Protocol — Hard-Won Fixes

The client in `apps/api/src/vista/rpcBrokerClient.ts` implements the VistA
XWB protocol from scratch. **Three critical bugs were found and fixed:**

### Fix 1: RPC message framing (`\x01` + `1` bytes)

Every RPC call message (prefix `11302`) must include `\x01` followed by `1`
between the prefix and the SPack'd RPC name. Without these two bytes the
server silently drops the connection ("608 Job ended").

```
Correct:  [XWB]11302 \x01 1 <SPack(name)> <params> \x04
Wrong:    [XWB]11302 <SPack(name)> <params> \x04
```

Reference: `vavista-rpc3/brokerRPC3.py` (`buildRpcGreeting`).

### Fix 2: Cipher pads — must use real XUSRB1.m Z-tag pads

The cipher pads are part of the RPC Broker sign-on obfuscation routine and
are extracted from `XUSRB1.m` (the `Z` label). They are not user credentials,
but they are security-sensitive implementation details and must not be treated
casually. There are 20 pads (94 chars each) used for `$TRANSLATE`-based
obfuscation of AV codes and context names.

If you ever need to re-extract them:
```bash
docker exec -it wv su - wv -c "mumps -r %XCMD 'F I=1:1:20 W \"PAD \"_I_\": \"_\$P(\$T(Z+I^XUSRB1),\";\",3),!'"
```

### Fix 3: Cipher algorithm — matches `ENCRYP^XUSRB1`

- Pick two _different_ random indices 1–20 (IDIX, ASSOCIX).
- `$TR(text, idStr, assocStr)` — translate each char (including spaces).
- Result: `chr(IDIX+31)` + translated + `chr(ASSOCIX+31)`.

**Spaces must be translated**, not skipped. Skipping spaces breaks context
names like `"OR CPRS GUI CHART"`.

---

## 3. Architecture Quick Map

```
apps/api/src/
  index.ts              — Fastify server, all routes (GET+POST)
  routes/
    vista-interop.ts    — VistA HL7/HLO interop telemetry (Phase 21)
  vista/
    config.ts           — env var loader + credential docs
    rpcBroker.ts        — TCP probe for /vista/ping (no auth)
    rpcBrokerClient.ts  — Full XWB RPC client (auth + RPC calls + LIST params)

apps/web/src/app/
  patient-search/       — Patient search, demographics, allergies, add allergy
  cprs/admin/integrations/ — Integration console + VistA HL7/HLO telemetry tab

services/vista/
  docker-compose.yml    — WorldVistA container (port 9430)
  ZVEMIOP.m             — Production M routine (4 interop RPC entry points)
  ZVEMINS.m             — RPC registration installer
  VEMCTX3.m             — Safe context adder (appends, never KILLs)

docs/runbooks/          — Step-by-step guides for each phase
scripts/                — Verification scripts
```

---

## 4. Running Everything

```powershell
# 1. Start Docker sandbox
cd services\vista
docker compose --profile dev up -d

# 2. Set up credentials (first time only)
cp apps/api/.env.example apps/api/.env.local
# Edit .env.local with PROV123 / PROV123!!

# 3. Start the API
cd apps/api
npx tsx --env-file=.env.local src/index.ts
# NOTE: Do NOT use "pnpm -C apps/api dev" — it does NOT load .env.local (BUG-010)

# 4. Verify
curl http://127.0.0.1:3001/vista/default-patient-list
# Should return {"ok":true, ...}
```

---

## 5. Verification Script

Run `scripts/verify-latest.ps1` from the repo root. It delegates to the
most recent phase verifier and reports PASS/FAIL for each gate.

```powershell
.\scripts\verify-latest.ps1
```

> **Note**: `verify-latest.ps1` currently delegates to Phase 19. Phase 20/21
> checks require manual curl commands — see BUG-037.

---

## 6. Key Gotchas for Future Work

1. **Don't fabricate protocol bytes.** The XWB protocol is finicky about exact
   byte sequences. Use `VISTA_DEBUG=true` to see hex dumps.
2. **Don't guess credentials.** They're documented on Docker Hub and in this file.
3. **`.env.local` is git-ignored.** You must create it yourself — see `.env.example`.
4. **Port 9430 takes ~15s to be ready** after Docker container starts.
5. **The verification script expects Docker running.** Use `-SkipDocker` to skip.
6. **XWB LIST param keys need MUMPS double-quotes** (`'"GMRAGNT"'`). See
   `buildRpcMessageEx` in `rpcBrokerClient.ts`.
7. **GMRAGNT format is `NAME^IEN;file_root`** (semicolon between IEN and root).
8. **All 6 OREDITED fields mandatory** for `ORWDAL32 SAVE ALLERGY` — see
   `docs/runbooks/vista-rpc-add-allergy.md`.
9. **Never use `requireSession` as a Fastify `preHandler`.** It returns
   `SessionData`, which Fastify interprets as a response payload, causing
   the route to hang forever with 0 bytes sent. Always call
   `requireSession(request, reply)` inside the handler body. See BUG-023.
10. **Never `KILL` VistA global subtrees to rebuild.** `KILL ^DIC(19,IEN,"RPC")`
    destroyed 1053 existing context entries. Always find the max sub-IEN and
    append with `$O(node,"",-1)+1`. See BUG-024.
11. **Never pass complex MUMPS as inline shell strings.** Write `.m` files in
    `services/vista/`, `docker cp` into the container, then `mumps -run`.
    4 layers of quoting (PowerShell → Docker → bash → MUMPS) will break. BUG-025.
12. **Always use `-UseBasicParsing` with `Invoke-WebRequest`.** Without it,
    PowerShell 5.1 may pop an IE security dialog that blocks automation.
    Or use `curl.exe` instead. See BUG-026.
13. **Interop RPCs must be installed in Docker.** Run
    `scripts/install-interop-rpcs.ps1` after a fresh container pull.
    The RPCs (IENs 3108–3111) survive `docker compose down/up` because
    the WorldVistA image has internal volumes. **But `docker compose down -v`
    or `docker system prune --volumes` destroys them** — re-run the installer.
14. **`connect()` reuse is idempotent but doesn't detect half-open sockets.**
    The guard `if (connected && sock && !sock.destroyed) return;` skips
    reconnection, but a TCP half-open state (remote closed, local doesn't
    know) passes the check. The `/interop/summary` endpoint relies on this
    for 4 sequential RPCs over one connection.
15. **`authenticateUser()` uses a fully separate temp socket.** It creates its
    own `tmpSock` with independent send/receive functions. This is intentional
    isolation so login requests don't interfere with in-flight RPC calls.
    Do NOT consolidate it with the global socket.
16. **`ORWPS ACTIVE` returns multi-line grouped records** — medication header
    lines start with `~`, continuation lines start with whitespace or `\`.
    Parse by splitting on `~` prefix first, not by newline. See BUG-028.
17. **LOCK/UNLOCK is mandatory for all VistA order writes.** Call `ORWDX LOCK`
    before any ordering RPC, `ORWDX UNLOCK` after. Forgetting UNLOCK leaves
    the patient locked for other providers. See BUG-029.
18. **Unsigned orders/notes don't appear in standard read RPCs.** POST may
    succeed but GET won't show the record until it's signed/verified. Query
    both signed and unsigned contexts and merge. See BUG-030, BUG-033.
19. **Use `safeCallRpc` from `rpc-resilience.ts`, not direct `callRpc`.**
    The circuit breaker (5 failures → open, 30s half-open, 2 retries + backoff)
    prevents hammering a failing VistA. Direct calls bypass it. Phase 21
    interop routes are known debt that skip this.
20. **All new fetches must use `credentials: 'include'`.** Auth uses httpOnly
    cookies, not Bearer tokens. Any `fetch()` without credentials won't
    send the session cookie and will get 401.
21. **Never add `console.log` freely.** Phase 16 verifier caps at ≤6 total
    across the entire codebase. Use the structured logger with
    `AsyncLocalStorage` for automatic request ID propagation.
22. **No hardcoded `PROV123` outside the login page.** The Phase 16 secret
    scan exempts only `page.tsx`. Credentials in any other `.ts` file will
    fail verification.
23. **Sandbox credentials on the login page are gated by NODE_ENV.** They only
    display when `NODE_ENV !== 'production'`. See BUG-035.
24. **`/admin/*` routes require admin role check.** Use `requireRole(session,
    'admin')` — not just session validation. Currently `provider` role also
    gets admin access (known debt for RBAC tightening).
25. **WebSocket console blocks `XUS AV CODE` and `XUS SET VISITOR` RPCs.**
    The `/ws/console` gateway has an explicit blocklist to prevent credential
    theft or privilege escalation through the debug console.
26. **RPC capability cache has configurable TTL** (default 5 min, env var
    `VISTA_CAPABILITY_TTL_MS`). Stale capabilities can cause wrong fallback
    behavior. The system distinguishes `expectedMissing` (known absent in
    sandbox) from `unexpectedMissing` (should alarm operators).
27. **Graceful shutdown doesn't disconnect the RPC broker.** `server.close()`
    is called but `disconnect()` on the global socket is not. VistA-side
    jobs may be left orphaned. Known debt for production hardening.
28. **`buildBye()` is dead code.** `disconnect()` sends raw `#BYE#` instead
    of the properly XWB-framed message. Works only because the socket is
    destroyed immediately after. See BUG-036.

---

## 7. Bug Tracker & Lessons Learned

A comprehensive log of every bug, challenge, and fix from Phase 1 through
Phase 5D lives in **[`docs/BUG-TRACKER.md`](docs/BUG-TRACKER.md)**.

It covers 37 bugs with:
- What was attempted
- The exact error or symptom
- Root cause analysis
- The fix applied
- Preventive measures

Plus 13 cross-cutting lessons and a quick-reference error → fix lookup table.

**Update this file whenever a new bug is found and fixed.** It's the single
source of debugging wisdom for VistA-Evolved.
