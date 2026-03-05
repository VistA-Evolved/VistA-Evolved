# VistA RPC Status — Full Registry Cross-Reference

**Date:** 2026-03-04  
**VistA Instance:** VEHU (`worldvista/vehu:latest`, port 9431)  
**Registry Source:** `apps/api/src/vista/rpcRegistry.ts`  
**Probe Source:** `/vista/rpc-capabilities` (87 RPCs probed at runtime)

## Summary

| Metric                     | Count                                                        |
| -------------------------- | ------------------------------------------------------------ |
| **RPC_REGISTRY entries**   | 165                                                          |
| **RPC_EXCEPTIONS**         | 76                                                           |
| **Capability-probed RPCs** | 87                                                           |
| **Probed: Available**      | 64                                                           |
| **Probed: Missing**        | 23 (6 true missing, 17 cascade from ZVEADT crash)            |
| **Not probed**             | 78+ (in registry but not in KNOWN_RPCS for capability probe) |

## Test Results Summary

| Test Suite                            | Result                    |
| ------------------------------------- | ------------------------- |
| verify:vista (6 core RPCs)            | **6/6 PASS**              |
| test:contract (27 API endpoint tests) | **27/27 PASS**            |
| test:rpc (10 boundary tests)          | **9/10 PASS** (1 timeout) |
| Capability probe (87 RPCs)            | **64/87 available**       |

---

## RPC Status Table — Grouped by Domain

Legend:

- **PASS** = Available on VEHU, tested and working
- **AVAIL** = Available on VEHU (capability probe confirmed), not individually tested
- **MISSING** = Not available on VEHU (probe confirmed absent)
- **CASCADE** = Reported missing due to ZVEADT socket crash (needs re-probe)
- **NOT PROBED** = In registry but not in capability probe's KNOWN_RPCS list
- **EXCEPTION** = In RPC_EXCEPTIONS (custom/non-Vivian), not in RPC_REGISTRY

### Auth (4 RPCs)

| RPC Name           | Domain | Tag  | Test Status | Issue                                        |
| ------------------ | ------ | ---- | ----------- | -------------------------------------------- |
| XUS SIGNON SETUP   | auth   | auth | PASS        | Used by connect(), verified via verify:vista |
| XUS AV CODE        | auth   | auth | PASS        | Used by login, verified via contract tests   |
| XWB CREATE CONTEXT | auth   | auth | PASS        | Used by connect(), verified via verify:vista |
| XUS GET USER INFO  | auth   | auth | PASS        | Used by connect(), verified via verify:vista |

### Patients (6 RPCs)

| RPC Name                   | Domain   | Tag  | Test Status | Issue                                   |
| -------------------------- | -------- | ---- | ----------- | --------------------------------------- |
| ORWPT LIST ALL             | patients | read | PASS        | Tested by verify:vista + contract tests |
| ORWPT SELECT               | patients | read | AVAIL       | Capability probe confirmed              |
| ORQPT DEFAULT PATIENT LIST | patients | read | PASS        | Tested by contract + boundary tests     |
| ORQPT DEFAULT LIST SOURCE  | patients | read | NOT PROBED  | Not in capability KNOWN_RPCS            |
| ORWPT ID INFO              | patients | read | NOT PROBED  | Exception: absent from Vivian           |
| ORWPT16 ID INFO            | patients | read | NOT PROBED  | Exception: absent from Vivian           |

### Allergies (3 RPCs)

| RPC Name               | Domain    | Tag   | Test Status | Issue                               |
| ---------------------- | --------- | ----- | ----------- | ----------------------------------- |
| ORQQAL LIST            | allergies | read  | PASS        | Tested by contract + boundary tests |
| ORWDAL32 ALLERGY MATCH | allergies | read  | AVAIL       | Capability probe confirmed          |
| ORWDAL32 SAVE ALLERGY  | allergies | write | AVAIL       | Capability probe confirmed          |

