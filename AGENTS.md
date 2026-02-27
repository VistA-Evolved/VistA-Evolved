# Agent & Developer Onboarding — VistA-Evolved

> **This file exists so AI coding agents and new developers can find critical
> context _fast_ without repeating hours of investigation.**

---

## 0. MANDATORY GOVERNANCE PREAMBLE (Phase 53)

**Every agent and developer MUST follow these rules:**

1. **Canonical inputs live ONLY in:** `/prompts` (IMPLEMENT + VERIFY prompts),
   `/scripts` (verifiers + audit tooling), `/docs/runbooks` and `/docs/decisions`
   (curated docs only).
2. **Verification outcomes are ARTIFACTS, not documentation.** Write all
   verify outputs to `/artifacts/**` (gitignored). Do NOT create or commit
   `/reports`, `/docs/reports`, or scattered "summary" markdown.
3. **VistA-first rule:** All VistA interactions must go through rpcRegistry.
   Every RPC name must be present in the Vivian index OR be explicitly
   allowlisted with justification.
4. **No dead clicks:** Every clickable element must either work OR show
   "integration pending" with target RPC(s). No silent no-ops, no fake success.
5. **Prompts folder integrity:** Each phase folder must contain
   `XX-01-IMPLEMENT.md` and `XX-99-VERIFY.md`. Filenames and internal
   headers must match (phase number + title).
6. **Minimal edits, inventory first, deterministic changes, commit discipline.**

### Anti-Sprawl Rules
- **Do NOT create `/reports` or `/docs/reports` folders.** They are forbidden.
- **Do NOT commit verification outputs.** They belong in `/artifacts/` (gitignored).
- **Prompts are canonical.** Do not duplicate prompt content in docs.
- **Pre-commit hook enforces these rules.** Set up with:
  `git config core.hooksPath .hooks`
- **See `docs/POLICY.md`** for the full documentation policy.

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
48. **Octo v1.1 does NOT support bare `TIMESTAMP` type.** Use `VARCHAR(32)`
    for timestamp columns and store ISO 8601 strings. Also does not support
    `DEFAULT` clauses on CREATE TABLE. Remove all DEFAULTs and ensure callers
    always provide every column value. See BUG-048.
49. **Octo v1.1 does NOT support `CREATE USER` SQL or `--create-user` CLI.**
    ROcto users must be created via direct M global manipulation:
    `^%ydboctoocto("users",username)` stores a pipe-delimited pg_authid row,
    and `^%ydboctoocto("users",username,"permissions")` must also be set.
    Use `ZVEUSERS.m` in `services/analytics/` for idempotent user creation.
    See BUG-049.
50. **ROcto user permissions: `0`=readonly, `1`=readwrite.** The ETL writer
    user must have `permissions=1` to INSERT. The BI readonly user should
    have `permissions=0`. Setting the wrong value causes
    `ERR_ROCTO_READONLY_USER`. See BUG-050.
51. **ROcto default `address=127.0.0.1` blocks Docker port forwarding.**
    Override with a custom `octo.conf` setting `address = "0.0.0.0"`.
    Mount it via Docker volume to `/etc/octo/octo.conf`. See BUG-051.
52. **ROcto MD5 password format:** `md5` + MD5(password + username).
    Stored as 11th pipe-delimited field in the user global. Must include
    the `md5` prefix. Salt-based challenge/response uses standard PG MD5
    auth handshake. See `ZVEUSERS.m` for examples.
53. **YottaDB requires `mupip rundown` after container restart.** Stale
    shared memory from previous incarnation causes `REQRUNDOWN` errors.
    Add `mupip rundown -reg "*"` to the container entrypoint before
    running `octo` or `rocto`.
54. **ETL writer uses minimal PG wire protocol (no npm deps).** The
    `PgSimpleClient` in `analytics-etl.ts` implements PG v3.0 Simple
    Query protocol using only Node.js `net` + `crypto`. Supports MD5
    auth, single-statement queries, and error parsing. Do not add
    `pg` or other database drivers — this is intentionally dependency-free.
55. **Never use em-dash (U+2014) or non-ASCII chars in .ps1 files.**
    PowerShell 5.1 reads UTF-8 files without BOM using Windows-1252 codepage.
    UTF-8 byte `0x94` (part of em-dash `E2 80 94`) maps to right double-quote
    `"` in CP1252, injecting phantom quotes that break string parsing. Use
    ASCII hyphens (`-` or `--`) only. See BUG-055.
56. **Use `Test-Path -LiteralPath` for Next.js dynamic route dirs.** Square
    brackets in `[param]` and `[...slug]` dirs are treated as wildcard character
    classes by PowerShell's `Test-Path`. Always use `-LiteralPath` when testing
    paths that contain brackets. See BUG-056.
57. **Telehealth rooms are in-memory and reset on API restart (Phase 30).**
    `room-store.ts` uses a `Map<>` store that clears on restart. This matches
    the imaging worklist pattern from Phase 23. Room auto-expiry is 4 hours
    (`TELEHEALTH_ROOM_TTL_MS`). Cleanup timer runs every 5 minutes.
58. **No PHI in telehealth meeting URLs.** Room IDs are opaque hex tokens
    (`ve-{randomBytes(12)}`). Patient names, DFN, and medical info must never
    appear in Jitsi room names, JWT payloads, or join URLs.
59. **Recording is OFF by default.** Jitsi config overrides disable local
    recording and transcription. Enabling recording requires a consent
    workflow that is not yet implemented. Do not enable without legal review.
60. **`TELEHEALTH_PROVIDER` env var selects the adapter.** Default is `"jitsi"`.
    `"stub"` is available for testing. Adding a new provider requires
    implementing `TelehealthProvider` and registering in `providers/index.ts`.
61. **Never bypass the policy engine.** All authorization decisions must flow
    through `evaluatePolicy()` in `policy-engine.ts`. The engine is default-deny
    with ~40 action mappings. Admin role gets superuser bypass. OPA-compatible
    structure allows migration to external OPA sidecar for production.
62. **Never log PHI in immutable audit.** `immutable-audit.ts` sanitizes SSN,
    DOB, patient names, and clinical content from audit entries automatically.
    IP addresses are hashed in production mode. The hash chain uses SHA-256
    with each entry linking to its predecessor's hash.
63. **OIDC is opt-in via `OIDC_ENABLED=true`.** Without it, VistA RPC auth
    is the only path. JWT validation uses zero-dependency Node.js crypto.
    JWKS is cached 10 min with auto-refresh on kid miss. Supports RS256-512
    and ES256-384-512.
64. **Passkey data never stored locally.** All WebAuthn credential management
    delegated to Keycloak. The `PasskeysProvider` only stores challenges
    (5-min TTL). Face verification is disabled by default and requires explicit
    vendor configuration + legal review.
65. **Immutable audit has dual sinks.** In-memory ring buffer (10K entries)
    plus JSONL file at `logs/immutable-audit.jsonl`. Chain verification via
    `GET /iam/audit/verify` (admin only). File chain verification available
    via `verifyFileAuditChain()`.
66. **Keycloak realm auto-imports on first boot.** The Docker compose mounts
    `infra/keycloak/realm-export.json`. Five dev users are pre-configured
    with DUZ mappings matching WorldVistA Docker accounts. WebAuthn
    Passwordless is configured as a required action.
67. **OTel tracing is opt-in via `OTEL_ENABLED=true`.** Without it, all
    tracing functions are no-ops (return dummy spans). The SDK only
    initializes when explicitly enabled. Auto-instrumentation covers HTTP
    and net; fs and DNS are disabled to reduce noise.
68. **PHI must never reach the OTel Collector storage.** The collector
    config has an `attributes/strip-phi` processor that deletes request
    bodies, response bodies, DB statements, and patient.* attributes.
    API-side instrumentation also avoids capturing bodies. Both layers
    must remain in place.
