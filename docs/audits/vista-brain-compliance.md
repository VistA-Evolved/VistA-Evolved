# VistA Brain Compliance Report

> Generated: 2026-03-09
> Source: Codebase audit of apps/api/src/ against VistA RPC registry

## Compliance Rule

**VistA-first**: All clinical logic that VistA already provides must be accessed
through real VistA RPC calls. Custom logic is only justified when VistA cannot
support the required functionality.

## VistA-Driven Areas (Correctly Using VistA RPCs)

### Patient Demographics & Search
- `ORWPT LIST ALL` -- patient search
- `ORWPT SELECT` -- patient selection
- `ORWPT16 ID INFO` -- demographics
- **Compliance: FULL**

### Allergies
- `ORQQAL LIST` -- read allergies
- `ORWDAL32 SAVE ALLERGY` -- write allergies
- **Compliance: FULL** (read + write)

### Vitals
- `ORQQVI VITALS` -- read vitals
- `GMV ADD VM` -- write vitals
- **Compliance: FULL** (read + write)

### Problems
- `ORQQPL LIST` -- read problems
- `GMPL ADD SAVE` -- write (NOT in VEHU File 8994)
- **Compliance: READ ONLY** -- write blocked by missing RPC

### Medications
- `ORWPS ACTIVE` -- read active meds
- Multi-line grouped record parsing per AGENTS.md rule 16
- **Compliance: READ ONLY** -- write requires PSO/PSJ package

### Notes/TIU
- `TIU CREATE RECORD` -- create document
- `TIU SET DOCUMENT TEXT` -- set body text
- `TIU DOCUMENTS BY CONTEXT` -- list notes
- `TIU SIGN RECORD` -- sign notes
- **Compliance: FULL** (read + write + sign)

### Labs
- `ORWLRR CHART` -- lab chart data
- `ORWLRR GRID` -- lab grid data
- `LR ORDER` -- write (NOT in VEHU)
- **Compliance: READ ONLY** -- write requires LR package

### Orders/CPOE
- `ORWORR AGET` / `ORWORR GET4V` -- read orders
- `ORWOR1 SIG` -- sign orders
- `ORWDX SAVE` -- save order
- `ORWDX LOCK` / `ORWDX UNLOCK` -- lock/unlock patient
- **Compliance: FULL** (read + write + sign + lock)

### Consults
- `ORQQCN LIST` -- read consults
- `ORWDCN32 SAVE` -- write (partial, dialog pending)
- **Compliance: PARTIAL**

### Surgery
- `ORWSR RPTLIST` -- read surgery reports
- **Compliance: READ ONLY** (read-only domain)

### Reports
- `ORWRP REPORT TEXT` -- clinical reports
- Cached per user+patient with short TTL (rule 43)
- **Compliance: FULL**

### Scheduling
- `SDES GET APPT TYPES` -- appointment types
- `SDOE LIST ENCOUNTERS FOR PAT` -- encounter list
- `SDES GET APPT BY APPT IEN` -- appointment detail
- `SDEC APPADD` -- create appointment
- **Compliance: FULL** (VistA SDES RPCs used per Phase 147)

### Imaging
- `MAG4 ADD IMAGE` -- VistA Imaging entry
- Orthanc proxy for DICOM/DICOMweb
- **Compliance: HYBRID** (VistA for metadata, Orthanc for DICOM storage)

### Messaging
- VistA MailMan RPCs for provider messaging
- **Compliance: FULL**

### Admin Domains (12)
All implemented via custom ZVE* M routines using FileMan APIs:
- `UPDATE^DIE`, `FILE^DIE`, `^DIK` for validated writes
- **Compliance: FULL** (custom RPCs justified -- no native admin RPCs exist)

## Areas With Custom Logic (Justified)

| Area | Justification |
| ---- | ------------- |
| RCM Claim Lifecycle | VistA IB/PRCA data is empty in sandbox; 9-state FSM needed for multi-country billing |
| Telehealth Room Store | VistA has no telehealth concept; Jitsi integration is external |
| Module System | SaaS module toggling not a VistA concept |
| Tenant Provisioning | SaaS multi-tenancy not a VistA concept |
| Analytics Aggregation | Hourly/daily aggregation of VistA-sourced events for BI |
| FHIR R4 Gateway | Translation layer between VistA RPC responses and FHIR R4 JSON |
| HL7v2 Engine | MLLP message handling and VistA HLO bridge |
| AI Intake Brain | LLM-assisted question ranking; rules engine is novel capability |
| Patient Portal Auth | Independent patient authentication separate from VistA provider auth |
| Immutable Audit | SHA-256 hash-chained audit trail with PHI redaction |

## Areas Where VistA Logic Was Incorrectly Duplicated (Fixed)

| Area | What Happened | Fix |
| ---- | ------------- | --- |
| None found | No instances of duplicated VistA clinical logic detected | N/A |

The codebase consistently defers to VistA RPCs for all clinical operations.
Where VistA data is empty or RPCs are missing, the system correctly returns
`integration-pending` with explicit VistA grounding metadata rather than
implementing custom clinical logic.

## RPC Coverage Summary

| Category | Count | Notes |
| -------- | ----- | ----- |
| Registered RPCs | ~340 | In rpcRegistry.ts |
| Exception RPCs | ~250 | Known absent, documented |
| Admin custom RPCs | 68 | Via 14 ZVE* M routines |
| VEHU confirmed available | 87 | Probed via ZVEPROB.m |
| VEHU confirmed missing | 14 | Package-dependent |

## Recommendations

1. Install GMPL (Problems) package in VEHU to enable problem add/edit
2. Install LR (Lab) package to enable lab ordering
3. Install PSB (BCMA) package to enable eMAR workflows
4. Install DG ADT write RPCs for admission/transfer/discharge
5. Maintain `docs/vista-alignment/rpc-coverage.json` as source of truth
