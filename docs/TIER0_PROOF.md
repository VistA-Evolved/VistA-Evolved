# Tier-0 Outpatient Proof Run

> A single, repeatable end-to-end proof that a consulting firm, hospital
> technical reviewer, or certification body can execute to confirm real
> VistA integration behavior.

## What It Proves

The Tier-0 proof validates that the VistA-Evolved API can execute a minimal
outpatient workflow against a live VistA instance using real RPC Broker calls:

| Step | API Endpoint | VistA RPC(s) | What It Proves |
|------|-------------|--------------|----------------|
| 1 | `GET /health` | (none) | API is running and healthy |
| 2 | `GET /vista/default-patient-list` | `ORQPT DEFAULT LIST SOURCE`, `ORWPT LIST ALL` | Authenticated RPC call returns real patient data |
| 3 | `GET /vista/nursing/vitals?dfn=3` | `ORQQVI VITALS` | Clinical read RPC works for vitals |
| 4 | `GET /vista/allergies?dfn=3` | `ORQQAL LIST` | Clinical read RPC works for allergies |
| 5 | `GET /vista/problems?dfn=3` | `ORQQPL PROBLEM LIST` | Clinical read RPC works for problem list |
| 6 | `POST /auth/logout` | (none) | Session cleanup works |

**Key guarantees:**
- No inpatient dependencies (no ADT, no bed management, no discharge RPCs)
- No queue system dependencies (no ticket creation)
- No template or note generation dependencies
- Every VistA-calling step uses a known-good outpatient-safe RPC
- The journey runs server-side via the Clinic Day Simulator engine
- Results include per-step pass/fail, timing, and missing-field analysis

## Prerequisites

1. **VistA Docker sandbox running** -- pick a lane
   (see [runtime-lanes.md](runbooks/runtime-lanes.md) for the full comparison):

   **Lane A -- VEHU (recommended)**:
   ```bash
   docker compose -f services/vista/docker-compose.yml --profile vehu up -d
   ```
   Default creds: `PRO1234` / `PRO1234!!` on port **9431**

   **Lane B -- Legacy (worldvista-ehr)**:
   ```bash
   docker compose -f services/vista/docker-compose.yml --profile legacy up -d
   ```
   Default creds: `PROV123` / `PROV123!!` on port **9430**

2. **Credentials configured** in `apps/api/.env.local` (see `.env.example`).
   Always read creds from `.env.local` -- do not rely on script defaults.

3. **API server running** on port 3001:
   ```bash
   cd apps/api
   npx tsx --env-file=.env.local src/index.ts
   ```

## How to Run

### Windows (PowerShell)

```powershell
.\scripts\verify-tier0.ps1
```

Options:
```powershell
.\scripts\verify-tier0.ps1 -BaseUrl http://127.0.0.1:3001   # custom API URL
.\scripts\verify-tier0.ps1 -SkipDocker                       # skip Docker check
```

### Linux / macOS (bash)

```bash
chmod +x scripts/verify-tier0.sh
./scripts/verify-tier0.sh
```

Options:
```bash
./scripts/verify-tier0.sh --base-url http://127.0.0.1:3001   # custom API URL
./scripts/verify-tier0.sh --skip-docker                       # skip Docker check
```

### Direct (Node.js)

```bash
node scripts/qa/clinic-day-runner.mjs --journey T0
```

## Expected Success Output

```
============================================
  Tier-0 Outpatient Proof Run
  20260305-143022
  API: http://127.0.0.1:3001
============================================

--- Gate 1: Docker VistA container ---
  [PASS] VistA container running

--- Gate 2: API reachability ---
  [PASS] API responded 200 at /health

--- Gate 3: Tier-0 Outpatient Journey (T0) ---

  Clinic Day Simulator
  Base URL: http://127.0.0.1:3001
  Filter: T0

  ============================================================
  PASS  T0 Tier-0 Outpatient Proof (1234ms)
       ok  Verify API health [200] 15ms
       ok  Fetch default patient list (VistA RPC) [200] 312ms
       ok  Read patient vitals (VistA RPC) [200] 189ms
       ok  Read patient allergies (VistA RPC) [200] 145ms
       ok  Read patient problems (VistA RPC) [200] 167ms
       ok  Logout session [200] 23ms
  ============================================================
  Summary: 1/1 journeys passed
           6/6 steps passed
  Duration: 1234ms
  ============================================================

  [PASS] T0 journey completed -- all steps green

--- Gate 4: Artifact integrity ---
  Journeys: 1/1 passed
  Steps:    6/6 passed
  [PASS] Artifact written and parseable

============================================
  TIER-0 PROOF: PASS
  All outpatient-safe RPCs verified end-to-end.
============================================

Artifact: artifacts/tier0-proof-20260305-143022.json
Output:   artifacts/tier0-proof-20260305-143022.txt
```

## Artifacts

Each run produces two files under `artifacts/` (gitignored):

| File | Contents |
|------|----------|
| `tier0-proof-{timestamp}.json` | Machine-readable journey report with per-step results |
| `tier0-proof-{timestamp}.txt` | Human-readable console output log |

The JSON artifact can be consumed by CI pipelines, dashboards, or auditors.

## What To Do if It Fails

### API not reachable
```
[FAIL] API not reachable at http://127.0.0.1:3001
```
- Start the API: `cd apps/api && npx tsx --env-file=.env.local src/index.ts`
- Check that port 3001 is not blocked

### VistA RPC step fails
```
FAIL  T0  Tier-0 Outpatient Proof
    FAIL  Fetch default patient list (VistA RPC) [500] 45ms
          -> Expected status 200, got 500
```
- Verify VistA Docker is running: `docker ps --filter name=vehu` (or `name=wv` for legacy)
- Check `.env.local` has correct credentials for your lane:
  - VEHU: `PRO1234` / `PRO1234!!` (port 9431)
  - Legacy: `PROV123` / `PROV123!!` (port 9430)
- Wait 15s after container start for the broker port to be ready
- Check API logs for RPC Broker connection errors

### Missing fields in response
```
    FAIL  Read patient allergies (VistA RPC) [200] 120ms
          -> Missing fields: ok
```
- The API returned 200 but the response shape is wrong
- Check API logs for middleware errors
- File a bug with the artifact JSON attached

### Logout fails
```
    FAIL  Logout session [200] 10ms
          -> Expected status 200, got 401
```
- Session may have expired during the run
- Check session TTL configuration

## Integration with RC Gates

The Tier-0 proof is registered as **G14** in `scripts/verify-rc.ps1`
(optional/non-blocking). It can be promoted to required for RC-2.

To run it as part of the full RC verification:
```powershell
.\scripts\verify-rc.ps1
```

The G14 gate requires a running API + VistA, so it only runs when
the environment is available (similar to G13 VistA Baseline Probe).

## Relationship to Other Journeys

| Journey | Scope | VistA RPCs | Dependencies |
|---------|-------|-----------|--------------|
| **T0** (this) | Outpatient reads only | 5 RPCs | API + VistA only |
| J1 | Full outpatient visit | 3 RPCs + queue + templates | Queue + note builder |
| J2 | Emergency department | 3 RPCs + imaging | Imaging service |
| J3 | Lab workflow | 3 RPCs | VistA only |
| J4 | Radiology workflow | 1 RPC + imaging | Orthanc service |
| J5 | Revenue cycle | 0 RPCs | RCM subsystem |
| J6 | Patient portal | 0 RPCs | Portal + scheduling |

T0 is intentionally the simplest journey with the fewest external
dependencies. If T0 fails, nothing else will work.