69. **`sanitizeRoute()` prevents Prometheus label cardinality explosion.**
    All metric labels for route use sanitized paths: UUIDs and numeric
    segments are replaced with `:id`. Without this, each unique patient
    DFN or resource ID creates a new time series.
70. **Graceful shutdown now has a drain timeout (default 30s).** Configured
    via `SHUTDOWN_DRAIN_TIMEOUT_MS`. The drain timer uses `unref()` so it
    won't keep the process alive if everything completes early. The
    previous behavior was to wait indefinitely for `server.close()`.
71. **`/ready` returns `ok: false` when circuit breaker is open.** This
    makes it safe for K8s readiness probes. `/health` always returns 200
    (liveness). Don't gate liveness on the circuit breaker or the pod
    will restart when VistA is temporarily down.
72. **`bridgeTracingToLogger()` avoids circular imports.** The logger
    module cannot import from telemetry (which might import things that
    log). Instead, `bridgeTracingToLogger()` injects getter functions at
    startup. Call it once in `index.ts` before creating the Fastify server.
73. **k6 smoke tests require the API + VistA Docker to be running.** They
    are NOT unit tests. The write test (`smoke-write.js`) is expected to
    partially fail on the sandbox due to VistA data constraints.
74. **OTel Collector contrib image is distroless -- no shell tools at all.**
    Docker healthchecks using `wget`, `curl`, or any binary will fail. The
    collector has its own internal `health_check` extension on `:13133`.
    Probe it externally; do not add a Docker healthcheck. See BUG-057.
75. **ESM projects must use `--import` for OTel auto-instrumentation.**
    With `"type": "module"`, ESM hoists all imports before execution, so
    `initTracing()` runs too late. Use `tsx --import ./src/telemetry/register.ts`
    to register the OTel SDK before any module loads. The inline `initTracing()`
    fallback only works in CJS. See BUG-059.
76. **`/metrics/prometheus` must be in AUTH_RULES bypass list.** Prometheus
    scraper has no session cookie. The regex must match both `/metrics` and
    `/metrics/prometheus`. See BUG-058.
77. **API routes use query params, not path params.** Routes are
    `/vista/allergies?dfn=3`, NOT `/vista/patient/3/allergies`. k6 tests and
    any external integrations must use query-param style. See BUG-060.
78. **`DEPLOY_SKU` env var controls which modules are enabled (Phase 37C).**
    Default is `FULL_SUITE` (all 12 modules). Set to `CLINICIAN_ONLY`,
    `PORTAL_ONLY`, `TELEHEALTH_ONLY`, `RCM_ONLY`, `IMAGING_ONLY`, or
    `INTEROP_ONLY` to restrict routes. The module guard middleware returns
    403 for routes belonging to disabled modules.
79. **`ADAPTER_<TYPE>` env vars select VistA vs stub adapters (Phase 37C).**
    Five adapter types: `ADAPTER_CLINICAL_ENGINE`, `ADAPTER_SCHEDULING`,
    `ADAPTER_BILLING`, `ADAPTER_IMAGING`, `ADAPTER_MESSAGING`. Value is
    `vista` (default) or `stub`. Stub adapters return `{ok:false, pending:true}`
    for all operations. If VistA adapter fails to load, it auto-falls back to stub.
80. **Module IDs are system-level, not tab-level (Phase 37C).** The new
    `module-registry.ts` uses 12 system modules (kernel, clinical, portal,
    telehealth, imaging, analytics, interop, intake, ai, iam, rcm, scheduling).
    The existing `tenant-config.ts` `ModuleId` type uses tab slugs (cover,
    problems, meds, etc.) for fine-grained UI control within the clinical module.
    These coexist at different granularity levels.
81. **Capability resolution is tenant-scoped (Phase 37C).** The capability
    service resolves effective status per tenant: disabled module → disabled,
    stub adapter → pending, otherwise → configured status. Call
    `resolveCapabilities(tenantId)` or hit `GET /api/capabilities`.
82. **Per-tenant module overrides via `POST /api/modules/override` (Phase 37C).**
    Admin-only. Pass `{tenantId, modules: [...]}` to override the SKU defaults
    for a specific tenant. Pass `{tenantId, modules: null}` to clear overrides.
    Dependency validation prevents enabling modules without their prerequisites.
83. **RCM is VistA-first — do NOT reimplement billing logic.** The claim store
    is in-memory (like imaging worklist Phase 23). VistA IB/AR files are the
    source of truth. The `vistaChargeIen` and `vistaArIen` fields on `Claim`
    ground every domain object to VistA globals. No SQLite, no Postgres for
    claim persistence — use VistA or the in-memory store.
84. **Connectors are swappable via payer `integrationMode`.** Four connector
    types are registered at startup: sandbox, clearinghouse (US EDI), philhealth
    (government portal), portal-batch (HMO batch upload). The connector registry
    resolves the right connector from the payer's `integrationMode` field. To
    add a new market, add a seed JSON in `data/payers/`, implement a connector,
    and register it. No route changes needed.
85. **Payer seed data lives in `data/payers/*.json`, not in code.** The payer
    registry loads all JSON files from `data/payers/` at startup. Each file is
    an array of `Payer` objects. Adding a new country/market is a data file,
    not a code change. Files: `us_core.json` (12 US payers), `ph_hmos.json`
    (15 PH payers including PhilHealth).
86. **RCM audit is hash-chained and separate from general + imaging audit.**
    `rcm-audit.ts` maintains its own SHA-256 chain (same pattern as
    `imaging-audit.ts` and `immutable-audit.ts`). PHI is sanitized before
    hashing. Verify via `GET /rcm/audit/verify`. Max 20K entries with FIFO
    eviction.
87. **EDI pipeline stages are tracked in-memory.** The 10-stage pipeline
    (created → validated → transformed → enqueued → transmitted → acknowledged
    → accepted → adjudicated → posted → reconciled) resets on API restart.
    Each stage transition is timestamped. Query via `GET /rcm/edi/pipeline`.
88. **PhilHealth connector maps X12 to CF1-CF4 forms internally.** The
    `philhealth-connector.ts` translates 837P claims to CF2 (outpatient) and
    837I to CF2+CF3+CF4 (inpatient). Member eligibility uses PhilHealth PIN
    validation. Env vars: `PHILHEALTH_API_ENDPOINT`, `PHILHEALTH_FACILITY_CODE`,
    `PHILHEALTH_API_TOKEN`, `PHILHEALTH_TEST_MODE`.

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
    analytics-etl.ts          — ETL writer: PG wire protocol → ROcto (Phase 25D)
    clinical-reports.ts       — Enhanced VistA clinical report pipeline (Phase 25)
  routes/
    analytics-routes.ts       — Analytics REST endpoints (Phase 25)

apps/web/src/app/cprs/admin/analytics/
  page.tsx                    — Analytics dashboard UI (4 tabs) (Phase 25)

services/analytics/
  docker-compose.yml          — YottaDB/Octo/ROcto for SQL analytics (Phase 25)
  octo-seed.sql               — SQL DDL for aggregated metrics tables (Phase 25D)
  octo.conf                   — ROcto config (0.0.0.0 binding, MD5 auth) (Phase 25D)
  ZVEUSERS.m                  — M routine for idempotent ROcto user creation (Phase 25D)

docs/
  analytics/phase25-data-classification.md — Data classification document (Phase 25)
  runbooks/analytics-octo-rocto.md         — Analytics SQL runbook (Phase 25)

scripts/
  verify-phase25-bi-analytics.ps1          — Phase 25 verification (60+ gates)
