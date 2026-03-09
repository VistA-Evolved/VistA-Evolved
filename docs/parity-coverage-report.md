# CPRS Parity Coverage Report — Phase 12

> Generated after Phase 12 BIG BUILD: CPRS Parity Wiring

## Summary

| Area               | Read RPCs Wired | Write RPCs Wired | UI Panels | Dialogs | Status                              |
| ------------------ | :-------------: | :--------------: | :-------: | :-----: | ----------------------------------- |
| Cover Sheet        |        5        |        0         |     1     |    0    | **Complete**                        |
| Problems           |        1        |        0         |     1     |    2    | Read complete; write is local draft |
| Medications        |        2        |        1         |     1     |    1    | Quick-order works; manual is draft  |
| Orders             |        1        |        1         |     1     |    0    | ORWDX SEND via quick-order          |
| Notes              |        2        |        1         |     1     |    0    | Full read + create + sign           |
| Clinical Procedures |        4        |        0         |     1     |    0    | Read parity via TIU/consult fallback; medicine pending |
| Consults           |        2        |        0         |     1     |    0    | **NEW Phase 12**                    |
| Surgery            |        4        |        0         |     1     |    0    | Detail + operative text parity      |
| D/C Summaries      |        2        |        0         |     1     |    0    | **NEW Phase 12**                    |
| Labs               |        1        |        0         |     1     |    0    | **NEW Phase 12**                    |
| Reports            |        2        |        0         |     1     |    0    | **NEW Phase 12**                    |
| Vitals             |        1        |        1         |     1     |    0    | Full read + write                   |
| Allergies          |        1        |        1         |     1     |    0    | Full read + write                   |
| **Graphing**       |        0        |        0         |     1     |    0    | **NEW Phase 12** — SVG chart        |
| **Remote Data**    |        0        |        0         |     0     |    1    | **NEW Phase 12** — arch hook        |
| **Legacy Console** |        0        |        0         |     0     |    1    | **NEW Phase 12** — live RPC exec    |
| **ICD Search**     |        1        |        0         |     0     |    0    | **NEW Phase 12** — ORQQPL4 LEX      |

---

## Tab-by-Tab Detail

### 1. Cover Sheet

- **Panel**: `CoverSheetPanel.tsx` — shows allergies, problems, vitals, notes, meds
- **RPCs (read)**: ORQQAL LIST, ORQQPL PROBLEM LIST, GMV EXTRACT REC, TIU DOCUMENTS BY CONTEXT, ORWPS ACTIVE
- **RPCs (write)**: None (navigates to individual tabs for edits)
- **Status**: Full parity

### 2. Problems

- **Panel**: `ProblemsPanel.tsx`
- **RPCs (read)**: ORQQPL PROBLEM LIST
- **RPCs (write)**: None wired (ORQQPL ADD SAVE requires ICD coding + complex validation)
- **Dialogs**: AddProblemDialog (ICD search via ORQQPL4 LEX → local draft), EditProblemDialog (try API → local fallback)
- **Status**: Read complete; write is honest-blocker with local draft
- **Gap**: ORQQPL ADD SAVE, ORQQPL EDIT SAVE not wired

### 3. Medications

- **Panel**: `MedsPanel.tsx`
- **RPCs (read)**: ORWPS ACTIVE, ORWORR GETTXT
- **RPCs (write)**: ORWDX SEND (quick-order via ORWDXM AUTOACK)
- **Dialogs**: AddMedicationDialog (quick-order + manual draft)
- **Status**: Read complete; quick-order write works; manual is honest local draft
- **Gap**: Manual medication ordering (OERR logic)

### 4. Orders

- **Panel**: `OrdersPanel.tsx`
- **RPCs (read)**: DraftOrder local state + medication orders
- **RPCs (write)**: ORWDX SEND via addMedication flow
- **Status**: Draft order lifecycle tracked locally; quick-order fires server-side

### 5. Notes (Progress Notes)

- **Panel**: `NotesPanel.tsx`
- **RPCs (read)**: TIU DOCUMENTS BY CONTEXT (signed + unsigned), TIU GET RECORD TEXT
- **RPCs (write)**: TIU CREATE RECORD, TIU SET DOCUMENT TEXT
- **Status**: Full parity — read, create, text entry

### 6. Consults / Requests (Phase 12A)

- **Panel**: `ConsultsPanel.tsx` — live data via data-cache
- **RPCs (read)**: ORQQCN LIST, ORQQCN DETAIL
- **API endpoints**: GET /vista/consults?dfn=, GET /vista/consults/detail?id=
- **Status**: Full read parity
- **Gap**: ORQQCN2 MED RESULTS for entering consult results

### 6B. Clinical Procedures (Phase 613)

