# CPRS Parity Matrix

> Generated: 2026-02-19
>
> Sources: Delphi CPRS contract, Runtime VistA RPC catalog, Vivian/DOX grounding

## Summary

| Dimension          | Total | Wired | Present (unwired) | Absent/Pending          |
| ------------------ | ----- | ----- | ----------------- | ----------------------- |
| RPCs (from Delphi) | 975   | 25    | 0                 | 950                     |
| Tabs               | 10    | 10    | -                 | 0 pending, 0 extensions |
| Menu Actions       | 35    | 35    | -                 | 0                       |

**Unhandled UI actions: 0**

## Tab Parity

| Tab         | Panel           | Status | RPCs Used                                                        | Wired |
| ----------- | --------------- | ------ | ---------------------------------------------------------------- | ----- |
| Problems    | ProblemsPanel   | wired  | ORWCH PROBLEM LIST                                               | 1/1   |
| Meds        | MedsPanel       | wired  | ORWPS ACTIVE, ORWORR GETTXT                                      | 2/2   |
| Orders      | OrdersPanel     | wired  | ORWPS ACTIVE                                                     | 1/1   |
| Notes       | NotesPanel      | wired  | TIU DOCUMENTS BY CONTEXT, TIU GET RECORD TEXT, TIU CREATE RECORD | 3/3   |
| Consults    | ConsultsPanel   | wired  | ORQQCN LIST, ORQQCN DETAIL                                       | 2/2   |
| Surgery     | SurgeryPanel    | wired  | ORWSR LIST                                                       | 1/1   |
| D/C Summ    | DCSummPanel     | wired  | TIU DOCUMENTS BY CONTEXT, TIU GET RECORD TEXT                    | 2/2   |
| Labs        | LabsPanel       | wired  | ORWLRR INTERIM                                                   | 1/1   |
| Reports     | ReportsPanel    | wired  | ORWRP REPORT LISTS, ORWRP REPORT TEXT                            | 2/2   |
| Cover Sheet | CoverSheetPanel | wired  | ORQQAL LIST, ORQQVI VITALS, ORWPS ACTIVE, ORWCH PROBLEM LIST     | 4/4   |

## Menu Action Parity

| Action              | Status | Handler                                 |
| ------------------- | ------ | --------------------------------------- |
| selectPatient       | wired  | router.push(/cprs/patient-search)       |
| refresh             | wired  | window.location.reload()                |
| inbox               | wired  | router.push(/cprs/inbox)                |
| orderSets           | wired  | router.push(/cprs/order-sets)           |
| print               | wired  | openModal(print)                        |
| printSetup          | wired  | openModal(printSetup)                   |
| signOut             | wired  | logout()                                |
| exit                | wired  | router.push(/cprs/login)                |
| copy                | wired  | navigator.clipboard.writeText()         |
| paste               | wired  | navigator.clipboard.readText()          |
| preferences         | wired  | router.push(/cprs/settings/preferences) |
| graphing            | wired  | openModal(graphing)                     |
| legacyConsole       | wired  | openModal(legacyConsole)                |
| remoteData          | wired  | openModal(remoteData)                   |
| remoteDataPage      | wired  | router.push(/cprs/remote-data-viewer)   |
| keyboardShortcuts   | wired  | openModal(keyboardShortcuts)            |
| about               | wired  | openModal(about)                        |
| theme:light         | wired  | updatePreferences({theme})              |
| theme:dark          | wired  | updatePreferences({theme})              |
| density:comfortable | wired  | updatePreferences({density})            |
| density:compact     | wired  | updatePreferences({density})            |
| density:balanced    | wired  | updatePreferences({density})            |
| density:dense       | wired  | updatePreferences({density})            |
| layout:cprs         | wired  | updatePreferences({layoutMode})         |
| layout:modern       | wired  | updatePreferences({layoutMode})         |
| tab:cover           | wired  | router.push(/cprs/chart/{dfn}/cover)    |
| tab:problems        | wired  | router.push(/cprs/chart/{dfn}/problems) |
| tab:meds            | wired  | router.push(/cprs/chart/{dfn}/meds)     |
| tab:orders          | wired  | router.push(/cprs/chart/{dfn}/orders)   |
| tab:notes           | wired  | router.push(/cprs/chart/{dfn}/notes)    |
| tab:consults        | wired  | router.push(/cprs/chart/{dfn}/consults) |
| tab:surgery         | wired  | router.push(/cprs/chart/{dfn}/surgery)  |
| tab:dcsumm          | wired  | router.push(/cprs/chart/{dfn}/dcsumm)   |
| tab:labs            | wired  | router.push(/cprs/chart/{dfn}/labs)     |
| tab:reports         | wired  | router.push(/cprs/chart/{dfn}/reports)  |

