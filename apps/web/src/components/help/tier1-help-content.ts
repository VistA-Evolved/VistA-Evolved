/**
 * Help content for all 15 Tier 1 VistA packages.
 * Registers help topics and guided tours at import time.
 *
 * Sources: VA VDL Technical Manuals, FileMan Data Dictionary,
 * Roll-and-Scroll prompt-to-field mappings from data/vista/admin-specs/
 */

import { registerHelpTopic, registerGuidedTour } from './ContextualHelp';

// ============================================================
// Kernel (XU) — Auth, Users, Security, Menus
// ============================================================

registerHelpTopic({
  id: 'xu-sign-on',
  title: 'VistA Sign-On',
  summary: 'VistA uses Access Code + Verify Code for authentication. The RPC Broker sends these encrypted via the XUS AV CODE RPC. In the modern UI, this is handled by the login form.',
  rsCommand: 'D ^ZU',
  menuPath: 'EVE > System Management',
  fileNumber: 200,
  category: 'workflow',
});

registerHelpTopic({
  id: 'xu-user-file',
  title: 'New Person File (#200)',
  summary: 'The central user record in VistA. Contains name, access/verify codes, security keys, menu assignments, electronic signature, service/section, and all user configuration. Over 200 fields.',
  fileNumber: 200,
  category: 'concept',
});

registerHelpTopic({
  id: 'xu-security-keys',
  title: 'Security Keys',
  summary: 'VistA security keys (File #19.1) control access to menu options and RPCs. Keys are allocated to users via the KEY ALLOCATE option. Common keys: PROVIDER, ORES (order entry), ORELSE (release orders).',
  rsCommand: 'KEY ALLOCATE',
  menuPath: 'EVE > User Management > Key Allocation',
  fileNumber: 19.1,
  category: 'concept',
});

registerHelpTopic({
  id: 'xu-menu-system',
  title: 'Menu System (File #19)',
  summary: 'VistA menus are stored in File #19 (OPTION). Each menu option has a type (action, menu, run routine, edit, print, inquire), associated routine, and required security keys. The menu tree defines all navigation.',
  fileNumber: 19,
  category: 'concept',
});

registerGuidedTour({
  id: 'tour-xu-login',
  name: 'Logging into VistA',
  module: 'xu',
  steps: [
    { target: '[data-tour="login-form"]', title: 'Enter Credentials', content: 'Enter your Access Code and Verify Code. These map to fields in the New Person File (#200).', rsEquivalent: 'ACCESS CODE: ___  VERIFY CODE: ___', placement: 'bottom' },
    { target: '[data-tour="login-submit"]', title: 'Authenticate', content: 'The system calls XUS AV CODE to authenticate you against VistA. If successful, you receive a session token.', rsEquivalent: 'Good morning PROVIDER,CLYDE', placement: 'top' },
    { target: '[data-tour="patient-select"]', title: 'Select a Patient', content: 'After login, select a patient to view their chart. This calls ORWPT LIST ALL to search.', rsEquivalent: 'Select PATIENT NAME:', placement: 'bottom' },
  ],
});

// ============================================================
// FileMan (DI) — Data Dictionary, Forms, Reports
// ============================================================

registerHelpTopic({
  id: 'di-data-dictionary',
  title: 'FileMan Data Dictionary',
  summary: 'FileMan is VistA\'s database engine. Every piece of data is stored in FileMan files with fields defined in ^DD. Field types include free text, numeric, date, pointer, set of codes, word processing, and computed.',
  rsCommand: 'D ^DI',
  category: 'concept',
});

registerHelpTopic({
  id: 'di-field-types',
  title: 'FileMan Field Types',
  summary: 'Free Text (F), Numeric (N), Date (D), Pointer (P), Set of Codes (S), Word Processing (W), Computed (C), Multiple (M), Variable Pointer (V). Each type has specific validation rules enforced by FileMan.',
  category: 'concept',
});

registerHelpTopic({
  id: 'di-search',
  title: 'FileMan Search/Lookup',
  summary: 'FileMan lookup uses ^DIC for finding entries. In R&S, typing part of a name at a SELECT prompt triggers the lookup. The API equivalent is FIND^DIC() which returns matching entries.',
  rsCommand: 'SELECT PATIENT NAME: SMITH',
  category: 'workflow',
});

// ============================================================
// Registration (DG) — Patient Demographics
// ============================================================