### Vitals (4 RPCs)

| RPC Name                     | Domain | Tag   | Test Status | Issue                               |
| ---------------------------- | ------ | ----- | ----------- | ----------------------------------- |
| ORQQVI VITALS                | vitals | read  | PASS        | Tested by contract + boundary tests |
| GMV ADD VM                   | vitals | write | AVAIL       | Capability probe confirmed          |
| GMV V/M ALLDATA              | vitals | read  | NOT PROBED  | Not in capability KNOWN_RPCS        |
| ORQQVI VITALS FOR DATE RANGE | vitals | read  | NOT PROBED  | Not in capability KNOWN_RPCS        |

### Notes / TIU (11 RPCs)

| RPC Name                   | Domain | Tag   | Test Status | Issue                                     |
| -------------------------- | ------ | ----- | ----------- | ----------------------------------------- |
| TIU DOCUMENTS BY CONTEXT   | notes  | read  | PASS        | Tested by contract tests (notes endpoint) |
| TIU CREATE RECORD          | notes  | write | AVAIL       | Capability probe confirmed                |
| TIU SET DOCUMENT TEXT      | notes  | write | NOT PROBED  | Not in capability KNOWN_RPCS              |
| TIU SET RECORD TEXT        | notes  | write | AVAIL       | Capability probe confirmed                |
| TIU GET RECORD TEXT        | notes  | read  | AVAIL       | Capability probe confirmed                |
| TIU SIGN RECORD            | notes  | write | NOT PROBED  | Not in capability KNOWN_RPCS              |
| TIU LOCK RECORD            | notes  | write | NOT PROBED  | Not in capability KNOWN_RPCS              |
| TIU UNLOCK RECORD          | notes  | write | NOT PROBED  | Not in capability KNOWN_RPCS              |
| TIU CREATE ADDENDUM RECORD | notes  | write | NOT PROBED  | Not in capability KNOWN_RPCS              |
| TIU REQUIRES COSIGNATURE   | notes  | read  | NOT PROBED  | Not in capability KNOWN_RPCS              |
| TIU PERSONAL TITLE LIST    | notes  | read  | NOT PROBED  | Not in capability KNOWN_RPCS              |

### Medications (3 RPCs)

| RPC Name       | Domain      | Tag   | Test Status | Issue                      |
| -------------- | ----------- | ----- | ----------- | -------------------------- |
| ORWPS ACTIVE   | medications | read  | PASS        | Tested by contract tests   |
| ORWORR GETTXT  | medications | read  | AVAIL       | Capability probe confirmed |
| ORWDXM AUTOACK | medications | write | AVAIL       | Capability probe confirmed |

### Problems (5 RPCs)

| RPC Name            | Domain   | Tag   | Test Status | Issue                               |
| ------------------- | -------- | ----- | ----------- | ----------------------------------- |
| ORQQPL PROBLEM LIST | problems | read  | PASS        | Tested by contract tests            |
| ORQQPL4 LEX         | problems | read  | AVAIL       | Capability probe confirmed          |
| ORQQPL ADD SAVE     | problems | write | AVAIL       | Capability probe confirmed          |
| ORQQPL EDIT SAVE    | problems | write | MISSING     | Expected — known sandbox limitation |
| ORWCH PROBLEM LIST  | problems | read  | NOT PROBED  | Exception: absent from Vivian       |

### Orders (12 RPCs)

