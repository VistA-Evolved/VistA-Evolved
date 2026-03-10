/**
 * Phase 160: Department Workflow Packs -- Predefined department workflows
 * 8 department packs with structured clinical steps.
 */
import type { WorkflowStepDef } from './types.js';

interface PackDef {
  department: string;
  displayName: string;
  description: string;
  workflows: Array<{
    name: string;
    description: string;
    steps: WorkflowStepDef[];
    tags: string[];
  }>;
}

function step(
  id: string,
  name: string,
  order: number,
  opts?: Partial<WorkflowStepDef>
): WorkflowStepDef {
  return { id, name, description: name, order, ...opts };
}

function pendingIntegration(targetRpc: string): NonNullable<WorkflowStepDef['vistaIntegration']> {
  return { targetRpc, status: 'integration-pending' };
}

export function getAllDepartmentPacks(): PackDef[] {
  return [
    // -- Emergency Department --------------------------------------
    {
      department: 'ed',
      displayName: 'Emergency Department',
      description: 'ED triage-to-disposition workflow with ESI acuity-based prioritization',
      workflows: [
        {
          name: 'ED Standard Visit',
          description: 'Full ED encounter from triage to disposition',
          tags: ['emergency-medicine', 'urgent-care'],
          steps: [
            step('ed-triage', 'Triage Assessment', 1, {
              requiredRole: 'nurse',
              specialtyTag: 'emergency-medicine',
              estimatedMinutes: 5,
            }),
            step('ed-register', 'Registration & Insurance', 2, {
              requiredRole: 'clerk',
              estimatedMinutes: 5,
            }),
            step('ed-nurse-assess', 'Nursing Assessment', 3, {
              requiredRole: 'nurse',
              estimatedMinutes: 10,
            }),
            step('ed-provider-eval', 'Provider Evaluation', 4, {
              requiredRole: 'provider',
              specialtyTag: 'emergency-medicine',
              estimatedMinutes: 15,
            }),
            step('ed-orders', 'Order Entry (Labs/Imaging)', 5, {
              requiredRole: 'provider',
              vistaIntegration: pendingIntegration('ORWDX SAVE'),
            }),
            step('ed-results-review', 'Results Review', 6, {
              requiredRole: 'provider',
              estimatedMinutes: 10,
            }),
            step('ed-disposition', 'Disposition Decision', 7, {
              requiredRole: 'provider',
              estimatedMinutes: 5,
            }),
            step('ed-discharge', 'Discharge / Admit Orders', 8, {
              requiredRole: 'provider',
              vistaIntegration: pendingIntegration('ORWDX SAVE'),
            }),
            step('ed-note', 'ED Note Documentation', 9, {
              requiredRole: 'provider',
              specialtyTag: 'emergency-medicine',
              estimatedMinutes: 10,
              vistaIntegration: pendingIntegration('TIU CREATE RECORD'),
            }),
          ],
        },
      ],
    },

    // -- Laboratory ------------------------------------------------
    {
      department: 'laboratory',
      displayName: 'Laboratory',
      description: 'Specimen collection, processing, and result verification',
      workflows: [
        {
          name: 'Lab Standard Draw',
          description: 'Blood draw and specimen processing workflow',
          tags: ['laboratory'],
          steps: [
            step('lab-checkin', 'Patient Check-in', 1, {
              requiredRole: 'clerk',
              estimatedMinutes: 2,
            }),
            step('lab-verify-order', 'Verify Lab Orders', 2, {
              requiredRole: 'nurse',
              vistaIntegration: pendingIntegration('ORWLR ALLTESTS'),
            }),
            step('lab-draw', 'Specimen Collection', 3, {
              requiredRole: 'nurse',
              estimatedMinutes: 5,
            }),
            step('lab-label', 'Labeling & Accession', 4, {
              requiredRole: 'nurse',
              estimatedMinutes: 2,
            }),
            step('lab-process', 'Specimen Processing', 5, { estimatedMinutes: 15 }),
            step('lab-result', 'Result Entry & Verification', 6, {
              requiredRole: 'provider',
              vistaIntegration: pendingIntegration('ORWLR REPORT'),
            }),
          ],
        },
      ],
    },

    // -- Radiology -------------------------------------------------
    {
      department: 'radiology',
      displayName: 'Radiology',
      description: 'Imaging order verification, exam execution, and reporting',
      workflows: [
        {
          name: 'Radiology Standard Exam',
          description: 'Imaging exam from order to report',
          tags: ['radiology'],
          steps: [
            step('rad-checkin', 'Patient Check-in', 1, {
              requiredRole: 'clerk',
              estimatedMinutes: 3,
            }),
            step('rad-verify', 'Verify Imaging Order', 2, {
              requiredRole: 'nurse',
              vistaIntegration: pendingIntegration('ORWDXR NEW ORDER'),
            }),
            step('rad-prep', 'Patient Prep & Screening', 3, {
              requiredRole: 'nurse',
              estimatedMinutes: 5,
            }),
            step('rad-exam', 'Perform Exam', 4, {
              requiredRole: 'provider',
              specialtyTag: 'radiology',
              estimatedMinutes: 20,
            }),
            step('rad-read', 'Radiologist Reading', 5, {
              requiredRole: 'provider',
              specialtyTag: 'radiology',
              estimatedMinutes: 15,
            }),
            step('rad-report', 'Generate Report', 6, {
              requiredRole: 'provider',
              vistaIntegration: pendingIntegration('TIU CREATE RECORD'),
            }),
          ],
        },
      ],
    },

    // -- Surgery Clinic --------------------------------------------
    {
      department: 'surgery-clinic',
      displayName: 'Surgery Clinic',
      description: 'Pre-op, surgical, and post-op workflows',
      workflows: [
        {
          name: 'Surgical Pre-Op Assessment',
          description: 'Pre-operative evaluation and clearance',
          tags: ['general-surgery'],
          steps: [
            step('surg-checkin', 'Patient Check-in', 1, {
              requiredRole: 'clerk',
              estimatedMinutes: 5,
            }),
            step('surg-vitals', 'Vitals & Measurements', 2, {
              requiredRole: 'nurse',
              estimatedMinutes: 5,
            }),
            step('surg-hx', 'Surgical History Review', 3, {
              requiredRole: 'provider',
              specialtyTag: 'general-surgery',
              estimatedMinutes: 10,
            }),
            step('surg-consent', 'Informed Consent', 4, {
              requiredRole: 'provider',
              estimatedMinutes: 10,
            }),
            step('surg-labs', 'Pre-Op Lab Orders', 5, {
              requiredRole: 'provider',
              vistaIntegration: pendingIntegration('ORWDX SAVE'),
            }),
            step('surg-clearance', 'Anesthesia Clearance', 6, {
              requiredRole: 'provider',
              specialtyTag: 'anesthesia',
              estimatedMinutes: 15,
            }),
            step('surg-instructions', 'Pre-Op Instructions', 7, {
              requiredRole: 'nurse',
              estimatedMinutes: 5,
            }),
          ],
        },
      ],
    },

    // -- OB/GYN ----------------------------------------------------
    {
      department: 'ob-gyn',
      displayName: 'OB/GYN',
      description: 'Obstetric and gynecological visit workflows',
      workflows: [
        {
          name: 'OB Prenatal Visit',
          description: 'Standard prenatal visit workflow',
          tags: ['ob-gyn'],
          steps: [
            step('ob-checkin', 'Check-in & Registration', 1, {
              requiredRole: 'clerk',
              estimatedMinutes: 3,
            }),
            step('ob-vitals', 'Vitals (weight, BP, FHR)', 2, {
              requiredRole: 'nurse',
              estimatedMinutes: 5,
            }),
            step('ob-urine', 'Urine Specimen Collection', 3, {
              requiredRole: 'nurse',
              estimatedMinutes: 3,
            }),
            step('ob-provider', 'Provider Exam', 4, {
              requiredRole: 'provider',
              specialtyTag: 'ob-gyn',
              estimatedMinutes: 15,
            }),
            step('ob-ultrasound', 'Ultrasound (if indicated)', 5, {
              isOptional: true,
              estimatedMinutes: 20,
              specialtyTag: 'ob-gyn',
            }),
            step('ob-education', 'Patient Education', 6, {
              requiredRole: 'nurse',
              estimatedMinutes: 10,
            }),
            step('ob-schedule', 'Schedule Follow-up', 7, {
              requiredRole: 'clerk',
              estimatedMinutes: 3,
            }),
          ],
        },
      ],
    },

    // -- ICU / Critical Care ---------------------------------------
    {
      department: 'icu-critical-care',
      displayName: 'ICU / Critical Care',
      description: 'Critical care admission and daily rounding workflows',
      workflows: [
        {
          name: 'ICU Daily Care Bundle',
          description: 'Daily ICU assessment and intervention bundle',
          tags: ['icu-critical-care'],
          steps: [
            step('icu-assess', 'Morning Assessment', 1, {
              requiredRole: 'nurse',
              estimatedMinutes: 15,
            }),
            step('icu-vent-check', 'Ventilator/Airway Check', 2, {
              requiredRole: 'nurse',
              estimatedMinutes: 5,
              isOptional: true,
            }),
            step('icu-lines', 'Line/Tube/Drain Check', 3, {
              requiredRole: 'nurse',
              estimatedMinutes: 5,
            }),
            step('icu-labs', 'AM Labs Review', 4, {
              requiredRole: 'provider',
              vistaIntegration: pendingIntegration('ORWLR REPORT'),
            }),
            step('icu-round', 'Multidisciplinary Rounding', 5, {
              requiredRole: 'provider',
              specialtyTag: 'icu-critical-care',
              estimatedMinutes: 20,
            }),
            step('icu-orders', 'Order Reconciliation', 6, {
              requiredRole: 'provider',
              vistaIntegration: pendingIntegration('ORWDX SAVE'),
            }),
            step('icu-skin', 'Skin/Wound Assessment', 7, {
              requiredRole: 'nurse',
              estimatedMinutes: 10,
            }),
            step('icu-family', 'Family Update', 8, {
              requiredRole: 'provider',
              isOptional: true,
              estimatedMinutes: 10,
            }),
          ],
        },
      ],
    },

    // -- Pharmacy --------------------------------------------------
    {
      department: 'pharmacy',
      displayName: 'Pharmacy',
      description: 'Medication dispensing and clinical pharmacy workflows',
      workflows: [
        {
          name: 'Pharmacy Dispensing',
          description: 'Prescription verification and dispensing',
          tags: ['pharmacy-clinical'],
          steps: [
            step('rx-receive', 'Receive Prescription', 1, {
              requiredRole: 'clerk',
              estimatedMinutes: 2,
            }),
            step('rx-verify', 'Pharmacist Verification', 2, {
              requiredRole: 'provider',
              specialtyTag: 'pharmacy-clinical',
              estimatedMinutes: 5,
            }),
            step('rx-ddi-check', 'Drug Interaction Check', 3, {
              vistaIntegration: pendingIntegration('ORWPS ACTIVE'),
              estimatedMinutes: 2,
            }),
            step('rx-fill', 'Fill Prescription', 4, { estimatedMinutes: 5 }),
            step('rx-final-check', 'Final Check', 5, {
              requiredRole: 'provider',
              specialtyTag: 'pharmacy-clinical',
              estimatedMinutes: 2,
            }),
            step('rx-counsel', 'Patient Counseling', 6, {
              requiredRole: 'provider',
              estimatedMinutes: 5,
            }),
            step('rx-dispense', 'Dispense to Patient', 7, {
              requiredRole: 'clerk',
              estimatedMinutes: 2,
            }),
          ],
        },
      ],
    },

    // -- Mental Health ---------------------------------------------
    {
      department: 'mental-health',
      displayName: 'Mental Health',
      description: 'Psychiatric assessment and therapy visit workflows',
      workflows: [
        {
          name: 'MH Initial Assessment',
          description: 'New patient psychiatric evaluation',
          tags: ['psychiatry', 'psychology-behavioral'],
          steps: [
            step('mh-checkin', 'Check-in & Screening', 1, {
              requiredRole: 'clerk',
              estimatedMinutes: 5,
            }),
            step('mh-screening', 'PHQ-9 / GAD-7 Screening', 2, {
              requiredRole: 'nurse',
              estimatedMinutes: 10,
            }),
            step('mh-vitals', 'Vitals & Safety Screen', 3, {
              requiredRole: 'nurse',
              estimatedMinutes: 5,
            }),
            step('mh-psych-eval', 'Psychiatric Evaluation', 4, {
              requiredRole: 'provider',
              specialtyTag: 'psychiatry',
              estimatedMinutes: 45,
            }),
            step('mh-treatment-plan', 'Treatment Plan Discussion', 5, {
              requiredRole: 'provider',
              specialtyTag: 'psychiatry',
              estimatedMinutes: 15,
            }),
            step('mh-safety-plan', 'Safety Plan (if indicated)', 6, {
              requiredRole: 'provider',
              isOptional: true,
              estimatedMinutes: 15,
            }),
            step('mh-follow-up', 'Schedule Follow-up', 7, {
              requiredRole: 'clerk',
              estimatedMinutes: 3,
            }),
          ],
        },
      ],
    },
  ];
}