registerHelpTopic({
  id: 'dg-patient-file',
  title: 'Patient File (#2)',
  summary: 'The core patient record with 594+ fields including name, SSN, DOB, address, eligibility, insurance, next of kin, emergency contacts, and service-connected disability information.',
  fileNumber: 2,
  category: 'concept',
});

registerHelpTopic({
  id: 'dg-patient-search',
  title: 'Patient Search',
  summary: 'Search patients by name (last,first), last 4 of SSN, or full SSN. Uses the "B" cross-reference on File #2. The RPC ORWPT LIST ALL returns matching patients.',
  rsCommand: 'Select PATIENT NAME:',
  menuPath: 'ADT > Registration',
  fileNumber: 2,
  category: 'workflow',
});

registerHelpTopic({
  id: 'dg-eligibility',
  title: 'Patient Eligibility',
  summary: 'Eligibility status determines what care a veteran can receive. Stored in File #2 fields: ELIGIBILITY CODE, SERVICE CONNECTED%, PRIMARY ELIGIBILITY CODE. Critical for billing.',
  fileNumber: 2,
  fieldNumber: 0.361,
  category: 'field',
});

registerGuidedTour({
  id: 'tour-dg-registration',
  name: 'Patient Registration Workflow',
  module: 'dg',
  steps: [
    { target: '[data-tour="patient-search"]', title: 'Search for Patient', content: 'Type at least 2 characters of the patient\'s last name. The system searches File #2 via ORWPT LIST ALL.', rsEquivalent: 'Select PATIENT NAME: SMITH', placement: 'bottom' },
    { target: '[data-tour="patient-demographics"]', title: 'View Demographics', content: 'Patient demographics come from File #2. SSN, DOB, address, phone are all FileMan fields.', rsEquivalent: 'PATIENT NAME: SMITH,JOHN  000-00-1234  01/15/1950', placement: 'right' },
    { target: '[data-tour="patient-select-confirm"]', title: 'Confirm Selection', content: 'Selecting a patient loads their chart. All subsequent clinical data is filtered by this patient\'s DFN.', rsEquivalent: '1  SMITH,JOHN  000-00-1234  01/15/1950', placement: 'bottom' },
  ],
});

// ============================================================
// Scheduling (SD) — Appointments, Clinics
// ============================================================

registerHelpTopic({
  id: 'sd-clinic-file',
  title: 'Hospital Location File (#44)',
  summary: 'Clinics are defined in File #44 with 108 fields including clinic name, abbreviation, service, stop code, provider, appointment length, availability patterns, and cancellation rules.',
  fileNumber: 44,
  category: 'concept',
});

registerHelpTopic({
  id: 'sd-appointment',
  title: 'Scheduling an Appointment',
  summary: 'Appointments are stored in the APPOINTMENT sub-file under File #44. Each slot has date/time, patient DFN, status, and provider. The SDES RPCs handle modern scheduling.',
  rsCommand: 'Select CLINIC:',
  menuPath: 'SDAM > Appointment Management',
  fileNumber: 44,
  category: 'workflow',
});

registerHelpTopic({
  id: 'sd-availability',
  title: 'Clinic Availability',
  summary: 'Clinic availability patterns define when appointments can be booked. Stored in File #44.001 with day-of-week patterns. SDES GET AVAIL APPT SLOTS returns open slots.',
  fileNumber: 44,
  category: 'field',
});

registerGuidedTour({
  id: 'tour-sd-scheduling',
  name: 'Scheduling an Appointment',
  module: 'sd',
  steps: [
    { target: '[data-tour="clinic-select"]', title: 'Select Clinic', content: 'Choose a clinic from File #44. Clinics are configured with appointment lengths and availability patterns.', rsEquivalent: 'Select CLINIC: PRIMARY CARE', placement: 'bottom' },
    { target: '[data-tour="date-select"]', title: 'Select Date/Time', content: 'Choose from available appointment slots. Availability is determined by clinic patterns in File #44.', rsEquivalent: 'Select DATE: T+7  (03/18/2026)', placement: 'right' },
    { target: '[data-tour="appointment-confirm"]', title: 'Confirm Appointment', content: 'Review and confirm the appointment. The system calls SDEC APPADD to create it in VistA.', rsEquivalent: 'Appt for SMITH,JOHN  03/18/2026@10:00  PRIMARY CARE  OK? YES', placement: 'bottom' },
  ],
});