| RPC Name       | Domain | Tag   | Test Status | Issue                        |
| -------------- | ------ | ----- | ----------- | ---------------------------- |
| ORWDX SAVE     | orders | write | AVAIL       | Capability probe confirmed   |
| ORWDX UNLOCK   | orders | write | NOT PROBED  | Not in capability KNOWN_RPCS |
| ORWDX LOCK     | orders | write | NOT PROBED  | Not in capability KNOWN_RPCS |
| ORWDXA DC      | orders | write | AVAIL       | Capability probe confirmed   |
| ORWDXA FLAG    | orders | write | AVAIL       | Capability probe confirmed   |
| ORWDXA VERIFY  | orders | write | AVAIL       | Capability probe confirmed   |
| ORWORR AGET    | orders | read  | AVAIL       | Capability probe confirmed   |
| ORWOR1 SIG     | orders | write | AVAIL       | Capability probe confirmed   |
| ORWDXC ACCEPT  | orders | read  | AVAIL       | Capability probe confirmed   |
| ORWDXC DISPLAY | orders | read  | NOT PROBED  | Not in capability KNOWN_RPCS |
| ORWDXC SAVECHK | orders | write | NOT PROBED  | Not in capability KNOWN_RPCS |
| ORWDX WRLST    | orders | read  | NOT PROBED  | Not in capability KNOWN_RPCS |

### Consults (3 RPCs)

| RPC Name            | Domain   | Tag   | Test Status | Issue                      |
| ------------------- | -------- | ----- | ----------- | -------------------------- |
| ORQQCN LIST         | consults | read  | AVAIL       | Capability probe confirmed |
| ORQQCN DETAIL       | consults | read  | AVAIL       | Capability probe confirmed |
| ORQQCN2 MED RESULTS | consults | write | AVAIL       | Capability probe confirmed |

### Surgery (2 RPCs)

| RPC Name      | Domain  | Tag  | Test Status | Issue                      |
| ------------- | ------- | ---- | ----------- | -------------------------- |
| ORWSR LIST    | surgery | read | AVAIL       | Capability probe confirmed |
| ORWSR RPTLIST | surgery | read | AVAIL       | Capability probe confirmed |

### Labs (4 RPCs)

| RPC Name        | Domain | Tag   | Test Status | Issue                         |
| --------------- | ------ | ----- | ----------- | ----------------------------- |
| ORWLRR INTERIM  | labs   | read  | AVAIL       | Capability probe confirmed    |
| ORWLRR ACK      | labs   | write | AVAIL       | Capability probe confirmed    |
| ORWLRR CHART    | labs   | read  | AVAIL       | Capability probe confirmed    |
| ORWLRR INTERIMG | labs   | read  | NOT PROBED  | Exception: absent from Vivian |

### Reports (2 RPCs)

| RPC Name           | Domain  | Tag  | Test Status | Issue                      |
| ------------------ | ------- | ---- | ----------- | -------------------------- |
| ORWRP REPORT LISTS | reports | read | AVAIL       | Capability probe confirmed |
| ORWRP REPORT TEXT  | reports | read | AVAIL       | Capability probe confirmed |

### Inbox / Notifications (2 RPCs)

| RPC Name            | Domain | Tag  | Test Status | Issue                      |
| ------------------- | ------ | ---- | ----------- | -------------------------- |
| ORWORB UNSIG ORDERS | inbox  | read | AVAIL       | Capability probe confirmed |
| ORWORB FASTUSER     | inbox  | read | AVAIL       | Capability probe confirmed |

### Remote (1 RPC)

| RPC Name           | Domain | Tag  | Test Status | Issue                      |
| ------------------ | ------ | ---- | ----------- | -------------------------- |
| ORWCIRN FACILITIES | remote | read | AVAIL       | Capability probe confirmed |

### Imaging (7 RPCs)

| RPC Name              | Domain  | Tag   | Test Status | Issue                        |
| --------------------- | ------- | ----- | ----------- | ---------------------------- |
| MAG4 REMOTE PROCEDURE | imaging | read  | AVAIL       | Capability probe confirmed   |
| MAG4 PAT GET IMAGES   | imaging | read  | NOT PROBED  | Not in capability KNOWN_RPCS |
| MAGG PAT PHOTOS       | imaging | read  | NOT PROBED  | Not in capability KNOWN_RPCS |
| RA DETAILED REPORT    | imaging | read  | AVAIL       | Capability probe confirmed   |
| MAG4 ADD IMAGE        | imaging | write | NOT PROBED  | Not in capability KNOWN_RPCS |
| MAG NEW SO ENTRY      | imaging | write | NOT PROBED  | Not in capability KNOWN_RPCS |
| MAG4 IMAGE            | imaging | read  | NOT PROBED  | Not in capability KNOWN_RPCS |

