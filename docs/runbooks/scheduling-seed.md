# Scheduling Sandbox Seed -- ZVESDSEED.m

> **DEV/DEMO ONLY** -- never run in production.

## Purpose

The WorldVistA Docker sandbox has SDES/SDOE/SD RPCs installed but many return
empty results because File 44 clinics lack scheduling resource/slot/appointment
configuration. `ZVESDSEED.m` seeds minimal clinics, appointment types, and demo
appointments so that scheduling endpoints return real data.

## What It Seeds

1. **Hospital Location (File 44)** -- 3 clinics if fewer than 3 exist:
   - PRIMARY CARE CLINIC (stop code 301)
   - MENTAL HEALTH CLINIC (stop code 502)
   - CARDIOLOGY CLINIC (stop code 303)
2. **Appointment Types (File 409.1)** -- standard types if not present
3. **Demo appointments** for DFN 3 (CARTER,DAVID) via `^SC` entries

## Prerequisites

- WorldVistA Docker container running (`services/vista/docker-compose.yml`)
- Container name: `wv` (default)

## Install Steps

```powershell
# 1. Copy routine into container
docker cp services/vista/ZVESDSEED.m wv:/tmp/ZVESDSEED.m

# 2. Install routine into MUMPS routines directory
docker exec -it wv su - wv -c "cp /tmp/ZVESDSEED.m /home/wv/r/ZVESDSEED.m"

# 3. Run the seeder
docker exec -it wv su - wv -c "mumps -r ZVESDSEED"

# Expected output:
# === VistA-Evolved Scheduling Sandbox Seeder (Phase 147) ===
# *** DEV/DEMO ONLY -- NOT FOR PRODUCTION ***
# --- Checking Hospital Location (File 44) ---
#   Existing clinics in ^SC: N
#   [Seeding messages...]
# === Seeding complete ===
```

## Verify

```powershell
# Verify seeded data exists
docker exec -it wv su - wv -c "mumps -r %XCMD 'D VERIFY^ZVESDSEED'"

# Or test via API (requires API running with .env.local)
curl http://127.0.0.1:3001/scheduling/clinics -b cookies.txt
curl http://127.0.0.1:3001/scheduling/appointment-types -b cookies.txt
```

## Idempotency

The routine is safe to run multiple times. It checks for existing data before
inserting and will skip seeding if sufficient records already exist.

## File Reference

| File                                                | Description                                        |
| --------------------------------------------------- | -------------------------------------------------- |
| `services/vista/ZVESDSEED.m`                        | The MUMPS seeder routine (208 lines)               |
| `apps/api/src/adapters/scheduling/vista-adapter.ts` | VistA scheduling adapter that calls SDES/SDOE RPCs |
| `config/capabilities.json`                          | 22 scheduling capabilities with RPC targets        |

## Scheduling Data Architecture

```
VistA Files:
  File 44    (Hospital Location)  -- clinics
  File 409.1 (Appointment Type)   -- appointment types
  File 409.2 (Cancellation Reason) -- cancel reasons
  File 409.3 (SD Wait List)       -- wait-list entries
  ^SC        (Scheduling globals) -- appointment slots/bookings
  ^AUPNVSIT  (Visit tracking)    -- encounter/visit records
```

## Relationship to Phase 152

Phase 152 enforces PG-only scheduling request stores in rc/prod mode.
The seed routine is **only relevant for dev mode** where in-memory fallback
is allowed and VistA sandbox data augmentation is needed. In rc/prod, all
scheduling requests flow through PostgreSQL exclusively.