- **Panel**: `ClinicalProceduresPanel.tsx` — live results browser with detail pane and consult-linked fallback
- **RPCs (read)**: TIU IDENTIFY CLINPROC CLASS, TIU DOCUMENTS BY CONTEXT, ORQQCN LIST, ORQQCN DETAIL
- **API endpoints**: GET /vista/clinical-procedures?dfn=, GET /vista/clinical-procedures/:id?kind=, GET /vista/clinical-procedures/consult-link?dfn=&consultId=, GET /vista/clinical-procedures/medicine?dfn=
- **Status**: Partial-but-real read parity. Results now use the TIU Clinical Procedures class when populated and truthfully fall back to consult-tracked procedure records when VEHU has no TIU CP documents. Consult-linked detail is live.
- **Gap**: MD package patient-scoped medicine results and consult attach/detach writes remain pending until File 702 / MD package data is actually present in the sandbox

### 7. Surgery (Phase 12B)

- **Panel**: `SurgeryPanel.tsx` — live data via data-cache plus linked operative report detail
- **RPCs (read)**: ORWSR LIST, ORWSR ONECASE, TIU GET RECORD TEXT, TIU DETAILED DISPLAY
- **API endpoints**: GET /vista/surgery?dfn=, GET /vista/surgery/detail?id=&dfn=
- **Status**: Full read parity including operative report text/detail
- **Gap**: VEHU case-header rows can throw `GETONE+5^ORWSR`; the API now truthfully resolves through linked document rows for the same case when available

### 8. Discharge Summaries (Phase 12C)

- **Panel**: `DCSummPanel.tsx` — live data via data-cache with text fetch
- **RPCs (read)**: TIU DOCUMENTS BY CONTEXT (CLASS=244), TIU GET RECORD TEXT
- **API endpoints**: GET /vista/dc-summaries?dfn=, GET /vista/tiu-text?id=
- **Status**: Full read parity
- **Gap**: TIU CREATE RECORD for new DC summaries (same flow as Notes)

### 9. Laboratory (Phase 12D)

- **Panel**: `LabsPanel.tsx` — live data via data-cache
- **RPCs (read)**: ORWLRR INTERIM
- **API endpoints**: GET /vista/labs?dfn=
- **Status**: Full read parity; acknowledge is local workflow
- **Gap**: ORWLRR CHART for lab charting, ORWLRR ALLTESTS for test catalog

### 10. Reports (Phase 12E)

- **Panel**: `ReportsPanel.tsx` — grouped live report browser + qualifier-aware text viewer
- **RPCs (read)**: ORWRP REPORT LISTS, ORWRP REPORT TEXT
- **API endpoints**: GET /vista/reports, GET /vista/reports/text?dfn=&id=&qualifier=&alpha=&omega=
- **Status**: Grouped report read parity with Health Summary and date-range qualifier support
- **Gap**: Remote HDR/site-specific report queries and exact ORWRP3 tree parity for advanced column layouts

---

## API Endpoint Inventory (29 total)

| #   | Method | Path                             | RPC(s)                         | Phase   |
| --- | ------ | -------------------------------- | ------------------------------ | ------- |
| 1   | GET    | /health                          | —                              | 1       |
| 2   | GET    | /vista/ping                      | TCP probe                      | 3       |
| 3   | GET    | /vista/patient-search?q=         | ORWPT LIST ALL                 | 4B      |
| 4   | GET    | /vista/patient-demographics?dfn= | ORWPT16 DEMOG                  | 4B      |
| 5   | GET    | /vista/allergies?dfn=            | ORQQAL LIST                    | 5A      |
| 6   | POST   | /vista/allergies?dfn=            | ORWDAL32 SAVE ALLERGY          | 5B      |
| 7   | GET    | /vista/vitals?dfn=               | GMV EXTRACT REC                | 6A      |
| 8   | POST   | /vista/vitals?dfn=               | GMV ADD VM                     | 6B      |
| 9   | GET    | /vista/notes?dfn=                | TIU DOCUMENTS BY CONTEXT       | 7A      |
| 10  | POST   | /vista/notes?dfn=                | TIU CREATE RECORD + SET TEXT   | 7B      |
| 11  | GET    | /vista/medications?dfn=          | ORWPS ACTIVE + ORWORR GETTXT   | 8A      |
| 12  | POST   | /vista/medications?dfn=          | ORWDX SEND + AUTOACK           | 8B      |
| 13  | GET    | /vista/default-patient-list      | ORQPT DEFAULT PATIENT LIST     | 4A      |
| 14  | GET    | /vista/problems?dfn=             | ORQQPL PROBLEM LIST            | 9A      |
| 15  | POST   | /vista/problems?dfn=             | (blocker — complex validation) | 9B      |
| 16  | GET    | /vista/icd-search?q=             | ORQQPL4 LEX                    | **12F** |
| 17  | GET    | /vista/consults?dfn=             | ORQQCN LIST                    | **12A** |
| 18  | GET    | /vista/consults/detail?id=       | ORQQCN DETAIL                  | **12A** |
| 19  | GET    | /vista/clinical-procedures?dfn=  | TIU CP class + ORQQCN LIST     | **613** |
| 20  | GET    | /vista/clinical-procedures/:id?kind= | ORQQCN DETAIL or TIU detail | **613** |
| 21  | GET    | /vista/clinical-procedures/consult-link?dfn=&consultId= | ORQQCN LIST + ORQQCN DETAIL | **613** |
| 22  | GET    | /vista/clinical-procedures/medicine?dfn= | honest MD-package pending grounding | **613** |
| 23  | GET    | /vista/surgery?dfn=              | ORWSR LIST                     | **12B** |
| 24  | GET    | /vista/surgery/detail?id=&dfn=   | ORWSR ONECASE + TIU detail     | **612** |
| 25  | GET    | /vista/dc-summaries?dfn=         | TIU DOCUMENTS BY CONTEXT (244) | **12C** |
| 26  | GET    | /vista/tiu-text?id=              | TIU GET RECORD TEXT            | **12C** |
| 27  | GET    | /vista/labs?dfn=                 | ORWLRR INTERIM                 | **12D** |
| 28  | GET    | /vista/reports                   | ORWRP REPORT LISTS             | **12E** |
| 29  | GET    | /vista/reports/text?dfn=&id=     | ORWRP REPORT TEXT              | **12E** |