```

## 7c. Architecture Quick Map (Phase 30 additions)

```
apps/api/src/
  telehealth/
    types.ts                — TelehealthProvider interface, room/device/waiting types (Phase 30)
    room-store.ts           — In-memory room lifecycle store (Phase 30)
    device-check.ts         — Device requirements + validation (Phase 30)
    providers/
      index.ts              — Provider registry/factory (Phase 30)
      jitsi-provider.ts     — Jitsi Meet adapter (Phase 30)
  routes/
    telehealth.ts           — Telehealth REST endpoints (Phase 30)

apps/web/src/components/cprs/panels/
  TelehealthPanel.tsx       — Clinician telehealth panel (Phase 30)

apps/portal/src/app/dashboard/telehealth/
  page.tsx                  — Patient telehealth UI (device check, waiting room, visit) (Phase 30)

docs/runbooks/
  phase30-telehealth.md     — Telehealth runbook (Phase 30)
```

## 7d. Architecture Quick Map (Phase 35 additions)

```
apps/api/src/
  auth/
    oidc-provider.ts          — OIDC config, discovery caching, claims mapping (Phase 35)
    jwt-validator.ts          — Zero-dep JWT validation (RS/ES256-512, JWKS) (Phase 35)
    policy-engine.ts          — In-process policy engine (default-deny, ~40 actions) (Phase 35)
    policies/
      default-policy.ts       — Role definitions + environment policies (Phase 35)
    biometric/
      types.ts                — BiometricAuthProvider interface (Phase 35)
      passkeys-provider.ts    — WebAuthn passkeys via Keycloak (Phase 35)
      face-provider.ts        — Face verification scaffold (disabled) (Phase 35)
      index.ts                — Provider registry (Phase 35)
  lib/
    immutable-audit.ts        — SHA-256 hash-chained append-only audit (Phase 35)
  routes/
    iam-routes.ts             — IAM REST endpoints (audit, policy, biometric) (Phase 35)

apps/web/src/app/cprs/admin/
  audit-viewer/page.tsx       — Immutable audit viewer (4 tabs) (Phase 35)

services/keycloak/
  docker-compose.yml          — Keycloak 24 + PostgreSQL 16 (Phase 35)

infra/keycloak/
  realm-export.json           — Full realm config (7 roles, 3 clients, WebAuthn) (Phase 35)
  README.md                   — Keycloak setup guide (Phase 35)

infra/opa/policy/
  authz.rego                  — OPA-compatible Rego policy (Phase 35)
  data.json                   — Role definitions + env configs (Phase 35)

docs/runbooks/
  phase35-iam-authz-audit.md  — IAM runbook (Phase 35)
```

## 7e. Architecture Quick Map (Phase 36 additions)

```
apps/api/src/
  telemetry/
    tracing.ts              — OTel SDK init, PHI-safe span helpers (Phase 36)
    metrics.ts              — prom-client registry, HTTP/RPC/CB metrics (Phase 36)

services/observability/
  docker-compose.yml        — OTel Collector + Jaeger + Prometheus (Phase 36)
  otel-collector-config.yaml — Receivers, PHI-strip processor, exporters (Phase 36)
  prometheus.yml            — Scrape configs for API + collector (Phase 36)

tests/k6/
  smoke-login.js            — Auth flow smoke test (Phase 36)
  smoke-reads.js            — Read-only clinical endpoints smoke test (Phase 36)
  smoke-write.js            — Write workflow smoke test (Phase 36)
  run-smoke.ps1             — k6 test runner wrapper (Phase 36)

docs/runbooks/
  phase36-observability-reliability.md — Observability runbook (Phase 36)
```

## 7f. Architecture Quick Map (Phase 37C additions)

```
config/
  modules.json              — 12 module definitions (route patterns, deps, adapters) (Phase 37C)
  skus.json                 — 7 SKU deploy profiles (Phase 37C)
  capabilities.json         — 50+ capability definitions (status, module, adapter, RPC) (Phase 37C)

