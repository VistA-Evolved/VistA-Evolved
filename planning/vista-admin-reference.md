# VistA Administrative Universe: Complete Reference for VistA Evolved

## The Big Picture: How the VA Actually Runs VistA

### There Is No Single Admin Dashboard

This is the critical thing to understand: VistA has **no unified admin GUI**. The VA's entire hospital configuration, user management, inventory, billing setup, ward/bed management, performance metrics — all of it — lives in **MUMPS/M routines accessed through roll-and-scroll terminal menus**. There are approximately 170+ packages in VistA, each with its own menu trees, FileMan files (the database tables), and security keys.

The VA's administrative workflow looks like this:

1. **Roll-and-Scroll Terminal (primary admin interface)**: System managers SSH/telnet into VistA and navigate text menus. This is where 90%+ of configuration happens. The entry point is `D ^ZU` (the VistA "front door"). From there, menu trees branch into every package.

2. **CPRS (Computerized Patient Record System)**: A Delphi/Windows desktop GUI — but this is almost entirely *clinical*, not administrative. Doctors and nurses use CPRS. Admins rarely touch it for configuration.

3. **FileMan (the database layer)**: Every piece of data in VistA lives in numbered FileMan files. File #200 is the NEW PERSON file (users), File #44 is HOSPITAL LOCATION (clinics), File #42 is WARD LOCATION, etc. Admins edit these directly through FileMan prompts or through the package-specific menu options that wrap FileMan.

4. **VistA System Monitor (VSM)**: A separate monitoring tool that collects system metrics — but it's for infrastructure health, not business intelligence.