// ============================================================
// Order Entry (OR) — Orders, CPRS Backend
// ============================================================

registerHelpTopic({
  id: 'or-order-file',
  title: 'Order File (#100)',
  summary: 'All orders (meds, labs, consults, imaging, diets, etc.) are stored in File #100 (ORDERS). Each order has a status lifecycle: unsigned > signed > active > completed/discontinued.',
  fileNumber: 100,
  category: 'concept',
});

registerHelpTopic({
  id: 'or-order-status',
  title: 'Order Status Lifecycle',
  summary: 'Orders flow: UNSIGNED (needs signature) > PENDING (needs processing) > ACTIVE > COMPLETED or DISCONTINUED. Unsigned orders are only visible to the ordering provider until signed.',
  fileNumber: 100,
  category: 'concept',
});

registerHelpTopic({
  id: 'or-lock-unlock',
  title: 'Patient Order Lock',
  summary: 'Before creating/modifying orders, the patient must be locked via ORWDX LOCK. This prevents concurrent ordering on the same patient. Always call ORWDX UNLOCK when finished.',
  category: 'concept',
});

registerGuidedTour({
  id: 'tour-or-order-entry',
  name: 'Placing an Order',
  module: 'or',
  steps: [
    { target: '[data-tour="orders-tab"]', title: 'Open Orders Tab', content: 'The Orders tab shows all active, pending, and recent orders for the patient from File #100.', rsEquivalent: 'OE/RR > Order Entry', placement: 'bottom' },
    { target: '[data-tour="new-order"]', title: 'Create New Order', content: 'Click to start a new order. The system locks the patient (ORWDX LOCK) to prevent conflicts.', rsEquivalent: 'Select ORDER ACTION: NEW ORDER', placement: 'right' },
    { target: '[data-tour="order-dialog"]', title: 'Fill Order Details', content: 'Select the order type, fill in required fields. Each order type has specific quick-order dialogs.', placement: 'bottom' },
    { target: '[data-tour="order-sign"]', title: 'Sign the Order', content: 'Enter your electronic signature code to sign. Calls ORWOR1 SIG. Unsigned orders are not processed.', rsEquivalent: 'ELECTRONIC SIGNATURE CODE: ___', placement: 'top' },
  ],
});

// ============================================================
// Pharmacy — Outpatient (PSO) + Inpatient (PSJ)
// ============================================================

registerHelpTopic({
  id: 'pso-drug-file',
  title: 'Drug File (#50)',
  summary: 'The drug formulary with 90+ fields per entry: generic name, VA classification, NDC codes, strength, unit, route, schedule, maximum dose, interactions, and formulary status.',
  fileNumber: 50,
  category: 'concept',
});

registerHelpTopic({
  id: 'pso-active-meds',
  title: 'Active Medications',
  summary: 'Active medications are retrieved via ORWPS ACTIVE. Returns medication name, sig (directions), status, start/stop dates. Multi-line records start with ~ delimiter.',
  rsCommand: 'View Active Medications',
  category: 'workflow',
});

registerHelpTopic({
  id: 'psj-unit-dose',
  title: 'Inpatient Unit Dose',
  summary: 'Inpatient medications in File #53.1 (PHARMACY PATIENT). Unit dose orders have scheduled administration times tracked by BCMA for barcode medication administration.',
  fileNumber: 53.1,
  category: 'concept',
});

registerGuidedTour({
  id: 'tour-pso-meds-review',
  name: 'Reviewing Medications',
  module: 'pso',
  steps: [
    { target: '[data-tour="meds-tab"]', title: 'Open Medications', content: 'View all active, pending, and recently expired medications. Data comes from ORWPS ACTIVE.', rsEquivalent: 'PSO > Patient Prescription Processing', placement: 'bottom' },
    { target: '[data-tour="med-detail"]', title: 'Medication Details', content: 'Click a medication to see full details: drug name, sig, dispense quantity, refills, start/stop dates.', placement: 'right' },
    { target: '[data-tour="med-interactions"]', title: 'Drug Interactions', content: 'Order checks run automatically when new meds are ordered. Critical interactions block until acknowledged.', rsEquivalent: 'ORDER CHECK: Drug-Drug Interaction', placement: 'bottom' },
  ],
});

// ============================================================
// Laboratory (LR) — Lab Tests, Results
// ============================================================

