# Nursing Documentation — VistA Grounding Map

## Overview
This document maps every data element in the Phase 84 nursing documentation
module to its source in VistA FileMan, M routines, and RPCs.

## VistA Packages Used

| Package | Prefix | Domain | Status |
|---------|--------|--------|--------|
| OR (CPRS) | OR | Patient context, ward query | ✅ Live |
| TIU (Text Integration Utilities) | TIU | Nursing notes CRUD | ✅ Live (read+create) |
| GMV (Vitals/Measurements) | GMV | Vital signs write | ✅ Live |
| GMR (Generic Med Record) | GMR | I&O tracking | 🔄 Pending |
| GN (Nursing) | GN | Nursing assessments | 🔄 Pending |
| PSB (BCMA) | PSB | MAR, med administration | 🔄 Pending |

## FileMan Files Referenced

### Live (data accessible in sandbox)

| File # | Name | Global | Usage |
|--------|------|--------|-------|
| 2 | PATIENT | ^DPT | Patient demographics, DFN |
| 120.5 | GMRV VITAL MEASUREMENT | ^GMR(120.5) | Individual vital readings |
| 120.51 | GMRV VITAL TYPE | ^GMR(120.51) | Vital type definitions (BP, Temp, etc.) |
| 8925 | TIU DOCUMENT | ^TIU(8925) | Clinical documents including nursing notes |
| 8925.1 | TIU DOCUMENT DEFINITION | ^TIU(8925.1) | Document class/type definitions |

### Pending (files exist but RPCs not in context)

| File # | Name | Global | Usage |
|--------|------|--------|-------|
| 126 | INTAKE/OUTPUT | ^GMR(126) | I&O entries per shift |
| 126.1 | I/O TYPE | ^GMR(126.1) | I&O type definitions |
| 126.2 | I/O SHIFT | ^GMR(126.2) | Shift definitions |
| 228 | GN ASSESSMENT | ^GN(228) | Nursing assessment data |
| 228.1 | GN ASSESSMENT DETAIL | ^GN(228.1) | Assessment detail fields |
| 53.79 | BCMA MEDICATION LOG | ^PSB(53.79) | Medication administration records |

## RPCs Used

### Live RPCs (working in sandbox)

| RPC | Package | Domain | Used By | Params |
|-----|---------|--------|---------|--------|
| ORQQVI VITALS | OR | Vitals read | flowsheet, vitals tab | [DFN] |
| ORQQVI VITALS FOR DATE RANGE | OR | Vitals read (shift) | vitals-range | [DFN, start, end] |
| TIU DOCUMENTS BY CONTEXT | TIU | Notes list | notes tab | [class, context, DFN, ...] |
| TIU GET RECORD TEXT | TIU | Note text | note viewer | [IEN] |
| TIU CREATE RECORD | TIU | Note create | note creation | [DFN, titleIEN, VDT, ...] |
| TIU SET DOCUMENT TEXT | TIU | Note text set | note creation | [IEN, text lines] |
| GMV ADD VM | GMV | Vitals write | vitals add (Phase 68 scope) | [formatted string] |
| ORWPT16 ID INFO | OR | Patient banner | patient context | [DFN] |
| ORWPT ID INFO | OR | Patient info (fallback) | patient context | [DFN] |
| ORQPT WARD PATIENTS | OR | Ward patients | ward-patients | [wardIEN] |

### Pending RPCs (integration targets)

| RPC | Package | Reason | Target Phase |
|-----|---------|--------|--------------|
| GMRIO RESULTS | GMR | I&O results query | Phase 84B |
| GMRIO ADD | GMR | I&O entry creation | Phase 84B |
| TIU SIGN RECORD | TIU | Note electronic signature | Phase 84B |
| PSB MED LOG | PSB | BCMA med admin records | Phase 68B |
| PSB ALLERGY | PSB | Allergy check for med admin | Phase 68B |

### Proposed Custom RPCs

| RPC | Routine | Function |
|-----|---------|----------|
| ZVENAS LIST | ZVENAS | Read nursing assessments from GN(228) |
| ZVENAS SAVE | ZVENAS | Write nursing assessment to GN(228) |
| ZVEIOM LIST | ZVEIOM | Read I&O from GMR(126) |
| ZVEIOM ADD | ZVEIOM | Write I&O to GMR(126) |

## M Routines Referenced

| Routine | Package | Function |
|---------|---------|----------|
| TIUSRVP | TIU | TIU document server (create/read) |
| TIUSRVPT | TIU | TIU patient document queries |
| TIUSRVS | TIU | TIU sign document |
| GMVDCSAV | GMV | Save vital measurement |
| GMRIORES | GMR | I&O results retrieval |
| GMRIOADD | GMR | I&O entry add |
| GMRIOENT | GMR | I&O entry point |
| GNASMT | GN | Nursing assessment read |
| GNASMTU | GN | Nursing assessment update |
| PSBML | PSB | BCMA medication log |
| PSBMLEN | PSB | BCMA med log entry |

## Critical Value Thresholds

Configurable thresholds for nursing safety alerts. In production, these
should be stored in VistA Parameter file (8989.5) via XPAR package.

| Vital Type | Low Threshold | High Threshold | Unit |
|------------|--------------|----------------|------|
| BLOOD PRESSURE | — | 180 | mmHg (systolic) |
| PULSE | 50 | 130 | bpm |
| TEMPERATURE | 95 | 103 | °F |
| RESPIRATION | 8 | 30 | breaths/min |
| PULSE OXIMETRY | 90 | — | % |
| PAIN | — | 8 | 0-10 scale |

Production target: VistA Parameter file `GMRV CRITICAL VALUES` or
custom `ZVECRIT` parameter set under XPAR.

## Data Flow Diagram

```
┌────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Web UI    │────▶│  API Endpoints   │────▶│  VistA RPC  │
│  /nursing  │     │  /vista/nursing/ │     │  Broker     │
└────────────┘     └──────────────────┘     └─────────────┘
                         │                        │
                    ┌────┴─────┐            ┌─────┴──────┐
                    │ Flowsheet│            │ ORQQVI     │
                    │ + Critical│           │ VITALS     │
                    │ Values    │           │            │
                    └──────────┘            │ TIU DOCS   │
                                            │ BY CONTEXT │
                                            │            │
                                            │ TIU CREATE │
                                            │ RECORD     │
                                            └────────────┘
```

## Gaps & Migration Paths

| Gap | Current Behavior | Migration Path |
|-----|-----------------|----------------|
| I&O not readable | Shows integration-pending shell | Enable GMRIO RESULTS in context or build ZVEIOM |
| Assessments not readable | Shows assessment type list | Build ZVENAS wrapping GN package or TIU templates |
| Note signing | Notes created but unsigned | Wire TIU SIGN RECORD with DUZ+ES |
| MAR | Shows pending banner | Install BCMA/PSB package |
| Threshold persistence | In-memory config | Migrate to VistA Parameter file (8989.5) |
| Task derivation | Static checklist | Derive from active orders + MAR schedule |
