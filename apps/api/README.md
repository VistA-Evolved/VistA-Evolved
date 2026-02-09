# apps/api (API Server)

Node.js API server for VistA Evolved.

## Responsibilities
- Provide API endpoints for the web UI
- Talk to YottaDB/VistA via bridge layer (mg-dbx-napi)
- Validate input/output and normalize data for the UI

## MVP endpoints (planned)
- Patient search
- Patient demographics lookup
- Allergies: list + create
- Vitals: list + create

## Notes
- Keep the API thin: translate UI needs into VistA calls.
- Decisions about REST/FHIR/GraphQL live in ADRs.