---

## Data-Cache Domains (11 total)

| Domain      | Type         | Fetcher          | Source              |
| ----------- | ------------ | ---------------- | ------------------- |
| allergies   | Allergy[]    | fetchAllergies   | /vista/allergies    |
| problems    | Problem[]    | fetchProblems    | /vista/problems     |
| vitals      | Vital[]      | fetchVitals      | /vista/vitals       |
| notes       | Note[]       | fetchNotes       | /vista/notes        |
| medications | Medication[] | fetchMedications | /vista/medications  |
| orders      | DraftOrder[] | (local-only)     | —                   |
| consults    | Consult[]    | fetchConsults    | /vista/consults     |
| surgery     | Surgery[]    | fetchSurgery     | /vista/surgery      |
| dcSummaries | DCSummary[]  | fetchDCSummaries | /vista/dc-summaries |
| labs        | LabResult[]  | fetchLabs        | /vista/labs         |
| reports     | ReportDef[]  | fetchReports     | /vista/reports      |

---

## Phase 12 Additions Summary

### New API Endpoints: 9

- ICD search, consults, consults/detail, surgery, dc-summaries, tiu-text, labs, reports, reports/text

### Panels Wired to Live Data: 5

- ConsultsPanel, SurgeryPanel, DCSummPanel, LabsPanel, ReportsPanel
- All 5 previously used MOCK\_\* data; now use data-cache with live RPC fetchers

### Dialogs Improved: 3

- **EditProblemDialog**: Now tries API first, honest fallback to local
- **AddProblemDialog**: Live ICD lexicon search (ORQQPL4 LEX), still drafts locally
- **AddMedicationDialog**: API_BASE now uses env var

### New Features: 3

- **Vitals Graphing**: SVG chart in Graphing modal (Tools → Graphing)
- **Remote Data Viewer**: Modal with architecture docs (Tools → Remote Data Viewer)
- **Legacy Console**: Working RPC console for direct API endpoint testing (Tools → Legacy Console)

---

## Remaining Gaps (Phase 13+ candidates)

1. **Problem writes**: ORQQPL ADD SAVE + ORQQPL EDIT SAVE (requires full ICD coding flow)
2. **Manual medication ordering**: Full OERR order dialog lifecycle
3. **Clinical Procedures medicine results and consult attach/detach writes**: MD TMDPATIENT, MD TMDWIDGET, MD TMDCIDC, ORQQCN ASSIGNABLE/ATTACH/REMOVABLE MED RESULTS
4. **D/C Summary creation**: TIU CREATE RECORD with CLASS=244
5. **Lab charting**: ORWLRR CHART for graphical lab results
6. **Advanced report tree parity**: ORWRP3 EXPAND COLUMNS / remote HDR query parity for column layouts and cross-site browsing
7. **Remote facility data**: ORWCIRN FACLIST + ORWCIRN HDRA (requires production VistA)
8. **Order sentences**: ORWDXA DC (discontinue), ORWDXA FLAG (flag), ORWDXA VERIFY
9. **Encounter management**: ORWPCE SAVE (PCE encounter capture)
