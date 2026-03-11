# HINQ (DVB)

> Auto-generated module documentation by vista-module-gen
> Source: VA VistA Roll & Scroll documentation, RPC catalog (File 8994), FileMan data dictionary

## Overview

| Property | Value |
|----------|-------|
| Namespace | `DVB` |
| Tier | 5 |
| FileMan Files | 0 |
| RPCs | 191 |
| Menu Options | 25 |

## FileMan Files

No FileMan file metadata available for this package.

## Remote Procedure Calls (RPCs)

### `DVBAB GET SET`

| Property | Value |
|----------|-------|
| Tag | `GETSET` |
| Routine | `DVBABDDU` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure retrieves the SET OF CODES for a given file and  field for use in populating controls.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBFIL | LITERAL | No |
| 2 | DVBFLD | LITERAL | No |

**API Endpoint:** `POST /vista/dvb/rpc/dvbab-get-set`

---

### `DVBAB REPORT CHECKLIST`

| Property | Value |
|----------|-------|
| Tag | `REPORT1` |
| Routine | `DVBAB9` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** Generates an exam worksheet.

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-report-checklist`

---

### `DVBAB CHECK CREDENTIALS`

| Property | Value |
|----------|-------|
| Tag | `CHKCRED` |
| Routine | `DVBAB1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |

**Description:** Verifies the user has been granted access to AMIE II/CAPRI

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-check-credentials`

---

### `DVBAB FIND EXAMS`

| Property | Value |
|----------|-------|
| Tag | `FINDEXAM` |
| Routine | `DVBAB1` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Lists all of the patient's AMIE II C&P exam requests whether complete, new or pending.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT1 | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-find-exams`

---

### `DVBAB SEND MSG`

| Property | Value |
|----------|-------|
| Tag | `MSG` |
| Routine | `DVBAB1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** Used to generate e-mail messages for specific CAPRI actions, such as changing a C&P exam request.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | VAL1 | LITERAL | No |
| 2 | VAL2 | LITERAL | No |
| 3 | VAL3 | REFERENCE | No |
| 4 | VAL4 | LITERAL | No |
| 5 | VAL5 | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-send-msg`

---

### `DVBAB APPOINTMENT LIST`

| Property | Value |
|----------|-------|
| Tag | `DPA` |
| Routine | `DVBAB1B` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |

**Description:** Returns a list of past, future or all appointments.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | VAL1 | LITERAL | No |
| 2 | VAL2 | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-appointment-list`

---

### `DVBAB REPORT LISTS`

| Property | Value |
|----------|-------|
| Tag | `LIST` |
| Routine | `DVBAB1` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call returns a list of reports, Health Summary types and date ranges that can be displayed at the workstation.   There are no input parameters for this RPC.

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-report-lists`

---

### `DVBAB PTINQ`

| Property | Value |
|----------|-------|
| Tag | `PTINQ` |
| Routine | `DVBAB1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |

**Description:** Returns a patient inquiry text report.

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-ptinq`

---

### `DVBAB INCREASE EXAM COUNT`

| Property | Value |
|----------|-------|
| Tag | `INCEXAM` |
| Routine | `DVBAB1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Used to record the number of exams pending for a specified patient.

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-increase-exam-count`

---

### `DVBAB HEALTH SUMMARY TEXT`

| Property | Value |
|----------|-------|
| Tag | `RPT` |
| Routine | `DVBAB1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** This rpc retrieves the report text for a report selected on the Report tab. the report format on the roll 'n scroll version of CPRS.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | REPORT ID | LITERAL | No |
| 3 | HEALTH SUMMARY TYPE | LITERAL | No |
| 4 | DATE RANGE | LITERAL | No |
| 5 | REPORT SECTION | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-health-summary-text`

---

### `DVBAB 2507 PENDING REPORT`

| Property | Value |
|----------|-------|
| Tag | `STRT` |
| Routine | `DVBAB6` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 6 |
| Status | Inactive (may still be callable) |

**Description:** Generates a report based on the status of 2507 requests.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBCSORT | LITERAL | No |
| 2 | RSTAT | LITERAL | No |
| 3 | ERDAYS | LITERAL | No |
| 4 | OLDAYS | LITERAL | No |
| 5 | ADIVNUM | LITERAL | No |
| 6 | ELTYP | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-2507-pending-report`

---

### `DVBAB INST LIST`

| Property | Value |
|----------|-------|
| Tag | `INSTLIST` |
| Routine | `DVBAB1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of Institutions.

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-inst-list`

---

### `DVBAB DATETIME`

| Property | Value |
|----------|-------|
| Tag | `DTTM` |
| Routine | `DVBAB1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns the current date/time from VistA

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-datetime`

---

### `DVBAB AMIS REPORT`

| Property | Value |
|----------|-------|
| Tag | `STRT` |
| Routine | `DVBAB3` |
| Return Type | ARRAY |
| Parameter Count | 6 |
| Status | Inactive (may still be callable) |

**Description:** Returns an AMIS report for specified search criteria.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | BDATE | LITERAL | No |
| 2 | EDATE | LITERAL | No |
| 3 | RONUM | LITERAL | No |
| 4 | SBULL | LITERAL | No |
| 5 | DUZ | LITERAL | No |
| 6 | DVBAPRTY | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-amis-report`

---

### `DVBAB SC VETERAN REPORT`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `DVBAB4` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Generates a service-connected veterans report.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INPUT1 | LITERAL | No |
| 2 | INPUT2 | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-sc-veteran-report`

---

### `DVBAB PENDING C&P REPORT`

| Property | Value |
|----------|-------|
| Tag | `STRT` |
| Routine | `DVBAB6` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 8 |
| Status | Inactive (may still be callable) |

**Description:** Generates a report containing the pending C&P exam requests.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBCSORT | LITERAL | No |
| 2 | RSTAT | LITERAL | No |
| 3 | ERDAYS | LITERAL | No |
| 4 | OLDAYS | LITERAL | No |
| 5 | ADIVNUM | LITERAL | No |
| 6 | ELTYP | LITERAL | No |
| 7 | DVBADLMTR | LITERAL | No |
| 8 | ROFILTER | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-pending-c&p-report`

---

### `DVBAB REPORT EXAM CHKLIST`

| Property | Value |
|----------|-------|
| Tag | `STRT` |
| Routine | `DVBAB4` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Generates an exam worksheet.

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-report-exam-chklist`

---

### `DVBAB REPORT ADMINQ`

| Property | Value |
|----------|-------|
| Tag | `ENBROKE2` |
| Routine | `DVBAADRP` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** Generates an admission inquiry report, in either standard or delimited  format, for the specified parameters.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | BDATE | LITERAL | No |
| 2 | EDATE | LITERAL | No |
| 3 | ROYESNO | LITERAL | No |
| 4 | RONUM | LITERAL | No |
| 5 | DVBADLMTR | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-report-adminq`

---

### `DVBAB REPORT INCOMPVET`

| Property | Value |
|----------|-------|
| Tag | `STRT` |
| Routine | `DVBAB51` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Generates an incompetent veteran report, in either standard or delimited  format, for the specificed date range.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | BDATE | LITERAL | No |
| 2 | EDATE | LITERAL | No |
| 3 | DVBADLMTR | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-report-incompvet`

---

### `DVBAB REPORT DISCHARGE`

| Property | Value |
|----------|-------|
| Tag | `STRT` |
| Routine | `DVBAB53` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** Generates a discharge report, in either standard or delimited format, for  the specified parameters.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | BDATE | LITERAL | No |
| 2 | EDATE | LITERAL | No |
| 3 | ADTYPE | LITERAL | No |
| 4 | DVBADLMTR | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-report-discharge`

---

### `DVBAB REPORT READMIT`

| Property | Value |
|----------|-------|
| Tag | `STRT` |
| Routine | `DVBAB56` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** Generates a re-admission report, in either standard or delimited format,  for the specified date range.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | BDATE | LITERAL | No |
| 2 | EDATE | LITERAL | No |
| 3 | DVBAH | LITERAL | No |
| 4 | DVBADLMTR | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-report-readmit`

---

### `DVBAB REPORT ADMISSIONS`

| Property | Value |
|----------|-------|
| Tag | `STRT` |
| Routine | `DVBAB54` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Generates an admission report, in either standard or delimited format, for the specified date range.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | BDATE | LITERAL | No |
| 2 | EDATE | LITERAL | No |
| 3 | DVBADLMTR | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-report-admissions`

---

### `DVBAB REPORT PENDING7131`

| Property | Value |
|----------|-------|
| Tag | `STRT` |
| Routine | `DVBAB57` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Generates a list of pending 7131 requests.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SELDIV | LITERAL | No |
| 2 | DIV | LITERAL | No |
| 3 | DVBADLMTR | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-report-pending7131`

---

### `DVBAB REPORT CPDETAILS`

| Property | Value |
|----------|-------|
| Tag | `STRT` |
| Routine | `DVBAB70` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns a detailed summary of a specific C&P request.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |
| 2 | ZREQDA | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-report-cpdetails`

---

### `DVBAB REPORT 7131INQ`

| Property | Value |
|----------|-------|
| Tag | `STRT` |
| Routine | `DVBAB71` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Returns a 7131 inquiry report.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ZDFN | LITERAL | No |
| 2 | RECIEN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-report-7131inq`

---

### `DVBAB LABLIST`

| Property | Value |
|----------|-------|
| Tag | `LABLIST` |
| Routine | `DVBAB1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of the site's laboratory test names.

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-lablist`

---

### `DVBAB VERSION`

| Property | Value |
|----------|-------|
| Tag | `VERSION` |
| Routine | `DVBAB1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the MINIMUM version parameter and also checks if the GUI matches the MINIMUM version build or the PREVIOUS version build. If the GUI is the PREVIOUS version and falls outside of the grace period or the GUI is not the MINIMUM or PREVIOUS build this RPC will return  the grace period d

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBGUIV | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-version`

---

### `DVBAB DIVISION`

| Property | Value |
|----------|-------|
| Tag | `DIVISION` |
| Routine | `DVBAB1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-division`

---

### `DVBAB TEAM PATIENTS`

| Property | Value |
|----------|-------|
| Tag | `TEAMPTS` |
| Routine | `DVBAB1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Function returns an array of patients on a team.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TEAM ID | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-team-patients`

---

### `DVBAB REPORTS`

| Property | Value |
|----------|-------|
| Tag | `START` |
| Routine | `DVBAB82` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** CAPRI REGIONAL OFFICE 21 DAY CERTIFICATE PRINTING

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | REPORT TYPE | LITERAL | No |
| 2 | REPORT STRING | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-reports`

---

### `DVBAB MAIL INIT`

| Property | Value |
|----------|-------|
| Tag | `INIT` |
| Routine | `DVBAB3` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Init Mailman variables. Return string: e-mail address^

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-mail-init`

---

### `DVBAB SURGERY CASE`

| Property | Value |
|----------|-------|
| Tag | `START` |
| Routine | `DVBAB89` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-surgery-case`

---

### `DVBAB ORIGINAL PROCESSING DATE`