registerHelpTopic({
  id: 'lr-test-file',
  title: 'Laboratory Test File (#60)',
  summary: 'All lab tests are defined in File #60 with specimen requirements, reference ranges, critical values, synonyms, and LOINC codes. Over 1,000 tests configured in a typical VistA instance.',
  fileNumber: 60,
  category: 'concept',
});

registerHelpTopic({
  id: 'lr-results',
  title: 'Lab Results',
  summary: 'Lab results are retrieved via ORWLRR INTERIMG (interim report) and ORWLRR CHART (chart view). Results include value, units, reference range, and abnormal flags (H/L/HH/LL/critical).',
  category: 'workflow',
});

registerHelpTopic({
  id: 'lr-critical-values',
  title: 'Critical Lab Values',
  summary: 'Critical values (e.g., K+ < 2.5 or > 6.5) trigger immediate notification. Stored in File #60 with high/low critical limits. The system generates alerts when results exceed these thresholds.',
  fileNumber: 60,
  category: 'concept',
});

registerGuidedTour({
  id: 'tour-lr-results',
  name: 'Viewing Lab Results',
  module: 'lr',
  steps: [
    { target: '[data-tour="labs-tab"]', title: 'Open Labs Tab', content: 'View all lab results. Data comes from ORWLRR INTERIMG for the interim report view.', rsEquivalent: 'LR > Results Inquiry', placement: 'bottom' },
    { target: '[data-tour="lab-result-detail"]', title: 'Result Details', content: 'Each result shows value, units, reference range, and abnormal flags. Critical values are highlighted in red.', placement: 'right' },
    { target: '[data-tour="lab-trends"]', title: 'Lab Trends', content: 'View trends over time for any test. Useful for tracking glucose, A1C, lipids, or creatinine.', rsEquivalent: 'ORWLRR CHART', placement: 'bottom' },
  ],
});

// ============================================================
// Radiology (RA) + Imaging (MAG)
// ============================================================

registerHelpTopic({
  id: 'ra-procedure-file',
  title: 'Radiology Procedure File (#71)',
  summary: 'Radiology procedures defined in File #71 with CPT codes, modality (CT, MR, XR, US, NM), contrast requirements, body part, and clinical indication requirements.',
  fileNumber: 71,
  category: 'concept',
});

registerHelpTopic({
  id: 'mag-imaging-entry',
  title: 'VistA Imaging Entry',
  summary: 'VistA Imaging stores image metadata in File #2005. The MAG4 ADD IMAGE RPC creates new entries. Images are stored externally (Orthanc/PACS) and linked via StudyInstanceUID.',
  fileNumber: 2005,
  category: 'concept',
});

registerHelpTopic({
  id: 'ra-order-workflow',
  title: 'Radiology Order Workflow',
  summary: 'Radiology orders flow from Order Entry (File #100) to the Radiology package. Technologists complete the exam, radiologists dictate findings, and reports are stored in File #74.',
  menuPath: 'RA > Order Entry',
  category: 'workflow',
});

// ============================================================
// TIU — Text Integration Utility (Notes)
// ============================================================

registerHelpTopic({
  id: 'tiu-document-file',
  title: 'TIU Document File (#8925)',
  summary: 'Clinical notes are stored in File #8925 with 75+ fields: title, author, date, status, body text, signature, cosigner, amendment history, and associated visit.',
  fileNumber: 8925,
  category: 'concept',
});

registerHelpTopic({
  id: 'tiu-document-status',
  title: 'Note Status Lifecycle',
  summary: 'Notes flow: UNSIGNED (draft) > COMPLETED (signed) > AMENDED (addendum added). Unsigned notes are only visible to the author. Signing is required before the note appears in the chart.',
  category: 'concept',
});

registerHelpTopic({
  id: 'tiu-templates',
  title: 'TIU Templates',
  summary: 'Note templates define the structure and boilerplate text. Templates can include auto-populated fields (patient name, date, vitals). Stored in File #8927 (TIU TEMPLATE FIELD).',
  fileNumber: 8927,
  category: 'concept',
});

