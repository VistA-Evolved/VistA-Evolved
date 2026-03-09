# Phase 168: Inpatient Depth — Med Rec + Discharge + MAR Safety

## Overview

Phase 168 adds three inpatient-depth modules:

1. **Medication Reconciliation** — cross-references inpatient vs outpatient/pre-admission med lists
2. **Discharge Workflow** — structured 10-item checklist with VistA-grounded items
3. **MAR Safety Net** — 5-rights verification + high-alert medication warnings

## Routes

### Medication Reconciliation

| Method | Path                                  | Description                    |
| ------ | ------------------------------------- | ------------------------------ |
| GET    | `/vista/med-rec/active-meds?dfn=`     | Read active meds from VistA    |
| POST   | `/vista/med-rec/start`                | Start reconciliation session   |
| GET    | `/vista/med-rec/session/:id`          | Get session detail             |
| POST   | `/vista/med-rec/session/:id/decide`   | Record reconciliation decision |
| POST   | `/vista/med-rec/session/:id/complete` | Complete reconciliation        |
| GET    | `/vista/med-rec/sessions`             | List sessions                  |

### Discharge Workflow

| Method | Path                                          | Description           |
| ------ | --------------------------------------------- | --------------------- |
| POST   | `/vista/discharge/plan`                       | Create discharge plan |
| GET    | `/vista/discharge/plan/:id`                   | Get plan detail       |
| PATCH  | `/vista/discharge/plan/:id`                   | Update plan metadata  |
| PUT    | `/vista/discharge/plan/:id/checklist/:itemId` | Update checklist item |
| POST   | `/vista/discharge/plan/:id/ready`             | Mark plan ready       |
| POST   | `/vista/discharge/plan/:id/complete`          | Complete discharge    |
| GET    | `/vista/discharge/plans`                      | List discharge plans  |

### MAR Safety Net

| Method | Path                                        | Description             |
| ------ | ------------------------------------------- | ----------------------- |
| POST   | `/emar/safety/five-rights`                  | Perform 5-rights check  |
| GET    | `/emar/safety/high-alert-check?medication=` | Check high-alert status |
| GET    | `/emar/safety/events`                       | List safety events      |
| GET    | `/emar/safety/admin-window?scheduledTime=`  | Check admin time window |

## VistA Integration

### Live RPCs

- `ORWPS ACTIVE` — active medication list
- `ORQQVI VITALS` — vitals for discharge readiness
- `ORQQAL LIST` — allergy cross-check
- `TIU CREATE RECORD` — medication reconciliation and discharge-prep draft notes
- `TIU SET DOCUMENT TEXT` — note body persistence for draft notes

### Integration-Pending RPCs

| RPC                   | Purpose                      |
| --------------------- | ---------------------------- |
| `PSO UPDATE MED LIST` | Outpatient med-rec writeback |
| `PSJ LM ORDER UPDATE` | Inpatient med-rec writeback  |
| `DG ADT DISCHARGE`    | VistA ADT discharge movement |
| `PSB VALIDATE ORDER`  | Real-time barcode validation |
| `PSB MED LOG`         | MAR recording                |

## Live Phase 594 Posture

- Medication reconciliation can now complete with a real TIU draft note while PSO and PSJ writeback remain integration-pending.
- Discharge preparation can now link a completed med-rec session, carry that status into the checklist, and create a real TIU draft note on plan completion.
- DG ADT discharge movement remains truthful `integration-pending` in VEHU because `DG ADT DISCHARGE` is not present in File 8994.
- The inpatient UI now exposes a real discharge-prep workspace under `ADT & Discharge Prep` instead of only a blocker modal for discharge.

## Live Phase 598 Posture