| Property | Value |
|----------|-------|
| Tag | `XDA` |
| Routine | `DVBAB89` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-original-processing-date`

---

### `DVBAB MPI ASSIGN ICN`

| Property | Value |
|----------|-------|
| Tag | `MPI` |
| Routine | `DVBCPATA` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |

**Description:** This call should be made after a new patient is added into the patient  file.  It will call the MPI to assign an ICN.  If no ICN can be obtained  after 30 seconds, a local ICN will be assigned and the local ICN flag set.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-mpi-assign-icn`

---

### `DVBAB REPORT ADMISSION INQUIRY`

| Property | Value |
|----------|-------|
| Tag | `ENBROKER` |
| Routine | `DVBAADRP` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns display text indicating when the report was last run

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-report-admission-inquiry`

---

### `DVBAB REPORT NEW NOTICES DC`

| Property | Value |
|----------|-------|
| Tag | `ENBROKER` |
| Routine | `DVBADSNT` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Broker-enabled version of option DVBA NOTICE/DISCHARGE PRINT, Print New Notices of Discharge.

**API Endpoint:** `POST /vista/dvb/rpc/dvbab-report-new-notices-dc`

---

### `DVBAB TEMPLATE DEFINITION`

| Property | Value |
|----------|-------|
| Tag | `DEFINE` |
| Routine | `DVBABFRM` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** C&P Worksheet Templates are made of 3 files:  a form definition, a code  definition, and a script definition.   Set DVBIEN to the internal entry number of the form   Set DVBTYPE to the definition you want:          1= Form, 2=Script, 3=Report

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBIEN | LITERAL | No |
| 2 | DVBTYPE | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-template-definition`

---

### `DVBAB NOTE TITLES`

| Property | Value |
|----------|-------|
| Tag | `NOTETL` |
| Routine | `DVBABTIU` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns list of note titles from TIU in format name+"  "+type+"  "+status

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-note-titles`

---

### `DVBAB GET VISIT INFO`

| Property | Value |
|----------|-------|
| Tag | `VISIT` |
| Routine | `DVBABTIU` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PATIENTNAME | LITERAL | No |
| 2 | VISITDATE | UNKNOWN() | No |
| 3 | CLINICIEN | UNKNOWN() | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-get-visit-info`

---

### `DVBAB REPORT SPECIAL`

| Property | Value |
|----------|-------|
| Tag | `SPECRPT` |
| Routine | `DVBASPD2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 6 |
| Status | Inactive (may still be callable) |

**Description:** Generates a Special Report for Pension and A&A, in either standard or  delimited format, for the specified parameters.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DCTYPES | REFERENCE | No |
| 2 | BDATE | LITERAL | No |
| 3 | EDATE | LITERAL | No |
| 4 | RONUM | LITERAL | No |
| 5 | REP | LITERAL | No |
| 6 | DVBADLMTR | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-report-special`

---

### `DVBAB SAVE FORM`

| Property | Value |
|----------|-------|
| Tag | `SAVE` |
| Routine | `DVBABFRM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** Set DVBIEN to the internal entry number of the form   Set DVBLINES to the lines to be saved   Set DVBLINEN to the starting line # in the global.  This allows for forms to be sent in chunks.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBIEN | LITERAL | No |
| 2 | DVBLINES | REFERENCE | No |
| 3 | DVBLINECOUNT | LITERAL | No |
| 4 | DVBLINEN | LITERAL | No |

**API Endpoint:** `POST /vista/dvb/rpc/dvbab-save-form`

---

### `DVBAB EXAMS BY DATE`

| Property | Value |
|----------|-------|
| Tag | `EXAMBYDT` |
| Routine | `DVBABEBD` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Provides a report by date range of all AMIE/CAPRI exam requests.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | BEGDT | LITERAL | No |
| 2 | ENDDT | LITERAL | No |
| 3 | DVBADLMTR | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-exams-by-date`

---

### `DVBAB TEMPLATE LIST`

| Property | Value |
|----------|-------|
| Tag | `TEMPLATE` |
| Routine | `DVBAB1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns complete list of CAPRI templates.

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-template-list`

---

### `DVBAB LOAD FORM`

| Property | Value |
|----------|-------|
| Tag | `LOAD` |
| Routine | `DVBABFRM` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBIEN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-load-form`

---

### `DVBAB NEW PERSON FILE`

| Property | Value |
|----------|-------|
| Tag | `START` |
| Routine | `DVBAB84` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-new-person-file`

---

### `DVBAB FETCH 1U4N`

| Property | Value |
|----------|-------|
| Tag | `U1N4` |
| Routine | `DVBABFRM` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Retrieve the 1u4n field for the list of patient IENS provided as the only argument.  Each IEN will be sent back with field .0905 appended after a caret.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ARR | REFERENCE | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-fetch-1u4n`

---

### `DVBAB TEMPLATE REPORT FULL`

| Property | Value |
|----------|-------|
| Tag | `RPTSTAT` |
| Routine | `DVBAB85` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Returns report of exam templates, including current status, Worksheet Originator name.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | STRTDT | LITERAL | No |
| 2 | ENDDT | LITERAL | No |
| 3 | DVBDLMT | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-template-report-full`

---

### `DVBAB FORM DATA BACKUP`

| Property | Value |
|----------|-------|
| Tag | `BACKUP` |
| Routine | `DVBABFRM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Makes a backup copy of a CAPRI template in case of data loss.  The backup  is restored through the CAPRI GUI.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBIEN | LITERAL | No |
| 2 | LISTBOX TEXT | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-form-data-backup`

---

### `DVBAB FORM DATA BACKUP DELETE`

| Property | Value |
|----------|-------|
| Tag | `DELETE` |
| Routine | `DVBABFRM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `POST /vista/dvb/rpc/dvbab-form-data-backup-delete`

---

### `DVBAB FORM DATA BACKUP RESTORE`

| Property | Value |
|----------|-------|
| Tag | `RESTORE` |
| Routine | `DVBABFRM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |
| 2 | SIEN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-form-data-backup-restore`

---

### `DVBAB FORM COPY`

| Property | Value |
|----------|-------|
| Tag | `COPY` |
| Routine | `DVBABFRM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Copies a CAPRI form in file 396.17 to a new entry.  Clears key field so  the form becomes editable as a new draft document.   DVBAB1 = IEN in 396.17 to copy DVBAB2 = IEN in patient file   If DVBAB2 is null, the copied form will be filed under the same patient  it previously belonged to.   If DVBAB

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBAB1 | LITERAL | No |
| 2 | DVBAB2 | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-form-copy`

---

### `DVBAB FIND DUPS`

| Property | Value |
|----------|-------|
| Tag | `DUP` |
| Routine | `DVBAB84` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Find potential duplicates within the PATIENT File (#2)   At least one of NAM, DOB, or SSN must be passed Possible matches are "better" when more than one of these is passed

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NAM | LITERAL | No |
| 2 | DOB | LITERAL | No |
| 3 | SSN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-find-dups`

---

### `DVBAB SET DIVISION`

| Property | Value |
|----------|-------|
| Tag | `DUZ2` |
| Routine | `DVBAB84` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Set the Division

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NUM | LITERAL | No |

**API Endpoint:** `POST /vista/dvb/rpc/dvbab-set-division`

---

### `DVBAB GET URL`

| Property | Value |
|----------|-------|
| Tag | `URL` |
| Routine | `DVBABURL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns a URL for some items used within CAPRI   1=VBA's AMIE worksheet website

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INDEX | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-get-url`

---

### `DVBAB DOD REPORT`

| Property | Value |
|----------|-------|
| Tag | `SENDRPT` |
| Routine | `DVBABDOD` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call returns a DOD report from the FHIE framework.   The RPC is designed specifically for the FHIE VistA server not the local  VAMC facilities.  It is distributed nationally with the CAPRI application  to keep the remote procedures and the DVBA CAPRI GUI option consistent on  a

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |
| 2 | DATATYPE | LITERAL | No |
| 3 | BEGDATE | LITERAL | No |
| 4 | ENDDATE | LITERAL | No |
| 5 | ORMAX | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-dod-report`

---

### `DVBAB DOD INFO`

| Property | Value |
|----------|-------|
| Tag | `INFOMSG` |
| Routine | `DVBABDOD` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call returns a message to be displayed in CAPRI.   The RPC is designed specifically for the FHIE VistA server not the local  VAMC facilities.  It is distributed nationally with the CAPRI application  to keep the remote procedures and the DVBA CAPRI GUI option consistent on  all

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-dod-info`

---

### `DVBAB FIND DFN BY ICN`

| Property | Value |
|----------|-------|
| Tag | `ICN` |
| Routine | `DVBABDOD` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call returns the patient's DFN associated with the  ICN passed to the RPC.  The DFN is the internal entry number in the  Patient (#2) file.  The RPC is designed specifically for the FHIE VistA  server not the local VAMC facilities.  It is distributed nationally with  the CAPRI

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ICN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-find-dfn-by-icn`

---

### `DVBAB DOD REPORT TYPES`

| Property | Value |
|----------|-------|
| Tag | `RPTTYPS` |
| Routine | `DVBABDOD` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure call returns a list of available report types.  The  RPC is designed specifically for the FHIE VistA server not the local VAMC  facilities.  It is distributed nationally with the CAPRI application to  keep the remote procedures and the DVBA CAPRI GUI option consistent on  all s

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-dod-report-types`

---

### `DVBAB CCOW`

| Property | Value |
|----------|-------|
| Tag | `CCOW` |
| Routine | `DVBABFRM` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure encapsulates the supported calls $$SITE^VASITE and $$PROD^XUPROD.   Paramater TYPE      1 = Pass back local station number ($$SITE^VASITE)      2 = Pass back whether production account or not ($$PROD^XUPROD)

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | INFOTYPE | LITERAL | No |
| 2 | TYPE | UNKNOWN() | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-ccow`

---

### `DVBAB RESTRICTED LIST PATIENTS`

| Property | Value |
|----------|-------|
| Tag | `RSTLIST` |
| Routine | `DVBABFRM` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** Returns a list of restricted patients for CAPRI when in remote mode.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DUZ | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-restricted-list-patients`

---

### `DVBAB ZIP2CITY`

| Property | Value |
|----------|-------|
| Tag | `ZIP2CITY` |
| Routine | `DVBABADR` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** The remote procedure returns a list containing city, county, and state for a given ZIP code. Results format:  Result(0)=ResultCount_"^"_ErrorMsg                  Result(1..n)=City_"^"_County_"^"_State

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBZIP | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-zip2city`

---

### `DVBA CHECK PATCH`

| Property | Value |
|----------|-------|
| Tag | `CHECK` |
| Routine | `DVBAB1B` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is a wrapper for the supported $$PATCH^XPDUTL API to determine whether a given patch is installed or not.  "1^Patch Is Installed" is  returned on success; otherwise "0^Patch Is Not Installed" is returned.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBPATCH | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-check-patch`

---

### `DVBAB GET VVA TOKEN`

| Property | Value |
|----------|-------|
| Tag | `VVATOKEN` |
| Routine | `DVBABURL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure retrieves the username, password, and token value  passed to the Virtual VA web service.

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-get-vva-token`