registerGuidedTour({
  id: 'tour-tiu-create-note',
  name: 'Creating a Clinical Note',
  module: 'tiu',
  steps: [
    { target: '[data-tour="notes-tab"]', title: 'Open Notes', content: 'View all notes for this patient. Notes come from TIU DOCUMENTS BY CONTEXT.', rsEquivalent: 'TIU > Document Entry', placement: 'bottom' },
    { target: '[data-tour="new-note"]', title: 'Start New Note', content: 'Select a note title/template. TIU CREATE RECORD creates the document shell in VistA.', rsEquivalent: 'Select TITLE: GENERAL NOTE', placement: 'right' },
    { target: '[data-tour="note-editor"]', title: 'Write Note Text', content: 'Enter the note body. TIU SET DOCUMENT TEXT saves the content to File #8925.', rsEquivalent: 'ENTER NOTE TEXT:', placement: 'bottom' },
    { target: '[data-tour="note-sign"]', title: 'Sign the Note', content: 'Enter your electronic signature code. The note moves from UNSIGNED to COMPLETED status.', rsEquivalent: 'ELECTRONIC SIGNATURE CODE: ___', placement: 'top' },
  ],
});

// ============================================================
// Problem List (GMPL)
// ============================================================

registerHelpTopic({
  id: 'gmpl-problem-file',
  title: 'Problem File (#9000011)',
  summary: 'Patient problems stored in File #9000011 with ICD-10 diagnosis codes, onset date, status (active/inactive/resolved), provider, and clinical notes.',
  fileNumber: 9000011,
  category: 'concept',
});

registerHelpTopic({
  id: 'gmpl-icd-coding',
  title: 'ICD-10 Diagnosis Coding',
  summary: 'Problems are coded with ICD-10-CM codes from the Lexicon Utility. The code is required for billing and clinical reporting. Search by code or description.',
  category: 'concept',
});

registerGuidedTour({
  id: 'tour-gmpl-add-problem',
  name: 'Adding a Problem to the List',
  module: 'gmpl',
  steps: [
    { target: '[data-tour="problems-tab"]', title: 'Open Problems', content: 'View the patient\'s problem list. Active and inactive problems from ORQQPL LIST.', rsEquivalent: 'PL > Problem List', placement: 'bottom' },
    { target: '[data-tour="add-problem"]', title: 'Add Problem', content: 'Search for a diagnosis. The Lexicon Utility searches ICD-10 codes and clinical terms.', rsEquivalent: 'Select PROBLEM: HYPERTENSION', placement: 'right' },
    { target: '[data-tour="problem-details"]', title: 'Set Details', content: 'Set onset date, status, priority, and provider. These map to File #9000011 fields.', rsEquivalent: 'ONSET DATE: TODAY  STATUS: ACTIVE', placement: 'bottom' },
  ],
});

// ============================================================
// Vitals (GMV/GMRV)
// ============================================================

registerHelpTopic({
  id: 'gmv-vitals-file',
  title: 'Vital Measurement File (#120.5)',
  summary: 'Vital signs stored in File #120.5: temperature, pulse, respiration, blood pressure (systolic/diastolic), height, weight, pain scale, pulse oximetry, and BMI (computed).',
  fileNumber: 120.5,
  category: 'concept',
});

registerHelpTopic({
  id: 'gmv-vital-types',
  title: 'Vital Sign Types',
  summary: 'Standard vital types: T (temperature), P (pulse), R (respiration), BP (blood pressure), HT (height), WT (weight), PN (pain), PO2 (pulse ox), BMI (computed from HT+WT).',
  category: 'concept',
});

registerGuidedTour({
  id: 'tour-gmv-vitals-entry',
  name: 'Entering Vital Signs',
  module: 'gmv',
  steps: [
    { target: '[data-tour="vitals-tab"]', title: 'Open Vitals', content: 'View the patient\'s vital history. Data comes from GMV VM ALLDATA.', rsEquivalent: 'Vitals > Enter Vitals', placement: 'bottom' },
    { target: '[data-tour="vitals-latest"]', title: 'Latest Vitals', content: 'The most recent set of vitals is displayed prominently with trend indicators.', placement: 'right' },
    { target: '[data-tour="vitals-trends"]', title: 'Vital Trends', content: 'View trends over time. Useful for tracking blood pressure, weight, or A1C changes.', rsEquivalent: 'ORQQVI VITALS', placement: 'bottom' },
  ],
});

// ============================================================
// Allergies (GMRA) — Adverse Reaction Tracking
// ============================================================

registerHelpTopic({
  id: 'gmra-allergy-file',
  title: 'Patient Allergy File (#120.8)',
  summary: 'Patient allergies/adverse reactions stored in File #120.8: allergen (drug, food, other), reaction type, severity (mild/moderate/severe), symptoms, date reported, and originator.',
  fileNumber: 120.8,
  category: 'concept',
});

