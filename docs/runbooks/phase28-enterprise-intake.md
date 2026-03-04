# Phase 28 -- Enterprise Intake OS Runbook

## Overview

The Enterprise Intake OS provides adaptive patient questionnaires with:

- 23 clinical packs (chief complaint, specialty, department)
- SDC-like adaptive question flow
- Portal + Kiosk + CPRS clinician review
- Red flag detection with severity grading
- Draft clinician summary (HPI narrative, ROS, med/allergy delta)
- Filing to VistA (clinician-triggered, never automatic)

## Architecture

```
Portal/Kiosk                    CPRS (Clinician)
     |                                |
     v                                v
 POST /intake/sessions          GET /intake/by-patient/:dfn
 POST /intake/sessions/:id/     GET /intake/sessions/:id/review
       next-question            PUT /intake/sessions/:id/review
 POST /intake/sessions/:id/     POST /intake/sessions/:id/file
       answers                  POST /intake/sessions/:id/export
 POST /intake/sessions/:id/
       submit
     |                                |
     v                                v
 +-------------------------------------------------+
 |          Intake OS Runtime (in-memory)           |
 |  intake-store  |  pack-registry  |  providers    |
 |  summary-provider  |  types                      |
 +-------------------------------------------------+
```

## Session Lifecycle

```
not_started -> in_progress -> submitted -> clinician_reviewed -> filed
                                       -> filed_pending_integration
              -> expired (24h idle)
              -> abandoned (manual)
```

## Pack Resolution

Packs are resolved based on session context:

1. **Department match** (e.g., ED triage pack for department=ED)
2. **Specialty match** (e.g., cardiology pack for specialty=cardiology)
3. **Complaint cluster** (e.g., chest-pain pack for chiefComplaint containing "chest")
4. **Core enterprise pack** always included (priority 100)

Pack items are merged by `linkId` (no duplicates), grouped by section order.

## Red Flags

Red flags fire when:

- A `QuestionnaireItem` has a `redFlag` definition
- The patient's answer matches the `redFlag.condition`
- Severity: `info`, `warning`, `critical`

Critical red flags (e.g., chest pain + exertional + diaphoresis) trigger
immediate visual alerts in both the patient UI (portal/kiosk) and the
clinician review panel.

## Quick Start

### Start a session (Portal)

```bash
# Patient creates session via portal (cookie auth)
curl -X POST http://127.0.0.1:3001/intake/sessions \
  -H "Content-Type: application/json" \
  -H "Cookie: portal_session=<token>" \
  -d '{"language":"en","context":{"chiefComplaint":"chest pain"}}'
```

### Clinician review

```bash
# List intakes for patient
curl http://127.0.0.1:3001/intake/by-patient/100022 \
  -H "Cookie: session=<clinician-token>"

# Open review (generates summary)
curl http://127.0.0.1:3001/intake/sessions/<id>/review \
  -H "Cookie: session=<clinician-token>"

# Mark reviewed
curl -X PUT http://127.0.0.1:3001/intake/sessions/<id>/review \
  -H "Content-Type: application/json" \
  -H "Cookie: session=<clinician-token>" \
  -d '{"reviewed":true}'

# File to VistA
curl -X POST http://127.0.0.1:3001/intake/sessions/<id>/file \
  -H "Content-Type: application/json" \
  -H "Cookie: session=<clinician-token>" \
  -d '{}'
```

### Kiosk session

```bash
# Create kiosk session (no portal cookie needed)
curl -X POST http://127.0.0.1:3001/kiosk/sessions \
  -H "Content-Type: application/json" \
  -d '{"language":"en","context":{"department":"ED"}}'

# Resume with token
curl -X POST http://127.0.0.1:3001/kiosk/sessions \
  -H "Content-Type: application/json" \
  -d '{"resumeToken":"ABC123"}'
```

## Packs Inventory (23 packs)

| Pack ID                       | Title              | Items | Triggers                 |
| ----------------------------- | ------------------ | ----- | ------------------------ |
| core-enterprise               | Core Enterprise    | 12    | Always                   |
| complaint-chest-pain          | Chest Pain         | 17    | CC: chest pain           |
| complaint-headache            | Headache           | 15    | CC: headache             |
| complaint-abdominal-pain      | Abdominal Pain     | 15    | CC: abdominal            |
| complaint-back-pain           | Back Pain          | 11    | CC: back pain            |
| complaint-cough               | Cough              | 10    | CC: cough                |
| complaint-fever               | Fever              | 10    | CC: fever                |
| complaint-fatigue             | Fatigue            | 8     | CC: fatigue              |
| complaint-dizziness           | Dizziness          | 9     | CC: dizziness            |
| complaint-shortness-of-breath | SOB                | 10    | CC: shortness, breathing |
| complaint-sore-throat         | Sore Throat        | 8     | CC: sore throat          |
| complaint-nausea-vomiting     | Nausea/Vomiting    | 9     | CC: nausea               |
| complaint-skin-rash           | Skin Rash          | 9     | CC: rash                 |
| complaint-joint-pain          | Joint Pain         | 9     | CC: joint pain           |
| complaint-anxiety             | Anxiety (GAD-2)    | 8     | CC: anxiety              |
| complaint-depression          | Depression (PHQ-2) | 10    | CC: depression           |
| specialty-primary-care        | Primary Care       | 10    | Specialty match          |
| specialty-pediatrics          | Pediatrics         | 8     | Specialty match          |
| specialty-obgyn               | OB/GYN             | 9     | Specialty match          |
| specialty-cardiology          | Cardiology         | 8     | Specialty match          |
| specialty-behavioral-health   | Behavioral Health  | 9     | Specialty match          |
| department-ed-triage          | ED Triage          | 10    | Department match         |
| department-outpatient         | Outpatient Clinic  | 8     | Department match         |

## VistA Filing Targets (Future)

| Data                      | Target RPC            | Status               |
| ------------------------- | --------------------- | -------------------- |
| New allergy               | ORWDAL32 SAVE ALLERGY | Available (existing) |
| Progress note             | TIU CREATE RECORD     | Available (existing) |
| Problem                   | ORQQPL ADD SAVE       | Available (existing) |
| Vital signs               | GMV ADD VM            | Available (existing) |
| Medication reconciliation | N/A                   | Pending              |
| Screening scores          | N/A                   | Pending              |

## Troubleshooting

### "No intake sessions for this patient"

The patient hasn't completed any intake via portal or kiosk. Sessions are
created when the patient starts a new intake, not when they log in.

### "Session must be reviewed before filing"

Filing requires explicit clinician review confirmation. The clinician must
click "Mark as Reviewed" before "File to VistA" becomes available.

### Sessions not appearing in clinician view

Only sessions in `submitted`, `clinician_reviewed`, `filed`, or
`filed_pending_integration` status appear in the clinician review.
In-progress sessions are not visible to clinicians.