---

### `DVBAB 8861 NOTIFICATIONS`

| Property | Value |
|----------|-------|
| Tag | `ENTER` |
| Routine | `DVBANTFY` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This will perform MailMan notifications for Form 8861 Requests based on the status of the request.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |
| 2 | STAT | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-8861-notifications`

---

### `DVBA MVI SEARCH PERSON`

| Property | Value |
|----------|-------|
| Tag | `FNDPAT` |
| Routine | `DVBAMVI1` |
| Return Type | ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure passes the delimited person traits to the MVI  SEARCH PERSON web service and returns the results of the search.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PERSON TRAITS | LITERAL | No |
| 2 | INITIAL QUANTITY | LITERAL | No |
| 3 | NAME FORMAT | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-mvi-search-person`

---

### `DVBA MVI GET CORRESPONDING IDS`

| Property | Value |
|----------|-------|
| Tag | `GETIDS` |
| Routine | `DVBAMVI2` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** The remote procedure passes the Integration Control Number ID to the MVI  GET CORRESPONDING IDS web service and returns the list of VAMC treating facilities for the selected identifier.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SOURCE ID | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-mvi-get-corresponding-ids`

---

### `DVBAD CONTRACTED EXAM REPORTS`

| Property | Value |
|----------|-------|
| Tag | `CERPTS` |
| Routine | `DVBACER1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Allows demTRAN (GUI) to execute the Detailed, Summary and Timeliness  contracted exam reports.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBARTYP | LITERAL | No |
| 2 | DVBAFLTRS | REFERENCE | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbad-contracted-exam-reports`

---

### `DVBAD CONTRACTED EXAM CRYPTO`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `DVBACEM1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Allows the demTRAN (GUI) application to Encrypt/Decrypt information for  storage to or retrieval from the VistA environment.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBAETYP | LITERAL | No |
| 2 | DVBAIVAL | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbad-contracted-exam-crypto`

---

### `DVBAB SEND MSG TWO`

| Property | Value |
|----------|-------|
| Tag | `MSG2` |
| Routine | `DVBAB1A` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** THIS RPC IS THE SECOND FOR THE CAPRI MSG 2507 EXAM THIS ONE PRODUCES A MESSAGE FOR EACH EXAM THAT IS COMPLETED

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DUZ | LITERAL | No |
| 2 | RIEN | LITERAL | No |
| 3 | ELIST | REFERENCE | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-send-msg-two`

---

### `DVBA CAPRI EXAM XML`

| Property | Value |
|----------|-------|
| Tag | `FILEIN` |
| Routine | `DVBAXML` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** This RPC allows for the filling of the 2507 EXAM template in the XML  version.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | EXAMIEN | LITERAL | No |
| 2 | DAS | LITERAL | No |
| 3 | DATTIM | LITERAL | No |
| 4 | XML | REFERENCE | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-exam-xml`

---

### `DVBA CAPRI EXAM LINK TIU`

| Property | Value |
|----------|-------|
| Tag | `LINK` |
| Routine | `DVBAXML` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Links an exam in CAPRI TEMPLATES #396.17 to TIU DOCUMENT #8925

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | EXAMIEN | LITERAL | No |
| 2 | TIUIEN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-exam-link-tiu`

---

### `DVBA CAPRI GET EXAM IEN`

| Property | Value |
|----------|-------|
| Tag | `GETEXAM` |
| Routine | `DVBAXML` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** get an exam ien from the CAPRI TEMMPLATE #396.17 given a tiu ien from TIU DOCUMENT #8925

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | TIUIEN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-get-exam-ien`

---

### `DVBA CAPRI GETSPCLCONSID`

| Property | Value |
|----------|-------|
| Tag | `GETSC` |
| Routine | `DVBACPR1` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This RPC returns an array of special considerations linked to a 2507  request.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | 2507 REQUEST IEN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-getspclconsid`

---

### `DVBA CAPRI LISTSPCLCONSID`

| Property | Value |
|----------|-------|
| Tag | `LSTSC` |
| Routine | `DVBACPR1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** This RPC returns an array (listing) of valid special considerations that  can be linked to a 2507 request.

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-listspclconsid`

---

### `DVBA CAPRI SETSPCLCONSID`

| Property | Value |
|----------|-------|
| Tag | `SETSC` |
| Routine | `DVBACPR1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |

**Description:** This RPC sets the passed-in special considerations and links them to the  passed-in 2507 request.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | 2507 REQUEST IEN | LITERAL | No |
| 2 | SPECIAL CONSIDERATION LIST | REFERENCE | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-setspclconsid`

---

### `DVBA CAPRI LISTINSUFRSN`

| Property | Value |
|----------|-------|
| Tag | `LSTIR` |
| Routine | `DVBACPR1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** This RPC returns a list (array) of valid Insufficient Reasons that can be  linked to a 2507 exam.

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-listinsufrsn`

---

### `DVBA CAPRI LISTCLAIMTYPE`

| Property | Value |
|----------|-------|
| Tag | `LSTCT` |
| Routine | `DVBACPR1` |
| Return Type | ARRAY |
| Parameter Count | 0 |

**Description:** This RPC returns a list (array) of valid Claim Types

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-listclaimtype`

---

### `DVBA CAPRI GETCLAIMTYPE`

| Property | Value |
|----------|-------|
| Tag | `GETCT` |
| Routine | `DVBACPR1` |
| Return Type | ARRAY |
| Parameter Count | 1 |

**Description:** This RPC returns a list (array) of Claim Types associated with a valid  2507 Request

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | REQIEN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-getclaimtype`

---

### `DVBA CAPRI SETCLAIMTYPE`

| Property | Value |
|----------|-------|
| Tag | `SETCT` |
| Routine | `DVBACPR1` |
| Return Type | ARRAY |
| Parameter Count | 2 |

**Description:** This RPC returns the status of Claim Types passed to be set to a valid  2507 Request

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | REQIEN | LITERAL | No |
| 2 | ARRAYCT | REFERENCE | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-setclaimtype`

---

### `DVBA CAPRI GETCANCELREASON`

| Property | Value |
|----------|-------|
| Tag | `CANRSN` |
| Routine | `DVBCANRS` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This returns an array of active 2507 EXAM Cancellation Reasons. New  active reasons added with Patch DVB*2.7*189. Old list of cancellation  reasons set to inactive.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | LIST | REFERENCE | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-getcancelreason`

---

### `DVBA CAPRI GETCONTREMARKS`

| Property | Value |
|----------|-------|
| Tag | `WPGET` |
| Routine | `DVBACREM` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This gets the remarks sent to the contractor concerning the 2507 REQUEST  in file 396.3. The remarks are stored in the word processing field #103 of the 2507 EXAM file 396.4.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBEIEN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-getcontremarks`

---

### `DVBA CAPRI SETCONTREMARKS`

| Property | Value |
|----------|-------|
| Tag | `WPSET` |
| Routine | `DVBACREM` |
| Return Type | WORD PROCESSING |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** The RPC sets remarks sent to the contractor into the new word processing field #103 of the 2507 EXAM file 396.4. The 2507 EXAMs are connected to the 2507 REQUEST file via a pointer.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RQID | LITERAL | No |
| 2 | TEXT | LIST | No |
| 3 | RETURN | LITERAL | No |
| 4 | EIEN | REFERENCE | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-setcontremarks`

---

### `DVBA CAPRI GET REROUTE`

| Property | Value |
|----------|-------|
| Tag | `REROST` |
| Routine | `DVBCUTL8` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return 1 if the Request is able to be rerouted or return 0  if the Request can not be rerouted.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RSP | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-get-reroute`

---

### `DVBA CAPRI REROUTE VAMC`

| Property | Value |
|----------|-------|
| Tag | `GETFAC` |
| Routine | `DVBACRVA` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** VA FACALITIY NAMES AND STATES ARE RETURNED FOR ALL ENTERIES ON FILE.  ENTRIES WILL BE RETURNED IN SPECIFIED SORT ORDER.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | SORTBY | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-reroute-vamc`

---

### `DVBA CAPRI GET DIVISION`

| Property | Value |
|----------|-------|
| Tag | `CDIV` |
| Routine | `DVBCUTL8` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return all of the active division for this site.

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-get-division`

---

### `DVBA CAPRI GET DIV COMMENT`

| Property | Value |
|----------|-------|
| Tag | `CDIVC` |
| Routine | `DVBCUTL8` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return the Comment for the selected Division.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DIV | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-get-div-comment`

---

### `DVBA CAPRI GET DIV EXAM`

| Property | Value |
|----------|-------|
| Tag | `CDIVE` |
| Routine | `DVBCUTL8` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return a the Default List of active exams.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DIV | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-get-div-exam`

---

### `DVBA CAPRI GET REROUTE CODE`

| Property | Value |
|----------|-------|
| Tag | `ARC` |
| Routine | `DVBCUTL8` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the active Reroute Code from file #396.55

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-get-reroute-code`

---

### `DVBA CAPRI SEND REROUTE`

| Property | Value |
|----------|-------|
| Tag | `EN` |
| Routine | `DVBCXFR1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 6 |
| Status | Inactive (may still be callable) |

**Description:** This RPC reroutes a 2507 C&P Request to another VAMC facility.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | 2507 Request IEN | LITERAL | No |
| 2 | Station Number | LITERAL | No |
| 3 | Patient IEN | LITERAL | No |
| 4 | Routing Location | LITERAL | No |
| 5 | REROUTE REASON | LITERAL | No |
| 6 | ReRoute Description | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-send-reroute`

---

### `DVBA CAPRI REROUTE INFO`

| Property | Value |
|----------|-------|
| Tag | `RINFO` |
| Routine | `DVBCUTL8` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns the ReRoute information based on the 2507 Request IEN.   Data is returned as:   RTN(1)-REROUTE TO^REROUTE DATE^REROUTE STATUS^STATUS DATE^REROUTED FROM^ REROUTE REASON^REJECT REASON RTN(2)-REROUTE DESCRIPTION RTN(3)-REROUTE REJECTION REASON

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | REQUEST IEN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-reroute-info`

---

### `DVBA CAPRI REROUTE STATUS`

| Property | Value |
|----------|-------|
| Tag | `RPRO` |
| Routine | `DVBCUTL8` |
| Return Type | SINGLE VALUE |
| Parameter Count | 4 |
| Status | Inactive (may still be callable) |

**Description:** This RPC updates the status of the rerouted 2507 Request

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | RIEN | LITERAL | No |
| 2 | RRSTA | LITERAL | No |
| 3 | REJR | LITERAL | No |
| 4 | RMAS | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-reroute-status`

---

### `DVBA CAPRI GET EDIPI`

| Property | Value |
|----------|-------|
| Tag | `EDIPIQ` |
| Routine | `DVBCENQ` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** CAPRI REMOTE PROCEDURE CALL RETURNS EDIPI TO BE SENT VIA DBQ'S TO DOD

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-get-edipi`

---

### `DVBA CAPRI GET EDIPI2`

