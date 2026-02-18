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
  services/
    imaging-worklist.ts — Imaging order worklist sidecar (Phase 23)
    imaging-ingest.ts   — Orthanc ingest reconciliation + linkage (Phase 23)
  vista/
    config.ts           — env var loader + credential docs
    rpcBroker.ts        — TCP probe for /vista/ping (no auth)
    rpcBrokerClient.ts  — Full XWB RPC client (auth + RPC calls + LIST params)

apps/web/src/app/
  patient-search/       — Patient search, demographics, allergies, add allergy
  cprs/admin/integrations/ — Integration console + VistA HL7/HLO telemetry tab

apps/web/src/components/cprs/panels/
  ImagingPanel.tsx      — Studies/Worklist/Orders tabs, order form (Phase 23)

services/vista/
  docker-compose.yml    — WorldVistA container (port 9430)
  ZVEMIOP.m             — Production M routine (4 interop RPC entry points)
  ZVEMINS.m             — RPC registration installer
  VEMCTX3.m             — Safe context adder (appends, never KILLs)

services/imaging/
  docker-compose.yml    — Orthanc (8042/4242) + OHIF (3003) containers
  orthanc.json          — Orthanc config (DICOMweb, Lua scripts)
  on-stable-study.lua   — OnStableStudy webhook to API ingest (Phase 23)

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
   byte sequences. Use `VISTA_DEBUG=true` to see hex dumps (routed through
   the structured logger at `debug` level, not raw `console.log`).
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
14. **`connect()` reuse is idempotent and now detects half-open sockets.**
    The guard checks `isSocketHealthy()` which tracks `lastActivityMs` — if
    the socket has been idle for >5 min, it forces reconnection. TCP keepalive
    is enabled (30s probe interval) and `close`/`error` events automatically
    mark `connected = false`. **Use `withBrokerLock()` for concurrent safety** —
    the async mutex in `rpcBrokerClient.ts` serializes all socket operations.
    `safeCallRpc` and `safeCallRpcWithList` use it automatically.
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
    prevents hammering a failing VistA. Direct calls bypass it. `safeCallRpc`
    also wraps calls in `withBrokerLock()` for concurrent socket safety.
    Phase 21 interop routes use `cachedRpc` which delegates to `resilientRpc`.
20. **All new fetches must use `credentials: 'include'`.** Auth uses httpOnly
    cookies, not Bearer tokens. Any `fetch()` without credentials won't
    send the session cookie and will get 401.
21. **Never add `console.log` freely.** Phase 16 verifier caps at ≤6 total
    across the entire codebase. Use the structured logger with
    `AsyncLocalStorage` for automatic request ID propagation. The RPC broker
    debug logging (`VISTA_DEBUG=true`) now uses `log.debug()` instead of
    `console.log`, so production log-level filtering suppresses it.
22. **No hardcoded `PROV123` outside the login page.** The Phase 16 secret
    scan exempts only `page.tsx`. Credentials in any other `.ts` file will
    fail verification.
23. **Sandbox credentials on the login page are gated by NODE_ENV.** They only
    display when `NODE_ENV !== 'production'`. See BUG-035.
24. **`/admin/*` routes require strict admin role check.** Use `requireRole(session,
    'admin')` — not just session validation. RBAC is now strict admin-only in
    `security.ts`, `imaging-proxy.ts`, and `ws-console.ts`. The sandbox user
    PROVIDER,CLYDE is mapped to admin role in `session-store.ts`.
25. **WebSocket console blocks `XUS AV CODE` and `XUS SET VISITOR` RPCs.**
    The `/ws/console` gateway has an explicit blocklist to prevent credential
    theft or privilege escalation through the debug console.
26. **RPC capability cache has configurable TTL** (default 5 min, env var
    `VISTA_CAPABILITY_TTL_MS`). Stale capabilities can cause wrong fallback
    behavior. The system distinguishes `expectedMissing` (known absent in
    sandbox) from `unexpectedMissing` (should alarm operators).
27. **Graceful shutdown now disconnects the RPC broker.** The `security.ts`
    middleware registers SIGINT/SIGTERM handlers that call
    `disconnectRpcBroker()` before `server.close()`.
28. **`buildBye()` is now used by `disconnect()`.** The properly XWB-framed
    `#BYE#` message is sent before socket destroy. Previously `disconnect()`
    sent raw `#BYE#` which only worked because the socket was destroyed
    immediately after. See BUG-036.
29. **Imaging worklist + ingest are in-memory sidecar stores (Phase 23).**
    `imaging-worklist.ts` and `imaging-ingest.ts` use `Map<>` stores that
    reset on API restart. This is intentional — VistA Radiology RPCs
    (`ORWDXR NEW ORDER`, `RAD/NUC MED REGISTER`) are not available in the
    WorldVistA sandbox. Each store has a documented 4-step migration plan
    to VistA-native storage. Don't attempt to persist to SQLite or similar
    without first checking VistA Rad/Nuc Med file availability.