## RPC Parity -- Wired

| RPC Name                   | API Endpoint                    | Phase | Package |
| -------------------------- | ------------------------------- | ----- | ------- |
| ORQPT DEFAULT PATIENT LIST | GET /vista/default-patient-list | 4A    | OR      |
| ORQQAL LIST                | GET /vista/allergies            | 5C    | OR      |
| ORQQCN DETAIL              | GET /vista/consults/detail      | 12A   | OR      |
| ORQQCN LIST                | GET /vista/consults             | 12A   | OR      |
| ORQQPL4 LEX                | GET /vista/icd-search           | 12F   | OR      |
| ORQQVI VITALS              | GET /vista/vitals               | 6A    | OR      |
| ORWDAL32 SAVE ALLERGY      | POST /vista/allergies           | 5D    | OR      |
| ORWDX LOCK                 | POST /vista/medications         | 14C   | OR      |
| ORWDX UNLOCK               | POST /vista/medications         | 14C   | OR      |
| ORWDXM AUTOACK             | POST /vista/medications         | 8B    | OR      |
| ORWLRR INTERIM             | GET /vista/labs                 | 12D   | OR      |
| ORWORR GETTXT              | GET /vista/medications          | 8A    | OR      |
| ORWPS ACTIVE               | GET /vista/medications          | 8A    | OR      |
| ORWPT LIST ALL             | GET /vista/patient-search       | 4B    | OR      |
| ORWPT SELECT               | GET /vista/patient-demographics | 5B    | OR      |
| ORWRP REPORT LISTS         | GET /vista/reports              | 12E   | OR      |
| ORWRP REPORT TEXT          | GET /vista/reports/text         | 12E   | OR      |
| ORWSR LIST                 | GET /vista/surgery              | 12B   | OR      |
| TIU CREATE RECORD          | POST /vista/notes               | 7B    | TIU     |
| TIU DOCUMENTS BY CONTEXT   | GET /vista/notes                | 7A    | TIU     |
| TIU GET RECORD TEXT        | GET /vista/tiu-text             | 12C   | TIU     |
| XUS AV CODE                | POST /auth/login                | 13    | XU      |
| XUS GET USER INFO          | POST /auth/login                | 13    | XU      |
| XUS SIGNON SETUP           | POST /auth/login                | 13    | XU      |
| XWB CREATE CONTEXT         | POST /auth/login                | 13    | XU      |

## RPC Parity -- Present in Runtime but Unwired

_Runtime catalog not available or no unwired RPCs found._

## RPC Parity -- Top 50 Absent (by reference count)