### Billing / PCE (16 RPCs)

| RPC Name               | Domain  | Tag   | Test Status | Issue                      |
| ---------------------- | ------- | ----- | ----------- | -------------------------- |
| ORWPCE VISIT           | billing | read  | AVAIL       | Capability probe confirmed |
| ORWPCE GET VISIT       | billing | read  | AVAIL       | Capability probe confirmed |
| ORWPCE DIAG            | billing | read  | AVAIL       | Capability probe confirmed |
| ORWPCE PROC            | billing | read  | AVAIL       | Capability probe confirmed |
| ORWPCE PCE4NOTE        | billing | read  | AVAIL       | Capability probe confirmed |
| ORWPCE HASVISIT        | billing | read  | AVAIL       | Capability probe confirmed |
| ORWPCE GETSVC          | billing | read  | AVAIL       | Capability probe confirmed |
| ORWPCE4 LEX            | billing | read  | AVAIL       | Capability probe confirmed |
| ORWPCE LEXCODE         | billing | read  | MISSING     | Not registered in VEHU     |
| ORWPCE ACTIVE CODE     | billing | read  | AVAIL       | Capability probe confirmed |
| ORWPCE SAVE            | billing | write | AVAIL       | Capability probe confirmed |
| IBCN INSURANCE QUERY   | billing | read  | AVAIL       | Capability probe confirmed |
| IBD GET ALL PCE DATA   | billing | read  | AVAIL       | Capability probe confirmed |
| IBD GET FORMSPEC       | billing | read  | AVAIL       | Capability probe confirmed |
| IBARXM QUERY ONLY      | billing | read  | MISSING     | Not registered in VEHU     |
| IBO MT LTC COPAY QUERY | billing | read  | AVAIL       | Capability probe confirmed |

### Interop — Custom VE RPCs (6 RPCs)

| RPC Name               | Domain  | Tag    | Test Status | Issue                                          |
| ---------------------- | ------- | ------ | ----------- | ---------------------------------------------- |
| VE INTEROP HL7 LINKS   | interop | custom | AVAIL       | Capability probe confirmed                     |
| VE INTEROP HL7 MSGS    | interop | custom | MISSING     | Routine exists but RPC returns "doesn't exist" |
| VE INTEROP HLO STATUS  | interop | custom | MISSING     | Routine exists but RPC returns "doesn't exist" |
| VE INTEROP QUEUE DEPTH | interop | custom | MISSING     | Routine exists but RPC returns "doesn't exist" |
| VE INTEROP MSG LIST    | interop | custom | AVAIL       | Capability probe confirmed                     |
| VE INTEROP MSG DETAIL  | interop | custom | AVAIL       | Capability probe confirmed                     |

### Messaging — Custom ZVE RPCs (6 RPCs)

| RPC Name            | Domain    | Tag   | Test Status | Issue                        |
| ------------------- | --------- | ----- | ----------- | ---------------------------- |
| ORQQXMB MAIL GROUPS | messaging | read  | NOT PROBED  | Not in capability KNOWN_RPCS |
| ZVE MAIL FOLDERS    | messaging | read  | AVAIL       | Capability probe confirmed   |
| ZVE MAIL LIST       | messaging | read  | AVAIL       | Capability probe confirmed   |
| ZVE MAIL GET        | messaging | read  | AVAIL       | Capability probe confirmed   |
| ZVE MAIL SEND       | messaging | write | AVAIL       | Capability probe confirmed   |
| ZVE MAIL MANAGE     | messaging | write | AVAIL       | Capability probe confirmed   |