30. **Orthanc `OnStableStudy` Lua callback needs `StableAge` tuning.**
    Default is 60s in `orthanc.json`. If studies arrive incrementally (e.g.
    CT slices over 90s), the callback fires mid-acquisition. For production,
    increase to 120–300s. The Lua script (`on-stable-study.lua`) reads
    `INGEST_CALLBACK_URL` and `INGEST_SERVICE_KEY` from env vars set in
    `services/imaging/docker-compose.yml`.
31. **`/imaging/ingest/callback` uses service-to-service auth, not session.**
    It expects `X-Service-Key` header validated with constant-time comparison.
    The `"service"` AuthLevel in `security.ts` bypasses session checks for
    this route. The webhook secret is configured via `IMAGING_INGEST_WEBHOOK_SECRET`
    env var (default: `dev-imaging-ingest-key-change-in-production`).
    **Change it in production.**
32. **Imaging order accession numbers use `VE-YYYYMMDD-NNNN` format.**
    The daily counter resets with API restart (in-memory). When migrating
    to VistA, use the native accession number generator (`RA ASSIGN ACC#`).
33. **Three ingest reconciliation strategies run in order:** (1) accession-exact
    match, (2) patient+modality+date fuzzy match, (3) quarantine. If accession
    matches a worklist order, the study is linked immediately. Quarantined
    studies appear in `/imaging/ingest/unmatched` (admin-only) and can be
    manually linked via POST `/imaging/ingest/unmatched/:id/link`.
34. **DICOMweb routes now require `imaging_view` permission (Phase 24).**
    Session auth alone is no longer sufficient. Users without imaging_view
    (e.g., clerks) get 403. Use break-glass for emergency access. The RBAC
    check uses `hasImagingPermission()` from `imaging-authz.ts`, which checks
    role-based permissions first, then active break-glass grants.
35. **Break-glass sessions are patient-scoped and time-limited (Phase 24).**
    Max TTL is 4 hours (`MAX_BREAK_GLASS_TTL_MS`), default 30 minutes.
    They auto-expire via `setTimeout`. Each session is logged to both the
    general audit trail and the imaging-specific hash-chained audit.
    API: `POST /security/break-glass/start` with reason + patientDfn + ttlMinutes.
36. **Imaging audit trail is hash-chained and separate from general audit.**
    `imaging-audit.ts` maintains its own SHA-256 chain. Each entry hashes the
    previous entry's hash. The chain can be verified via `GET /imaging/audit/verify`.
    The `sanitizeDetail()` function strips pixel data, HL7 bodies, credentials,
    SSN, and DOB from audit details before hashing.
37. **DICOMweb has its own rate limiter (Phase 24).** Default: 120 req/60s
    per user. Configured via `DICOMWEB_RATE_LIMIT` and `DICOMWEB_RATE_WINDOW_MS`
    env vars. This is separate from the general API rate limiter in `security.ts`.
    OHIF viewer can burst many requests; tune these values accordingly.
38. **Device AE Titles must be uppercase, 1-16 chars, `[A-Z0-9_ ]` only.**
    The device registry (`imaging-devices.ts`) validates this on create/update.
    Duplicate AE Titles return 409. Deletion is soft (sets status to
    `decommissioned`) to preserve audit trail references.
39. **STOW-RS and demo upload now require `imaging_admin`, not just admin role.**
    Phase 24 switched from raw `requireAdmin()` (role check) to
    `requireImagingAdmin()` (imaging permission check). This means the same
    permission model applies to all imaging write operations.
40. **Analytics events NEVER contain patient DFN.** The `AnalyticsEvent`
    schema in `analytics-store.ts` structurally lacks a DFN field. User IDs
    are salted SHA-256 hashed via `hashUserId()`. Tags are sanitized by
    `sanitizeAnalyticsTags()` to strip PHI patterns. See
    `docs/analytics/phase25-data-classification.md` for the 4-class model.
41. **Analytics permissions are role-mapped, not new session fields.**
    `analytics_viewer` and `analytics_admin` permissions are derived from
    `UserRole` via `ANALYTICS_ROLE_PERMISSIONS` in `analytics-config.ts`.
    Providers/nurses/pharmacists get `analytics_viewer`; only admins get
    `analytics_admin` (exports + forced aggregation). Clerks get neither.
42. **Analytics aggregation runs on a background interval timer.**
    `startAggregationJob()` is called at server startup in `index.ts`.
    `stopAggregationJob()` is called during graceful shutdown in
    `security.ts`. The interval defaults to 1 hour (`ANALYTICS_AGGREGATION_INTERVAL_MS`).