apps/api/src/
  modules/
    module-registry.ts      — Module loader, SKU resolution, route guard (Phase 37C)
    capability-service.ts   — Capability resolution (live/pending/disabled per tenant) (Phase 37C)
  adapters/
    types.ts                — BaseAdapter, AdapterResult<T>, clinical record types (Phase 37C)
    adapter-loader.ts       — Central adapter registry, env-var selection, health (Phase 37C)
    clinical-engine/        — ClinicalEngineAdapter: VistA + stub (Phase 37C)
    scheduling/             — SchedulingAdapter: VistA + stub (Phase 37C)
    billing/                — BillingAdapter: VistA + stub (Phase 37C)
    imaging/                — ImagingAdapter: VistA + stub (Phase 37C)
    messaging/              — MessagingAdapter: VistA + stub (Phase 37C)
  middleware/
    module-guard.ts         — Fastify onRequest hook for module toggle enforcement (Phase 37C)
  routes/
    module-capability-routes.ts — /api/modules/*, /api/capabilities/*, /api/adapters/* (Phase 37C)

docs/architecture/
  product-modularity-v1.md  — Full architecture specification (Phase 37C)

scripts/
  verify-phase37c-modularity.ps1 — Phase 37C verifier (65 gates) (Phase 37C)
```

## 7g. Architecture Quick Map (Phase 38 additions)

```
data/payers/
  us_core.json                — 12 US payer seed records (Phase 38)
  ph_hmos.json                — 15 PH payer seed records (PhilHealth + HMOs) (Phase 38)

apps/api/src/rcm/
  domain/
    claim.ts                  — Claim entity, lifecycle transitions, 9-state FSM (Phase 38)
    payer.ts                  — Payer entity, IntegrationMode (6 modes) (Phase 38)
    remit.ts                  — Remittance/EOB types for 835 processing (Phase 38)
    claim-store.ts            — In-memory claim + remittance store (Phase 38)
  payer-registry/
    registry.ts               — Payer catalog, seed loader from data/payers/ (Phase 38)
  edi/
    types.ts                  — X12 transaction types (837/835/270-278/999/TA1) (Phase 38)
    pipeline.ts               — EDI pipeline orchestration, 10-stage tracking (Phase 38)
  validation/
    engine.ts                 — Multi-layer validation (15+ rules, 5 categories) (Phase 38)
  connectors/
    types.ts                  — RcmConnector interface + registry (Phase 38)
    clearinghouse-connector.ts — US EDI clearinghouse transport (Phase 38)
    philhealth-connector.ts   — PhilHealth eClaims API adapter (Phase 38)
    sandbox-connector.ts      — Simulated transport for dev/testing (Phase 38)
    portal-batch-connector.ts — HMO portal/batch upload adapter (Phase 38)
  audit/
    rcm-audit.ts              — Hash-chained PHI-safe RCM audit trail (Phase 38)
  rcm-routes.ts               — ~30 RCM REST endpoints (Phase 38)

apps/web/src/app/cprs/admin/rcm/
  page.tsx                    — RCM dashboard (4 tabs: Claims, Payers, Connectors, Audit) (Phase 38)

docs/runbooks/
  rcm-payer-connectivity.md   — Main RCM runbook (Phase 38)
  rcm-philhealth-eclaims.md   — PhilHealth integration guide (Phase 38)
  rcm-us-edi-clearinghouse.md — US EDI clearinghouse guide (Phase 38)
  payer-registry.md           — Payer registry reference (Phase 38)

docs/architecture/
  rcm-gateway-architecture.md — RCM architecture spec (Phase 38)

docs/security/
  rcm-phi-handling.md         — RCM PHI safeguards + HIPAA compliance (Phase 38)

scripts/
  verify-phase38-rcm.ps1      — Phase 38 verifier (Phase 38)
```

## 7h. Architecture Quick Map (Phase 39 additions)

```
data/vista/
  capability-map-billing.json — Machine-readable VistA billing capability map (Phase 39)

apps/api/src/routes/
  vista-rcm.ts                — VistA RCM read-only routes (7 endpoints) (Phase 39)

apps/web/src/app/cprs/admin/rcm/
  page.tsx                    — +VistA Billing tab (encounter/insurance/ICD/pending) (Phase 39)

docs/vista/
  capability-map-billing.md   — Human-readable billing capability map (Phase 39)

docs/runbooks/
  rcm-billing-grounding.md    — Phase 39 billing grounding runbook (Phase 39)

services/vista/
  ZVEBILP.m                   — VistA billing probe routine (IB/PRCA/PCE globals) (Phase 39)
  ZVEBILR.m                   — VistA billing RPC probe routine (85 RPCs found) (Phase 39)

scripts/
  verify-phase39-billing-grounding.ps1 — Phase 39 verifier (Phase 39)
```

## 7i. Architecture Quick Map (Phase 40 additions)

```
apps/api/src/rcm/
  edi/
    x12-serializer.ts          — X12 5010 wire format serializer (837P/I, 270) (Phase 40)
    ph-eclaims-serializer.ts   — PhilHealth eClaims CF1-CF4 bundle generator (Phase 40)

apps/web/src/app/cprs/admin/rcm/
  page.tsx                     — +submission safety banner, +DEMO badge, +export column (Phase 40)

docs/runbooks/
  rcm-payer-connectivity-phase40.md — Phase 40 runbook (Phase 40)

scripts/
  verify-phase40-payer-connectivity.ps1 — Phase 40 verifier (53 gates) (Phase 40)
```

## 7j. Architecture Quick Map (Phase 106 additions)

```
tools/rpc-extract/
  build-coverage-map.mjs        -- CPRS+Vivian+API cross-reference generator (Phase 106)

docs/vista-alignment/
  rpc-coverage.json              -- 1016 tracked RPCs with status + call sites (Phase 106)
  rpc-coverage.md                -- Human-readable coverage report (Phase 106)

apps/web/src/
  components/cprs/
    VistaAlignmentBanner.tsx     -- Dev-mode VistA wiring status banner (Phase 106)
  lib/
    vista-panel-wiring.ts        -- Auto-generated panel wiring metadata (Phase 106)

scripts/
  verify-phase106-vista-alignment.ps1 -- Phase 106 verifier (23 checks, 8 gates) (Phase 106)
```

106. **`build-coverage-map.mjs` is deterministic (content-hash stable).**
     File hash varies due to `generatedAt` timestamp, but stripping the
     timestamp produces identical content hashes across runs. The tool
     cross-references CPRS Delphi extraction (975 RPCs), Vivian index
     (3747 RPCs), and the API `rpcRegistry.ts` (109+29). Output includes
     `rpc-coverage.json`, `rpc-coverage.md`, and `vista-panel-wiring.ts`.
107. **VistaAlignmentBanner is dev-mode only and not yet integrated.**
     The component returns null in production (`NODE_ENV === 'production'`).
     Panels can import it as `<VistaAlignmentBanner panelName="CoverSheetPanel" />`
     to display a wiring status badge. No panel imports it yet -- adoption
     is optional and incremental.
108. **Phase 106 verifier catches unregistered RPCs at CI time.**
     Gate 3 scans all `callRpc`/`safeCallRpc`/`safeCallRpcWithList` call
     sites and fails if any reference an RPC not in `RPC_REGISTRY` or
     `RPC_EXCEPTIONS`. This prevents silent drift between code and registry.

89. **VistA billing data is split across IB/PRCA/PCE subsystems (Phase 39).**
    PCE encounters (^AUPNVSIT, ^AUPNVCPT, ^AUPNVPOV) have data in the sandbox.
    IB charges (^IB(350)) and claims (^DGCR(399)) are empty in WorldVistA Docker.
    AR transactions (^PRCA(430)) are also empty. The read-only endpoints return
    `status: "integration-pending"` with exact VistA file/routine/RPC targets.
90. **85 billing-related RPCs exist in the sandbox.** ORWPCE (55), IBD (12),
    IBCN (2), IBARXM (3), SD W/L (14), IBO/DGBT (2). All are callable but
    IB/PRCA data-producing RPCs return empty results due to missing upstream data.
91. **`/vista/rcm/*` routes auto-require session via AUTH_RULES catch-all.**
    No additional auth configuration needed. The `/vista/` prefix matches the
    existing catch-all rule in `security.ts`.
92. **Integration-pending responses include `vistaGrounding` metadata.**
    Each pending endpoint returns `{ vistaFiles, targetRoutines, migrationPath,
    sandboxNote }` so developers know exactly what VistA subsystem to integrate
    when moving to production.
93. **MUMPS probing through Docker uses .m routines, not inline commands.**
    PowerShell -> Docker -> su -> mumps has 4 layers of quoting that break.
    Write .m files in `services/vista/`, `docker cp` into container, then
    `mumps -r ROUTINENAME`. See ZVEBILP.m and ZVEBILR.m for examples.
94. **`CLAIM_SUBMISSION_ENABLED=false` by default (Phase 40).** No claim
    is ever submitted to a real payer unless this env var is explicitly set
    to `true`. The default behavior is export-only: claims are serialized to
    X12 wire format and written to `data/rcm-exports/` as review artifacts.
    The submit endpoint returns `submitted: false, safetyMode: 'export_only'`
    and transitions the claim to `ready_to_submit` instead of `submitted`.
95. **Demo claims are permanently blocked from real submission (Phase 40).**
    Claims created with `isDemo: true` return 403 on `/rcm/claims/:id/submit`
    regardless of `CLAIM_SUBMISSION_ENABLED`. They can only be exported.
96. **X12 serializer defaults to `usageIndicator: 'T'` (test) (Phase 40).**
    The scaffold serializer in `x12-serializer.ts` generates structurally
    correct 5010 X12 but NEVER defaults to production mode. Override with
    `{ usageIndicator: 'P' }` only for real clearinghouse submission.
97. **No proprietary code set tables bundled (Phase 40).** CPT/HCPCS
    descriptions and ICD-10-CM descriptions are NOT embedded in the
    serializer. Code values pass through as-is. The clearinghouse or
    payer validates code set membership. This avoids AMA/CMS licensing issues.
98. **PhilHealth eClaims uses CF1-CF4 JSON bundles, NOT X12 (Phase 40).**
    The `ph-eclaims-serializer.ts` transforms EdiClaim837 to PhilHealth
    format. CF1=facility, CF2=claim, CF3=professional fees (inpatient),
    CF4=medicines/supplies. Actual API submission through PhilHealth connector.
99. **CSV payer import at `/rcm/payers/import` requires payerId,name columns.**
    Additional columns map to payer fields. Defaults: country=US, status=active,
    integrationMode=not_classified. Use this for bulk onboarding from
    clearinghouse payer rosters.
100. **Export artifacts go to `data/rcm-exports/` at repo root.**
     Files named `{txSet}_{claimId}_{timestamp}.x12`. Directory is created
     automatically. Add to `.gitignore` for production deployments.
101. **PowerShell `Set-Content -Encoding UTF8` adds BOM (Phase 75).**
     Any JSON file emitted by PowerShell (e.g., `ConvertTo-Json | Set-Content`)
     starts with bytes `EF BB BF`. Node.js `JSON.parse()` chokes on the BOM.
     Always strip BOM before parsing: `raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw`.
     See BUG-064.
102. **Idempotency `reply.then()` clobbers `onSend`-captured body (Phase 103).**
     Fastify `reply.then()` fires after the response is sent (payload gone).
     `onSend` fires during serialization (payload available). Never create a
     new cache entry in `reply.then()` if `onSend` already captured the body.
     The `onSend` hook is the sole authority for response body caching. See BUG-066.
103. **`withPgRetry` and `isPgUniqueViolation` are infrastructure (Phase 103).**
     These are exported from the pg barrel but not yet consumed by PG repos.
     They're ready for adoption when PG repos need retry/dedup logic. Don't
     force-wire them into SQLite-backed routes.
104. **Idempotency middleware is scoped to payer-db routes (Phase 103).**
     The hooks are registered inside the `adminPayerDbRoutes` Fastify plugin,
     so they only affect `/admin/payer-db/*` routes. Other mutation routes
     (RCM, imaging, etc.) are not affected. To extend, register the hooks
     in additional route plugins.
105. **Fastify onRequest hooks don't stop after `reply.send()` (BUG-067).**
     In Fastify v5, calling `reply.send()` in one `onRequest` hook does NOT
     prevent subsequent `onRequest` hooks from executing. If a later hook also
     calls `reply.send()`, Node.js crashes with `ERR_HTTP_HEADERS_SENT`.
     Fix: Set `(request as any)._rejected = true` in the auth gateway hook
     before sending the rejection response. All downstream hooks
     (Origin check, CSRF) must check `if ((request as any)._rejected || reply.sent) return;`
     at entry.

## 7k. Architecture Quick Map (Phase 107 additions)

```
apps/api/src/posture/
  index.ts                    -- Fastify plugin: /posture/* routes (Phase 107)
  observability-posture.ts    -- 6 gates: logging, request IDs, prometheus, OTel, audit, security (Phase 107)
  tenant-posture.ts           -- 8 gates: middleware, RLS, FORCE RLS, connection release (Phase 107)
  perf-posture.ts             -- 6 gates: budgets, rate limiter, circuit breaker, SLO, heap, shutdown (Phase 107)
  backup-posture.ts           -- 6 gates: SQLite, backup script, PG, Docker, in-memory, runbook (Phase 107)

scripts/
  backup-restore.mjs          -- Unified backup/restore for SQLite + PG + audit JSONL (Phase 107)
  qa-gates/prod-posture.mjs   -- Offline production posture QA gate (11 checks) (Phase 107)
  verify-phase107-prod-posture.ps1 -- Phase 107 verifier (15 gates) (Phase 107)

docs/runbooks/
  phase107-production-posture.md -- Production posture runbook (Phase 107)
```

109. **Posture routes require admin auth (Phase 107).** The `/posture/*`
     endpoints expose infrastructure details (RLS status, circuit breaker
     state, heap memory, store inventory). AUTH_RULES enforce `admin` level.
     Do not downgrade to `session`.
110. **Tenant RLS activation is gated by `PLATFORM_PG_RLS_ENABLED=true`.**
     Without this env var, `applyRlsPolicies()` is a no-op. The function
     covers 21 tables with ENABLE + FORCE RLS + tenant_id policy. RLS is
     transaction-scoped via `SET LOCAL app.current_tenant_id` so pooled
     connections cannot leak tenant context.
111. **`backup-restore.mjs` handles SQLite + PG + audit JSONL.** Docker
     volume backups (VistA, Keycloak, Orthanc, YottaDB) require manual
     steps documented in the runbook. In-memory stores (~30) are ephemeral
     by design and not backed up.
112. **Posture checks are live introspection, not unit tests.** The
     `/posture/tenant` endpoint queries `pg_tables` and `pg_class` to
     verify actual RLS status. `/posture/performance` checks live heap
     usage and circuit breaker state. These require a running API.
     Use `pnpm qa:prod-posture` for offline file-existence checks.
113. **`requirePortalSession()` must throw, never `reply.send()` + throw.**
     The portal route helper previously called `reply.code(401).send(...)` then
     `throw new Error(...)`. Fastify catches the throw and tries to send a 500,
     but headers were already sent from the 401, crashing Node with
     `ERR_HTTP_HEADERS_SENT`. Fix: throw an error with `statusCode: 401`
     property and let Fastify handle the response natively. See BUG-068.
114. **`backup-restore.mjs` uses `execFileSync`, not `execSync`.**
     Shell injection via `PLATFORM_PG_URL` was possible when interpolating
     the URL into `execSync('pg_dump "${URL}"')`. Fixed to use `execFileSync`
     with array arguments. Restore requires `--yes` flag to prevent
     accidental data overwrite.

## 7l. Architecture Quick Map (Phase 108 additions)

```
scripts/
  build-phase-index.mjs         -- Scans prompts/, generates docs/qa/phase-index.json (Phase 108)
  generate-phase-qa.mjs         -- Reads phase-index, generates E2E + API test specs (Phase 108)
  phase-qa-runner.mjs           -- Progressive QA runner: phase N, range N M, all (Phase 108)
  qa-gates/phase-index-gate.mjs -- CI gate: validates phase-index.json consistency (Phase 108)

docs/qa/
  phase-index.json              -- Generated: 115 phases with routes/RPCs/UI metadata (Phase 108)

apps/web/e2e/phases/
  phases-*.spec.ts              -- Generated E2E specs (7 files, 78 UI phases) (Phase 108)

apps/api/tests/phases/
  phases-*.test.ts              -- Generated API specs (2 files, 17 API-only phases) (Phase 108)

docs/runbooks/
  phase108-phase-audit-harness.md -- Phase audit harness runbook (Phase 108)
```

115. **Generated test specs are auto-generated -- do NOT edit manually (Phase 108).**
     Run `node scripts/generate-phase-qa.mjs` to regenerate. Manual edits
     will be overwritten. The generator reads `docs/qa/phase-index.json`.
116. **`phase-index.json` must be committed and kept fresh (Phase 108).**
     The CI gate (`phase-index-gate.mjs`) checks existence, phase count
     match, freshness (<30 days), and consistency. Regenerate with
     `pnpm qa:phase-index` after adding phases.
117. **Phase QA runner (`phase-qa-runner.mjs`) supports 5 commands (Phase 108):**
     `phase <N>` (single), `range <from> <to>`, `all`, `index` (rebuild),
     `generate` (regen specs). It delegates to Playwright for E2E and
     Vitest for API specs with 5-minute per-spec timeout.
118. **Phase numbers can be alphanumeric (Phase 108).** E.g. "37B", "95B",
     "96B". All generators and runners handle this. The index builder
     extracts the phase number from the folder name regex, not the prefix.
119. **Module entitlements are now DB-backed (Phase 109).** The in-memory
     `tenantModuleOverrides` Map in `module-registry.ts` is supplemented by
     4 SQLite tables: `module_catalog`, `tenant_module`, `tenant_feature_flag`,
     `module_audit_log`. The DB is the source of truth when the entitlement
     provider is registered (via `setDbEntitlementProvider()` in `index.ts`
     after `initPlatformDb()`). Falls back to in-memory SKU resolution if
     DB is unavailable.
120. **Module catalog is seeded from config/modules.json on startup (Phase 109).**
     `module-catalog-seed.ts` reads `config/modules.json` + `config/skus.json`,
     upserts all 13 modules into `module_catalog`, then seeds `tenant_module`
     rows for the default tenant from the active SKU profile. Idempotent --
     existing entitlements are not overwritten.
121. **Module audit log is append-only and tenant-scoped (Phase 109).** Every
     enable/disable, feature flag change, and seed operation writes to
     `module_audit_log` with actor, before/after JSON, and reason. Query via
     `GET /admin/modules/audit?limit=100&offset=0`.
122. **Feature flags are per-tenant key-value pairs (Phase 109).** Stored in
     `tenant_feature_flag` with unique (tenant_id, flag_key). Optionally
     scoped to a module_id. Manage via `/admin/modules/feature-flags` CRUD.
123. **`/admin/modules/*` routes bypass the module guard (Phase 109).** Added
     to BYPASS_PATTERNS in `module-guard.ts`. Auth is still enforced by
     AUTH_RULES (`/admin/*` requires admin role).

---

## 7m. Architecture Quick Map (Phase 109 additions)

```
apps/api/src/
  modules/
    module-catalog-seed.ts        -- Startup seed: modules.json -> DB (Phase 109)
    module-registry.ts            -- +setDbEntitlementProvider, DB-first resolution (Phase 109)
  platform/db/
    schema.ts                     -- +moduleCatalog, tenantModule, tenantFeatureFlag, moduleAuditLog (Phase 109)
    migrate.ts                    -- +4 CREATE TABLE + 11 indexes (Phase 109)
    repo/
      module-repo.ts              -- Full CRUD for all 4 Phase 109 tables (Phase 109)
  routes/
    module-entitlement-routes.ts  -- 8 admin endpoints: catalog, entitlements, flags, audit (Phase 109)
  middleware/
    module-guard.ts               -- +/admin/modules bypass (Phase 109)

apps/web/src/app/cprs/admin/modules/
  page.tsx                        -- +Entitlements tab, +Feature Flags tab, +Audit Log tab (Phase 109)

docs/architecture/
  module-catalog.md               -- 13 modules, 7 SKUs, 9 feature flags documented (Phase 109)

scripts/
  verify-phase109-modular-packaging.ps1 -- Phase 109 verifier (35 gates) (Phase 109)
```

## 7n. Architecture Quick Map (Phase 125 additions)

```
apps/api/src/
  platform/
    runtime-mode.ts               -- PLATFORM_RUNTIME_MODE contract (dev/test/rc/prod) (Phase 125)
    store-resolver.ts             -- +blocks SQLite in rc/prod (Phase 125)
  posture/
    data-plane-posture.ts         -- 9 production data plane gates (Phase 125+150+153)
    index.ts                      -- +/posture/data-plane endpoint (Phase 125)
  platform/pg/
    pg-migrate.ts                 -- +auto-enables RLS for rc/prod mode (Phase 125)
  rcm/payers/
    payer-persistence.ts          -- +blocks JSON file writes in rc/prod (Phase 125)

qa/gauntlet/
  gates/g12-data-plane.mjs        -- Data plane gauntlet gate (Phase 125)
  cli.mjs                         -- +G12 in RC + FULL suites (Phase 125)

scripts/migrations/
  sqlite-to-pg.mjs                -- One-shot SQLite -> PG data transfer (Phase 125)

docs/runbooks/
  postgres-only-dataplane.md      -- Data plane runbook (Phase 125)
```

124. **`PLATFORM_RUNTIME_MODE` controls the data plane contract (Phase 125).**
     Values: `dev` (default), `test`, `rc`, `prod`. In `rc`/`prod` mode,
     PostgreSQL is required -- the API throws on startup if `PLATFORM_PG_URL`
     is not set. SQLite store backend is blocked. JSON mutable file stores
     are blocked. RLS auto-enables. Falls back to `NODE_ENV` mapping if unset.
125. **Store resolver blocks SQLite in rc/prod (Phase 125).** `resolveBackend()`
     in `store-resolver.ts` checks `requiresPg()` and refuses to return
     `"sqlite"` in rc/prod modes. `STORE_BACKEND=sqlite` throws immediately.
     `STORE_BACKEND=auto` also throws if PG is not configured.
126. **JSON mutable file stores blocked in rc/prod (Phase 125).**
     `payer-persistence.ts` `atomicWrite()` checks `blocksJsonStores()` and
     throws if the runtime mode is rc/prod. Use the PG-backed payer repository
     via store-resolver instead.
127. **Migration script: `scripts/migrations/sqlite-to-pg.mjs` (Phase 125).**
     One-shot idempotent SQLite-to-PG data transfer. Uses `ON CONFLICT DO NOTHING`.
     Supports `--dry-run` and `--table TABLE` flags. Requires `PLATFORM_PG_URL`
     and an existing `data/platform.db`.
128. **RCM store repo interfaces use `any`, not typed arrays (Phase 126).**
     `ClaimRepo`, `ClaimCaseRepo`, `AckRepo`, and `PipelineRepo` declare all
     methods as returning `any`. This is intentional — SQLite repos return
     synchronous values while PG repos return `Promise<T[]>`. Using `any`
     lets both be assignable to the same interface. Do not "fix" these to
     typed return signatures without also making callers await-safe.
129. **EDI ack + pipeline stores use write-through, not full DB-first reads
     (Phase 126).** `ack-status-processor.ts` and `pipeline.ts` still serve
     reads from in-memory Maps (cache-first). DB writes are fire-and-forget
     (`void dbRepo.insertXxx(...)`). This is intentional for latency — the
     Maps are the hot path. The PG tables provide restart durability and
     audit queryability. Full DB-first reads can be added later when needed.
130. **PG migration v10 covers 6 RCM/EDI tables (Phase 126).** Tables:
     `rcm_claim`, `rcm_remittance`, `rcm_claim_case`, `edi_acknowledgement`,
     `edi_claim_status`, `edi_pipeline_entry`. All have `tenant_id` columns
     and are included in `applyRlsPolicies()`. The edi_acknowledgement and
     edi_claim_status tables have UNIQUE indexes on `(tenant_id, idempotency_key)`.
131. **CSRF uses session-bound synchronizer token, NOT double-submit cookie
     (Phase 132).** The `ehr_csrf` cookie is no longer set. CSRF secrets are
     generated at session creation, stored in the DB `csrf_secret` column,
     and delivered to clients via JSON response body (`csrfToken` field on
     login response and `GET /auth/csrf-token`). Clients must store the token
     in memory and send it as `X-CSRF-Token` header. Never read CSRF from
     cookies. Portal uses the same pattern via `validateCsrf(req, reply,
     session.csrfSecret)`. See `apps/web/src/lib/csrf.ts` for the shared
     frontend CSRF manager.

## 7o. Architecture Quick Map (Phase 143 additions)

```
apps/api/src/intake/brain/
  types.ts                      -- IntakeBrainPlugin interface + result types (Phase 143)
  registry.ts                   -- Plugin registry + decision audit store (Phase 143)
  rules-engine.ts               -- Deterministic rules engine brain (default) (Phase 143)
  llm-provider.ts               -- LLM brain (AI Gateway bridge, governed) (Phase 143)
  third-party-connector.ts      -- 3P connector scaffold (adapter pattern) (Phase 143)
  index.ts                      -- Barrel + initBrainPlugins() (Phase 143)

apps/api/src/intake/
  brain-routes.ts               -- 9 brain-specific API endpoints (Phase 143)

apps/portal/src/app/dashboard/intake/
  page.tsx                      -- +Provider selector UI (Phase 143)

apps/portal/public/messages/
  en.json                       -- +7 intake brain i18n keys (Phase 143)
  fil.json                      -- +7 intake brain i18n keys (Phase 143)
  es.json                       -- +7 intake brain i18n keys (Phase 143)

docs/runbooks/
  phase143-ai-intake-engine.md  -- AI intake engine runbook (Phase 143)
```

132. **Brain plugin registry is always-fallback-to-rules (Phase 143).**
     `resolveBrainPlugin()` tries exact match, then family match, then
     rules_engine. The rules engine is always registered and cannot be
     unregistered. LLM and 3P providers are opt-in via env vars.
133. **Brain decisions are audited with input/output hashes (Phase 143).**
     The `logBrainDecision()` function logs every nextQuestion, submitAnswer,
     startSession, and finalizeSummary call. Hashes are SHA-256 truncated to
     16 chars. No PHI in the audit store.
134. **LLM brain may only RANK, never INVENT questions (Phase 143).**
     The LLM provider gets eligible questions from the rules engine first,
     then asks the LLM to rank them. The LLM cannot add new questions
     not in the pack registry.
135. **TIU draft notes are ALWAYS DRAFT and require clinician signature.**
     The `/intake/sessions/:id/tiu-draft` endpoint generates TIU-ready
     note text with `vistaIntegration.requiresSignature: true`. Target
     RPCs: `TIU CREATE RECORD`, `TIU SET DOCUMENT TEXT`.
136. **Brain state stores are in-memory (Phase 143).** `brainStates` Map
     in brain-routes.ts and `decisionAuditLog` array in registry.ts.
     Both registered in store-policy.ts. Loss on restart = session re-init
     recreates brain state.

## 7p. Architecture Quick Map (Phase 147 additions)

```
services/vista/
  ZVESDSEED.m                     -- Optional sandbox seeder (clinic/appt-type/appt data) (Phase 147)

apps/api/src/adapters/scheduling/
  interface.ts                    -- +6 types: AppointmentType, CancelReason, ClinicResource,
                                     SdesAvailSlot, TruthGateResult, SchedulingMode (Phase 147)
                                  -- +6 methods: getAppointmentTypes, getCancelReasons,
                                     getClinicResource, getSdesAvailability, verifyAppointment,
                                     getSchedulingMode (Phase 147)
  stub-adapter.ts                 -- +6 stub method implementations (Phase 147)
  vista-adapter.ts                -- +6 SDES depth methods, +11 SDES posture entries (Phase 147)

apps/api/src/routes/scheduling/
  index.ts                        -- +6 endpoints: appointment-types, cancel-reasons,
                                     clinic/:ien/resource, sdes-availability, verify/:ref,
                                     mode (Phase 147)

apps/api/src/lib/
  immutable-audit.ts              -- +scheduling.truth_gate action (Phase 147)

apps/api/src/vista/
  rpcRegistry.ts                  -- +19 RPCs (SDES x11, SDVW x2, SD W/L x3, ORWPT x1, SD x2) (Phase 147)

apps/portal/src/app/dashboard/appointments/
  page.tsx                        -- +scheduling mode badge (aligned with API SchedulingMode) (Phase 147)

apps/portal/src/lib/
  api.ts                          -- +fetchSchedulingMode() via portalFetch (Phase 147)

config/
  capabilities.json               -- +7 scheduling capabilities (Phase 147)

docs/runbooks/
  phase147-scheduling-depth-v2.md -- Scheduling depth runbook (Phase 147)
```

137. **SDES RPCs are callable but return no data without `ZVESDSEED.m` (Phase 147).**
     The WorldVistA Docker sandbox has 80+ SDES RPCs installed, but many
     return empty results because File 44 clinics lack SDES resource/slot
     configuration. Run `ZVESDSEED.m` (optional, DEV/DEMO labeled) to seed
     basic clinic + appointment type + demo appointment data.
138. **Truth gate pattern: verify local state against VistA (Phase 147).**
     `verifyAppointment()` calls `SDES GET APPT BY APPT IEN` with the local
     appointment ref. If the RPC confirms the appointment exists in VistA,
     `passed: true, vistaVerified: true`. Falls back to `SDOE LIST ENCOUNTERS
     FOR PAT` and scans for a matching IEN. The result is logged to the
     immutable audit trail as `scheduling.truth_gate`.
139. **`getSchedulingMode()` probes SDES/SDOE/SDWL/SDVW RPCs at runtime (Phase 147).**
     Each probe is wrapped in try/catch. `sdesInstalled` means SDES GET APPT
     TYPES succeeded. Mode is `sdes_partial` if SDES installed, otherwise
     `request_only`. Future: `vista_direct` when full SDES writeback is confirmed.
140. **Portal scheduling mode badge uses `portalFetch`, not bare `fetch` (Phase 147).**
     The badge calls `fetchSchedulingMode()` from `api.ts` which routes through
     `portalFetch("/scheduling/mode")` with `API_BASE`. A bare `fetch("/api/...")`
     would hit Next.js (no proxy) and silently fail. BUG-069/070 fixed in VERIFY.

## 7q. Architecture Quick Map (Phase 148 additions)

```
services/vista-distro/
  Dockerfile                      -- Multi-stage reproducible VistA build (Phase 148)
  docker-compose.yml              -- Distro lane compose (profile: distro, port 9431) (Phase 148)
  entrypoint.sh                   -- Runtime: YottaDB init + xinetd broker (Phase 148)
  health-check.sh                 -- TCP probe for Docker HEALTHCHECK (Phase 148)
  build.env                       -- Version pinning (YottaDB, VistA-M ref) (Phase 148)
  .dockerignore                   -- Build context exclusions (Phase 148)
  routines/                       -- Custom ZVE* MUMPS routines for distro (Phase 148)

apps/api/src/vista/
  swap-boundary.ts                -- Typed swap boundary contract + validators (Phase 148)

data/vista/
  rpc-catalog-snapshot.json       -- Versioned RPC catalog (137 RPCs + 59 exceptions) (Phase 148)

scripts/
  verify-vista-compat.ps1         -- Compatibility test (14 gates) (Phase 148)

docs/runbooks/
  vista-distro-lane.md            -- Build, run, swap, cutover runbook (Phase 148)
```

141. **Distro lane runs on port 9431 to avoid conflict with dev sandbox (Phase 148).**
     The dev sandbox uses port 9430. Both can run simultaneously. Switch the
     API by changing `VISTA_HOST`/`VISTA_PORT` in `.env.local`. The
     `VISTA_INSTANCE_ID` env var disambiguates in logs and swap boundary.
142. **No credentials baked into the distro Dockerfile (Phase 148).**
     `entrypoint.sh` fails fast if `VISTA_ADMIN_ACCESS`/`VISTA_ADMIN_VERIFY`
     are not set. Credentials must be injected via `-e` flags, `.env` file,
     or Docker/K8s secrets. This is enforced by the compatibility test
     (Gate 8: no baked creds in Dockerfile, Gate 9: no baked creds in entrypoint).
143. **`/vista/swap-boundary` is an unauthenticated infrastructure probe (Phase 148).**
     Added to AUTH_RULES bypass (`"none"`) alongside `/vista/ping`. Returns
     the active `VistaSwapBoundary` descriptor showing instance ID, connection
     params, capabilities, and security posture. Does not expose credentials.
144. **RPC catalog snapshot is generated, not hand-maintained (Phase 148).**
     Run `node -e "..."` to regenerate from `rpcRegistry.ts`. The snapshot
     includes all 137 registered RPCs and 59 exceptions with domains and tags.
     Used by the compatibility test and for cross-referencing during cutover.
145. **`validateSwapBoundary()` returns a failure list (Phase 148).** Pass
     probe results and the boundary descriptor to get a list of unmet
     contract requirements. Empty list = swap is safe. Used in the
     compatibility test and available for runtime health checks.
146. **OIDC is mandatory in rc/prod mode (Phase 150).** `requiresOidc()`
     returns true for rc/prod. `validateRuntimeMode()` throws at startup
     if OIDC_ENABLED is not "true" or OIDC_ISSUER is not set. Dev mode
     is unaffected -- VistA RPC auth remains the only path.
147. **Portal session tokens are SHA-256 hashed in PG (Phase 150).**
     The raw token is stored only in the httpOnly cookie and the in-memory
     Map cache. The database stores `hashPortalToken(token)` using SHA-256.
     This prevents session hijacking if the database is compromised.
     Use `pg-portal-session-repo.ts` for all PG session operations.
148. **Portal logs never contain DFN (Phase 150).** The `log.info("Portal
     login")` call no longer includes `{ dfn }`. DFN appears only in the
     `portalAudit()` security audit trail. Do not add DFN to general
     `log.*` calls.
149. **`portal_patient_identity` maps OIDC sub to patient DFN (Phase 150).**
     New table with unique index on (tenant_id, oidc_sub). Included in
     RLS tenant tables. Not yet populated -- requires OIDC login path.
150. **`sanitizeAuditDetail()` is the single entry point for audit PHI scrub (Phase 151).**
     Exported from `lib/phi-redaction.ts`. All audit emitters (immutableAudit,
     portalAudit, imagingAudit, rcmAudit) now delegate to it before storing
     detail objects. It calls `redactPhi()` which strips all PHI_FIELDS keys
     (including dfn, patientDfn, patient_dfn, mrn, ssn, dob, patientName)
     and scrubs inline patterns (SSN, DOB, VistA names). Never bypass it.
151. **`auditIncludesDfn: false` in server-config.ts (Phase 151).** DFN is
     no longer included in audit log output. The `neverLogFields` set also
     blocks dfn, patientDfn, patient_dfn, patientName, patient_name, mrn
     from appearing in structured log payloads.
152. **G22 PHI Leak Audit is a static analysis CI gate (Phase 151).** Scans
     `routes/` and `services/` directories for `log.info|warn|error` calls
     that include `dfn` in their payload object. Also validates phi-redaction.ts
     field coverage, server-config settings, and audit emitter wiring. Add
     any new PHI fields to `PHI_FIELDS` in phi-redaction.ts, not in individual
     audit modules.

## 7r. Architecture Quick Map (Phase 153 additions)

```
apps/api/src/
  auth/
    oidc-provider.ts              -- +validateOidcConfig(), OidcConfigValidation (Phase 153)
  posture/
    data-plane-posture.ts         -- +Gate 8 AUTH_MODE alignment, +Gate 9 OIDC config depth (Phase 153)
  platform/pg/
    pg-migrate.ts                 -- +v20 tenant_oidc_mapping table + RLS entry (Phase 153)

qa/gauntlet/gates/
  g12-data-plane.mjs              -- +sub-checks 9-11: auth-mode, validateOidcConfig, tenant mapping (Phase 153)

apps/api/
  .env.example                    -- +OIDC/IAM/runtime-mode env vars (Phase 153)

# Cookie secure flag alignment (Phase 153):
apps/api/src/auth/auth-routes.ts          -- +PLATFORM_RUNTIME_MODE check
apps/api/src/auth/idp/idp-routes.ts       -- +PLATFORM_RUNTIME_MODE check
apps/api/src/routes/portal-auth.ts        -- +PLATFORM_RUNTIME_MODE check
apps/api/src/portal-iam/portal-iam-routes.ts -- +PLATFORM_RUNTIME_MODE check
apps/api/src/routes/hardening-routes.ts   -- +PLATFORM_RUNTIME_MODE check + posture update
```

153. **`validateOidcConfig()` enforces OIDC config depth in rc/prod (Phase 153).**
     In rc/prod mode, `validateOidcConfig()` returns errors (not just warnings)
     for: missing OIDC_ENABLED, missing OIDC_ISSUER, missing OIDC_CLIENT_ID.
     In dev/test, the same missing values produce warnings only. The function
     does NOT import from `runtime-mode.ts` to avoid circular deps -- it reads
     `PLATFORM_RUNTIME_MODE` directly from `process.env`.
154. **Cookie secure flag aligned with PLATFORM_RUNTIME_MODE (Phase 153).**
     All 5 cookie `secure:` flags now also check `PLATFORM_RUNTIME_MODE=rc|prod`
     in addition to `NODE_ENV=production`. This ensures cookies are secure even
     when NODE_ENV is not explicitly set to production but the runtime mode is.
155. **Data plane posture now has 9 gates (Phase 153).** Gate 8 checks
     AUTH_MODE=oidc when PG is required (rc/prod). Gate 9 checks OIDC config
     depth (OIDC_CLIENT_ID explicitly set, not defaulted). Gates 1-6 are
     Phase 125, Gate 7 is Phase 150, Gates 8-9 are Phase 153.
156. **`tenant_oidc_mapping` table (Phase 153).** PG migration v20 creates
     the table with columns: id, tenant_id, issuer_url, client_id, audience,
     claim_mapping_json, enabled, created_at, updated_at. Unique index on
     (tenant_id, issuer_url). Included in RLS tenant tables array.
157. **G12 gauntlet gate has 11 sub-checks (Phase 153).** Sub-checks 9-11
     validate auth-mode-policy.ts enforceAuthMode, oidc-provider.ts
     validateOidcConfig, and tenant_oidc_mapping migration presence.

## 7s. Architecture Quick Map (Phase 154 additions)

```
apps/api/src/
  routes/cprs/
    orders-cpoe.ts                -- +DB-backed idempotency, +PG sign event audit (Phase 154)
    wave2-routes.ts               -- +DB-backed idempotency, Map removed (Phase 154)
    tiu-notes.ts                  -- +DB-backed idempotency, Map removed (Phase 154)
  middleware/
    idempotency.ts                -- +X-Idempotency-Key backward compat (Phase 154)
  platform/pg/
    pg-migrate.ts                 -- +v21 cpoe_order_sign_event table (Phase 154)
  platform/
    store-policy.ts               -- orders/wave2/tiu idempotency -> pg_backed (Phase 154)

apps/web/src/components/cprs/panels/
  OrdersPanel.tsx                 -- +esCode input, +Idempotency-Key header (Phase 154)

config/
  capabilities.json               -- clinical.orders.sign targetRpc corrected to ORWOR1 SIG (Phase 154)
```

158. **In-memory Map idempotency eliminated from all CPRS write routes (Phase 154).**
     `orders-cpoe.ts`, `wave2-routes.ts`, and `tiu-notes.ts` all used separate
     `Map<string, IdempotencyEntry>` stores with 10-min TTL. These are replaced
     by the DB-backed `idempotencyGuard()` middleware from `middleware/idempotency.ts`
     which uses the `idempotency_key` PG table (24h TTL). Multi-instance safe.
159. **`idempotencyGuard` middleware now accepts both header names (Phase 154).**
     Both `Idempotency-Key` and `X-Idempotency-Key` are accepted for backward
     compatibility. The middleware reads `request.headers["idempotency-key"]`
     first, falls back to `request.headers["x-idempotency-key"]`.
160. **`cpoe_order_sign_event` PG table tracks all sign attempts (Phase 154).**
     PG migration v21 creates the table with columns: id (UUID PK), tenant_id,
     order_ien, dfn, duz, action, status, es_hash (SHA-256 truncated to 16 chars),
     rpc_used, detail (JSONB), created_at. Three indexes on (tenant_id, created_at),
     (tenant_id, order_ien), (tenant_id, dfn). Included in RLS tenant tables.
161. **Sign endpoint returns structured blockers, never fake success (Phase 154).**
     Missing esCode returns `{ok:false, status:"sign-blocked", blocker:"esCode_required"}`.
     RPC unavailable returns `{ok:false, status:"integration-pending"}`.
     Successful sign returns `{ok:true, status:"signed"}`. No silent no-ops.
162. **esCode is hashed before logging (Phase 154).** The raw e-signature code
     is never stored in audit trails or PG events. `hashEsCode()` uses SHA-256
     truncated to 16 hex chars. The hash is stored in `cpoe_order_sign_event.es_hash`.

## 8. Bug Tracker & Lessons Learned

A comprehensive log of every bug, challenge, and fix from Phase 1 through
Phase 25 lives in **[`docs/BUG-TRACKER.md`](docs/BUG-TRACKER.md)**.

It covers 58 bugs with:
- What was attempted
- The exact error or symptom
- Root cause analysis
- The fix applied
- Preventive measures

Plus 13 cross-cutting lessons and a quick-reference error → fix lookup table.

**Update this file whenever a new bug is found and fixed.** It's the single
source of debugging wisdom for VistA-Evolved.