5. **No BI/Analytics Dashboard exists**: The VA has no built-in business intelligence UI. Reports are run through roll-and-scroll menu options that print to screen or printer. For analytics, the VA extracts data to external systems (like the VA's Corporate Data Warehouse).

### What This Means for VistA Evolved

This is a **massive opportunity**. Building a modern web admin UI for VistA would be one of the most valuable things VistA Evolved can offer — because it literally doesn't exist today. Every clinic/hospital running VistA worldwide (VA, Indian Health Service, Jordan, Finland, etc.) does all admin through 1980s-era terminal menus. A modern admin panel would be transformative.

---

## The 12 Functional Domains of VistA Administration

Everything a clinic or hospital owner needs falls into these domains. Each domain maps to specific VistA packages, FileMan files, menu trees, and RPCs.

---

### DOMAIN 1: SYSTEM INFRASTRUCTURE & SECURITY

**What it covers**: User accounts, security keys, menu assignments, devices, printers, TaskMan (background jobs), system parameters, audit logs.

**VistA Packages**:
- **Kernel (XU)** — The operating system of VistA. User authentication, menu management, security keys, device handler, TaskMan
- **Toolkit (XT)** — Parameter management (XPAR), alerts (XQAB), electronic signature
- **VA FileMan (DI)** — The database engine itself; data dictionary management, file access security
- **MailMan (XM)** — Internal messaging system
- **RPC Broker (XWB)** — The bridge between GUI clients and VistA M code

**Key FileMan Files**:
- File #200 — NEW PERSON (the master user file — every user, their keys, menus, access/verify codes, electronic signature, provider info)
- File #19 — OPTION (every menu option in VistA)
- File #19.1 — SECURITY KEY (all security keys)
- File #3.5 — DEVICE (printers, terminals, network devices)
- File #8989.3 — KERNEL SYSTEM PARAMETERS (site-wide settings)
- File #8989.5 — PARAMETER DEFINITION
- File #14.5 — TASKMAN OPTION SCHEDULER
- File #.85 — LANGUAGE
- File #1.1 — AUDIT

**Key Menu Trees** (accessed from Systems Manager Menu):
- `EVE` — Systems Manager Menu (the top-level admin menu)
- `XUMAINT` — Menu Management (assign menus to users)
- `XUKEYALL` — Security Key Allocation
- `XUSER` — User Management
- `XUKERNEL` — Kernel Management Menu
- `XUTM` — TaskMan Management

**VDL Documentation**:
- Kernel 8.0 Systems Management Guide
- Kernel 8.0 Developer's Guide
- VA FileMan 22.2 Technical Manual
- VA FileMan 22.2 User Manual

---

### DOMAIN 2: FACILITY SETUP & ORGANIZATION

**What it covers**: Hospital identity, divisions, institution records, station numbers, treating specialties, service lines, stop codes, location types.

**VistA Packages**:
- **Registration (DG)** — Hospital identity, divisions, treating specialties
- **Kernel (XU)** — Site parameters, institution file

**Key FileMan Files**:
- File #4 — INSTITUTION (master list of VA facilities and external institutions)
- File #40.8 — MEDICAL CENTER DIVISION (divisions within a hospital)
- File #389.9 — STATION NUMBER (TIME SENSITIVE)
- File #42.4 — SPECIALTY (treating specialties)
- File #45.7 — FACILITY TREATING SPECIALTY (maps specialties to facility)
- File #40.7 — STOP CODE (workload classification codes)
- File #49 — SERVICE/SECTION (organizational units like Medicine, Surgery, etc.)
- File #44 — HOSPITAL LOCATION (clinics, wards, OR, file rooms — the master location file)

**Key Menu Trees**:
- `DG REGISTER` — Registration Menu
- `DGREG` — MAS Manager Menu (Medical Administration Service)
- `DG SITE PARAMETER EDIT` — Site Parameter Edit

**VDL Documentation**:
- Registration (PIMS) Technical Manual
- ADT (Admission Discharge Transfer) Technical Manual

---

### DOMAIN 3: CLINIC SETUP & SCHEDULING

**What it covers**: Creating clinics, appointment types, scheduling templates/patterns, availability, providers, stop codes, clinic groups, holiday scheduling, cancellation rules, wait times.

**VistA Packages**:
- **Scheduling (SD)** — Clinic creation, appointment management, wait list, recall, scheduling patterns
- **PCE Patient Care Encounter (PX)** — Encounter forms tied to clinics

**Key FileMan Files**:
- File #44 — HOSPITAL LOCATION (the clinic definition file — name, service, stop code, providers, appointment length, patterns, etc.)
- File #44.1 — HOSPITAL LOCATION EXTRA (overflow fields)
- File #44.2 — CLINIC STOP (stop code assignments)
- File #409.1 — APPOINTMENT TYPE
- File #409.2 — SCHEDULING REASON
- File #409.832 — CLINIC GROUP
- File #409.845 — VS GUI SCHEDULING RESOURCE
- File #2 — PATIENT (appointment sub-files)

**Key Menu Trees**:
- `SDAM APPT MGT` — Scheduling Menu
- `SD SUPERVISOR` — Supervisor Menu (clinic setup lives here)
- `SD SET UP A CLINIC` — Set up a Clinic

**How the VA sets up a clinic** (roll-and-scroll workflow):
Core Applications → Scheduling Manager's Menu → Supervisor Menu → Set up a Clinic. You are then walked through ~40 fields: name, abbreviation, service, stop code, appointment type, providers, appointment length, display increments, availability patterns, no-show limits, future booking limits, letters, overbook limits, etc.

**VDL Documentation**:
- Scheduling V. 5.3 Technical Manual
- Scheduling V. 5.3 User Manual
- VistA Scheduling Enhancements (VSE) Technical Manual

---

### DOMAIN 4: INPATIENT — WARDS, BEDS, ADT

**What it covers**: Ward setup, bed configuration, bed control, admissions, discharges, transfers, census, treating specialty assignment, bed availability, room/bed numbers.

**VistA Packages**:
- **Registration (DG)** — ADT (Admission/Discharge/Transfer) module
- **Bed Management Solutions (WEBB)** — Newer bed management

**Key FileMan Files**:
- File #42 — WARD LOCATION (ward definitions — beds, treating specialty, service, teams)
- File #42.4 — SPECIALTY
- File #405 — PATIENT MOVEMENT (every admission, discharge, transfer event)
- File #405.1 — FACILITY MOVEMENT TYPE
- File #43 — MAS PARAMETERS (Medical Administration Service site parameters)
- File #391 — BED CONTROL MOVEMENT
- File #405.4 — BED STATUS

**Key Menu Trees**:
- `DG ADT` — ADT Menu
- `DGPMADM` — Admit a Patient
- `DGPMDIS` — Discharge a Patient
- `DGPMTR` — Transfer a Patient
- `DG BED CONTROL` — Bed Control Menu
- `DGWARD` — Ward Definition Menu

**Important RPCs for ADT** (these are what a GUI calls):
- `VBECS ADT EVENTS` — ADT event notifications
- `DG CHK PAT/DIV MEANS TEST` — Check patient means test
- Various `DG` namespace RPCs for movement

**VDL Documentation**:
- ADT/Registration Technical Manual
- PIMS (Patient Information Management System) Technical Manual and User Manual

---

### DOMAIN 5: PHARMACY SETUP

**What it covers**: Drug file management, formulary, drug interactions, pharmacy locations, dispensing windows, order checks, outpatient/inpatient pharmacy configuration, CMOP, controlled substances.

**VistA Packages**:
- **Outpatient Pharmacy (PSO)** — Outpatient dispensing
- **Inpatient Medications (PSJ)** — Inpatient dispensing
- **Pharmacy Data Management (PSS)** — Core drug data
- **National Drug File (PSN)** — National formulary
- **Drug Accountability (PSA)** — Drug inventory
- **Controlled Substances (PSD)** — DEA-regulated drugs
- **CMOP (PSX)** — Consolidated Mail Outpatient Pharmacy
- **Barcode Medication Administration (PSB/ALPB)** — BCMA

**Key FileMan Files**:
- File #50 — DRUG (local drug file — the formulary)
- File #50.6 — VA GENERIC
- File #50.67 — NDC/UPN (national drug codes)
- File #50.68 — VA PRODUCT
- File #51 — MEDICATION ROUTES
- File #51.1 — MED ADMINISTRATION SCHEDULE
- File #52 — PRESCRIPTION (outpatient prescriptions)
- File #53.1 — NON-VERIFIED ORDERS
- File #55 — PHARMACY PATIENT
- File #58.1 — DRUG ACCOUNTABILITY TRANSACTION
- File #59 — OUTPATIENT SITE

**VDL Documentation**:
- Outpatient Pharmacy V. 7.0 Technical Manual
- Inpatient Medications V. 5.0 Technical Manual
- Pharmacy Data Management V. 1.0 Technical Manual
- National Drug File V. 4.0 Technical Manual

---

### DOMAIN 6: LABORATORY SETUP

**What it covers**: Lab tests, panels, collection sites, accession areas, work areas, instruments, result entry, reference ranges, specimen types, lab ordering, reporting.

**VistA Packages**:
- **Lab Service (LR)** — The entire lab system
- **Automated Lab Instruments (LA)** — Instrument interfaces

**Key FileMan Files**:
- File #60 — LABORATORY TEST (master test definitions)
- File #61 — TOPOGRAPHY FIELD
- File #62 — COLLECTION SAMPLE
- File #62.05 — URGENCY (lab urgency codes)
- File #63 — LAB DATA (patient lab results)
- File #64 — AUTO INSTRUMENT
- File #68 — ACCESSION (lab accession tracking)
- File #69 — LAB ORDER ENTRY
- File #69.9 — LABORATORY SITE (lab site parameters)

**VDL Documentation**:
- Laboratory V. 5.2 Technical Manual
- Laboratory V. 5.2 Manager's User Manual (this is the admin manual)

---

### DOMAIN 7: RADIOLOGY SETUP

**What it covers**: Imaging types, exam setup, procedure definitions, rad locations, equipment, report templates, radiologist assignment, contrast media.

**VistA Packages**:
- **Radiology Nuclear Medicine (RA)** — All radiology functions
- **Imaging (MAG)** — VistA Imaging (PACS-like image storage and viewing)

**Key FileMan Files**:
- File #71 — RAD/NUC MED PROCEDURES (procedure definitions)
- File #72 — RAD/NUC MED ORDERS
- File #73 — RAD/NUC MED EXAMINATIONS
- File #74 — RAD/NUC MED REPORTS
- File #79 — RAD/NUC MED DIVISION
- File #79.1 — RAD/NUC MED CLASSIFICATION

**VDL Documentation**:
- Radiology/Nuclear Medicine V. 5.0 Technical Manual
- Radiology/Nuclear Medicine V. 5.0 User Manual
- VistA Imaging System Technical Manual

---

### DOMAIN 8: BILLING, INSURANCE & REVENUE CYCLE

**What it covers**: Insurance verification, claims management, rate setting, fee schedules, means testing, co-pays, third-party billing, accounts receivable, charge capture, billing parameters.

**VistA Packages**:
- **Integrated Billing (IB)** — The billing engine (charges, claims, insurance, fee schedules)
- **Accounts Receivable (PRCA/PRY/RC)** — AR management, collections, statements
- **Fee Basis (FB)** — Fee-for-service care
- **Income Verification Match (IVM)** — Income verification
- **E Claims Management Engine (BPS)** — Electronic claims
- **Automated Information Collection System (IBD)** — Encounter data capture

**Key FileMan Files**:
- File #350 — IB ACTION (billing actions/charges)
- File #350.1 — IB ACTION TYPE
- File #350.9 — IB SITE PARAMETERS
- File #355.3 — IB INSURANCE COMPANY
- File #355.33 — GROUP INSURANCE PLAN
- File #36 — INSURANCE COMPANY (patient insurance)
- File #360 — ACCOUNTS RECEIVABLE (AR records)
- File #399 — BILL/CLAIMS (the master claims file)
- File #340 — RATE TYPE
- File #162 — FEE BASIS PATIENT

**Key Menu Trees**:
- `IB MANAGER MENU` — Integrated Billing Master Menu
- `IBCN INSURANCE MGMT MENU` — Patient Insurance Menu
- `PRCA MENU` — AR Main Menu
- `IB SITE PARAMETERS` — Billing site parameters setup

**VDL Documentation**:
- Integrated Billing V. 2.0 Technical Manual
- Integrated Billing V. 2.0 User Manual
- Accounts Receivable V. 4.5 Technical Manual

---

### DOMAIN 9: INVENTORY & SUPPLY CHAIN (IFCAP)

**What it covers**: Item master, inventory locations, stock levels, purchase orders, receiving, distribution, equipment tracking, warehouse management.

**VistA Packages**:
- **IFCAP (PRC/PRX)** — Inventory Fund Control Accounting and Purchasing (the main supply chain system)
- **Equipment Turn-In Request (PRCN)** — Equipment lifecycle
- **Drug Accountability (PSA)** — Pharmacy inventory specifically
- **Engineering (EN)** — Facility equipment, work orders, space management

**Key FileMan Files**:
- File #441 — ITEM MASTER
- File #442 — PROCUREMENT & ACCOUNTING TRANSACTIONS
- File #443 — PURCHASE ORDER
- File #445 — VENDOR
- File #446 — INVENTORY POINT
- File #410 — INVENTORY (on-hand inventory)
- File #6914 — ENGINEERING WORK ORDER
- File #6928 — EQUIPMENT INV (equipment inventory)

**VDL Documentation**:
- IFCAP V. 5.1 Technical Manual
- Engineering V. 7.0 Technical Manual

---

### DOMAIN 10: EMPLOYEE & WORKFORCE MANAGEMENT

**What it covers**: Personnel records, timekeeping, position management, pay, credentialing, privileges, employee health, training.

**VistA Packages**:
- **PAID (PRS)** — Personnel & Accounting Integrated Data (timekeeping, payroll)
- **Credentials Tracking (QAR)** — Provider credentialing and privileging
- **Nursing Service (NUR)** — Nursing staffing and scheduling
- **Occupational Health Record-Keeping System (OHRS)** — Employee health
- **EEO Complaint Tracking (EEO)** — Equal employment tracking
- **Voluntary Service System (VSS)** — Volunteer management

**Key FileMan Files**:
- File #200 — NEW PERSON (again — this is the master user/employee file)
- File #450 — PAID EMPLOYEE
- File #451 — PAID PAY PERIOD
- File #8932.1 — PERSON CLASS (provider taxonomy)
- File #150 — CREDENTIALS (credentialing records)
- File #210 — NURSING SITE PARAMETERS

**VDL Documentation**:
- PAID V. 4.0 Technical Manual
- Credentials Tracking User Manual
- Nursing Service Technical Manual

---

### DOMAIN 11: QUALITY, COMPLIANCE & REPORTING

**What it covers**: Incident reporting, quality assurance, occurrence screening, patient safety, risk management, utilization review, clinical reminders compliance, national reporting extracts.

**VistA Packages**:
- **Quality Assurance Integration (QAQ)** — QA site parameters
- **Incident Reporting (QAN)** — Incident tracking
- **Occurrence Screen (QAO)** — Automated screening
- **Clinical Monitoring System (QAM)** — Clinical quality monitoring
- **Clinical Reminders (PXRM)** — Preventive care reminders and compliance
- **DSS Extracts (ECX)** — Decision Support System data extracts
- **Event Capture (EC)** — Workload capture
- **Utilization Review (PRMQ)** — Utilization management

**Key FileMan Files**:
- File #740 — QA SITE PARAMETERS
- File #741 — QA OCCURRENCE
- File #810 — REMINDER DEFINITION
- File #811.9 — REMINDER SITE PARAMETERS
- File #727.81 — DSS DEPARTMENT
- File #749 — EVENT CAPTURE PROCEDURE

**VDL Documentation**:
- Quality Management Integration module documentation (multiple manuals)
- Clinical Reminders Technical Manual
- DSS Extracts Technical Manual

---

### DOMAIN 12: CLINICAL APPLICATION SETUP

**What it covers**: Order entry configuration, order sets, quick orders, consult setup, health summary setup, TIU document definitions, clinical procedure setup, surgery setup, dietetics setup, social work, mental health screening setup.

**VistA Packages**:
- **Order Entry Results Reporting (OR/OE/RR)** — CPRS order entry backend
- **Consult Request Tracking (GMRC)** — Consult service setup
- **Text Integration Utility (TIU)** — Document types, templates, titles
- **Health Summary (GMTS)** — Health summary types
- **Surgery (SR)** — Surgical suite setup
- **Dietetics (FH)** — Nutrition/food service setup
- **Mental Health (YS)** — Mental health instruments
- **Clinical Procedures (MD)** — Procedure types
- **Problem List (GMPL)** — Problem list management
- **Vitals (GMRV/GMV)** — Vital signs setup

**Key FileMan Files**:
- File #100 — ORDER (the orders file)
- File #100.98 — ORDER PARAMETERS
- File #101 — PROTOCOL (order protocols and actions)
- File #101.41 — ORDER DIALOG
- File #101.44 — ORDER QUICK VIEW
- File #123 — REQUEST/CONSULTATION (consults)
- File #123.5 — REQUEST SERVICES
- File #8925 — TIU DOCUMENT (clinical documents)
- File #8925.1 — TIU DOCUMENT DEFINITION (document types/classes)
- File #8926 — TIU TEMPLATE
- File #130 — SURGERY (surgical cases)
- File #136.5 — SURGICAL SITE PARAMETERS
- File #115 — HEALTH SUMMARY TYPE
- File #120.51 — GMRV VITAL QUALIFIER

**VDL Documentation**:
- CPRS Technical Manual
- CPRS Configuration (Clin Coord) User Manual (critical — this is the clinical coordinator's setup guide)
- Consult/Request Tracking V. 3.0 Technical Manual
- TIU Technical Manual
- Surgery Technical Manual

---

## The Complete VistA Package List (170+ Packages)

These are ALL the VistA packages as cataloged in the OSEHRA/WorldVistA source tree. Each package has its own namespace, FileMan files, routines, and documentation.

### Infrastructure & Platform
- Kernel (XU) — Authentication, menus, security, TaskMan
- VA FileMan (DI/DD/DM) — Database engine
- MailMan (XM) — Messaging
- Toolkit (XT) — Parameters, alerts, electronic signature
- RPC Broker (XWB) — GUI-to-M bridge
- VistALink (XOBV) — Java-to-M bridge
- Health Level Seven (HL) — HL7 messaging engine
- List Manager (VALM) — Terminal list display
- M XML Parser (MXML) — XML parsing
- Web Services Client (XOBW) — SOAP/REST client
- Capacity Management (KMP) — System performance monitoring

### Patient Administration
- Registration (DG) — Patient registration, ADT, demographics, eligibility, means test
- Scheduling (SD/SC) — Appointments, clinic management, wait list
- Enrollment Application System (EAS) — Enrollment processing
- Beneficiary Travel (DGBT) — Patient travel reimbursement
- Incomplete Records Tracking (DGJ) — Deficiency tracking
- Record Tracking (RT) — Medical record location tracking
- Master Patient Index VistA (MPIF) — Cross-system patient matching
- Income Verification Match (IVM) — Financial screening

### Clinical
- Order Entry Results Reporting (OR) — CPRS order entry
- Consult Request Tracking (GMRC) — Consults/referrals
- Text Integration Utility (TIU) — Clinical notes/documents
- Progress Notes (GMN) — Progress notes
- Problem List (GMPL) — Patient problems
- Clinical Reminders (PXRM) — Preventive care
- PCE Patient Care Encounter (PX) — Encounter documentation
- Health Summary (GMTS) — Summary views
- Vitals (GMRV/GMV) — Vital signs
- Clinical Procedures (MD) — Procedures
- Adverse Reaction Tracking (GMRA) — Allergies
- Surgery (SR) — Surgical scheduling and documentation
- Medicine (MC) — Cardiology, pulmonary, etc.
- Emergency Department Integration Software (EDP) — ED tracking
- Womens Health (WV) — Women's health tracking
- Mental Health (YS) — Assessments, instruments
- Social Work (SOW) — Social work tracking
- Spinal Cord Dysfunction (SPN) — SCI tracking
- Oncology (ONC) — Cancer registry
- Dental (DENT) — Dental records

### Pharmacy
- Outpatient Pharmacy (PSO) — Outpatient dispensing
- Inpatient Medications (PSJ/PSG) — Inpatient dispensing
- Pharmacy Data Management (PSS) — Drug data management
- National Drug File (PSN) — National formulary
- Drug Accountability (PSA) — Drug inventory
- Controlled Substances (PSD) — CS tracking
- CMOP (PSX) — Mail-order pharmacy
- Barcode Medication Administration (PSB) — BCMA
- Auto Replenishment Ward Stock (PSGW) — Ward stock management
- Pharmacy Benefits Management (PSU) — PBM reporting
- E Claims Management Engine (BPS) — eClaims
- Medication Order Check Healthcare Application (PREM) — Order checks

### Laboratory
- Lab Service (LR/LS) — Complete lab system
- Automated Lab Instruments (LA) — Instrument interfaces
- National Laboratory Test (NLT) — National test codes

### Radiology & Imaging
- Radiology Nuclear Medicine (RA) — Rad/nuc med
- Imaging (MAG) — VistA Imaging/PACS

### Billing & Finance
- Integrated Billing (IB) — Claims, charges, insurance
- Accounts Receivable (PRCA/PRY/RC) — AR, collections
- Fee Basis (FB) — Fee-for-service
- Fee Basis Claims System (DSIF) — Fee claims processing
- Integrated Patient Fund (PRPF) — Patient funds
- Utilization Management Rollup (IBQ) — UM reporting

### Supply Chain & Engineering
- IFCAP (PRC/PRX) — Procurement and inventory
- Equipment Turn-In Request (PRCN) — Equipment disposal
- Engineering (EN) — Facility management, work orders, equipment
- Prosthetics (RMPR) — Prosthetic devices

### Workforce
- PAID (PRS) — Timekeeping, payroll
- Credentials Tracking (QAR) — Provider credentialing
- Nursing Service (NUR) — Nursing management
- Police and Security (ES) — Security operations
- Voluntary Service System (VSS) — Volunteer tracking

### Quality & Compliance
- Quality Assurance Integration (QAQ) — QA framework
- Incident Reporting (QAN) — Incident tracking
- Occurrence Screen (QAO) — Automated screening
- Clinical Monitoring System (QAM) — Quality monitoring
- Utilization Review (PRMQ) — UM reviews

### Reporting & Analytics
- DSS Extracts (ECX) — Decision support data
- Event Capture (EC) — Workload tracking
- Clinical Case Registries (ROR) — Disease registries
- Health Data and Informatics (HDI) — Data standards

### Interoperability
- Health Level Seven (HL) — HL7 messaging
- Clinical Information Resource Network (RG) — CIRN data sharing
- Direct Secure Messaging (WEBD) — Direct messaging
- VA-DOD Sharing (ID) — DoD interoperability
- National Health Information Network (NHIN) — Nationwide exchange
- Virtual Patient Record (VPR) — Patient data API

### Coding & Terminology
- DRG Grouper (ICD) — ICD/DRG codes
- CPT/HCPCS Codes (ICPT) — Procedure codes
- Lexicon Utility (LEX) — Clinical terminology
- Enterprise Terminology Services (ETS) — Terminology management

### Miscellaneous
- Dietetics (FH) — Food service, nutrition
- Hospital Based Home Care (HBH) — Home health
- Patient Representative (QAC) — Patient complaints
- Release Of Information (DSIR) — ROI tracking
- Survey Generator (QAP) — Patient surveys
- Asists (OOPS) — Accident/injury tracking
- Functional Independence (RMIM) — Functional measures
- Library (LBR) — Medical library management

---

## Documentation: Where to Find Everything

### Primary Documentation Sources

**1. VA Software Document Library (VDL)** — https://www.va.gov/vdl/
- This is THE canonical source. Contains Technical Manuals, User Manuals, Security Guides, and Installation Guides for every VistA package.
- Each package has up to 4 document types: Technical Manual (TM), User Manual (UM), Security Guide (SG), Installation Guide (IG).
- Documents are PDFs, typically 50-500 pages each.

**2. VistApedia** — https://vistapedia.com/ (also https://vistapedia.net/)
- Community wiki with practical howto guides, menu maps, configuration walkthroughs.
- The VistA Menu Map page is especially valuable: https://vistapedia.com/index.php/VistA_Menu_Commands_/_VistA_Menu_Map

**3. WorldVistA ViViaN** — https://vivian.worldvista.org/dox/
- Visual cross-reference of all VistA code: packages, routines, globals, FileMan files, dependencies.
- Package list with namespace mapping: https://vivian.worldvista.org/dox/Packages_Namespace_Mapping.html
- FileMan Files List: https://vivian.worldvista.org/dox/filemanfiles.html

**4. WorldVistA GitHub** — https://github.com/WorldVistA/
- VistA-M source code repository
- Packages.csv (complete package/namespace/file mapping)
- VEHU demo database (what your worldvista/vehu Docker image is based on)

**5. Hardhats Community** — https://www.hardhats.org/
- Installation guides, configuration walkthroughs
- The most practical "how to actually set up VistA" documentation

**6. OSEHRA Archive (via Logica)** — https://www.logicahealth.org/osehra-archive/
- Historical OSEHRA documentation archive

### The Most Important Manuals for Admin UI Development

These are the documents you'd need to feed to an AI coding tool, ranked by priority:

**Tier 1 — Must Have (core admin)**:
1. Kernel 8.0 Systems Management Guide — User management, security, menus, site parameters
2. VA FileMan 22.2 Technical Manual — Understanding the database layer
3. Registration (PIMS) Technical Manual — Patient registration, ADT, facility setup
4. Scheduling Technical Manual — Clinic setup, appointment configuration
5. Integrated Billing Technical Manual — Billing setup, insurance, claims
6. CPRS Configuration (Clin Coord) User Manual — Clinical application setup

**Tier 2 — Important (department setup)**:
7. Outpatient Pharmacy Technical Manual — Pharmacy configuration
8. Inpatient Medications Technical Manual — Inpatient pharmacy setup
9. Laboratory Manager's User Manual — Lab setup
10. Radiology/Nuclear Medicine Technical Manual — Radiology setup
11. IFCAP Technical Manual — Inventory/procurement
12. Engineering Technical Manual — Equipment/facility management

**Tier 3 — Operational (reporting/workforce)**:
13. PAID Technical Manual — Timekeeping
14. DSS Extracts Technical Manual — Reporting data
15. Accounts Receivable Technical Manual — Financial reporting
16. Clinical Reminders Technical Manual — Quality metrics

---

## Key FileMan Files Reference (The "Tables" of VistA)

These are the most important FileMan files for administrative functions. FileMan files are VistA's equivalent of database tables.

### System Setup Files
| File # | Name | Purpose |
|--------|------|---------|
| 4 | INSTITUTION | All facilities/hospitals |
| 40.8 | MEDICAL CENTER DIVISION | Divisions within facility |
| 389.9 | STATION NUMBER | Station number assignment |
| 8989.3 | KERNEL SYSTEM PARAMETERS | System-wide settings |
| 8989.5 | PARAMETER DEFINITION | Parameter framework |
| 3.5 | DEVICE | Printers, terminals |
| 19 | OPTION | All menu options |
| 19.1 | SECURITY KEY | Security keys |

### People Files
| File # | Name | Purpose |
|--------|------|---------|
| 200 | NEW PERSON | Users/staff (THE master user table) |
| 2 | PATIENT | Patient demographics (THE master patient table) |
| 450 | PAID EMPLOYEE | Employee payroll records |
| 8932.1 | PERSON CLASS | Provider taxonomy (NPI-related) |

### Location Files
| File # | Name | Purpose |
|--------|------|---------|
| 44 | HOSPITAL LOCATION | Clinics, OR, file rooms, etc. |
| 42 | WARD LOCATION | Inpatient wards |
| 40.7 | STOP CODE | DSS workload identifiers |
| 42.4 | SPECIALTY | Treating specialties |
| 49 | SERVICE/SECTION | Organizational units |

### Clinical Setup Files
| File # | Name | Purpose |
|--------|------|---------|
| 50 | DRUG | Local formulary |
| 60 | LABORATORY TEST | Lab test definitions |
| 71 | RAD/NUC MED PROCEDURES | Radiology procedures |
| 101 | PROTOCOL | Order protocols |
| 101.41 | ORDER DIALOG | Order entry dialogs |
| 123.5 | REQUEST SERVICES | Consult services |
| 8925.1 | TIU DOCUMENT DEFINITION | Document types |
| 100.98 | ORDER PARAMETERS | Order entry config |
| 130 | SURGERY | Surgical cases |

### Financial Files
| File # | Name | Purpose |
|--------|------|---------|
| 350 | IB ACTION | Billing charges |
| 350.9 | IB SITE PARAMETERS | Billing config |
| 355.3 | IB INSURANCE COMPANY | Insurance companies |
| 399 | BILL/CLAIMS | Claims file |
| 360 | ACCOUNTS RECEIVABLE | AR records |
| 36 | INSURANCE COMPANY | Insurance data |

### Inventory Files
| File # | Name | Purpose |
|--------|------|---------|
| 441 | ITEM MASTER | Supply items |
| 443 | PURCHASE ORDER | POs |
| 445 | VENDOR | Vendors/suppliers |
| 446 | INVENTORY POINT | Inventory locations |

---

## Strategy: How to Feed This to an AI Coding Tool

### The Challenge

VistA has ~170 packages × ~4 manuals each = ~680 PDF documents, totaling probably 50,000+ pages. No AI tool can ingest all of this at once.

### Recommended Approach

**Phase 1: Build the RPC Catalog**
The key insight is that a modern admin UI doesn't read FileMan files directly — it calls VistA through RPCs (Remote Procedure Calls) via the RPC Broker. Every GUI action maps to an RPC.

1. Extract the complete RPC list from your VEHU Docker instance:
   - File #8994 (REMOTE PROCEDURE) contains every registered RPC
   - Run: `D LISTALL^XWBFM` or query File #8994 through FileMan
   - This gives you the complete API surface of VistA

2. For each admin domain, identify which RPCs already exist and which FileMan operations would need new RPCs written.

**Phase 2: Domain-by-Domain Documentation Ingestion**
For each of the 12 domains above:

1. Download the relevant Technical Manual PDFs from https://www.va.gov/vdl/
2. Feed the specific manual to Claude/Cursor with a focused prompt:
   - "Read this VistA [Package Name] Technical Manual. Extract: (a) all FileMan files and their fields, (b) all RPCs, (c) all menu options, (d) all security keys, (e) all site parameters. Output as structured JSON."

3. Use the ViViaN cross-reference to verify:
   - Package page (e.g., https://vivian.worldvista.org/dox/Package_Scheduling.html) shows all files, routines, globals for that package

**Phase 3: Live VistA Introspection**
Your VEHU Docker instance is a goldmine. You can programmatically extract:

```
# Connect to VistA via the broker and run these FileMan queries:

# List all FileMan files:
D P^DI → Option 1 (File) → List File Attributes

# List all RPCs:
S X="" F  S X=$O(^XWB(8994,"B",X)) Q:X=""  W !,X

# List all menu options:
S X="" F  S X=$O(^DIC(19,"B",X)) Q:X=""  W !,X

# List all security keys:
S X="" F  S X=$O(^DIC(19.1,"B",X)) Q:X=""  W !,X

# List all parameters:
S X="" F  S X=$O(^XTV(8989.51,"B",X)) Q:X=""  W !,X
```

**Phase 4: Build the Admin Panel**
For each domain, the admin UI needs:
- **Setup/Configuration screens** — Map to FileMan file edit operations (via RPCs)
- **List/Search views** — Map to FileMan lookups (via RPCs)
- **Reports/Dashboards** — Map to existing VistA report options or custom queries
- **User/Security management** — Map to Kernel RPCs

### What to Give the AI Coder

For each module you want to build, give the AI:

1. **This document** — for overall architecture understanding
2. **The specific VDL Technical Manual PDF** — for that domain
3. **The RPC list for that namespace** — extracted from your VEHU instance
4. **The FileMan data dictionary for relevant files** — extracted from VEHU
5. **The ViViaN cross-reference page** — for dependency mapping
6. **Sample roll-and-scroll workflows** — screenshots or transcripts of the menu-driven process you're replacing with a GUI

### Estimated Scope

A complete hospital admin panel covering all 12 domains would include roughly:

- ~150+ configuration screens
- ~80+ list/search views
- ~50+ report views
- ~30+ dashboard widgets
- ~200+ RPCs to implement or wire up

This is a massive project, but it's also VistA Evolved's biggest differentiator. No one else has built this.

---

## Quick Reference: VDL URLs for Key Package Documentation

All documentation accessible at: **https://www.va.gov/vdl/**

Navigate to the package name and download the Technical Manual (TM) and User Manual (UM).

Key packages and their VDL search terms:
- Kernel → "Kernel"
- FileMan → "VA FileMan"  
- Registration → "Registration" or "PIMS"
- Scheduling → "Scheduling"
- Integrated Billing → "Integrated Billing"
- Outpatient Pharmacy → "Outpatient Pharmacy"
- Inpatient Medications → "Inpatient Medications"
- Laboratory → "Laboratory"
- Radiology → "Radiology Nuclear Medicine"
- IFCAP → "IFCAP"
- PAID → "PAID"
- Surgery → "Surgery"
- Order Entry → "CPRS" or "Order Entry Results Reporting"
- Text Integration Utility → "Text Integration Utility"
- Clinical Reminders → "Clinical Reminders"
- Accounts Receivable → "Accounts Receivable"
- Engineering → "Engineering"
- Nursing → "Nursing Service"

---

*Document generated for VistA Evolved development reference. Source data from VA VDL, WorldVistA ViViaN, VistApedia, and OSEHRA archives.*