registerHelpTopic({
  id: 'gmra-severity',
  title: 'Allergy Severity Levels',
  summary: 'Three severity levels: Mild (minor symptoms), Moderate (significant but manageable), Severe (life-threatening, anaphylaxis). Severe allergies trigger prominent warnings on all clinical screens.',
  category: 'concept',
});

registerHelpTopic({
  id: 'gmra-nka',
  title: 'No Known Allergies (NKA)',
  summary: 'If a patient has no known allergies, it must be explicitly documented as NKA. An empty allergy list is NOT the same as NKA — it means allergies have not been assessed.',
  category: 'concept',
});

registerGuidedTour({
  id: 'tour-gmra-add-allergy',
  name: 'Documenting a Patient Allergy',
  module: 'gmra',
  steps: [
    { target: '[data-tour="allergies-tab"]', title: 'Open Allergies', content: 'View the patient\'s allergy list from ORQQAL LIST. Severe allergies show a red banner.', rsEquivalent: 'ARV > Allergy List', placement: 'bottom' },
    { target: '[data-tour="add-allergy"]', title: 'Add Allergy', content: 'Search for the allergen. The system searches the allergy file and drug ingredients.', rsEquivalent: 'Select CAUSATIVE AGENT: PENICILLIN', placement: 'right' },
    { target: '[data-tour="allergy-reactions"]', title: 'Set Reactions', content: 'Select observed reactions (rash, hives, anaphylaxis) and severity level. Six OREDITED fields are mandatory.', rsEquivalent: 'REACTIONS: RASH  SEVERITY: MODERATE', placement: 'bottom' },
  ],
});

// ============================================================
// Integrated Billing (IB) + Accounts Receivable (PRCA)
// ============================================================

registerHelpTopic({
  id: 'ib-billing-file',
  title: 'Integrated Billing File (#350)',
  summary: 'Billing actions stored in File #350: charges for services, copay determinations, insurance verification, and claim generation. IB interfaces with PRCA for receivables.',
  fileNumber: 350,
  category: 'concept',
});

registerHelpTopic({
  id: 'ib-insurance',
  title: 'Insurance Verification',
  summary: 'Patient insurance information in File #2.312 (INSURANCE TYPE sub-file of Patient). Includes group number, subscriber ID, effective dates, and pre-authorization requirements.',
  fileNumber: 2,
  fieldNumber: 2.312,
  category: 'concept',
});

registerHelpTopic({
  id: 'prca-ar',
  title: 'Accounts Receivable File (#430)',
  summary: 'AR transactions in File #430 track all receivables: patient copays, third-party claims, and collection actions. Status codes track the lifecycle from billed to paid/written-off.',
  fileNumber: 430,
  category: 'concept',
});

registerGuidedTour({
  id: 'tour-ib-billing',
  name: 'Billing Workflow Overview',
  module: 'ib',
  steps: [
    { target: '[data-tour="billing-tab"]', title: 'Billing Dashboard', content: 'View patient billing status: charges, insurance, copays, and outstanding balances.', rsEquivalent: 'IB > Billing Management', placement: 'bottom' },
    { target: '[data-tour="insurance-verify"]', title: 'Insurance Verification', content: 'Verify insurance eligibility. Data from File #2.312 (Insurance Type sub-file).', rsEquivalent: 'Select PATIENT: SMITH  Insurance Type:', placement: 'right' },
    { target: '[data-tour="charges"]', title: 'View Charges', content: 'All charges from encounters, procedures, and prescriptions flow into File #350 for billing.', rsEquivalent: 'IB > Charge Display', placement: 'bottom' },
  ],
});

// ============================================================
// Summary: What this registers
// ============================================================
// 15 Tier 1 packages covered:
//   XU (Kernel), DI (FileMan), DG (Registration), SD (Scheduling),
//   OR (Order Entry), PSO (Outpatient Pharmacy), PSJ (Inpatient Pharmacy),
//   LR (Laboratory), RA/MAG (Radiology/Imaging), TIU (Notes),
//   GMPL (Problem List), GMV/GMRV (Vitals), GMRA (Allergies),
//   IB (Integrated Billing), PRCA (Accounts Receivable)
//
// Total: ~35 help topics + ~12 guided tours