| RPC Name                    | Ref Count | Package | Suggested Next Step     |
| --------------------------- | --------- | ------- | ----------------------- |
| TIU GET DOCUMENT PARAMETERS | 11        | TIU     | Wire to TIU package     |
| TIU UPDATE RECORD           | 8         | TIU     | Wire to TIU package     |
| TIU REQUIRES COSIGNATURE    | 7         | TIU     | Wire to TIU package     |
| ORWPCE GET SET OF CODES     | 6         | OR      | Wire to OR package      |
| XWB REMOTE RPC              | 6         | XU      | Wire to XU package      |
| OREVNTX ACTIVE              | 5         | OR      | Wire to OR package      |
| ORWDBA1 ORPKGTYP            | 5         | OR      | Wire to OR package      |
| ORWPCE DIAG                 | 5         | OR      | Wire to OR package      |
| ORWTIU VIEWCOPY             | 5         | OR      | Wire to OR package      |
| ORWU NEWPERS                | 5         | OR      | Wire to OR package      |
| TIU LONG LIST OF TITLES     | 5         | TIU     | Wire to TIU package     |
| TIU PERSONAL TITLE LIST     | 5         | TIU     | Wire to TIU package     |
| ORWDBA4 GETTFCI             | 4         | OR      | Wire to OR package      |
| ORWOR VERIFY NOTE TITLE     | 4         | OR      | Wire to OR package      |
| ORWPCE GET DX TEXT          | 4         | OR      | Wire to OR package      |
| ORWTIU GETPASTE             | 4         | OR      | Wire to OR package      |
| ORWTIU SVPASTE              | 4         | OR      | Wire to OR package      |
| ORWU DT                     | 4         | OR      | Wire to OR package      |
| TIUADD                      | 4         | TIU     | Wire to TIU package     |
| TIUID                       | 4         | TIU     | Wire to TIU package     |
| GMRCNOAT                    | 3         | ?       | Identify target package |
| GMRCNOPD                    | 3         | ?       | Identify target package |
| GMRCREAF                    | 3         | ?       | Identify target package |
| OR CPRS GUI CHART           | 3         | OR      | Wire to OR package      |
| ORB3UTL DEFER               | 3         | OR      | Wire to OR package      |
| ORB3UTL GET NOTIFICATION    | 3         | OR      | Wire to OR package      |
| ORDEA LNKMSG                | 3         | OR      | Wire to OR package      |
| OREVNTX1 DONE               | 3         | OR      | Wire to OR package      |
| ORWCH LOADALL               | 3         | OR      | Wire to OR package      |
| ORWDPS32 DLGSLCT            | 3         | OR      | Wire to OR package      |
| ORWDRA32 LOCTYPE            | 3         | OR      | Wire to OR package      |
| ORWDXA VALID                | 3         | OR      | Wire to OR package      |
| ORWDXQ GETQLST              | 3         | OR      | Wire to OR package      |
| ORWPCE ACTPROB              | 3         | OR      | Wire to OR package      |
| ORWPT DFLTSRC               | 3         | OR      | Wire to OR package      |
| TIU AUTHORIZATION           | 3         | TIU     | Wire to TIU package     |
| TIU GET REQUEST             | 3         | TIU     | Wire to TIU package     |
| XUS DIVISION GET            | 3         | XU      | Wire to XU package      |
| XUS PKI GET UPN             | 3         | XU      | Wire to XU package      |
| DG CHK BS5 XREF ARRAY       | 2         | DG      | Wire to DG package      |
| ORB DELETE ALERT            | 2         | OR      | Wire to OR package      |
| ORBSMART OUSMALRT           | 2         | OR      | Wire to OR package      |
| ORDEA AUINTENT              | 2         | OR      | Wire to OR package      |
| ORDEA DEATEXT               | 2         | OR      | Wire to OR package      |
| ORDEA SIGINFO               | 2         | OR      | Wire to OR package      |
| ORDEBUG SAVEDESC            | 2         | OR      | Wire to OR package      |
| ORDEBUG SAVERPCS            | 2         | OR      | Wire to OR package      |
| OREVNTX PAT                 | 2         | OR      | Wire to OR package      |
| OREVNTX1 EXISTS             | 2         | OR      | Wire to OR package      |
| ORIMO IMOLOC                | 2         | OR      | Wire to OR package      |

