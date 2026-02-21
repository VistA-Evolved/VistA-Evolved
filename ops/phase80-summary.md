# Phase 80 -- Patient Record Portability v1

## What Changed

- **Record Portability Store** (`apps/api/src/services/record-portability-store.ts`)
  - In-memory store for export artifacts and share links
  - AES-256-GCM encryption at rest with per-export random 256-bit key + 96-bit IV
  - Forward secrecy: key zeroed on expiry/revoke
  - TTL enforcement with 5-minute cleanup interval
  - Access code generation (6 chars, ambiguity-free alphabet)
  - Lockout after 3 failed access attempts
  - Max 20 exports, 10 shares per patient

- **Record Portability Routes** (`apps/api/src/routes/record-portability.ts`)
  - 10 endpoints under `/portal/record/*`
  - VistA-first: tries `ORWRP REPORT TEXT` (Health Summary), falls back to section RPCs
  - Section RPCs: ORQQAL LIST, ORWPS ACTIVE, ORWCH PROBLEM LIST, ORQQVI VITALS, ORWPT SELECT, ORWLRR INTERIMG
  - Pending targets documented: ORQQPX IMMUN LIST
  - HTML + PDF generation with RPC provenance footer
  - Share lifecycle: create (with DOB), preview (public), verify (code+DOB), revoke

- **Portal UI** (`apps/portal/src/app/dashboard/records/page.tsx`)
  - 3 tabs: Generate & Download, Share, Access Audit
  - Card-based layout matching existing portal conventions
  - Real-time export list, share management, audit log view
  - Access code display for newly created shares

- **Portal Nav** -- Added "My Records" nav item

- **Audit Actions** -- 6 new portal audit actions (export, download, export.revoke, share.create, share.revoke, share.access)

- **E2E Tests** (`apps/portal/e2e/record-portability.spec.ts`)
  - Unauthenticated access denied (3 tests)
  - Export generation: PDF + HTML creation, list, download, bad token
  - Share lifecycle: create -> preview -> verify -> revoke -> denied
  - Wrong access code returns 403
  - Validation: missing exportToken, missing DOB
  - Shares list + audit endpoints
  - Stats endpoint

## How to Test Manually

```bash
# 1. Start API + VistA Docker
cd services/vista && docker compose --profile dev up -d
cd apps/api && npx tsx --env-file=.env.local src/index.ts

# 2. Login to portal
curl -c cookies.txt -X POST http://localhost:3001/portal/auth/login \
  -H "Content-Type: application/json" -d '{"username":"patient1","password":"patient1"}'

# 3. Generate export
curl -b cookies.txt -X POST http://localhost:3001/portal/record/export \
  -H "Content-Type: application/json" -d '{"format":"html"}'

# 4. Download (use token from step 3)
curl -b cookies.txt http://localhost:3001/portal/record/export/<TOKEN> -o summary.html

# 5. Create share
curl -b cookies.txt -X POST http://localhost:3001/portal/record/share \
  -H "Content-Type: application/json" \
  -d '{"exportToken":"<TOKEN>","label":"For Dr. Smith","ttlMinutes":60,"patientDob":"1990-01-01"}'

# 6. Verify share (public)
curl -X POST http://localhost:3001/portal/record/share/verify/<SHARE_TOKEN> \
  -H "Content-Type: application/json" \
  -d '{"accessCode":"<CODE>","patientDob":"1990-01-01"}'
```

## Verifier Output

```
Phase 80 Results: 66 PASS / 0 FAIL / 66 total
```

## Follow-ups

- Production: replace in-memory stores with persistent storage
- Add GMTS HS ABBREVIATED PROFILE when available in production VistA
- Add ORQQPX IMMUN LIST integration for immunization section
- Add ORWLRR CHART for richer lab data
- CCD/C-CDA export format alongside PDF/HTML
- Rate limiting on share verify endpoint (per-IP)
- FHIR R4 DocumentReference export
