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

The 20 cipher pads (94 chars each) are **not secrets** — they ship in every
VistA distribution inside `XUSRB1.m` at the `Z` label. They are used for
$TRANSLATE-based obfuscation of AV codes and context names.

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
  index.ts              — Fastify server, all routes
  vista/
    config.ts           — env var loader + credential docs
    rpcBroker.ts        — TCP probe for /vista/ping (no auth)
    rpcBrokerClient.ts  — Full XWB RPC client (auth + RPC calls)

services/vista/
  docker-compose.yml    — WorldVistA container (port 9430)

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
pnpm -C apps/api dev

# 4. Verify
curl http://127.0.0.1:3001/vista/default-patient-list
# Should return {"ok":true, ...}
```

---

## 5. Verification Script

Run `scripts/verify-phase1-to-phase4a.ps1` from the repo root. It checks
40 items across Phases 1–4A and reports PASS/FAIL for each.

```powershell
.\scripts\verify-phase1-to-phase4a.ps1
```

---

## 6. Key Gotchas for Future Work

1. **Don't fabricate protocol bytes.** The XWB protocol is finicky about exact
   byte sequences. Use `VISTA_DEBUG=true` to see hex dumps.
2. **Don't guess credentials.** They're documented on Docker Hub and in this file.
3. **`.env.local` is git-ignored.** You must create it yourself — see `.env.example`.
4. **Port 9430 takes ~15s to be ready** after Docker container starts.
5. **The verification script expects Docker running.** Use `-SkipDocker` to skip.
