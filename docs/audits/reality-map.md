# Reality Map -- UI -> API -> VistA Wiring Status

> Generated: 2026-03-09
> Source: Full codebase audit of `apps/api/src/` for `integration-pending` markers

## Working End-to-End Flows (Real VistA Data)

| Flow | UI | API Route | VistA RPC | Status |
| ---- | -- | --------- | --------- | ------ |
| Patient search | patient-search/page.tsx | /vista/patients | ORWPT LIST ALL | **LIVE** |
| Patient demographics | patient-search/page.tsx | /vista/demographics | ORWPT SELECT, ORWPT16 ID INFO | **LIVE** |
| Allergies read | AllergiesPanel.tsx | /vista/allergies | ORQQAL LIST | **LIVE** |
| Allergy add | AllergiesPanel.tsx | POST /vista/allergies | ORWDAL32 SAVE ALLERGY | **LIVE** |
| Vitals read | VitalsPanel.tsx | /vista/vitals | ORQQVI VITALS | **LIVE** |
| Vitals add | VitalsPanel.tsx | POST /vista/vitals | GMV ADD VM | **LIVE** |
| Problems read | ProblemsPanel.tsx | /vista/problems | ORQQPL LIST | **LIVE** |
| Meds read | MedsPanel.tsx | /vista/meds | ORWPS ACTIVE | **LIVE** |
| Notes read | NotesPanel.tsx | /vista/notes | TIU DOCUMENTS BY CONTEXT | **LIVE** |
| Note create | NotesPanel.tsx | POST /vista/notes | TIU CREATE RECORD + TIU SET DOCUMENT TEXT | **LIVE** |
| Note sign | NotesPanel.tsx | POST /vista/notes/sign | TIU SIGN RECORD | **LIVE** |
| Labs read | LabsPanel.tsx | /vista/labs | ORWLRR CHART, ORWLRR GRID | **LIVE** |
| Consults read | ConsultsPanel.tsx | /vista/consults | ORQQCN LIST | **LIVE** |
| Surgery read | SurgeryPanel.tsx | /vista/surgery | ORWSR RPTLIST | **LIVE** |
| DC Summaries | DCSummariesPanel.tsx | /vista/dc-summaries | TIU DOCUMENTS BY CONTEXT | **LIVE** |
| Reports read | ReportsPanel.tsx | /vista/reports | ORWRP REPORT TEXT | **LIVE** |
| Orders read | OrdersPanel.tsx | /vista/orders | ORWORR AGET, ORWORR GET4V | **LIVE** |
| Orders sign | OrdersPanel.tsx | POST /cprs/orders/sign | ORWOR1 SIG | **LIVE** |
| Cover sheet | CoverSheetPanel.tsx | multiple | Multiple RPCs | **LIVE** |
| Default patient list | - | /vista/default-patient-list | ORWPT LIST ALL | **LIVE** |
| Admin dashboard | admin/dashboard | /admin/vista-dashboard | 29 parallel RPCs | **LIVE** |
| Messaging | messaging | /vista/mailman | XM MSG, XM SEND | **LIVE** |
| Portal intake | portal/intake | /intake/sessions | Rules engine | **LIVE** |
| Portal auth | portal/login | /portal/auth | Portal session | **LIVE** |
| Scheduling reads | scheduling | /scheduling/* | SDES GET APPT TYPES, SDOE LIST | **LIVE** |
| VistA Console | admin/terminal | /ws/console | XWB direct | **LIVE** |

## Partial Flows (Read Works, Write Integration-Pending)

| Flow | Read RPC | Write RPC | Blocker | Target |
| ---- | -------- | --------- | ------- | ------ |
| Problems add | ORQQPL LIST (works) | GMPL ADD SAVE | RPC not in File 8994 | File 9000011 / GMPL package |
| Lab orders | ORWLRR CHART (works) | LR ORDER | RPC not registered in VEHU | LR package install |
| Lab verify | - | LR VERIFY | RPC not registered | LR VERIFY DISPLAY |
| Immunizations | IMM read (works) | PX SAVE DATA | RPC exists in VEHU (IEN 3430) -- needs wiring | Wire to PX SAVE DATA |
| eMAR admin | PSB ALLERGY (works) | PSB MED LOG | RPC not in File 8994 | PSB/BCMA package |
| Pharmacy order | ORWPS ACTIVE (works) | PSO/PSJ writeback | PSO package RPCs missing | PSO ORDER |
| Pharmacy dispense | - | PSO DISPENSE | Missing | Pharmacy package |
| ADT admission | - | DGPM NEW ADMISSION | RPC not registered | DG package |
| ADT transfer | - | DGPM NEW TRANSFER | RPC not registered | DG package |
| ADT discharge | - | DGPM NEW DISCHARGE | RPC not registered | DG package |
| Nursing tasks | - | NURS TASK LIST | RPC not registered | NURS package |
| Nursing assessments | - | NURS ASSESSMENTS | RPC not registered | NURS package |
| Med reconciliation | ORWPS ACTIVE (works) | PSO/PSJ writeback | Write path pending | PSO package |
| Scheduling recall | SDES reads (works) | SDES recall API | API exists but no data | ZVESDSEED.m |
| Consult orders | ORQQCN LIST (works) | ORWDCN32 SAVE | Full dialog pending | Wire ORWDCN32 |
| Clinical procedures | - | CP result filing | Routes exist | Wire VistA CP |
| MHA/Behavioral | - | YTQZ LISTTESTS | RPC not in context | YTT package |
| Identity linking | - | portal_patient_identity | Table exists, not populated | Wire to OIDC |

## Integration-Pending by Domain

### RCM (~30 pending items)
- **EDI 270/271 (Eligibility)**: Stub adapter returns mock responses
- **EDI 276/277 (Claim Status)**: Stub adapter returns mock responses
- **ERA to VistA AR**: ^PRCA(430) is empty in sandbox; posting deferred
- **Encounter to Claim**: Binding exists, IB charges empty
- **Charge Capture**: IB (350) empty; stub returns `integrationPending`
- **PhilHealth connector**: API endpoint pending real credentials
- **LOA workflow**: Stub adapter, pending payer portal integration
- **HMO portal**: Claim packets pending IB data

### Clinical (~15 pending items)
- **TIU notes**: Create/sign works; some status check RPCs pending
- **Appointments**: wave1 route returns integration-pending
- **Reminders**: RPC missing from VEHU context
- **Order checks**: ORWDXC results integration pending
- **MAR safety**: PSB VALIDATE ORDER wiring incomplete

### Radiology (3 pending)
- Accession assignment (RA ASSIGN ACC#)
- VistA Rad/Nuc Med procedure creation
- Report creation/verification

### Scheduling (2 pending)
- Writeback guard when adapter unavailable
- SDES write operations partially working

### Inpatient/Nursing (4 pending)
- Vitals write via GMV ADD VM (VistA RPC exists, needs wiring)
- Nursing note creation
- ADT movement RPCs (DGPM not registered)
- Nursing route handlers

## Domains Fully Working

- **12 Admin Domains**: All fully wired (users, facilities, clinics, wards, pharmacy, lab, radiology, billing, inventory, workforce, quality, clinical setup)
- **Security**: OIDC, RBAC, ABAC, CSRF, PHI redaction, audit trails
- **Analytics**: Event stream, aggregation, ROcto SQL, dashboard
- **Imaging**: Orthanc proxy, DICOMweb, OHIF integration, device registry
- **Telehealth**: Jitsi provider, room lifecycle, device check
- **Module System**: 14 modules, 7 SKUs, 50+ capabilities, DB-backed entitlements

## Action Items

1. **Wire PX SAVE DATA** for immunizations (RPC exists in VEHU IEN 3430)
2. **Wire GMV ADD VM** for inpatient vitals (RPC exists in VEHU)
3. **Probe GMPL ADD SAVE** via ZVEPROB.m -- may exist under different name
4. **Document all missing RPCs** with exact VistA package requirements
5. **Wire identity linking** to OIDC flow (Phase 7)
6. **Run ZVESDSEED.m** for scheduling test data (Phase 9)