### Catalog (1 RPC)

| RPC Name     | Domain  | Tag    | Test Status | Issue                      |
| ------------ | ------- | ------ | ----------- | -------------------------- |
| VE LIST RPCS | catalog | custom | AVAIL       | Capability probe confirmed |

### RCM (1 RPC)

| RPC Name             | Domain | Tag    | Test Status | Issue                      |
| -------------------- | ------ | ------ | ----------- | -------------------------- |
| VE RCM PROVIDER INFO | rcm    | custom | AVAIL       | Capability probe confirmed |

### ADT (12 RPCs)

| RPC Name                 | Domain | Tag  | Test Status | Issue                                     |
| ------------------------ | ------ | ---- | ----------- | ----------------------------------------- |
| ORQPT WARDS              | adt    | read | NOT PROBED  | Not in capability KNOWN_RPCS              |
| ORQPT WARD PATIENTS      | adt    | read | NOT PROBED  | Not in capability KNOWN_RPCS              |
| ORQPT PROVIDER PATIENTS  | adt    | read | NOT PROBED  | Not in capability KNOWN_RPCS              |
| ORQPT TEAMS              | adt    | read | NOT PROBED  | Not in capability KNOWN_RPCS              |
| ORQPT TEAM PATIENTS      | adt    | read | NOT PROBED  | Not in capability KNOWN_RPCS              |
| ORQPT SPECIALTIES        | adt    | read | NOT PROBED  | Not in capability KNOWN_RPCS              |
| ORQPT SPECIALTY PATIENTS | adt    | read | NOT PROBED  | Not in capability KNOWN_RPCS              |
| ORWU1 NEWLOC             | adt    | read | NOT PROBED  | Not in capability KNOWN_RPCS              |
| ORWPT16 ADMITLST         | adt    | read | NOT PROBED  | Exception: absent from Vivian             |
| ZVEADT WARDS             | adt    | read | **CASCADE** | Socket crash — kills VistA connection     |
| ZVEADT BEDS              | adt    | read | **CASCADE** | Not connected (cascade from ZVEADT WARDS) |
| ZVEADT MVHIST            | adt    | read | **CASCADE** | Not connected (cascade from ZVEADT WARDS) |

### Scheduling (31 RPCs)

