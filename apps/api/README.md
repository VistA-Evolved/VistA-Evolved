# apps/api (API Server)

Node.js API server for VistA Evolved.

## What this is (today)
Minimal Fastify API scaffold for the “Hello System” milestone.

## What this becomes (later)
A thin API layer that:
- Provides endpoints for the web UI
- Talks to VistA/YottaDB via the bridge layer (mg-dbx-napi)
- Validates input/output and normalizes data for the UI

## Run (Hello System)
From repo root:
pnpm -r install

Then:
pnpm -C apps/api dev

## Test
Open:
http://localhost:3001/health

Expected:
{ "ok": true }

## MVP endpoints (planned)
- Patient search
- Patient demographics lookup
- Allergies: list + create
- Vitals: list + create

## Notes
- Keep the API thin: translate UI needs into VistA calls.
- Decisions about REST/FHIR/GraphQL live in ADRs.