| Property | Value |
|----------|-------|
| Tag | `EDIPIQ2` |
| Routine | `DVBCENQ` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** CAPRI REMOTE PROCEDURE CALL RETURNS EDIPI AND LAST SERVICE BRANCH  TO BE SENT VIA DBQ'S TO DOD.  FIRST PIECE IS EDIPI OR ZERO (0) IF THERE   IS NO DATA, SECOND PIECE IS LAST SERVICE BRANCH.  "1XXXX^LAST SERVICE BRANCH"

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-get-edipi2`

---

### `DVBAB PRF POPUP`

| Property | Value |
|----------|-------|
| Tag | `TRIGRPOP` |
| Routine | `DVBCPRF` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return 1 if the patient has any active flags for Category I  or Category II, a return of 0 if no active flags exist.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PTDFN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-prf-popup`

---

### `DVBAB HASFLG`

| Property | Value |
|----------|-------|
| Tag | `HASFLG` |
| Routine | `DVBCPRF` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return an array of active assigned flags for a patient

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PTDFN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-hasflg`

---

### `DVBAB GETFLAG`

| Property | Value |
|----------|-------|
| Tag | `GETFLG` |
| Routine | `DVBCPRF` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** RPC returns detailed flag information for flag selected

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PTDFN | LITERAL | No |
| 2 | FLAGID | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-getflag`

---

### `DVBAB CLRFLG`

| Property | Value |
|----------|-------|
| Tag | `CLEAR` |
| Routine | `DVBCPRF` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Clears the ^TMP file created for Patient Record Flag data

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-clrflg`

---

### `DVBAB SELF REFERRAL`

| Property | Value |
|----------|-------|
| Tag | `SELFREF` |
| Routine | `DVBCENQ` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return an array of Date/Time Locked(Field 5) and Form  Title(Field 9) of File 396.17 if the VHA Internal DBQ Referral (Field 25)  is Yes.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | Patient IEN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-self-referral`

---

### `DVBA MVI CERNER CORRELATIONS`

| Property | Value |
|----------|-------|
| Tag | `GETACC` |
| Routine | `DVBAMVI2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will be used by CAPRI to determine if there are any active Cerner correlations for a given ICN.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ICN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-mvi-cerner-correlations`

---

### `DVBA ACTIVE DBQ LIST`

| Property | Value |
|----------|-------|
| Tag | `ACTIVE` |
| Routine | `DVBCPNCS` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return the list of active DBQ's from file 396.18. The Array will contain the DBQ name, active date, version and PNCS file  name

**API Endpoint:** `GET /vista/dvb/rpc/dvba-active-dbq-list`

---

### `DVBA DBQ CHECK`

| Property | Value |
|----------|-------|
| Tag | `DBQCHECK` |
| Routine | `DVBCPNCS` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used by the CAPRI GUI to verify that a started DBQ is still  active and has not been marked as inactive in File ^DVB(396.18) Return Data example, 1st Piece is the DBQ Template Status and 2nd Piece  is the DBQ Template Name: RTN(1)="FALSE^DBQ ENDO THYROID & PARATHYROID" RTN(2)="FALSE^VBMS

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-dbq-check`

---

### `DVBA DBQ GEN CHECK`

| Property | Value |
|----------|-------|
| Tag | `DBQCK` |
| Routine | `DVBCPNCS` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will be used to check if a draft DBQ is using the correct  version.  This will accept a general DBQ name and specific date to use  for verification.  The RPC verifies the DBQ has not been De-Activated and  the Activation Date is before the date sent for verification.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBDBQ | LITERAL | No |
| 2 | DVBDATE | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-dbq-gen-check`

---

### `DVBA REPORT BUILDER`

| Property | Value |
|----------|-------|
| Tag | `REPORT` |
| Routine | `DVBCREPT` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | ARRAY | REFERENCE | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-report-builder`

---

### `DVBA CAPRI DBQ STATUS`

| Property | Value |
|----------|-------|
| Tag | `DBQSTAT` |
| Routine | `DVBCPNCS` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will change the status of an DBQ Template to the status sent  from the CAPRI GUI.  Once successfully changed it will return a 1.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |
| 2 | DBQ STATUS | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-dbq-status`

---

### `DVBA CAPRI GET EFOLDER TOKEN`

| Property | Value |
|----------|-------|
| Tag | `EFOLD` |
| Routine | `DVBABURL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** CAPRI REMOTE PROCEDURE CALL RETURNS DVBAB CAPRI CDEFOLD TOKEN SECURITY  CODE.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DUZ | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-get-efolder-token`

---

### `DVBA CAPRI PARAM INQ`

| Property | Value |
|----------|-------|
| Tag | `PARAMS` |
| Routine | `DVBCPUSH` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return all Parameters under the AMIE(DVBA) namespace. Multiple instances are separated by vertical bars ("|").

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-param-inq`

---

### `DVBA CAPRI PARAM UPDATE`

| Property | Value |
|----------|-------|
| Tag | `PARAMED` |
| Routine | `DVBCPUSH` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC allows CAPRI to update CAPRI Parameter values. If the parameter has multiples, then the multiple instance values are  sent in the 3rd input parameter (DVBVAL) separated by vertical bars ("|"). The RPC will delete all instances and replace them with the new values in  DVBVAL.  If a single nu

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | PARAMETER NAME | LITERAL | No |
| 2 | VALUE | LITERAL | No |

**API Endpoint:** `POST /vista/dvb/rpc/dvba-capri-param-update`

---

### `DVBA CAPRI CLINDOC URLS`

| Property | Value |
|----------|-------|
| Tag | `CLNDCURL` |
| Routine | `DVBCTOG` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This REMOTE PROCEDURE CALL returns the PIV URL, proxy URL and the  priority of which transmission process is assigned.

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-clindoc-urls`

---

### `DVBA CAPRI GET TOGGLES`

| Property | Value |
|----------|-------|
| Tag | `GETTOG` |
| Routine | `DVBCTOG` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Purpose: to get the value of the toggle name that is passed in.   This REMOTE PROCEDURE CALL returns the internal value of any parameter that meets the criteria of having an entity defined as PACKAGE and an  instance that does not apply.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBTOG | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-get-toggles`

---

### `DVBA CAPRI GET PAR DESC`

| Property | Value |
|----------|-------|
| Tag | `PARADESC` |
| Routine | `DVBCPUSH` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will be used by CAPRI to return a Parameter Description.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | IEN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-get-par-desc`

---

### `DVBA CAPRI SET METRICS`

| Property | Value |
|----------|-------|
| Tag | `EFOLDMET` |
| Routine | `DVBCPUSH` |
| Return Type | SINGLE VALUE |
| Parameter Count | 6 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will create an entry in ^DVB(396.21) for EFolder Transmission  metrics reporting.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBAUTH | LITERAL | No |
| 2 | DVBPIEN | LITERAL | No |
| 3 | DVBTRANS | LITERAL | No |
| 4 | DVBERR | LITERAL | No |
| 5 | DVBSTAT | LITERAL | No |
| 6 | DVBRPD | LIST | No |

**API Endpoint:** `POST /vista/dvb/rpc/dvba-capri-set-metrics`

---

### `DVBA CAPRI PURGE MET`

| Property | Value |
|----------|-------|
| Tag | `PURGEMET` |
| Routine | `DVBCPUSH` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will allow the CAPRI GUI User with the correct security key to  purge metrics data in File ^DVB(396.21).

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DUZ | LITERAL | No |
| 2 | DATE | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-purge-met`

---

### `DVBA CAPRI GET MET RPT`

| Property | Value |
|----------|-------|
| Tag | `RPCENTRY` |
| Routine | `DVBCTOG` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used by the CAPRI GUI to obtain a Metrics Report of Clinical  Document Transmissions.  Data stored in file ^DVB(396.21)

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBBDT | LITERAL | No |
| 2 | DVBEDT | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-get-met-rpt`

---

### `DVBA CAPRI GET ALL PARAM`

| Property | Value |
|----------|-------|
| Tag | `ALL` |
| Routine | `DVBCPUSH` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will be used by CAPRI to return all parameter descriptions.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NULL | UNKNOWN() | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-get-all-param`

---

### `DVBAB CAPRI ALLOW CLINDOCS`

| Property | Value |
|----------|-------|
| Tag | `EFOLDER` |
| Routine | `DVBCENQ` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** THIS CAPRI RPC WILL VALIDATE IF THE USER IS A PROVIDER, VBA USER, VHA  USER WITH THE REQUIRED TITLE TO ALLOW FOR SENDING OF CLINICAL DOCUMENTS  TO THE EFOLDER

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-capri-allow-clindocs`

---

### `DVBAB CAPRI EFOLDER LOCATION`

| Property | Value |
|----------|-------|
| Tag | `LOCATION` |
| Routine | `DVBCENQ` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns the location to be used for Clinical Docs to be sent from CAPRI  GUI

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-capri-efolder-location`

---

### `DVBAB CAPRI PROVIDER`

| Property | Value |
|----------|-------|
| Tag | `PROVIDER` |
| Routine | `DVBCENQ` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** CAPRI GUI verifies that the user is a Provider

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DFN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvbab-capri-provider`

---

### `DVBA CAPRI SPEC ADD`

| Property | Value |
|----------|-------|
| Tag | `SPECADD` |
| Routine | `DVBCPUSH` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used by the CAPRI PUSH Utility Application to allow users to  add new Special Considerations used by the 2507 process.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBNAME | LITERAL | No |

**API Endpoint:** `POST /vista/dvb/rpc/dvba-capri-spec-add`

---

### `DVBA CAPRI SPEC STATUS`

| Property | Value |
|----------|-------|
| Tag | `SPECDIS` |
| Routine | `DVBCPUSH` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is used by the CAPRI PUSH Utility Application to allow users to  disable or enable Special Considerations used by the 2507 process.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBIEN | LITERAL | No |
| 2 | DVBSTAT | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-spec-status`

---

### `DVBA CAPRI SPEC INACTIVE`

| Property | Value |
|----------|-------|
| Tag | `LISTSC` |
| Routine | `DVBCPUSH` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return to the CAPRI Push application the list of inactive  Special Considerations.

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-spec-inactive`

---

### `DVBA CAPRI WORKSHEET STAT LIST`

| Property | Value |
|----------|-------|
| Tag | `LISTSTAT` |
| Routine | `DVBCPSH1` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return the list of AMIE Worksheet Exams according to status.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBSTAT | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-worksheet-stat-list`

---

### `DVBA CAPRI WORKSHEET NAME ED`

| Property | Value |
|----------|-------|
| Tag | `EXEDIT` |
| Routine | `DVBCPSH1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will allow the edit of an AMIE Worksheet Name in File DVB(396.6)

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBIEN | LITERAL | No |
| 2 | DVBNAME | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-worksheet-name-ed`

---

### `DVBA CAPRI WORKSHEET STATUS`

| Property | Value |
|----------|-------|
| Tag | `EXINACT` |
| Routine | `DVBCPSH1` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will set the status of an entry in File 396.6 to active or  inactive

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBIEN | LITERAL | No |
| 2 | DVBSTAT | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-worksheet-status`

---

### `DVBA CAPRI UPDATE DBQ TRANSTAT`