43. **Clinical report pipeline caches per user+patient with short TTL.**
    `clinical-reports.ts` caches `ORWRP REPORT TEXT` results for 30s
    (configurable via `CLINICAL_REPORT_CACHE_TTL_MS`). The cache key
    includes DUZ, DFN, report ID, and HS type. Max 200 cache entries.
44. **ROcto SQL is read-only by design.** The Octo/ROcto container
    (port 1338) exposes PostgreSQL wire protocol for BI tools. Only
    aggregated metrics tables — no PHI. The `bi_readonly` user has
    SELECT-only access. ETL writer is a future enhancement.
45. **Analytics `AUTH_RULE` uses `"session"` auth level, not `"admin"`.**
    `/analytics/*` routes match `{ pattern: /^\/analytics\//, auth: "session" }`.
    Fine-grained permission checks (`analytics_viewer`, `analytics_admin`)
    happen inside route handlers via `requireAnalyticsPermission()`.
46. **Guard `request.body` in optional-body POST routes.** Fastify leaves
    `request.body` as `undefined` when no Content-Type header is sent.
    Always use `const body = (request.body as any) || {}` before accessing
    properties. See BUG-046.
47. **Octo/ROcto entrypoint must source `ydb_env_set`.** The `yottadb/octo`
    Docker image needs `/opt/yottadb/current/ydb_env_set` sourced at startup
    to create `/data/o`, `/data/r`, set `$ZROUTINES`, and configure `$PATH`.
    Overriding env vars like `ydb_dist`, `ydb_gbldir`, `ydb_routines` directly
    conflicts with the image's init script. Use the image's `ydb_env_set` and
    extend, don't replace. `rocto` binary is at
    `/opt/yottadb/current/plugin/octo/bin/rocto`. See BUG-047.

---

## 7. Architecture Quick Map (Phase 24 additions)

```
apps/api/src/
  services/
    imaging-authz.ts      — Imaging RBAC + break-glass (Phase 24)
    imaging-audit.ts      — Hash-chained imaging audit trail (Phase 24)
    imaging-devices.ts    — DICOM device registry + C-ECHO (Phase 24)
  config/
    imaging-tenant.ts     — Multi-tenant imaging config (Phase 24)
  routes/
    imaging-audit-routes.ts — Imaging audit compliance endpoints (Phase 24)
    imaging-proxy.ts      — DICOMweb proxy (Phase 22, hardened Phase 24)

apps/web/src/components/cprs/panels/
  ImagingPanel.tsx        — +Devices tab, +Audit tab, +Break-glass banner (Phase 24)

docs/runbooks/
  imaging-enterprise-security.md           — RBAC + break-glass guide (Phase 24)
  imaging-device-onboarding-enterprise.md  — Device registry guide (Phase 24)
  imaging-audit.md                         — Audit trail guide (Phase 24)

scripts/
  verify-imaging-devices.ps1  — Device registry test harness (Phase 24)
```

## 7b. Architecture Quick Map (Phase 25 additions)

```
apps/api/src/
  config/
    analytics-config.ts       — Analytics permissions, event/aggregation/SQL config (Phase 25)
  services/
    analytics-store.ts        — PHI-safe analytics event stream (ring buffer, hashing) (Phase 25)
    analytics-aggregator.ts   — Hourly/daily aggregation engine (Phase 25)
    clinical-reports.ts       — Enhanced VistA clinical report pipeline (Phase 25)
  routes/
    analytics-routes.ts       — Analytics REST endpoints (Phase 25)

apps/web/src/app/cprs/admin/analytics/
  page.tsx                    — Analytics dashboard UI (4 tabs) (Phase 25)

services/analytics/
  docker-compose.yml          — YottaDB/Octo/ROcto for SQL analytics (Phase 25)
  octo-seed.sql               — SQL DDL for aggregated metrics tables (Phase 25)

docs/
  analytics/phase25-data-classification.md — Data classification document (Phase 25)
  runbooks/analytics-octo-rocto.md         — Analytics SQL runbook (Phase 25)

scripts/
  verify-phase25-bi-analytics.ps1          — Phase 25 verification (60+ gates)
```

---

## 8. Bug Tracker & Lessons Learned

A comprehensive log of every bug, challenge, and fix from Phase 1 through
Phase 24 lives in **[`docs/BUG-TRACKER.md`](docs/BUG-TRACKER.md)**.

It covers 45 bugs with:
- What was attempted
- The exact error or symptom
- Root cause analysis
- The fix applied
- Preventive measures

Plus 13 cross-cutting lessons and a quick-reference error → fix lookup table.

**Update this file whenever a new bug is found and fixed.** It's the single
source of debugging wisdom for VistA-Evolved.
