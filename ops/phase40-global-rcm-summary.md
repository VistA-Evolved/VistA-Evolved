# Phase 40 (Superseding) -- Global RCM Connectivity Foundation Summary

## What Changed

### Payer Registry Expansion

- PH HMOs expanded from 15 to 28 (all 27 Insurance Commission HMOs + PhilHealth)
- Added 7 Australian payers (Medicare, DVA, Medibank, Bupa, HCF, nib, APRA)
- Added 6 Singapore payers (NPHC, MediSave, Prudential, NTUC, Great Eastern, AIA)
- Added 4 New Zealand payers (ACC, Southern Cross, nib NZ, Partners Life)
- PayerCountry type expanded: US | PH | AU | SG | NZ | INTL

### Connector Framework (10 total)

- Existing: sandbox, clearinghouse, philhealth, portal-batch
- New: OfficeAlly (SFTP+HTTPS), Availity (OAuth2), Stedi (feature-flagged), ECLIPSE AU (PRODA+PKI), ACC NZ (REST/OAuth2), NPHC SG (CorpPass)
- All new connectors are integration-ready stubs with env var configuration

### Job Queue

- In-memory async job queue with 5 job types, priority, dead-letter, retry
- Routes: /rcm/jobs, /rcm/jobs/stats, /rcm/jobs/:id, /rcm/jobs/enqueue, /rcm/jobs/:id/cancel

### VistA Binding Points

- encounter-to-claim: PCE encounter -> Claim draft factory
- era-to-vista: ERA/835 -> VistA AR posting (integration-pending)
- charge-capture: Unbilled encounter detection (integration-pending)
- Routes: /rcm/vista/encounter-to-claim, /rcm/vista/charge-candidates, /rcm/vista/era-post

### Validation Engine Enhancement

- Added 5 country-specific rules (CTY-001 through CTY-005)
- Total validation rules: 23+ across 6 categories

### UI

- AU/SG/NZ country filters in Payer Registry
- Job Queue stats in Connectors & EDI tab
- "Global RCM" branding

## How to Test Manually

```powershell
# Start API
cd apps/api
npx tsx --env-file=.env.local src/index.ts

# Check health
curl http://localhost:3001/rcm/health

# List connectors (should show 10)
curl http://localhost:3001/rcm/connectors

# List payers (should show 45+)
curl http://localhost:3001/rcm/payers?limit=100

# Filter by country
curl "http://localhost:3001/rcm/payers?country=AU"
curl "http://localhost:3001/rcm/payers?country=NZ"

# Connector capabilities
curl http://localhost:3001/rcm/connectors/capabilities

# Job queue stats
curl http://localhost:3001/rcm/jobs/stats

# VistA binding (returns integration-pending)
curl http://localhost:3001/rcm/vista/charge-candidates?patientDfn=3

# Validation rules (should show 23+)
curl http://localhost:3001/rcm/validation/rules
```

## Verifier Output

```
.\scripts\verify-phase40-global-rcm.ps1
```

## Follow-ups

- [ ] Add live connector test gates (requires API running)
- [ ] Implement background job processor (dequeue + execute)
- [ ] PhilHealth connector real SFTP enrollment
- [ ] ECLIPSE AU PRODA certificate provisioning
- [ ] ACC NZ OAuth client registration
- [ ] Stedi partnership agreement