| Property | Value |
|----------|-------|
| Tag | `STATUS` |
| Routine | `DVBCTXML` |
| Return Type | SINGLE VALUE |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** This rpc will update the individual DBQ transmission status in the CAPRI  TEMPLATES FILE (396.17)

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBIEN | LITERAL | No |
| 2 | DVBCT | LITERAL | No |
| 3 | DVBNAME | LITERAL | No |
| 4 | DVBSTAT | LITERAL | No |
| 5 | DVBRESP | LITERAL | No |

**API Endpoint:** `POST /vista/dvb/rpc/dvba-capri-update-dbq-transtat`

---

### `DVBA CAPRI GET DBQ XML`

| Property | Value |
|----------|-------|
| Tag | `FAILXML` |
| Routine | `DVBCTXML` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is being used by CAPRI GUI to retrieve the XML document stored  in CAPRI TEMPLATES FILE (396.17)

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBIEN | LITERAL | No |
| 2 | DVBCT | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-get-dbq-xml`

---

### `DVBA CAPRI DBQ TRANS FAIL LIST`

| Property | Value |
|----------|-------|
| Tag | `FAILIST` |
| Routine | `DVBCTXML` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is returning a list of failed XML transmissions to the CAPRI GUI

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBDUZ | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-dbq-trans-fail-list`

---

### `DVBA CAPRI SAVE DBQ XML`

| Property | Value |
|----------|-------|
| Tag | `SAVEXML` |
| Routine | `DVBCTXML` |
| Return Type | SINGLE VALUE |
| Parameter Count | 7 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will save the DBQ XML created during the signing process for  transmission

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBNAME | LITERAL | No |
| 2 | DVBCT | LITERAL | No |
| 3 | DVBXML | REFERENCE | No |
| 4 | DVBSTAT | LITERAL | No |
| 5 | DVBRESP | LITERAL | No |
| 6 | DVBIEN | LITERAL | No |
| 7 | DVBPM5 | LITERAL | No |

**API Endpoint:** `POST /vista/dvb/rpc/dvba-capri-save-dbq-xml`

---

### `DVBA CAPRI NF DATA`

| Property | Value |
|----------|-------|
| Tag | `NEWSFEED` |
| Routine | `DVBCTXM2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** The RPC is returning the News Feed Client, Tenant and Token IDs, also the  Site ID, Drive ID and File Info URLs to the CAPRI GUI

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-nf-data`

---

### `DVBA CAPRI GET EXAM REPORT`

| Property | Value |
|----------|-------|
| Tag | `TRANSRPT` |
| Routine | `DVBCTPD2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Returns DBQ Transmission History based either on worksheet IEN or Date  Range. The Date Range will pull all XMLs Transmissions from within that  time frame. If no end date is sent with starting date, we default to  today.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBIEN | LITERAL | No |
| 2 | DVBSDT | LITERAL | No |
| 3 | DVBEDT | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-get-exam-report`

---

### `DVBA CAPRI FAIL CHECK`

| Property | Value |
|----------|-------|
| Tag | `FAILCHK` |
| Routine | `DVBCTXML` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** RPC will check if there are any failed transmissions in File 396.17.  If there is at least 1 it will return a 1.

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-fail-check`

---

### `DVBA CAPRI GITHUB LOCATION`

| Property | Value |
|----------|-------|
| Tag | `GITHUB` |
| Routine | `DVBCTXML` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return the GITHUB location for C&P Worksheet templates

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-github-location`

---

### `DVBA CAPRI GET GITHUB DATA`

| Property | Value |
|----------|-------|
| Tag | `GITTOK` |
| Routine | `DVBCTXML` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is being used by the CAPRI GUI to return the GITHUB security  token, APP ID and Installation ID.

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-get-github-data`

---

### `DVBA CAPRI GITHUB DATE`

| Property | Value |
|----------|-------|
| Tag | `PARDATE` |
| Routine | `DVBCTXM2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will receive the GITHUB error date from the CAPRI GUI and set it  in the DVBAB CAPRI GITHUB ERROR DATE parameter

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBDATE | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-github-date`

---

### `DVBA CAPRI GET GITHUB DATE`

| Property | Value |
|----------|-------|
| Tag | `GITDATE` |
| Routine | `DVBCTXM2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return the GITHUB Error date stored by the CAPRI GUI.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | none | UNKNOWN() | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-get-github-date`

---

### `DVBA CAPRI IEPD DATA`

| Property | Value |
|----------|-------|
| Tag | `SPIEPD` |
| Routine | `DVBCTXM2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return to the CAPRI GUI the info needed for the Sharepoint  IEPD process.

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-iepd-data`

---

### `DVBA CAPRI GET EXAM PDF`

| Property | Value |
|----------|-------|
| Tag | `PDFRTN` |
| Routine | `DVBCTPDF` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return to CAPRI the new CMT created PDF Exam Files from  file 396.17.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBARRAY | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-get-exam-pdf`

---

### `DVBA CAPRI CREATE WORKSHEET`

