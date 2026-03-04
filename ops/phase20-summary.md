# Phase 20 — VistA-First Grounding: Ops Summary

## What Changed

Phase 20 enforces "VistA-first binding" across the entire platform via
grounding documentation and minimal code corrections.

### New Documents (7)

| Document                          | Purpose                                                                          |
| --------------------------------- | -------------------------------------------------------------------------------- |
| `docs/vista-capability-matrix.md` | 115 features mapped to VistA packages, RPCs, FileMan files, implementation state |
| `docs/interop-grounding.md`       | HL7/HLO file architecture → Interop Monitor binding plan                         |
| `docs/imaging-grounding.md`       | VistA Imaging files, OHIF/Orthanc build strategy, FDA awareness                  |
| `docs/reporting-grounding.md`     | Clinical vs. platform reporting separation                                       |
| `docs/fhir-posture.md`            | VistA-first, FHIR-second interop strategy                                        |
| `docs/octo-analytics-plan.md`     | Platform telemetry architecture (NOT clinical analytics)                         |
| `docs/ai-gateway-plan.md`         | Governed clinical AI integration with human-in-the-loop                          |

### New Prompt Files (6)

- `prompts/22-PHASE-20-VISTA-FIRST-GROUNDING/22-01-*-IMPLEMENT.md`
- `prompts/22-PHASE-20-VISTA-FIRST-GROUNDING/22-99-*-VERIFY.md`
- `prompts/20-PHASE-18-INTEROP-IMAGING/20-02-*-IMPLEMENT.md` (enforcement)
- `prompts/20-PHASE-18-INTEROP-IMAGING/20-90-*-VERIFY.md` (enforcement)
- `prompts/21-PHASE-19-REPORTING-GOVERNANCE/21-02-*-IMPLEMENT.md` (enforcement)
- `prompts/21-PHASE-19-REPORTING-GOVERNANCE/21-90-*-VERIFY.md` (enforcement)

### Code Corrections

- **interop.ts**: Added VistA HL7 file binding header (files #870, #772, #773, #776, #779.x)
- **imaging-service.ts**: Added VistA Imaging file binding header (files #2005, #2005.1, #2005.2, #74, #70)
- **integration-registry.ts**: Added VistA HL7 binding note for `hl7v2` type
- **reporting.ts**: Rewrote header to distinguish platform vs clinical reporting; renamed `/reports/clinical` → `/reports/clinical-activity`
- **export-governance.ts**: Updated ExportReportType to include `clinical-activity`
- **verify script**: Updated to check for `/reports/clinical-activity`
- **runbook**: Updated route reference
- **ops/summary.md**: Updated curl command

## How to Test Manually

```powershell
# 1. Start API
pnpm -C apps/api dev

# 2. Login
$wc = New-Object Net.WebClient
$wc.Headers["Content-Type"] = "application/json"
$wc.UploadString("http://127.0.0.1:3001/auth/login","POST",'{"accessCode":"PROV123","verifyCode":"PROV123!!"}')

# 3. Test renamed route (must use cookie from login)
$wc.Headers["Cookie"] = "ehr_session=<TOKEN>"
$wc.DownloadString("http://127.0.0.1:3001/reports/clinical-activity")

# 4. Verify grounding docs exist
Test-Path docs/vista-capability-matrix.md    # True
Test-Path docs/interop-grounding.md          # True
Test-Path docs/imaging-grounding.md          # True
Test-Path docs/reporting-grounding.md        # True
Test-Path docs/fhir-posture.md               # True
Test-Path docs/octo-analytics-plan.md        # True
Test-Path docs/ai-gateway-plan.md            # True
```

## Verifier Output

Phase 20 is primarily a documentation phase. Run verify-latest.ps1 for
regression checks against Phases 1-19.

## Follow-ups

1. Execute Phase 18B enforcement (add VistA file binding comments — deferred to future sub-phase execution)
2. Execute Phase 19B enforcement (rename already done; remaining items deferred)
3. Wire gap RPCs identified in capability matrix (56 gaps)
4. Build ZVEMIOP M routine for HL7 monitoring RPCs
5. Deploy Orthanc/OHIF in Docker for dev imaging
6. Probe C0FHIR RPCs for FHIR posture validation
