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

### Integration-Pending RPCs

| RPC                   | Purpose                      |
| --------------------- | ---------------------------- |
| `PSO UPDATE MED LIST` | Outpatient med-rec writeback |
| `PSJ LM ORDER UPDATE` | Inpatient med-rec writeback  |
| `DG ADT DISCHARGE`    | VistA ADT discharge movement |
| `PSB VALIDATE ORDER`  | Real-time barcode validation |
| `PSB MED LOG`         | MAR recording                |
| `TIU CREATE RECORD`   | Discharge summary note       |

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
curl http://127.0.0.1:3001/vista/med-rec/active-meds?dfn=3 -b cookies.txt

# Start med-rec session
curl -X POST http://127.0.0.1:3001/vista/med-rec/start -H "Content-Type: application/json" -d '{"dfn":"3"}' -b cookies.txt

# Create discharge plan
curl -X POST http://127.0.0.1:3001/vista/discharge/plan -H "Content-Type: application/json" -d '{"dfn":"3"}' -b cookies.txt

# 5-rights check
curl -X POST http://127.0.0.1:3001/emar/safety/five-rights -H "Content-Type: application/json" -d '{"patientDfn":"3","medicationName":"warfarin","dose":"5mg","route":"oral"}' -b cookies.txt

# High-alert check
curl http://127.0.0.1:3001/emar/safety/high-alert-check?medication=heparin -b cookies.txt
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