| Property | Value |
|----------|-------|
| Tag | `CREATE` |
| Routine | `DVBCTPDF` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Called by CAPRI to create a new entry in ^DVB(396.17 Will create new Worksheet IEN and save basic details.  Basic details include Patient, Document Manager, Date/Time Created, Date/Time Updated, Date/Time Locked, Form Title, Transcriber, Status, IEPD Version, New Flag, VHA Internal DBQ Referral, and

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBDATA | REFERENCE | No |
| 2 | DVBEXAMLIST | REFERENCE | No |

**API Endpoint:** `POST /vista/dvb/rpc/dvba-capri-create-worksheet`

---

### `DVBA CAPRI SAVE EXAM PDF`

| Property | Value |
|----------|-------|
| Tag | `PDFSAVE` |
| Routine | `DVBCTPDF` |
| Return Type | SINGLE VALUE |
| Parameter Count | 7 |
| Status | Inactive (may still be callable) |

**Description:** Used to save PDF details for each exam in  ^DVB(396.17,*WorksheetIEN*,15,*Seq*

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBIEN | LITERAL | No |
| 2 | DVBSEQ | LITERAL | No |
| 3 | DVBEXAMNAME | LITERAL | No |
| 4 | DVBPDFDATA | REFERENCE | No |
| 5 | DVBTABIO | LITERAL | No |
| 6 | DVBSMSG | LITERAL | No |
| 7 | DVBVER | LITERAL | No |

**API Endpoint:** `POST /vista/dvb/rpc/dvba-capri-save-exam-pdf`

---

### `DVBA CAPRI GET WORKSHEET`

| Property | Value |
|----------|-------|
| Tag | `PDFEXAM` |
| Routine | `DVBCTPDF` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return the list of Exams included in a CAPRI Worksheet from  File 396.17

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBIEN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-get-worksheet`

---

### `DVBA CAPRI PASCAL CHECK`

| Property | Value |
|----------|-------|
| Tag | `PASCALCHK` |
| Routine | `DVBCTPDF` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This is doing a check to confirm if the worksheet contains Pascal Script  of CMT PDF exams.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBIEN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-pascal-check`

---

### `DVBA CAPRI GET WORKSHEET LIST`

| Property | Value |
|----------|-------|
| Tag | `PDFLST` |
| Routine | `DVBCTPDF` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return the list of CAPRI Worksheet from file 396.17

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBIEN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-get-worksheet-list`

---

### `DVBA CAPRI DELETE CHECK`

| Property | Value |
|----------|-------|
| Tag | `DELCHECK` |
| Routine | `DVBCTPDF` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This will check if a user is able to delete a worksheet from File 396.17.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBIEN | LITERAL | No |

**API Endpoint:** `POST /vista/dvb/rpc/dvba-capri-delete-check`

---

### `DVBA CAPRI DELETE WORKSHEET`

| Property | Value |
|----------|-------|
| Tag | `DELETE` |
| Routine | `DVBCTPDF` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** RPC is deleting the worksheet from File 396.17

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBIEN | LITERAL | No |

**API Endpoint:** `POST /vista/dvb/rpc/dvba-capri-delete-worksheet`

---

### `DVBA CAPRI WORKSHEET UPDATE`

| Property | Value |
|----------|-------|
| Tag | `WKSHTSAVE` |
| Routine | `DVBCWKSHT` |
| Return Type | ARRAY |
| Parameter Count | 9 |
| Status | Inactive (may still be callable) |

**Description:** Allows updates to Document Manager, Transcriber, DBQ Referral, New Flag, Green Flag, Exclamation Flag, IEPD Version Number and Acceptable  Clinical Evidence.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBIEN | LITERAL | No |
| 2 | DVBAUTH | LITERAL | No |
| 3 | DVBTRAN | LITERAL | No |
| 4 | DVBDBQ | LITERAL | No |
| 5 | DVBF19 | LITERAL | No |
| 6 | DVBF20 | LITERAL | No |
| 7 | DVBF21 | LITERAL | No |
| 8 | DVBF12 | LITERAL | No |
| 9 | DVBF1  | LITERAL | No |

**API Endpoint:** `POST /vista/dvb/rpc/dvba-capri-worksheet-update`

---

### `DVBA CAPRI GET DBQ PDF`

| Property | Value |
|----------|-------|
| Tag | `FAILPDF` |
| Routine | `DVBCTPDF` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is returning the DBQ PDF to retransmit DBQ's from the eFolder  que.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBIEN | LITERAL | No |
| 2 | DVBCT | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-get-dbq-pdf`

---

### `DVBA CAPRI INVALID CHAR LIST`

| Property | Value |
|----------|-------|
| Tag | `INVALCHAR` |
| Routine | `DVBUTIL` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** RPC to provide list of invalid characters and replacement characters from  DVBAB CAPRI INVALID CHARACTERS Parameter

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-invalid-char-list`

---

### `DVBA CAPRI CMT SSN VAR`

| Property | Value |
|----------|-------|
| Tag | `GETSSNVAR` |
| Routine | `DVBCTXM2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |

**Description:** This RPC will be used by CAPRI to return CMT SSN Variances

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NULL | UNKNOWN() | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-cmt-ssn-var`

---

### `DVBA CAPRI UNLOCK EXAM`

| Property | Value |
|----------|-------|
| Tag | `LOCKUNLOCK` |
| Routine | `DVBUTIL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** RPC is used by CAPRI GUI to unlock an exam being updated once a user closes the exam.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBIEN | LITERAL | No |
| 2 | DVBLOCK | LITERAL | No |

**API Endpoint:** `POST /vista/dvb/rpc/dvba-capri-unlock-exam`

---

### `DVBA CAPRI ADD EXAM`

| Property | Value |
|----------|-------|
| Tag | `ADDPDF` |
| Routine | `DVBCTPD2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Allows CAPRI user to add a new exam to an existing worksheet.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBIEN | LITERAL | No |
| 2 | DVBEXAMNAME | LITERAL | No |

**API Endpoint:** `POST /vista/dvb/rpc/dvba-capri-add-exam`

---

### `DVBA CAPRI DELETE EXAM`

| Property | Value |
|----------|-------|
| Tag | `DELETEXAM` |
| Routine | `DVBCTPD2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Allows CAPRI to delete an exam from a worksheet

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBIEN | LITERAL | No |
| 2 | DVBSEQ | LITERAL | No |
| 3 | DVBEXAMNAME | LITERAL | No |

**API Endpoint:** `POST /vista/dvb/rpc/dvba-capri-delete-exam`

---

### `DVBA CAPRI CMT TOGGLE`

| Property | Value |
|----------|-------|
| Tag | `TOGGLE` |
| Routine | `DVBUTIL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is returning data from the DVBAB CAPRI CMT TOGGLE  parameter. This value tells the CAPRI GUI which C&P type is being used,  CMT or Pascal.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | null | UNKNOWN() | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-cmt-toggle`

---

### `DVBA CAPRI GET EXAM HISTORY`

| Property | Value |
|----------|-------|
| Tag | `EXAMHIST` |
| Routine | `DVBCTPD2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Allows the CAPRI user to get the exam history for a given worksheet.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBIEN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-get-exam-history`

---

### `DVBA CAPRI EXAM RESTORE`

| Property | Value |
|----------|-------|
| Tag | `RESTORE` |
| Routine | `DVBCTPD2` |
| Return Type | SINGLE VALUE |
| Parameter Count | 5 |
| Status | Inactive (may still be callable) |

**Description:** RPC will allow user to restore an exam, even ones deleted, to a previous  version based on save sequence numbers displayed in the Exam History RPC.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBIEN | LITERAL | No |
| 2 | DVBSEQ | LITERAL | No |
| 3 | DVBEXAM | LITERAL | No |
| 4 | DVBSAVE | LITERAL | No |
| 5 | DVBDTM | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-exam-restore`

---

### `DVBA CAPRI TEMP DEF LIST`

| Property | Value |
|----------|-------|
| Tag | `LISTTEMP` |
| Routine | `DVBCPSH2` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This remote procedure for the DBQ Push Utility will filter the CAPRI   Template Definitions in the EDIT LOCAL tab in a returned array sorted

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBFILT | LITERAL | No |
| 2 | DVBSORT | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-temp-def-list`

---

### `DVBA CAPRI GET EXAMINER INFO`

| Property | Value |
|----------|-------|
| Tag | `EXINFO` |
| Routine | `DVBUTIL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** This RPC returns data for a given user.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBDUZ | LITERAL | No |
| 2 | DVBDVI | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-get-examiner-info`

---

### `DVBA CAPRI SAVE SIGNER`

| Property | Value |
|----------|-------|
| Tag | `SAVESIGN` |
| Routine | `DVBSIGN` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Saves Signer DUZ, CoSigner Required Flag, CoSigner DUZ, and updates  Date/Time for worksheet.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBIEN | LITERAL | No |
| 2 | DVBCOSIGNER | LITERAL | No |

**API Endpoint:** `POST /vista/dvb/rpc/dvba-capri-save-signer`

---

### `DVBA CAPRI GET SECID`

| Property | Value |
|----------|-------|
| Tag | `GETSECID` |
| Routine | `DVBSECID` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the SECID information for a NEW PERSON file entry.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBDUZ | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-get-secid`

---

### `DVBA CAPRI UNCOSIGN COUNT`

| Property | Value |
|----------|-------|
| Tag | `ALERTCNT` |
| Routine | `DVBSIGN` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** To return count of DBQs that require Cosignature

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-uncosign-count`

---

### `DVBA CAPRI UNCOSIGNED INFO`

| Property | Value |
|----------|-------|
| Tag | `UNCSINFO` |
| Routine | `DVBSIGN` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns an array of info regarding all uncosigned worksheets.

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-uncosigned-info`

---

### `DVBA CAPRI SECURITY TOGGLE`

| Property | Value |
|----------|-------|
| Tag | `SECTOG` |
| Routine | `DVBUTIL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC is returning data from the DVBAB CAPRI SECURITY TOGGLE  parameter.  This value tells the CAPRI GUI which security field(s) must  be validated to allow GUI access.

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-security-toggle`

---

### `DVBA CAPRI PDF SIG FIELD NAMES`

| Property | Value |
|----------|-------|
| Tag | `PDFSIGNM` |
| Routine | `DVBUTIL` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns a list of all DBQ PDF field names to enable CMT PDF signing.

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-pdf-sig-field-names`

---

### `DVBA CAPRI SAVE REVIEW DATA`

| Property | Value |
|----------|-------|
| Tag | `REVIEWSAVE` |
| Routine | `DVBSIGN` |
| Return Type | SINGLE VALUE |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** CAPRI GUI will call RPC to save details for each review action

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBIEN | LITERAL | No |
| 2 | DVBTYP | LITERAL | No |
| 3 | DVBREVCMT | REFERENCE | No |

**API Endpoint:** `POST /vista/dvb/rpc/dvba-capri-save-review-data`

---

### `DVBA CAPRI TRAINEE DOC MANAGER`

| Property | Value |
|----------|-------|
| Tag | `DOCMAN` |
| Routine | `DVBSIGN` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** RPC Used only to update Document Manager Field to Trainee before  Signature Validation

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBIEN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-trainee-doc-manager`

---

### `DVBA CAPRI TRAINEE SIGNATURE`

| Property | Value |
|----------|-------|
| Tag | `TRAINSIG` |
| Routine | `DVBSIGN` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns the DUZ and DIV for the Trainee that filled out the Worksheet.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBIEN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-trainee-signature`

---

### `DVBA CAPRI STATUS COUNT`

| Property | Value |
|----------|-------|
| Tag | `STATCNT` |
| Routine | `DVBSIGN` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return the count for worksheets with the following statuses: A=Awaiting signature D=Draft/Not ready O=Outdataed template P=Review pending S=Sent back

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-status-count`

---

### `DVBA CAPRI ALERTS DATA`

| Property | Value |
|----------|-------|
| Tag | `ALRTDATA` |
| Routine | `DVBSIGN2` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** Returns the data for the following worksheet review statuses: A=Awaiting Signature, D=Draft/Not ready, O=Outdated Template, P=Review  Pending, S=Sent Back   The "P" status needs to be specifically requested (via the 2nd input  parameter DVBST).  If this does not happen, then data is only returned  f

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBST | LITERAL | No |
| 2 | DVBDUZ | LITERAL | No |
| 3 | DVBUT | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-alerts-data`

---

### `DVBA CAPRI PDF LOGIC TOGGLE`

| Property | Value |
|----------|-------|
| Tag | `DBQLOGIC` |
| Routine | `DVBUTIL` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** RPC will return Parameter results that list ALL, None, or the the  name(s) of the DBQs that need to skip the DBQ Conditional Logic.

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-pdf-logic-toggle`

---

### `DVBA CAPRI WORKSHEET BY EXAM`

| Property | Value |
|----------|-------|
| Tag | `WKSHBYEXAM` |
| Routine | `DVBUTIL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** RPC to provide Worksheet IEN based on 2507 Exam Reference Number

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBEXAM | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-worksheet-by-exam`

---

### `DVBA CAPRI PN TOGGLE`

| Property | Value |
|----------|-------|
| Tag | `PNTOG` |
| Routine | `DVBUTIL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will return the value of the DVBAB CAPRI PN Toggle of 1 determines that TIU Notes text data should be populated in whole or 0 TIU Notes text data directing to review CAPRI for PDF text document.

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-pn-toggle`

---

### `DVBA CAPRI SKIP PARENTCHILD`

| Property | Value |
|----------|-------|
| Tag | `PCHILDLOGIC` |
| Routine | `DVBUTIL` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns current list of parameters in DVBAB CAPRI SKIP PARENTCHILD

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-skip-parentchild`

---

### `DVBA CAPRI SKIP CHILD RESET`

| Property | Value |
|----------|-------|
| Tag | `CSKIPLOGIC` |
| Routine | `DVBUTIL` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns list of parameters in DVBAB CAPRI SKIP CHILD RESET

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-skip-child-reset`

---

### `DVBA CAPRI CMT IEPD RESET`

| Property | Value |
|----------|-------|
| Tag | `IEPDREST` |
| Routine | `DVBUTIL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** RPC will return value of DVBAB CAPRI CMT IEPD RESET parameter. This value  is being used to determine if the CAPRI GUI will redownload the IEPD.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | N/A | UNKNOWN() | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-cmt-iepd-reset`

---

### `DVBA CAPRI CMT SKIP COND`

| Property | Value |
|----------|-------|
| Tag | `CONDSKIP` |
| Routine | `DVBUTIL` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Returns list of parameters in DVBAB CAPRI SKIP CONDFIELD

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | N/A | UNKNOWN() | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-cmt-skip-cond`

---

### `DVBA CAPRI WORD WRAP`

| Property | Value |
|----------|-------|
| Tag | `WORDWRAP` |
| Routine | `DVBUTIL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Max length of characters before word wrap.

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-word-wrap`

---

### `DVBA CAPRI MED OPN FIELDS`

| Property | Value |
|----------|-------|
| Tag | `MEDOPFLDS` |
| Routine | `DVBUTIL` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** RPC to return values from parameter DVBAB CAPRI MED OPN FIELDS

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-med-opn-fields`

---

### `DVBA CAPRI SUPPORT MESSAGE`

| Property | Value |
|----------|-------|
| Tag | `HELPINFO` |
| Routine | `DVBUTIL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns support desk phone number to display to CAPRI user when they need  to submit a support ticket.  Message received from parameter DVBAB CAPRI SUPPORT MESSAGE.

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-support-message`

---

### `DVBA CAPRI NRE LOAD`

| Property | Value |
|----------|-------|
| Tag | `LOADRPC` |
| Routine | `DVBANRE` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Return configuration string for a division

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBDIVID | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-nre-load`

---

### `DVBA CAPRI NRE MARK`

| Property | Value |
|----------|-------|
| Tag | `MARKRPC` |
| Routine | `DVBANRE` |
| Return Type | SINGLE VALUE |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** Mark status of an export

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBPROCESSID | LITERAL | No |
| 2 | DVBEXPORTMARK | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-nre-mark`

---

### `DVBA CAPRI NRE OPEN`

| Property | Value |
|----------|-------|
| Tag | `OPENRPC` |
| Routine | `DVBANRE` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Return a file stream of an exported csv

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBPROCESSID | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-nre-open`

---

### `DVBA CAPRI NRE SAVE`

| Property | Value |
|----------|-------|
| Tag | `SAVERPC` |
| Routine | `DVBANRE` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Save configuration data for a division

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBSAVESTRING | LITERAL | No |

**API Endpoint:** `POST /vista/dvb/rpc/dvba-capri-nre-save`

---

### `DVBA CAPRI NRE STATIC`

| Property | Value |
|----------|-------|
| Tag | `STATICRPC` |
| Routine | `DVBANRE` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** New Reports Export - Return meta data for the NRE screen

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-nre-static`

---

### `DVBA CAPRI NRE SUMMARY`

| Property | Value |
|----------|-------|
| Tag | `SUMMARYRPC` |
| Routine | `DVBANRE` |
| Return Type | ARRAY |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns a multi-line summary for all divisions

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-nre-summary`

---

### `DVBA CAPRI NRE HISTORY`

| Property | Value |
|----------|-------|
| Tag | `HISTORYRPC` |
| Routine | `DVBANRE` |
| Return Type | GLOBAL ARRAY |
| Parameter Count | 3 |
| Status | Inactive (may still be callable) |

**Description:** New Reports Export - Return export history

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBDIVID | LITERAL | No |
| 2 | DVBRANGEID | LITERAL | No |
| 3 |  | UNKNOWN(RPCHISTORY) | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-nre-history`

---

### `DVBA CAPRI NRE RUNNOW`

| Property | Value |
|----------|-------|
| Tag | `RUNNOWRPC` |
| Routine | `DVBANRE` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Produce an ad-hoc report

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBSAVESTRING | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-nre-runnow`

---

### `DVBA CAPRI PROXY DATA`

| Property | Value |
|----------|-------|
| Tag | `LISTPROXY` |
| Routine | `DVBUTIL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** This RPC will be used by CAPRI to return Proxy security token

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | NULL | UNKNOWN() | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-proxy-data`

---

### `DVBA CAPRI ARP RSKDT`

| Property | Value |
|----------|-------|
| Tag | `COMBINE` |
| Routine | `DVBAARP` |
| Return Type | ARRAY |
| Parameter Count | 2 |
| Status | Inactive (may still be callable) |

**Description:** For enabling AMIE options and rescheduling AMIE options in Taskman

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBAOPTIONS | LITERAL | No |
| 2 | DVBDATA | REFERENCE | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-arp-rskdt`

---

### `DVBA CAPRI OPEN ACCESS CHECK`

| Property | Value |
|----------|-------|
| Tag | `OPENCHECK` |
| Routine | `DVBCWKSHT` |
| Return Type | SINGLE VALUE |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Given a worksheet IEN, it will determine if the user has permissions to  open the worksheet for editing. Checking if the user holds the "DVBAB  CPWM REVIEWER" Key, has FileMan access, or is listed as the Document  Manager, Transcriber, or Worksheet Originator.

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBIEN | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-open-access-check`

---

### `DVBA CAPRI LOOKUP OPTSET`

| Property | Value |
|----------|-------|
| Tag | `LOOKUP` |
| Routine | `DVBAARP` |
| Return Type | ARRAY |
| Parameter Count | 1 |
| Status | Inactive (may still be callable) |

**Description:** Verifies whether the AMIE Options exist  Display the TASKMAN Schedule  Displays the Task ID if it has one

**Parameters:**

| # | Name | Type | Required |
|---|------|------|----------|
| 1 | DVBOPTLIST | LITERAL | No |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-lookup-optset`

---

### `DVBA CAPRI ARP OPTSET`

| Property | Value |
|----------|-------|
| Tag | `N/A` |
| Routine | `N/A` |
| Return Type | UNKNOWN() |
| Parameter Count | 0 |

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-arp-optset`

---

### `DVBA CAPRI TOGGLE XML HEADER`

| Property | Value |
|----------|-------|
| Tag | `XMLHEADER` |
| Routine | `DVBUTIL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns XML Header Toggle Parameter setting  DVBAB CARPI XML HEADER TOGGLE

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-toggle-xml-header`

---

### `DVBA CAPRI CMT SIGFLD NUM`

| Property | Value |
|----------|-------|
| Tag | `SIGFLDNUM` |
| Routine | `DVBUTIL` |
| Return Type | SINGLE VALUE |
| Parameter Count | 0 |
| Status | Inactive (may still be callable) |

**Description:** Returns value from Parameter: DVBAB CAPRI CMT SIGFLD NUM NUM^DELIMITER (3^_) for placement of PDF Name Fields in current IEPD

**API Endpoint:** `GET /vista/dvb/rpc/dvba-capri-cmt-sigfld-num`

---


## Menu Options

### Menu

| Name | Security Key |
|------|-------------|
| DVB HMENU-HINQ | DVBHINQ |
| DVB HSUSP-UTILITY | DVBHINQ |
| DVB HNET-WORK | — |
| DVB HMENU-USER | — |
| DVB HUPLOAD-MENU | DVBHINQ |

### Run routine

| Name | Security Key |
|------|-------------|
| DVB HREQ-STATUSBYPAT | DVBHINQ |
| DVB HSUSP-VIEWFILE | — |
| DVB HSUSP-ENTERREQ | — |
| DVB HSUSP-PRINTSUSP | DVBHINQ |
| DVB HSUSP-EDPARAMETERS | — |
| DVB HSUSP-SELVIEWFILE | — |
| DVB HREQ-TRANSTEST | — |
| DVB HSUSP-MAIL | — |
| DVB HSUSP-DELETE | — |

### Action

| Name | Security Key |
|------|-------------|
| DVB HSUSP-PURGEFILE | — |
| DVB HNET-ENABLE | — |
| DVB HNET-DISABLE | — |
| DVB HREQ-INDIVHREQ | DVBHINQ |
| DVB HSUSP-PROCESSFILE | DVBHINQ |
| DVB HREQ-GENERHREQ | DVBHINQ |
| DVB HUPLOAD | DG ELIGIBILITY |
| DVB HUPLOAD-AUDIT | — |
| DVB HUPLOAD-PRINT | — |
| DVB HAUTO-PURGE | — |
| DVB HRECOMPILE | — |

## Security Keys

These VistA security keys control access to specific functions within this module:

- `DVBHINQ`
- `DG ELIGIBILITY`

## API Route Summary

All routes are prefixed with `/vista/dvb/`.

| Method | Endpoint | RPC | Return Type |
|--------|----------|-----|-------------|
| POST | `/vista/dvb/rpc/dvbab-get-set` | DVBAB GET SET | ARRAY |
| GET | `/vista/dvb/rpc/dvbab-report-checklist` | DVBAB REPORT CHECKLIST | ARRAY |
| GET | `/vista/dvb/rpc/dvbab-check-credentials` | DVBAB CHECK CREDENTIALS | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvbab-find-exams` | DVBAB FIND EXAMS | ARRAY |
| GET | `/vista/dvb/rpc/dvbab-send-msg` | DVBAB SEND MSG | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvbab-appointment-list` | DVBAB APPOINTMENT LIST | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-report-lists` | DVBAB REPORT LISTS | ARRAY |
| GET | `/vista/dvb/rpc/dvbab-ptinq` | DVBAB PTINQ | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-increase-exam-count` | DVBAB INCREASE EXAM COUNT | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvbab-health-summary-text` | DVBAB HEALTH SUMMARY TEXT | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-2507-pending-report` | DVBAB 2507 PENDING REPORT | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-inst-list` | DVBAB INST LIST | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-datetime` | DVBAB DATETIME | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvbab-amis-report` | DVBAB AMIS REPORT | ARRAY |
| GET | `/vista/dvb/rpc/dvbab-sc-veteran-report` | DVBAB SC VETERAN REPORT | ARRAY |
| GET | `/vista/dvb/rpc/dvbab-pending-c&p-report` | DVBAB PENDING C&P REPORT | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-report-exam-chklist` | DVBAB REPORT EXAM CHKLIST | ARRAY |
| GET | `/vista/dvb/rpc/dvbab-report-adminq` | DVBAB REPORT ADMINQ | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-report-incompvet` | DVBAB REPORT INCOMPVET | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-report-discharge` | DVBAB REPORT DISCHARGE | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-report-readmit` | DVBAB REPORT READMIT | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-report-admissions` | DVBAB REPORT ADMISSIONS | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-report-pending7131` | DVBAB REPORT PENDING7131 | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-report-cpdetails` | DVBAB REPORT CPDETAILS | ARRAY |
| GET | `/vista/dvb/rpc/dvbab-report-7131inq` | DVBAB REPORT 7131INQ | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-lablist` | DVBAB LABLIST | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-version` | DVBAB VERSION | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvbab-division` | DVBAB DIVISION | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvbab-team-patients` | DVBAB TEAM PATIENTS | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-reports` | DVBAB REPORTS | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-mail-init` | DVBAB MAIL INIT | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvbab-surgery-case` | DVBAB SURGERY CASE | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-original-processing-date` | DVBAB ORIGINAL PROCESSING DATE | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-mpi-assign-icn` | DVBAB MPI ASSIGN ICN | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvbab-report-admission-inquiry` | DVBAB REPORT ADMISSION INQUIRY | ARRAY |
| POST | `/vista/dvb/rpc/dvbab-report-new-notices-dc` | DVBAB REPORT NEW NOTICES DC | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-template-definition` | DVBAB TEMPLATE DEFINITION | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-note-titles` | DVBAB NOTE TITLES | ARRAY |
| GET | `/vista/dvb/rpc/dvbab-get-visit-info` | DVBAB GET VISIT INFO | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvbab-report-special` | DVBAB REPORT SPECIAL | GLOBAL ARRAY |
| POST | `/vista/dvb/rpc/dvbab-save-form` | DVBAB SAVE FORM | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvbab-exams-by-date` | DVBAB EXAMS BY DATE | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-template-list` | DVBAB TEMPLATE LIST | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-load-form` | DVBAB LOAD FORM | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-new-person-file` | DVBAB NEW PERSON FILE | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-fetch-1u4n` | DVBAB FETCH 1U4N | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-template-report-full` | DVBAB TEMPLATE REPORT FULL | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-form-data-backup` | DVBAB FORM DATA BACKUP | SINGLE VALUE |
| POST | `/vista/dvb/rpc/dvbab-form-data-backup-delete` | DVBAB FORM DATA BACKUP DELETE | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvbab-form-data-backup-restore` | DVBAB FORM DATA BACKUP RESTORE | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvbab-form-copy` | DVBAB FORM COPY | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvbab-find-dups` | DVBAB FIND DUPS | GLOBAL ARRAY |
| POST | `/vista/dvb/rpc/dvbab-set-division` | DVBAB SET DIVISION | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvbab-get-url` | DVBAB GET URL | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvbab-dod-report` | DVBAB DOD REPORT | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-dod-info` | DVBAB DOD INFO | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvbab-find-dfn-by-icn` | DVBAB FIND DFN BY ICN | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-dod-report-types` | DVBAB DOD REPORT TYPES | ARRAY |
| GET | `/vista/dvb/rpc/dvbab-ccow` | DVBAB CCOW | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvbab-restricted-list-patients` | DVBAB RESTRICTED LIST PATIENTS | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbab-zip2city` | DVBAB ZIP2CITY | ARRAY |
| GET | `/vista/dvb/rpc/dvba-check-patch` | DVBA CHECK PATCH | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvbab-get-vva-token` | DVBAB GET VVA TOKEN | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvbab-8861-notifications` | DVBAB 8861 NOTIFICATIONS | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-mvi-search-person` | DVBA MVI SEARCH PERSON | ARRAY |
| GET | `/vista/dvb/rpc/dvba-mvi-get-corresponding-ids` | DVBA MVI GET CORRESPONDING IDS | ARRAY |
| GET | `/vista/dvb/rpc/dvbad-contracted-exam-reports` | DVBAD CONTRACTED EXAM REPORTS | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvbad-contracted-exam-crypto` | DVBAD CONTRACTED EXAM CRYPTO | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvbab-send-msg-two` | DVBAB SEND MSG TWO | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-exam-xml` | DVBA CAPRI EXAM XML | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-exam-link-tiu` | DVBA CAPRI EXAM LINK TIU | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-get-exam-ien` | DVBA CAPRI GET EXAM IEN | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-getspclconsid` | DVBA CAPRI GETSPCLCONSID | ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-listspclconsid` | DVBA CAPRI LISTSPCLCONSID | ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-setspclconsid` | DVBA CAPRI SETSPCLCONSID | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-listinsufrsn` | DVBA CAPRI LISTINSUFRSN | ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-listclaimtype` | DVBA CAPRI LISTCLAIMTYPE | ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-getclaimtype` | DVBA CAPRI GETCLAIMTYPE | ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-setclaimtype` | DVBA CAPRI SETCLAIMTYPE | ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-getcancelreason` | DVBA CAPRI GETCANCELREASON | ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-getcontremarks` | DVBA CAPRI GETCONTREMARKS | ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-setcontremarks` | DVBA CAPRI SETCONTREMARKS | WORD PROCESSING |
| GET | `/vista/dvb/rpc/dvba-capri-get-reroute` | DVBA CAPRI GET REROUTE | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-reroute-vamc` | DVBA CAPRI REROUTE VAMC | ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-get-division` | DVBA CAPRI GET DIVISION | ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-get-div-comment` | DVBA CAPRI GET DIV COMMENT | ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-get-div-exam` | DVBA CAPRI GET DIV EXAM | ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-get-reroute-code` | DVBA CAPRI GET REROUTE CODE | ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-send-reroute` | DVBA CAPRI SEND REROUTE | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-reroute-info` | DVBA CAPRI REROUTE INFO | ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-reroute-status` | DVBA CAPRI REROUTE STATUS | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-get-edipi` | DVBA CAPRI GET EDIPI | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-get-edipi2` | DVBA CAPRI GET EDIPI2 | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvbab-prf-popup` | DVBAB PRF POPUP | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvbab-hasflg` | DVBAB HASFLG | ARRAY |
| GET | `/vista/dvb/rpc/dvbab-getflag` | DVBAB GETFLAG | ARRAY |
| GET | `/vista/dvb/rpc/dvbab-clrflg` | DVBAB CLRFLG | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvbab-self-referral` | DVBAB SELF REFERRAL | ARRAY |
| GET | `/vista/dvb/rpc/dvba-mvi-cerner-correlations` | DVBA MVI CERNER CORRELATIONS | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-active-dbq-list` | DVBA ACTIVE DBQ LIST | ARRAY |
| GET | `/vista/dvb/rpc/dvba-dbq-check` | DVBA DBQ CHECK | ARRAY |
| GET | `/vista/dvb/rpc/dvba-dbq-gen-check` | DVBA DBQ GEN CHECK | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-report-builder` | DVBA REPORT BUILDER | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-dbq-status` | DVBA CAPRI DBQ STATUS | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-get-efolder-token` | DVBA CAPRI GET EFOLDER TOKEN | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-param-inq` | DVBA CAPRI PARAM INQ | ARRAY |
| POST | `/vista/dvb/rpc/dvba-capri-param-update` | DVBA CAPRI PARAM UPDATE | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-clindoc-urls` | DVBA CAPRI CLINDOC URLS | ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-get-toggles` | DVBA CAPRI GET TOGGLES | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-get-par-desc` | DVBA CAPRI GET PAR DESC | ARRAY |
| POST | `/vista/dvb/rpc/dvba-capri-set-metrics` | DVBA CAPRI SET METRICS | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-purge-met` | DVBA CAPRI PURGE MET | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-get-met-rpt` | DVBA CAPRI GET MET RPT | ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-get-all-param` | DVBA CAPRI GET ALL PARAM | ARRAY |
| GET | `/vista/dvb/rpc/dvbab-capri-allow-clindocs` | DVBAB CAPRI ALLOW CLINDOCS | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvbab-capri-efolder-location` | DVBAB CAPRI EFOLDER LOCATION | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvbab-capri-provider` | DVBAB CAPRI PROVIDER | SINGLE VALUE |
| POST | `/vista/dvb/rpc/dvba-capri-spec-add` | DVBA CAPRI SPEC ADD | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-spec-status` | DVBA CAPRI SPEC STATUS | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-spec-inactive` | DVBA CAPRI SPEC INACTIVE | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-worksheet-stat-list` | DVBA CAPRI WORKSHEET STAT LIST | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-worksheet-name-ed` | DVBA CAPRI WORKSHEET NAME ED | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-worksheet-status` | DVBA CAPRI WORKSHEET STATUS | SINGLE VALUE |
| POST | `/vista/dvb/rpc/dvba-capri-update-dbq-transtat` | DVBA CAPRI UPDATE DBQ TRANSTAT | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-get-dbq-xml` | DVBA CAPRI GET DBQ XML | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-dbq-trans-fail-list` | DVBA CAPRI DBQ TRANS FAIL LIST | GLOBAL ARRAY |
| POST | `/vista/dvb/rpc/dvba-capri-save-dbq-xml` | DVBA CAPRI SAVE DBQ XML | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-nf-data` | DVBA CAPRI NF DATA | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-get-exam-report` | DVBA CAPRI GET EXAM REPORT | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-fail-check` | DVBA CAPRI FAIL CHECK | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-github-location` | DVBA CAPRI GITHUB LOCATION | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-get-github-data` | DVBA CAPRI GET GITHUB DATA | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-github-date` | DVBA CAPRI GITHUB DATE | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-get-github-date` | DVBA CAPRI GET GITHUB DATE | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-iepd-data` | DVBA CAPRI IEPD DATA | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-get-exam-pdf` | DVBA CAPRI GET EXAM PDF | GLOBAL ARRAY |
| POST | `/vista/dvb/rpc/dvba-capri-create-worksheet` | DVBA CAPRI CREATE WORKSHEET | ARRAY |
| POST | `/vista/dvb/rpc/dvba-capri-save-exam-pdf` | DVBA CAPRI SAVE EXAM PDF | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-get-worksheet` | DVBA CAPRI GET WORKSHEET | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-pascal-check` | DVBA CAPRI PASCAL CHECK | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-get-worksheet-list` | DVBA CAPRI GET WORKSHEET LIST | GLOBAL ARRAY |
| POST | `/vista/dvb/rpc/dvba-capri-delete-check` | DVBA CAPRI DELETE CHECK | SINGLE VALUE |
| POST | `/vista/dvb/rpc/dvba-capri-delete-worksheet` | DVBA CAPRI DELETE WORKSHEET | SINGLE VALUE |
| POST | `/vista/dvb/rpc/dvba-capri-worksheet-update` | DVBA CAPRI WORKSHEET UPDATE | ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-get-dbq-pdf` | DVBA CAPRI GET DBQ PDF | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-invalid-char-list` | DVBA CAPRI INVALID CHAR LIST | ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-cmt-ssn-var` | DVBA CAPRI CMT SSN VAR | GLOBAL ARRAY |
| POST | `/vista/dvb/rpc/dvba-capri-unlock-exam` | DVBA CAPRI UNLOCK EXAM | SINGLE VALUE |
| POST | `/vista/dvb/rpc/dvba-capri-add-exam` | DVBA CAPRI ADD EXAM | SINGLE VALUE |
| POST | `/vista/dvb/rpc/dvba-capri-delete-exam` | DVBA CAPRI DELETE EXAM | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-cmt-toggle` | DVBA CAPRI CMT TOGGLE | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-get-exam-history` | DVBA CAPRI GET EXAM HISTORY | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-exam-restore` | DVBA CAPRI EXAM RESTORE | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-temp-def-list` | DVBA CAPRI TEMP DEF LIST | ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-get-examiner-info` | DVBA CAPRI GET EXAMINER INFO | SINGLE VALUE |
| POST | `/vista/dvb/rpc/dvba-capri-save-signer` | DVBA CAPRI SAVE SIGNER | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-get-secid` | DVBA CAPRI GET SECID | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-uncosign-count` | DVBA CAPRI UNCOSIGN COUNT | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-uncosigned-info` | DVBA CAPRI UNCOSIGNED INFO | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-security-toggle` | DVBA CAPRI SECURITY TOGGLE | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-pdf-sig-field-names` | DVBA CAPRI PDF SIG FIELD NAMES | GLOBAL ARRAY |
| POST | `/vista/dvb/rpc/dvba-capri-save-review-data` | DVBA CAPRI SAVE REVIEW DATA | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-trainee-doc-manager` | DVBA CAPRI TRAINEE DOC MANAGER | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-trainee-signature` | DVBA CAPRI TRAINEE SIGNATURE | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-status-count` | DVBA CAPRI STATUS COUNT | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-alerts-data` | DVBA CAPRI ALERTS DATA | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-pdf-logic-toggle` | DVBA CAPRI PDF LOGIC TOGGLE | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-worksheet-by-exam` | DVBA CAPRI WORKSHEET BY EXAM | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-pn-toggle` | DVBA CAPRI PN TOGGLE | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-skip-parentchild` | DVBA CAPRI SKIP PARENTCHILD | ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-skip-child-reset` | DVBA CAPRI SKIP CHILD RESET | ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-cmt-iepd-reset` | DVBA CAPRI CMT IEPD RESET | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-cmt-skip-cond` | DVBA CAPRI CMT SKIP COND | ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-word-wrap` | DVBA CAPRI WORD WRAP | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-med-opn-fields` | DVBA CAPRI MED OPN FIELDS | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-support-message` | DVBA CAPRI SUPPORT MESSAGE | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-nre-load` | DVBA CAPRI NRE LOAD | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-nre-mark` | DVBA CAPRI NRE MARK | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-nre-open` | DVBA CAPRI NRE OPEN | GLOBAL ARRAY |
| POST | `/vista/dvb/rpc/dvba-capri-nre-save` | DVBA CAPRI NRE SAVE | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-nre-static` | DVBA CAPRI NRE STATIC | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-nre-summary` | DVBA CAPRI NRE SUMMARY | ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-nre-history` | DVBA CAPRI NRE HISTORY | GLOBAL ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-nre-runnow` | DVBA CAPRI NRE RUNNOW | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-proxy-data` | DVBA CAPRI PROXY DATA | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-arp-rskdt` | DVBA CAPRI ARP RSKDT | ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-open-access-check` | DVBA CAPRI OPEN ACCESS CHECK | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-lookup-optset` | DVBA CAPRI LOOKUP OPTSET | ARRAY |
| GET | `/vista/dvb/rpc/dvba-capri-arp-optset` | DVBA CAPRI ARP OPTSET | UNKNOWN() |
| GET | `/vista/dvb/rpc/dvba-capri-toggle-xml-header` | DVBA CAPRI TOGGLE XML HEADER | SINGLE VALUE |
| GET | `/vista/dvb/rpc/dvba-capri-cmt-sigfld-num` | DVBA CAPRI CMT SIGFLD NUM | SINGLE VALUE |
