# VistA-Evolved -- Copilot Build Protocol (MANDATORY)

## RULE ZERO -- Docker-First Verification (NON-NEGOTIABLE)

**Before writing ANY code**, verify the infrastructure is running. This is the
#1 failure mode of AI-assisted development on this project: writing code that
"looks right" but was never tested against the real VistA Docker.

### Check infrastructure

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"
```

If `vehu` or `ve-platform-db` are not running:

```powershell
docker compose -f services/vista/docker-compose.yml --profile vehu up -d
docker compose -f services/platform-db/docker-compose.yml up -d
```

### Start the API

```powershell
cd apps/api
npx tsx --env-file=.env.local src/index.ts
```

**Check the logs.** You MUST see:

- `Server listening` on port 3001
- `Platform PG init` with `ok: true, errors: []`
- NO `migration_failed` messages

If there are migration errors, fix them BEFORE writing any other code.

### Verify VistA connectivity

```powershell
curl.exe -s http://127.0.0.1:3001/vista/ping
# Must return: {"ok":true,"vista":"reachable","port":9431}

curl.exe -s http://127.0.0.1:3001/health
# Must return: {"ok":true,...,"platformPg":{"ok":true,...}}
```

### Test EVERY route change against live VistA

After modifying any backend route:

```powershell
# Login
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"

# Test the route (use DFN=46 for VEHU)
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/<route>?dfn=46"

# Clean up
Remove-Item login-body.json, cookies.txt -ErrorAction SilentlyContinue
```

A route is NOT done until it returns `{"ok": true, ...}` with real VistA data.

### VEHU test data

- Valid patient DFNs: 46, 47, 49, 53-93 (NOT 1, 2, 3 -- those don't exist)
- DFN=46 has: 2 allergies, 5 vitals, 2 problems, 1 note
- Credentials: `PRO1234 / PRO1234!!` (DUZ 1, PROGRAMMER,ONE)

---

## Primary rules

- Never fragment the system. Always inventory first, reuse existing patterns, then verify.
- Never claim code "works" without running it against the live Docker.
- Never skip verification because "it should work" or "it compiled fine."

## Step 0 -- Prompt capture (always first)

Before coding, create a new prompt file under /prompts that contains:

- the user request
- the implementation steps
- the verification steps (including live Docker tests)
- links to files touched

Use the existing ordering rules in prompts/00-ORDERING-RULES.md.

## Step 1 -- Inventory-first

Before editing, list:

- files inspected
- existing routes/endpoints involved
- existing UI pages/components involved
- exact files to change

## Step 2 -- Implement

- Minimal edits
- Reuse existing rpcBrokerClient + route conventions
- Keep API + web consistent
- Don't invent new UI patterns (use the established layout conventions)

## Step 3 -- Verify against LIVE Docker (required, not optional)

This is where AI coding most commonly fails. You MUST:

1. Run the API against the running VistA Docker
2. Call the actual HTTP endpoint with curl
3. Verify the response contains real VistA data
4. If the response has MUMPS errors, fix the parameter passing
5. If the response is 404, verify the route is registered

DO NOT skip this step. DO NOT say "verification deferred."

Also run:

- `scripts/verify-latest.ps1` (or the correct phase/bundle verifier)
- If failures: fix and rerun until clean

## Step 4 -- Docs + Logging artifacts (required)

- Update docs/runbooks/<relevant>.md
- Create ops/summary.md:
  - what changed
  - how to test manually (with actual curl commands that work)
  - verifier output
  - follow-ups
- Create ops/notion-update.json:
  - feature title
  - stage/status
  - prompt ref path
  - runbook path
  - verify script used
  - commit SHA

## Step 5 -- Commit

One coherent commit including:

- code
- prompt file(s)
- runbook
- ops artifacts

## VistA RPC Availability (VEHU -- confirmed 2026-03-05)

Before using any VistA RPC, check if it actually exists. **Do NOT guess.**

### RPCs that EXIST in VEHU (use them directly)

ORWPS ACTIVE, ORQQAL LIST, ORQQVI VITALS, TIU CREATE RECORD,
TIU SET DOCUMENT TEXT, TIU DOCUMENTS BY CONTEXT, PSB ALLERGY (IEN 1278),
PSB VALIDATE ORDER (IEN 646), ORWPCE SAVE, PX SAVE DATA, ORWDX SAVE,
ORWDXA DC, ORWDXA COMPLETE, ORWDXA FLAG, ORWDXA HOLD, ORWDXC ACCEPT,
MAG4 ADD IMAGE, SDEC APPADD.

### RPCs that DO NOT EXIST in VEHU (cannot call them)

PSB MED LOG, PSJBCMA, DGPM NEW ADMISSION/TRANSFER/DISCHARGE,
GMRIO RESULTS, GMRIO ADD, GMPL ADD SAVE, LR ORDER, LR VERIFY,
NURS TASK LIST, NURS ASSESSMENTS, ZVENAS LIST, ZVENAS SAVE.

### How to check if an RPC exists

1. Add the RPC name to `services/vista/ZVEPROB.m` LIST array
2. Run: `docker cp services\vista\ZVEPROB.m vehu:/tmp/ZVEPROB.m`
3. Run: `docker exec vehu su - vehu -c "cp /tmp/ZVEPROB.m /home/vehu/r/ZVEPROB.m && mumps -r PROBE^ZVEPROB"`
4. If it shows `IEN:NNN` -- the RPC exists, wire it
5. If it shows `NOT IN FILE 8994` -- the RPC is genuinely missing

### Key reference files

- `data/vista/vivian/rpc_index.json` -- 3,747 RPCs from Vivian/DOX index
- `docs/vista-alignment/rpc-coverage.json` -- Cross-ref: CPRS + Vivian + API
- `apps/api/src/vista/rpcRegistry.ts` -- Which RPCs our API knows about
- `apps/api/src/lib/tier0-response.ts` -- `SANDBOX_EXPECTED_MISSING` list
- `services/vista/ZVEPROB.m` -- Probe routine for File 8994

**CRITICAL:** Never add an RPC to `SANDBOX_EXPECTED_MISSING` without running
ZVEPROB.m first. This list was wrong before -- it blocked 11 working RPCs.

### When an RPC is missing

If a route needs an RPC that doesn't exist in VEHU:

1. Use an alternative RPC that IS available (e.g., use ORWPS ACTIVE instead of PSB MED LOG)
2. If no alternative, return a clear response explaining what VistA package is needed
3. Include `vistaGrounding` metadata: target file, routine, and migration path
4. Do NOT return 501 "not-implemented" -- return ok:true with what data IS available

---

## What "done" means for this project

A feature or route is DONE when ALL of these are true:

1. API starts without errors (0 migration failures)
2. VistA Docker is running and reachable
3. The route returns `{"ok": true}` with real data from VistA
4. Response includes `rpcUsed` array showing which VistA RPC was called
5. Test was run against LIVE Docker, not simulated
6. No MUMPS errors in the response data
7. Verification script passes

A feature is NOT done if:

- It was only written, never executed
- It returns "Not implemented" or placeholder data
- It was tested against a mock or stub
- Docker was not running during development