| RPC Name                       | Domain     | Tag   | Test Status | Issue                                |
| ------------------------------ | ---------- | ----- | ----------- | ------------------------------------ |
| ORWCV VST                      | scheduling | read  | NOT PROBED  |                                      |
| SDOE LIST ENCOUNTERS FOR PAT   | scheduling | read  | NOT PROBED  | Exception: SD underrepresented       |
| SD W/L RETRIVE HOSP LOC(#44)   | scheduling | read  | NOT PROBED  | Exception: SD underrepresented       |
| SD W/L RETRIVE PERSON(200)     | scheduling | read  | NOT PROBED  | Exception: SD underrepresented       |
| SDOE LIST ENCOUNTERS FOR DATES | scheduling | read  | NOT PROBED  | Exception: SD underrepresented       |
| SDOE GET GENERAL DATA          | scheduling | read  | NOT PROBED  | Exception: SD underrepresented       |
| SDOE GET PROVIDERS             | scheduling | read  | NOT PROBED  | Exception: SD underrepresented       |
| SDOE GET DIAGNOSES             | scheduling | read  | NOT PROBED  | Exception: SD underrepresented       |
| SD W/L CREATE FILE             | scheduling | write | NOT PROBED  | Exception: SD underrepresented       |
| SD W/L RETRIVE FULL DATA       | scheduling | read  | NOT PROBED  | Exception: SD underrepresented       |
| ORWPT APPTLST                  | scheduling | read  | NOT PROBED  | Exception: absent from Vivian        |
| SDVW MAKE APPT API APP         | scheduling | write | NOT PROBED  | Exception: SD underrepresented       |
| SDVW SDAPI APP                 | scheduling | read  | NOT PROBED  | Exception: SD underrepresented       |
| SD W/L PRIORITY                | scheduling | read  | NOT PROBED  | Exception: SD underrepresented       |
| SD W/L TYPE                    | scheduling | read  | NOT PROBED  | Exception: SD underrepresented       |
| SD W/L CURRENT STATUS          | scheduling | read  | NOT PROBED  | Exception: SD underrepresented       |
| SDES GET APPTS BY PATIENT DFN3 | scheduling | read  | NOT PROBED  | Exception: SDES not in Vivian        |
| SDES GET CLIN AVAILABILITY     | scheduling | read  | NOT PROBED  | Exception: SDES not in Vivian        |
| SDES GET APPT TYPES            | scheduling | read  | NOT PROBED  | Exception: SDES not in Vivian        |
| SDES GET CANCEL REASONS        | scheduling | read  | NOT PROBED  | Exception: SDES not in Vivian        |
| SDES GET RESOURCE BY CLINIC    | scheduling | read  | NOT PROBED  | Exception: SDES not in Vivian        |
| SDES GET CLINIC INFO2          | scheduling | read  | NOT PROBED  | Exception: SDES not in Vivian        |
| SDES GET APPT BY APPT IEN      | scheduling | read  | NOT PROBED  | Exception: SDES not in Vivian        |
| SDES CREATE APPOINTMENTS       | scheduling | write | NOT PROBED  | Exception: SDES not in Vivian        |
| SDES CANCEL APPOINTMENT 2      | scheduling | write | NOT PROBED  | Exception: SDES not in Vivian        |
| SDES CHECKIN                   | scheduling | write | NOT PROBED  | Exception: SDES not in Vivian        |
| SDES CHECKOUT                  | scheduling | write | NOT PROBED  | Exception: SDES not in Vivian        |
| SD RECALL LIST                 | scheduling | read  | NOT PROBED  | Exception: File 403.5 not in sandbox |
| SD RECALL GET                  | scheduling | read  | NOT PROBED  | Exception: File 403.5 not in sandbox |
| SDES GET RECALL ENTRIES        | scheduling | read  | NOT PROBED  | Exception: SDES not in Vivian        |
| SD RECALL DATE CHECK           | scheduling | read  | NOT PROBED  | Exception: File 403.5 not in sandbox |

### Clinical Procedures (15 RPCs)

| RPC Name                      | Domain              | Tag   | Test Status | Issue |
| ----------------------------- | ------------------- | ----- | ----------- | ----- |
| MD CLIO                       | clinical-procedures | read  | NOT PROBED  |       |
| MD TMDPROCEDURE               | clinical-procedures | read  | NOT PROBED  |       |
| MD TMDPATIENT                 | clinical-procedures | read  | NOT PROBED  |       |
| MD TMDNOTE                    | clinical-procedures | write | NOT PROBED  |       |
| MD TMDRECORDID                | clinical-procedures | read  | NOT PROBED  |       |
| MD TMDOUTPUT                  | clinical-procedures | read  | NOT PROBED  |       |
| MD TMDCIDC                    | clinical-procedures | read  | NOT PROBED  |       |
| MD TMDLEX                     | clinical-procedures | read  | NOT PROBED  |       |
| MD TMDWIDGET                  | clinical-procedures | read  | NOT PROBED  |       |
| MD UTILITIES                  | clinical-procedures | read  | NOT PROBED  |       |
| ORQQCN ASSIGNABLE MED RESULTS | clinical-procedures | read  | NOT PROBED  |       |
| ORQQCN ATTACH MED RESULTS     | clinical-procedures | write | NOT PROBED  |       |
| ORQQCN GET MED RESULT DETAILS | clinical-procedures | read  | NOT PROBED  |       |
| TIU IS THIS A CLINPROC?       | clinical-procedures | read  | NOT PROBED  |       |
| TIU IDENTIFY CLINPROC CLASS   | clinical-procedures | read  | NOT PROBED  |       |

### Immunizations (2 RPCs)

| RPC Name              | Domain        | Tag  | Test Status | Issue |
| --------------------- | ------------- | ---- | ----------- | ----- |
| ORQQPX IMMUN LIST     | immunizations | read | NOT PROBED  |       |
| PXVIMM IMM SHORT LIST | immunizations | read | NOT PROBED  |       |

### Mental Health (5 RPCs)

| RPC Name           | Domain        | Tag   | Test Status | Issue |
| ------------------ | ------------- | ----- | ----------- | ----- |
| YTT GET INSTRUMENT | mental-health | read  | NOT PROBED  |       |
| YTQZ LISTTESTS     | mental-health | read  | NOT PROBED  |       |
| YTT SAVE RESULTS   | mental-health | write | NOT PROBED  |       |
| YTQZ RESULTLIST    | mental-health | read  | NOT PROBED  |       |
| YTQZ DETAILLIST    | mental-health | read  | NOT PROBED  |       |

### Reminders (2 RPCs)

| RPC Name               | Domain    | Tag  | Test Status | Issue |
| ---------------------- | --------- | ---- | ----------- | ----- |
| ORQQPX REMINDERS LIST  | reminders | read | NOT PROBED  |       |
| ORQQPX REMINDER DETAIL | reminders | read | NOT PROBED  |       |

### eMAR / BCMA (4 RPCs — Exception-only)

| RPC Name           | Domain | Tag   | Test Status | Issue                                |
| ------------------ | ------ | ----- | ----------- | ------------------------------------ |
| PSB MED LOG        | emar   | write | CASCADE     | Requires PSB package, not in sandbox |
| PSB ALLERGY        | emar   | read  | CASCADE     | Requires PSB package, not in sandbox |
| PSB VALIDATE ORDER | emar   | write | CASCADE     | Requires PSB package, not in sandbox |
| PSJBCMA            | emar   | read  | CASCADE     | Requires PSJ/PSB packages            |

### Nursing (6 RPCs — Exception-only)

| RPC Name         | Domain  | Tag   | Test Status | Issue                             |
| ---------------- | ------- | ----- | ----------- | --------------------------------- |
| NURS TASK LIST   | nursing | read  | CASCADE     | Requires NURS package             |
| NURS ASSESSMENTS | nursing | read  | CASCADE     | Requires NURS package             |
| GMRIO RESULTS    | nursing | read  | CASCADE     | Requires GMR IO config            |
| GMRIO ADD        | nursing | write | CASCADE     | Requires GMR IO config            |
| ZVENAS LIST      | nursing | read  | CASCADE     | Custom routine (not yet deployed) |
| ZVENAS SAVE      | nursing | write | CASCADE     | Custom routine (not yet deployed) |

### ADT Write — DGPM (3 RPCs — Exception-only)

| RPC Name           | Domain | Tag   | Test Status | Issue                            |
| ------------------ | ------ | ----- | ----------- | -------------------------------- |
| DGPM NEW ADMISSION | adt    | write | CASCADE     | Not in OR CPRS GUI CHART context |
| DGPM NEW TRANSFER  | adt    | write | CASCADE     | Not in OR CPRS GUI CHART context |
| DGPM NEW DISCHARGE | adt    | write | CASCADE     | Not in OR CPRS GUI CHART context |

---

## Issues Found

### CRITICAL: ZVEADT WARDS Socket Crash

The `ZVEADT WARDS` RPC causes a socket close when called through the capability probe. This crashes the VistA connection and all 16 subsequent RPCs appear as "Not connected" — these are **false negatives**.

**Impact:** 17 RPCs misreported as missing (1 ZVEADT WARDS + 16 cascade)  
**Root Cause:** Likely the ZVEADT.m routine encounters an error with empty params that kills the VistA job instead of returning an error message.  
**Fix:** Debug ZVEADT.m to add proper error handling for empty/missing parameters.

### WARN: Test Timeout on Capability Probe

The `rpc-boundary.test.ts` capability probe test times out at 30s because the endpoint probes 87 RPCs sequentially (~35s total).

**Fix:** Add `{ timeout: 120_000 }` to the test case, or skip it in fast test runs.

### INFO: 6 Genuinely Missing RPCs

| RPC                    | Reason                                                      |
| ---------------------- | ----------------------------------------------------------- |
| ORQQPL EDIT SAVE       | Known sandbox limitation — not installed                    |
| ORWPCE LEXCODE         | Not registered in VEHU `File 8994`                          |
| IBARXM QUERY ONLY      | Not registered in VEHU `File 8994`                          |
| VE INTEROP HL7 MSGS    | Custom routine issue — entry point may need re-registration |
| VE INTEROP HLO STATUS  | Custom routine issue — entry point may need re-registration |
| VE INTEROP QUEUE DEPTH | Custom routine issue — entry point may need re-registration |

### INFO: 78+ RPCs Not Probed

These RPCs are in `RPC_REGISTRY` but not in the capability probe's `KNOWN_RPCS` list. They include scheduling (31), clinical procedures (15), ADT read (9), notes advanced (7), imaging (5), mental health (5), vitals (2), immunizations (2), reminders (2), and others. These RPCs may or may not be available — they simply haven't been tested yet.

---

## Domain Health Summary

| Domain              | Read       | Write      | Status                              |
| ------------------- | ---------- | ---------- | ----------------------------------- |
| auth                | 2/2        | 2/2        | **Healthy**                         |
| patients            | 4/4 probed | —          | **Healthy**                         |
| allergies           | 2/2        | 1/1        | **Healthy**                         |
| vitals              | 1/1 probed | 1/1        | **Healthy**                         |
| notes               | 2/2 probed | 2/2 probed | **Healthy**                         |
| medications         | 2/2        | 1/1        | **Healthy**                         |
| problems            | 3/3        | 1/2        | **Partial** (EDIT SAVE missing)     |
| orders              | 3/3 probed | 4/4 probed | **Healthy**                         |
| consults            | 2/2        | 1/1        | **Healthy**                         |
| surgery             | 2/2        | —          | **Healthy**                         |
| labs                | 3/3        | 1/1 probed | **Healthy**                         |
| reports             | 2/2        | —          | **Healthy**                         |
| inbox               | 2/2        | —          | **Healthy**                         |
| remote              | 1/1        | —          | **Healthy**                         |
| imaging             | 2/2 probed | —          | **Healthy**                         |
| billing             | 12/13      | 1/1        | **Partial** (2 RPCs missing)        |
| interop             | 3/6        | —          | **Partial** (3 custom RPCs missing) |
| messaging           | 5/5        | 2/2        | **Healthy**                         |
| catalog             | 1/1        | —          | **Healthy**                         |
| rcm                 | 1/1        | —          | **Healthy**                         |
| adt                 | 0/3 probed | —          | **Broken** (ZVEADT crash)           |
| scheduling          | —          | —          | **NOT PROBED** (31 RPCs)            |
| clinical-procedures | —          | —          | **NOT PROBED** (15 RPCs)            |
| emar                | —          | —          | **Not in sandbox**                  |
| nursing             | —          | —          | **Not in sandbox**                  |
| mental-health       | —          | —          | **NOT PROBED** (5 RPCs)             |
| immunizations       | —          | —          | **NOT PROBED** (2 RPCs)             |
| reminders           | —          | —          | **NOT PROBED** (2 RPCs)             |