- The inpatient `ADT & Discharge Prep` workspace now supports recovery after refresh or clinician handoff by loading existing medication reconciliation sessions and discharge plans for the active DFN.
- Workspace recovery is powered by the existing list/detail routes instead of a parallel frontend cache: `/vista/med-rec/sessions`, `/vista/med-rec/session/:id`, `/vista/discharge/plans`, and `/vista/discharge/plan/:id`.
- Loading an existing discharge plan also reloads its linked medication-reconciliation session when present so the checklist and documentation posture stay consistent.
- The recovery UI remains truthful about VistA posture: resuming saved workflow state is live today, while final pharmacy and DG ADT writeback are still integration-pending in VEHU.

## High-Alert Medications

Based on ISMP High-Alert Medications List:

- **Anticoagulants**: warfarin, heparin
- **Insulin**: all insulin products
- **Opioids**: morphine, hydromorphone, fentanyl
- **Concentrated electrolytes**: potassium chloride
- **Chemotherapy**: methotrexate

## Testing

```powershell
# Read active meds
curl.exe -s http://127.0.0.1:3001/vista/med-rec/active-meds?dfn=46 -b cookies.txt

# Start med-rec session
curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/vista/med-rec/start -H "Content-Type: application/json" -H "X-CSRF-Token: <csrf>" -d '{"dfn":"46","outpatientMeds":[{"medicationName":"Lisinopril 10mg","dose":"10 mg","route":"PO","frequency":"daily","source":"patient-reported","status":"active"}]}'

# Complete med-rec with TIU draft
curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/vista/med-rec/session/<medRecId>/complete -H "Content-Type: application/json" -H "X-CSRF-Token: <csrf>" -d '{"documentation":{"createNote":true,"additionalNote":"Medication reconciliation completed during discharge preparation workflow."}}'

# Recover existing med-rec sessions for the patient
curl.exe -s -b cookies.txt http://127.0.0.1:3001/vista/med-rec/sessions
curl.exe -s -b cookies.txt http://127.0.0.1:3001/vista/med-rec/session/<medRecId>

# Create and update discharge plan
curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/vista/discharge/plan -H "Content-Type: application/json" -H "X-CSRF-Token: <csrf>" -d '{"dfn":"46","targetDate":"2026-03-08","disposition":"Home","medRecSessionId":"<medRecId>"}'
curl.exe -s -b cookies.txt -X PATCH http://127.0.0.1:3001/vista/discharge/plan/<planId> -H "Content-Type: application/json" -H "X-CSRF-Token: <csrf>" -d '{"followUpInstructions":["Primary care follow-up within 7 days"],"patientEducation":["Reviewed warning signs"],"medRecSessionId":"<medRecId>"}'

# Recover existing discharge plans for the patient
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/discharge/plans?dfn=46"
curl.exe -s -b cookies.txt http://127.0.0.1:3001/vista/discharge/plan/<planId>

# Mark ready and complete with TIU draft
curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/vista/discharge/plan/<planId>/ready -H "X-CSRF-Token: <csrf>"
curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/vista/discharge/plan/<planId>/complete -H "Content-Type: application/json" -H "X-CSRF-Token: <csrf>" -d '{"documentation":{"createNote":true,"additionalNote":"Discharge preparation completed; TIU note created while DG ADT discharge movement remains pending in VEHU."}}'

# 5-rights check
curl.exe -s -X POST http://127.0.0.1:3001/emar/safety/five-rights -H "Content-Type: application/json" -d '{"patientDfn":"46","medicationName":"warfarin","dose":"5mg","route":"oral"}' -b cookies.txt

# High-alert check
curl.exe -s http://127.0.0.1:3001/emar/safety/high-alert-check?medication=heparin -b cookies.txt
```

## Store Policy

| Store             | Domain   | Classification | Migration Target |
| ----------------- | -------- | -------------- | ---------------- |
| med-rec-sessions  | clinical | critical       | VistA PSO/PSJ    |
| discharge-plans   | clinical | critical       | VistA DG(405)    |
| mar-safety-events | clinical | operational    | VistA PSB        |

## Verification

```powershell
node qa/gauntlet/cli.mjs --suite rc
```