## Vivian/DOX Package Grounding

| Package | Name                                                   | FileMan Files | Routines | Globals |
| ------- | ------------------------------------------------------ | ------------- | -------- | ------- |
| IBD     | Automated Information Collection System                | 0             | 0        | 0       |
| GMPL    | Problem List                                           | 0             | 0        | 0       |
| GMTS    | Health Summary                                         | 0             | 0        | 0       |
| DGJ     | Incomplete Records Tracking                            | 0             | 0        | 0       |
| GMRC    | Consult Request Tracking                               | 0             | 0        | 0       |
| GMRS    | Consult Request Tracking                               | 0             | 0        | 0       |
| GMRT    | Consult Request Tracking                               | 0             | 0        | 0       |
| TIU     | Text Integration Utility                               | 0             | 0        | 0       |
| GMRP    | Text Integration Utility                               | 0             | 0        | 0       |
| USR     | Authorization Subscription                             | 0             | 0        | 0       |
| DSIR    | Release Of Information - DSSI                          | 0             | 0        | 0       |
| VBEC    | VBECS                                                  | 0             | 0        | 0       |
| HBH     | Hospital Based Home Care                               | 0             | 0        | 0       |
| WEBI    | Integrated Home Telehealth                             | 0             | 0        | 0       |
| LA      | Automated Lab Instruments                              | 0             | 0        | 0       |
| NLT     | National Laboratory Test                               | 0             | 0        | 0       |
| LR      | Lab Service                                            | 0             | 0        | 0       |
| LS      | Lab Service                                            | 0             | 0        | 0       |
| MAG     | Imaging                                                | 0             | 0        | 0       |
| ZMAG    | Imaging                                                | 0             | 0        | 0       |
| FH      | Dietetics                                              | 0             | 0        | 0       |
| PSJ     | Inpatient Medications                                  | 0             | 0        | 0       |
| PSIV    | Inpatient Medications                                  | 0             | 0        | 0       |
| PSG     | Inpatient Medications                                  | 0             | 0        | 0       |
| PSGW    | Auto Replenishment Ward Stock                          | 0             | 0        | 0       |
| PREC    | Pharmacy Enterprise Customization System               | 0             | 0        | 0       |
| PSO     | Outpatient Pharmacy                                    | 0             | 0        | 0       |
| APSP    | Outpatient Pharmacy                                    | 0             | 0        | 0       |
| PSD     | Controlled Substances                                  | 0             | 0        | 0       |
| PSA     | Drug Accountability                                    | 0             | 0        | 0       |
| PREN    | Pharmacy Product System - National                     | 0             | 0        | 0       |
| PSS     | Pharmacy Data Management                               | 0             | 0        | 0       |
| PSN     | National Drug File                                     | 0             | 0        | 0       |
| PSX     | CMOP                                                   | 0             | 0        | 0       |
| PSU     | Pharmacy Benefits Management                           | 0             | 0        | 0       |
| RA      | Radiology Nuclear Medicine                             | 0             | 0        | 0       |
| RMIM    | Functional Independence                                | 0             | 0        | 0       |
| RMPR    | Prosthetics                                            | 0             | 0        | 0       |
| RMPO    | Prosthetics                                            | 0             | 0        | 0       |
| RMPS    | Prosthetics                                            | 0             | 0        | 0       |
| ANRV    | Visual Impairment Service Team                         | 0             | 0        | 0       |
| ACKQ    | Quasar                                                 | 0             | 0        | 0       |
| SOW     | Social Work                                            | 0             | 0        | 0       |
| SWBH    | Social Work                                            | 0             | 0        | 0       |
| SWFG    | Social Work                                            | 0             | 0        | 0       |
| ORRC    | Care Management                                        | 0             | 0        | 0       |
| PSB     | Barcode Medication Administration                      | 0             | 0        | 0       |
| ALPB    | Barcode Medication Administration                      | 0             | 0        | 0       |
| OR      | Order Entry Results Reporting                          | 0             | 0        | 0       |
| OCX     | Order Entry Results Reporting                          | 0             | 0        | 0       |
| MD      | Clinical Procedures                                    | 0             | 0        | 0       |
| GMRV    | General Medical Record - Vitals                        | 0             | 0        | 0       |
| GMV     | General Medical Record - Vitals                        | 0             | 0        | 0       |
| DVBA    | Automated Medical Information Exchange                 | 0             | 0        | 0       |
| DVBC    | Automated Medical Information Exchange                 | 0             | 0        | 0       |
| NUPA    | Patient Assessment Documentation                       | 0             | 0        | 0       |
| GMRA    | Adverse Reaction Tracking                              | 0             | 0        | 0       |
| GMA     | Adverse Reaction Tracking                              | 0             | 0        | 0       |
| PX      | PCE Patient Care Encounter                             | 0             | 0        | 0       |
| EFDP    | PCE Patient Care Encounter                             | 0             | 0        | 0       |
| VSIT    | PCE Patient Care Encounter                             | 0             | 0        | 0       |
| AUPN    | PCE Patient Care Encounter                             | 0             | 0        | 0       |
| AUTN    | PCE Patient Care Encounter                             | 0             | 0        | 0       |
| AUTT    | PCE Patient Care Encounter                             | 0             | 0        | 0       |
| EDP     | Emergency Department Integration Software              | 0             | 0        | 0       |
| YS      | Mental Health                                          | 0             | 0        | 0       |
| RUCL    | Mental Health                                          | 0             | 0        | 0       |
| YI      | Mental Health                                          | 0             | 0        | 0       |
| YT      | Mental Health                                          | 0             | 0        | 0       |
| SPN     | Spinal Cord Dysfunction                                | 0             | 0        | 0       |
| MC      | Medicine                                               | 0             | 0        | 0       |
| SR      | Surgery                                                | 0             | 0        | 0       |
| PXRM    | Clinical Reminders                                     | 0             | 0        | 0       |
| QAM     | Clinical Monitoring System                             | 0             | 0        | 0       |
| DENT    | Dental                                                 | 0             | 0        | 0       |
| NUR     | Nursing Service                                        | 0             | 0        | 0       |
| GMRG    | General Medical Record - Generator                     | 0             | 0        | 0       |
| GMRY    | General Medical Record - IO                            | 0             | 0        | 0       |
| GMRD    | General Medical Record - IO                            | 0             | 0        | 0       |
| EN      | Engineering                                            | 0             | 0        | 0       |
| RMPF    | Remote Order Entry System                              | 0             | 0        | 0       |
| RMPJ    | Remote Order Entry System                              | 0             | 0        | 0       |
| PRS     | PAID                                                   | 0             | 0        | 0       |
| ES      | Police and Security                                    | 0             | 0        | 0       |
| EDR     | Event Driven Reporting                                 | 0             | 0        | 0       |
| PRCA    | Accounts Receivable                                    | 0             | 0        | 0       |
| PRY     | Accounts Receivable                                    | 0             | 0        | 0       |
| RC      | Accounts Receivable                                    | 0             | 0        | 0       |
| IB      | Integrated Billing                                     | 0             | 0        | 0       |
| PRQ     | Integrated Billing                                     | 0             | 0        | 0       |
| BPS     | E Claims Management Engine                             | 0             | 0        | 0       |
| FB      | Fee Basis                                              | 0             | 0        | 0       |
| ICD     | DRG Grouper                                            | 0             | 0        | 0       |
| IC      | DRG Grouper                                            | 0             | 0        | 0       |
| DGBT    | Beneficiary Travel                                     | 0             | 0        | 0       |
| PRPF    | Integrated Patient Fund                                | 0             | 0        | 0       |
| PRC     | IFCAP                                                  | 0             | 0        | 0       |
| PRX     | IFCAP                                                  | 0             | 0        | 0       |
| PRCN    | Equipment Turn-In Request                              | 0             | 0        | 0       |
| GEC     | Generic Code Sheet                                     | 0             | 0        | 0       |
| EC      | Event Capture                                          | 0             | 0        | 0       |
| KMPS    | SAGG Project                                           | 0             | 0        | 0       |
| A1B5    | SAGG Project                                           | 0             | 0        | 0       |
| KMPR    | Capacity Management - RUM                              | 0             | 0        | 0       |
| KMPD    | Capacity Management Tools                              | 0             | 0        | 0       |
| RG      | Clinical Information Resource Network                  | 0             | 0        | 0       |
| MRF     | Clinical Information Resource Network                  | 0             | 0        | 0       |
| MPIF    | Master Patient Index VistA                             | 0             | 0        | 0       |
| XOBE    | Electronic Signature                                   | 0             | 0        | 0       |
| LEX     | Lexicon Utility                                        | 0             | 0        | 0       |
| GMPT    | Lexicon Utility                                        | 0             | 0        | 0       |
| HDI     | Health Data and Informatics                            | 0             | 0        | 0       |
| ICPT    | CPT HCPCS Codes                                        | 0             | 0        | 0       |
| DGYA    | CPT HCPCS Codes                                        | 0             | 0        | 0       |
| RT      | Record Tracking                                        | 0             | 0        | 0       |
| XU      | Kernel                                                 | 0             | 0        | 0       |
| A4A7    | Kernel                                                 | 0             | 0        | 0       |
| USC     | Kernel                                                 | 0             | 0        | 0       |
| XG      | Kernel                                                 | 0             | 0        | 0       |
| XIP     | Kernel                                                 | 0             | 0        | 0       |
| XLF     | Kernel                                                 | 0             | 0        | 0       |
| XNOA    | Kernel                                                 | 0             | 0        | 0       |
| XPD     | Kernel                                                 | 0             | 0        | 0       |
| XQ      | Kernel                                                 | 0             | 0        | 0       |
| XVIR    | Kernel                                                 | 0             | 0        | 0       |
| ZI      | Kernel                                                 | 0             | 0        | 0       |
| ZOSF    | Kernel                                                 | 0             | 0        | 0       |
| ZOSV    | Kernel                                                 | 0             | 0        | 0       |
| ZT      | Kernel                                                 | 0             | 0        | 0       |
| ZU      | Kernel                                                 | 0             | 0        | 0       |
| %Z      | Kernel                                                 | 0             | 0        | 0       |
| XT      | Toolkit                                                | 0             | 0        | 0       |
| AWCM    | Toolkit                                                | 0             | 0        | 0       |
| XD      | Toolkit                                                | 0             | 0        | 0       |
| XIN     | Toolkit                                                | 0             | 0        | 0       |
| XPAR    | Toolkit                                                | 0             | 0        | 0       |
| XQAB    | Toolkit                                                | 0             | 0        | 0       |
| XUC     | Toolkit                                                | 0             | 0        | 0       |
| XUR     | Toolkit                                                | 0             | 0        | 0       |
| ZIN     | Toolkit                                                | 0             | 0        | 0       |
| ZTED    | Toolkit                                                | 0             | 0        | 0       |
| VEEM    | VPE Shell                                              | 0             | 0        | 0       |
| ZVEM    | VPE Shell                                              | 0             | 0        | 0       |
| VALM    | List Manager                                           | 0             | 0        | 0       |
| MXML    | M XML Parser                                           | 0             | 0        | 0       |
| FMDC    | FileMan Delphi Components                              | 0             | 0        | 0       |
| DI      | VA FileMan                                             | 0             | 0        | 0       |
| DD      | VA FileMan                                             | 0             | 0        | 0       |
| DM      | VA FileMan                                             | 0             | 0        | 0       |
| A1AE    | Patch Module                                           | 0             | 0        | 0       |
| FSC     | National Online Information Sharing                    | 0             | 0        | 0       |
| NVS     | National VistA Support                                 | 0             | 0        | 0       |
| XM      | MailMan                                                | 0             | 0        | 0       |
| NHIN    | National Health Information Network                    | 0             | 0        | 0       |
| HL      | Health Level Seven                                     | 0             | 0        | 0       |
| VDEF    | VDEF                                                   | 0             | 0        | 0       |
| VAQ     | Patient Data Exchange                                  | 0             | 0        | 0       |
| VPR     | Virtual Patient Record                                 | 0             | 0        | 0       |
| AFJX    | Network Health Exchange                                | 0             | 0        | 0       |
| XOBU    | Foundations                                            | 0             | 0        | 0       |
| XOBV    | VistALink                                              | 0             | 0        | 0       |
| XOBS    | VistALink Security                                     | 0             | 0        | 0       |
| XOBW    | Web Services Client                                    | 0             | 0        | 0       |
| XWB     | RPC Broker                                             | 0             | 0        | 0       |
| ECX     | DSS Extracts                                           | 0             | 0        | 0       |
| WII     | Wounded Injured and Ill Warriors                       | 0             | 0        | 0       |
| WEBV    | VistA Web                                              | 0             | 0        | 0       |
| QAC     | Patient Representative                                 | 0             | 0        | 0       |
| IVM     | Income Verification Match                              | 0             | 0        | 0       |
| DVB     | HINQ                                                   | 0             | 0        | 0       |
| SD      | Scheduling                                             | 0             | 0        | 0       |
| SC      | Scheduling                                             | 0             | 0        | 0       |
| EAS     | Enrollment Application System                          | 0             | 0        | 0       |
| DG      | Registration                                           | 0             | 0        | 0       |
| DGQE    | Registration                                           | 0             | 0        | 0       |
| DPT     | Registration                                           | 0             | 0        | 0       |
| VA      | Registration                                           | 0             | 0        | 0       |
| VIC     | Registration                                           | 0             | 0        | 0       |
| QAO     | Occurrence Screen                                      | 0             | 0        | 0       |
| IBQ     | Utilization Management Rollup                          | 0             | 0        | 0       |
| QAQ     | Quality Assurance Integration                          | 0             | 0        | 0       |
| QAP     | Survey Generator                                       | 0             | 0        | 0       |
| CRHD    | Shift Handoff Tool                                     | 0             | 0        | 0       |
| ECT     | Interim Management Support                             | 0             | 0        | 0       |
| OOPS    | Asists                                                 | 0             | 0        | 0       |
| ABSV    | Voluntary Timekeeping                                  | 0             | 0        | 0       |
| SIS     | Sea Island Systems Registration                        | 0             | 0        | 0       |
| QAN     | Incident Reporting                                     | 0             | 0        | 0       |
| LBR     | Library                                                | 0             | 0        | 0       |
| LBRS    | Library                                                | 0             | 0        | 0       |
| WV      | Womens Health                                          | 0             | 0        | 0       |
| ONC     | Oncology                                               | 0             | 0        | 0       |
| ROR     | Clinical Case Registries                               | 0             | 0        | 0       |
| IMR     | Clinical Case Registries                               | 0             | 0        | 0       |
| MMRS    | Methicillin Resistant Staph Aurerus Initiative Reports | 0             | 0        | 0       |
| GMR     | General Medical Record - Vitals                        | 0             | 0        | 0       |
| XUS     | Kernel                                                 | 0             | 0        | 0       |
| XUSRB   | Kernel                                                 | 0             | 0        | 0       |
| DDR     | VA FileMan                                             | 0             | 0        | 0       |
| VE      | Order Entry Results Reporting                          | 0             | 0        | 0       |

---

_This report is auto-generated by `scripts/build_parity_matrix.ts`. Do not edit manually._
