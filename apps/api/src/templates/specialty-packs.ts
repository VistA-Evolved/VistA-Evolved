/**
 * Phase 158: Specialty Pack Definitions — 45+ unique specialty tags
 *
 * Each pack provides starter templates for rapid clinical documentation.
 * Templates are orchestration metadata — clinical truth lives in VistA.
 * No PHI. No auto-coding. Billing suggestions are advisory only.
 *
 * Structure references:
 *   CMS 1995/1997 E&M Documentation Guidelines
 *   Joint Commission RC.01.01.01 / RC.02.01.01
 *   VistA TIU Technical Manual
 * See docs/research/phase158-sources.md for full citations.
 */

import type { ClinicalTemplate, TemplateSection, SpecialtyTag } from "./types.js";

// ─── Reusable Section Builders ─────────────────────────────────────

function hpiSection(order: number): TemplateSection {
  return {
    id: "hpi", type: "text", title: "History of Present Illness", order,
    collapsible: true, defaultExpanded: true,
    fields: [
      { key: "hpi_cc", label: "Chief Complaint", fieldType: "text", order: 1, validation: { required: true, maxLength: 500 } },
      { key: "hpi_onset", label: "Onset", fieldType: "text", order: 2 },
      { key: "hpi_location", label: "Location", fieldType: "text", order: 3 },
      { key: "hpi_duration", label: "Duration", fieldType: "text", order: 4 },
      { key: "hpi_character", label: "Character", fieldType: "text", order: 5 },
      { key: "hpi_aggravating", label: "Aggravating Factors", fieldType: "textarea", order: 6 },
      { key: "hpi_relieving", label: "Relieving Factors", fieldType: "textarea", order: 7 },
      { key: "hpi_severity", label: "Severity (0-10)", fieldType: "number", order: 8, validation: { min: 0, max: 10 } },
      { key: "hpi_timing", label: "Timing", fieldType: "text", order: 9 },
      { key: "hpi_context", label: "Context", fieldType: "textarea", order: 10 },
    ],
  };
}

function rosSection(order: number): TemplateSection {
  return {
    id: "ros", type: "checkbox", title: "Review of Systems", order,
    collapsible: true, defaultExpanded: false,
    fields: [
      { key: "ros_constitutional", label: "Constitutional", fieldType: "checkbox", order: 1 },
      { key: "ros_eyes", label: "Eyes", fieldType: "checkbox", order: 2 },
      { key: "ros_ent", label: "ENT", fieldType: "checkbox", order: 3 },
      { key: "ros_cardiovascular", label: "Cardiovascular", fieldType: "checkbox", order: 4 },
      { key: "ros_respiratory", label: "Respiratory", fieldType: "checkbox", order: 5 },
      { key: "ros_gi", label: "GI", fieldType: "checkbox", order: 6 },
      { key: "ros_gu", label: "GU", fieldType: "checkbox", order: 7 },
      { key: "ros_musculoskeletal", label: "Musculoskeletal", fieldType: "checkbox", order: 8 },
      { key: "ros_skin", label: "Skin/Integumentary", fieldType: "checkbox", order: 9 },
      { key: "ros_neuro", label: "Neurological", fieldType: "checkbox", order: 10 },
      { key: "ros_psych", label: "Psychiatric", fieldType: "checkbox", order: 11 },
      { key: "ros_endocrine", label: "Endocrine", fieldType: "checkbox", order: 12 },
      { key: "ros_heme_lymph", label: "Hematologic/Lymphatic", fieldType: "checkbox", order: 13 },
      { key: "ros_allergic_immuno", label: "Allergic/Immunologic", fieldType: "checkbox", order: 14 },
      { key: "ros_details", label: "ROS Details", fieldType: "textarea", order: 15 },
    ],
  };
}

function peSection(order: number): TemplateSection {
  return {
    id: "pe", type: "text", title: "Physical Examination", order,
    collapsible: true, defaultExpanded: true,
    fields: [
      { key: "pe_general", label: "General Appearance", fieldType: "textarea", order: 1 },
      { key: "pe_vitals", label: "Vitals Summary", fieldType: "text", order: 2, mappingTarget: { vistaReadRpc: "GMV VITALS/CAT/QUAL", vistaReadStatus: "available" } },
      { key: "pe_heent", label: "HEENT", fieldType: "textarea", order: 3 },
      { key: "pe_neck", label: "Neck", fieldType: "textarea", order: 4 },
      { key: "pe_chest_lungs", label: "Chest/Lungs", fieldType: "textarea", order: 5 },
      { key: "pe_heart", label: "Heart", fieldType: "textarea", order: 6 },
      { key: "pe_abdomen", label: "Abdomen", fieldType: "textarea", order: 7 },
      { key: "pe_extremities", label: "Extremities", fieldType: "textarea", order: 8 },
      { key: "pe_neuro", label: "Neurological", fieldType: "textarea", order: 9 },
      { key: "pe_skin", label: "Skin", fieldType: "textarea", order: 10 },
    ],
  };
}

function assessmentPlanSection(order: number): TemplateSection {
  return {
    id: "ap", type: "text", title: "Assessment & Plan", order,
    collapsible: true, defaultExpanded: true,
    fields: [
      { key: "ap_assessment", label: "Assessment", fieldType: "textarea", order: 1, validation: { required: true } },
      { key: "ap_plan", label: "Plan", fieldType: "textarea", order: 2, validation: { required: true } },
      { key: "ap_followup", label: "Follow-up", fieldType: "text", order: 3 },
      { key: "ap_referrals", label: "Referrals", fieldType: "textarea", order: 4 },
    ],
  };
}

function medicationsSection(order: number): TemplateSection {
  return {
    id: "meds", type: "text", title: "Medications", order,
    collapsible: true, defaultExpanded: false,
    fields: [
      { key: "meds_current", label: "Current Medications", fieldType: "textarea", order: 1, mappingTarget: { vistaReadRpc: "ORWPS ACTIVE", vistaReadStatus: "available" } },
      { key: "meds_changes", label: "Medication Changes", fieldType: "textarea", order: 2 },
      { key: "meds_allergies", label: "Known Allergies", fieldType: "textarea", order: 3, mappingTarget: { vistaReadRpc: "ORQQAL LIST", vistaReadStatus: "available" } },
    ],
  };
}

function socialHistorySection(order: number): TemplateSection {
  return {
    id: "sh", type: "text", title: "Social History", order,
    collapsible: true, defaultExpanded: false,
    fields: [
      { key: "sh_tobacco", label: "Tobacco Use", fieldType: "select", order: 1, allowedValues: ["Never", "Former", "Current", "Unknown"] },
      { key: "sh_alcohol", label: "Alcohol Use", fieldType: "select", order: 2, allowedValues: ["None", "Social", "Heavy", "Unknown"] },
      { key: "sh_drugs", label: "Recreational Drug Use", fieldType: "text", order: 3 },
      { key: "sh_occupation", label: "Occupation", fieldType: "text", order: 4 },
      { key: "sh_living", label: "Living Situation", fieldType: "text", order: 5 },
      { key: "sh_exercise", label: "Exercise", fieldType: "text", order: 6 },
    ],
  };
}

function pmhSection(order: number): TemplateSection {
  return {
    id: "pmh", type: "text", title: "Past Medical History", order,
    collapsible: true, defaultExpanded: false,
    fields: [
      { key: "pmh_conditions", label: "Active Problems", fieldType: "textarea", order: 1, mappingTarget: { vistaReadRpc: "ORQQPL LIST", vistaReadStatus: "available" } },
      { key: "pmh_surgeries", label: "Past Surgeries", fieldType: "textarea", order: 2 },
      { key: "pmh_hospitalizations", label: "Prior Hospitalizations", fieldType: "textarea", order: 3 },
    ],
  };
}

function familyHistorySection(order: number): TemplateSection {
  return {
    id: "fhx", type: "text", title: "Family History", order,
    collapsible: true, defaultExpanded: false,
    fields: [
      { key: "fhx_details", label: "Family History", fieldType: "textarea", order: 1 },
    ],
  };
}

// ─── Template Generator per Specialty ──────────────────────────────

type TemplateInput = Omit<ClinicalTemplate, "id" | "tenantId" | "createdAt" | "updatedAt">;

function makeTemplate(
  name: string,
  specialty: SpecialtyTag,
  setting: ClinicalTemplate["setting"],
  sections: TemplateSection[],
  tags?: string[],
  description?: string
): TemplateInput {
  return {
    name,
    specialty,
    setting,
    version: 1,
    status: "published" as const,
    description: description || `${name} - ${specialty}`,
    tags: tags || [specialty],
    sections,
  };
}

// ─── Full Specialty Pack Set ───────────────────────────────────────

export function getAllSpecialtyPacks(): { specialty: SpecialtyTag; templates: TemplateInput[] }[] {
  return [
    // 1. Primary Care
    {
      specialty: "primary-care",
      templates: [
        makeTemplate("Primary Care Office Visit", "primary-care", "outpatient", [
          hpiSection(1), rosSection(2), pmhSection(3), socialHistorySection(4),
          familyHistorySection(5), medicationsSection(6), peSection(7), assessmentPlanSection(8),
        ]),
        makeTemplate("Annual Wellness Visit", "primary-care", "outpatient", [
          { id: "awv-header", type: "header", title: "Annual Wellness Visit", order: 0, fields: [] },
          hpiSection(1), rosSection(2), socialHistorySection(3), peSection(4),
          { id: "preventive", type: "checkbox", title: "Preventive Screenings", order: 5, collapsible: true, defaultExpanded: true,
            fields: [
              { key: "screen_mammogram", label: "Mammogram", fieldType: "checkbox", order: 1 },
              { key: "screen_colonoscopy", label: "Colonoscopy", fieldType: "checkbox", order: 2 },
              { key: "screen_lipids", label: "Lipid Panel", fieldType: "checkbox", order: 3 },
              { key: "screen_a1c", label: "HbA1c", fieldType: "checkbox", order: 4 },
              { key: "screen_dexa", label: "DEXA Scan", fieldType: "checkbox", order: 5 },
              { key: "screen_psa", label: "PSA", fieldType: "checkbox", order: 6 },
            ],
          },
          assessmentPlanSection(6),
        ]),
      ],
    },
    // 2. Family Medicine
    {
      specialty: "family-medicine",
      templates: [
        makeTemplate("Family Medicine Visit", "family-medicine", "outpatient", [
          hpiSection(1), rosSection(2), pmhSection(3), socialHistorySection(4),
          familyHistorySection(5), medicationsSection(6), peSection(7), assessmentPlanSection(8),
        ]),
      ],
    },
    // 3. Internal Medicine
    {
      specialty: "internal-medicine",
      templates: [
        makeTemplate("Internal Medicine Consult", "internal-medicine", "any", [
          { id: "consult-reason", type: "text", title: "Reason for Consultation", order: 0,
            fields: [{ key: "consult_reason", label: "Reason", fieldType: "textarea", order: 1, validation: { required: true } }] },
          hpiSection(1), rosSection(2), pmhSection(3), medicationsSection(4),
          peSection(5), assessmentPlanSection(6),
        ]),
      ],
    },
    // 4. Pediatrics
    {
      specialty: "pediatrics",
      templates: [
        makeTemplate("Pediatric Well-Child Visit", "pediatrics", "outpatient", [
          { id: "peds-growth", type: "text", title: "Growth & Development", order: 0,
            fields: [
              { key: "peds_weight_pct", label: "Weight Percentile", fieldType: "number", order: 1 },
              { key: "peds_height_pct", label: "Height Percentile", fieldType: "number", order: 2 },
              { key: "peds_hc_pct", label: "Head Circumference Percentile", fieldType: "number", order: 3 },
              { key: "peds_milestones", label: "Developmental Milestones", fieldType: "textarea", order: 4 },
            ] },
          peSection(1), medicationsSection(2),
          { id: "peds-imm", type: "checkbox", title: "Immunizations Reviewed", order: 3, collapsible: true, defaultExpanded: true,
            fields: [
              { key: "imm_uptodate", label: "Immunizations Up-to-Date", fieldType: "checkbox", order: 1 },
              { key: "imm_notes", label: "Immunization Notes", fieldType: "textarea", order: 2 },
            ] },
          assessmentPlanSection(4),
        ]),
        makeTemplate("Pediatric Sick Visit", "pediatrics", "outpatient", [
          hpiSection(1), rosSection(2), peSection(3), assessmentPlanSection(4),
        ]),
      ],
    },
    // 5. OB/GYN
    {
      specialty: "ob-gyn",
      templates: [
        makeTemplate("OB Prenatal Visit", "ob-gyn", "outpatient", [
          { id: "ob-dates", type: "text", title: "Obstetric Dating", order: 0,
            fields: [
              { key: "ob_edd", label: "EDD", fieldType: "date", order: 1 },
              { key: "ob_ga", label: "Gestational Age (weeks)", fieldType: "number", order: 2 },
              { key: "ob_gravida", label: "Gravida", fieldType: "number", order: 3 },
              { key: "ob_para", label: "Para", fieldType: "number", order: 4 },
            ] },
          { id: "ob-interval", type: "text", title: "Interval History", order: 1,
            fields: [
              { key: "ob_fetal_movement", label: "Fetal Movement", fieldType: "text", order: 1 },
              { key: "ob_contractions", label: "Contractions", fieldType: "text", order: 2 },
              { key: "ob_bleeding", label: "Bleeding/Discharge", fieldType: "text", order: 3 },
            ] },
          peSection(2), assessmentPlanSection(3),
        ]),
        makeTemplate("GYN Annual Exam", "ob-gyn", "outpatient", [
          hpiSection(1), rosSection(2), peSection(3), assessmentPlanSection(4),
        ]),
      ],
    },
    // 6. Emergency Medicine
    {
      specialty: "emergency-medicine",
      templates: [
        makeTemplate("ED Evaluation", "emergency-medicine", "ed", [
          { id: "triage", type: "text", title: "Triage", order: 0,
            fields: [
              { key: "triage_acuity", label: "ESI Acuity Level", fieldType: "select", order: 1, allowedValues: ["1-Resuscitation", "2-Emergent", "3-Urgent", "4-Less Urgent", "5-Non-Urgent"] },
              { key: "triage_mode", label: "Mode of Arrival", fieldType: "select", order: 2, allowedValues: ["Ambulatory", "Wheelchair", "Stretcher", "Ambulance", "Police"] },
              { key: "triage_time", label: "Triage Time", fieldType: "text", order: 3 },
            ] },
          hpiSection(1), rosSection(2), medicationsSection(3), peSection(4),
          { id: "ed-procedures", type: "text", title: "Procedures", order: 5,
            fields: [
              { key: "proc_list", label: "Procedures Performed", fieldType: "textarea", order: 1 },
              { key: "proc_results", label: "Procedure Results", fieldType: "textarea", order: 2 },
            ] },
          { id: "ed-mdm", type: "text", title: "Medical Decision Making", order: 6,
            fields: [
              { key: "mdm_complexity", label: "MDM Complexity", fieldType: "select", order: 1, allowedValues: ["Straightforward", "Low", "Moderate", "High"] },
              { key: "mdm_data", label: "Data Reviewed", fieldType: "textarea", order: 2 },
              { key: "mdm_risk", label: "Risk of Complications", fieldType: "textarea", order: 3 },
            ] },
          assessmentPlanSection(7),
          { id: "ed-dispo", type: "text", title: "Disposition", order: 8,
            fields: [
              { key: "dispo_decision", label: "Disposition", fieldType: "select", order: 1, allowedValues: ["Discharge", "Admit", "Transfer", "AMA", "Observation", "Deceased"] },
              { key: "dispo_instructions", label: "Discharge Instructions", fieldType: "textarea", order: 2 },
              { key: "dispo_followup", label: "Follow-up Instructions", fieldType: "text", order: 3 },
            ] },
        ]),
      ],
    },
    // 7. Urgent Care
    {
      specialty: "urgent-care",
      templates: [
        makeTemplate("Urgent Care Visit", "urgent-care", "outpatient", [
          hpiSection(1), rosSection(2), peSection(3), assessmentPlanSection(4),
        ]),
      ],
    },
    // 8. Cardiology
    {
      specialty: "cardiology",
      templates: [
        makeTemplate("Cardiology Consult", "cardiology", "any", [
          { id: "card-reason", type: "text", title: "Reason for Consult", order: 0,
            fields: [{ key: "card_reason", label: "Indication", fieldType: "textarea", order: 1 }] },
          hpiSection(1),
          { id: "card-cardiac-hx", type: "text", title: "Cardiac History", order: 2,
            fields: [
              { key: "card_cad", label: "CAD History", fieldType: "textarea", order: 1 },
              { key: "card_chf", label: "CHF History", fieldType: "textarea", order: 2 },
              { key: "card_arrhythmia", label: "Arrhythmia History", fieldType: "textarea", order: 3 },
              { key: "card_devices", label: "Cardiac Devices", fieldType: "text", order: 4 },
            ] },
          rosSection(3), medicationsSection(4), peSection(5), assessmentPlanSection(6),
        ]),
      ],
    },
    // 9. Pulmonology
    {
      specialty: "pulmonology",
      templates: [
        makeTemplate("Pulmonology Consult", "pulmonology", "any", [
          hpiSection(1),
          { id: "pulm-hx", type: "text", title: "Pulmonary History", order: 2,
            fields: [
              { key: "pulm_smoking_py", label: "Smoking (Pack-Years)", fieldType: "number", order: 1 },
              { key: "pulm_pfts", label: "PFT Results", fieldType: "textarea", order: 2 },
              { key: "pulm_o2_use", label: "Home O2 Use", fieldType: "text", order: 3 },
            ] },
          rosSection(3), peSection(4), assessmentPlanSection(5),
        ]),
      ],
    },
    // 10. Endocrinology
    {
      specialty: "endocrinology",
      templates: [
        makeTemplate("Endocrinology Visit", "endocrinology", "outpatient", [
          hpiSection(1),
          { id: "endo-dm", type: "text", title: "Diabetes Management", order: 2,
            fields: [
              { key: "endo_a1c", label: "Last HbA1c", fieldType: "number", order: 1 },
              { key: "endo_glucose_log", label: "Glucose Log Summary", fieldType: "textarea", order: 2 },
              { key: "endo_insulin", label: "Insulin Regimen", fieldType: "textarea", order: 3 },
              { key: "endo_foot_exam", label: "Foot Exam", fieldType: "textarea", order: 4 },
            ] },
          rosSection(3), peSection(4), assessmentPlanSection(5),
        ]),
      ],
    },
    // 11. Nephrology
    {
      specialty: "nephrology",
      templates: [
        makeTemplate("Nephrology Consult", "nephrology", "any", [
          hpiSection(1),
          { id: "neph-labs", type: "text", title: "Renal Labs", order: 2,
            fields: [
              { key: "neph_creatinine", label: "Creatinine", fieldType: "number", order: 1 },
              { key: "neph_gfr", label: "eGFR", fieldType: "number", order: 2 },
              { key: "neph_bun", label: "BUN", fieldType: "number", order: 3 },
              { key: "neph_dialysis", label: "Dialysis Status", fieldType: "select", order: 4, allowedValues: ["None", "Hemodialysis", "Peritoneal Dialysis", "Planning"] },
            ] },
          rosSection(3), peSection(4), assessmentPlanSection(5),
        ]),
      ],
    },
    // 12. Neurology
    {
      specialty: "neurology",
      templates: [
        makeTemplate("Neurology Consult", "neurology", "any", [
          hpiSection(1),
          { id: "neuro-exam", type: "text", title: "Neurological Examination", order: 2,
            fields: [
              { key: "neuro_mental_status", label: "Mental Status", fieldType: "textarea", order: 1 },
              { key: "neuro_cranial_nerves", label: "Cranial Nerves", fieldType: "textarea", order: 2 },
              { key: "neuro_motor", label: "Motor", fieldType: "textarea", order: 3 },
              { key: "neuro_sensory", label: "Sensory", fieldType: "textarea", order: 4 },
              { key: "neuro_reflexes", label: "Reflexes", fieldType: "textarea", order: 5 },
              { key: "neuro_coordination", label: "Coordination/Gait", fieldType: "textarea", order: 6 },
            ] },
          assessmentPlanSection(3),
        ]),
      ],
    },
    // 13. Psychiatry
    {
      specialty: "psychiatry",
      templates: [
        makeTemplate("Psychiatric Evaluation", "psychiatry", "any", [
          hpiSection(1),
          { id: "psych-mse", type: "text", title: "Mental Status Examination", order: 2,
            fields: [
              { key: "mse_appearance", label: "Appearance/Behavior", fieldType: "textarea", order: 1 },
              { key: "mse_speech", label: "Speech", fieldType: "text", order: 2 },
              { key: "mse_mood", label: "Mood (patient report)", fieldType: "text", order: 3 },
              { key: "mse_affect", label: "Affect (observed)", fieldType: "text", order: 4 },
              { key: "mse_thought_process", label: "Thought Process", fieldType: "text", order: 5 },
              { key: "mse_thought_content", label: "Thought Content", fieldType: "textarea", order: 6 },
              { key: "mse_perceptions", label: "Perceptions", fieldType: "text", order: 7 },
              { key: "mse_cognition", label: "Cognition", fieldType: "text", order: 8 },
              { key: "mse_insight_judgment", label: "Insight/Judgment", fieldType: "text", order: 9 },
            ] },
          { id: "psych-safety", type: "checkbox", title: "Safety Assessment", order: 3,
            fields: [
              { key: "safety_si", label: "Suicidal Ideation", fieldType: "checkbox", order: 1 },
              { key: "safety_hi", label: "Homicidal Ideation", fieldType: "checkbox", order: 2 },
              { key: "safety_plan", label: "Safety Plan in Place", fieldType: "checkbox", order: 3 },
              { key: "safety_details", label: "Safety Details", fieldType: "textarea", order: 4 },
            ] },
          pmhSection(4), medicationsSection(5), socialHistorySection(6), assessmentPlanSection(7),
        ]),
      ],
    },
    // 14. Psychology/Behavioral
    {
      specialty: "psychology-behavioral",
      templates: [
        makeTemplate("Behavioral Health Assessment", "psychology-behavioral", "outpatient", [
          hpiSection(1),
          { id: "bh-screening", type: "text", title: "Screening Tools", order: 2,
            fields: [
              { key: "phq9_score", label: "PHQ-9 Score", fieldType: "number", order: 1 },
              { key: "gad7_score", label: "GAD-7 Score", fieldType: "number", order: 2 },
              { key: "audit_score", label: "AUDIT-C Score", fieldType: "number", order: 3 },
            ] },
          socialHistorySection(3), assessmentPlanSection(4),
        ]),
      ],
    },
    // 15. Orthopedics
    {
      specialty: "orthopedics",
      templates: [
        makeTemplate("Orthopedic Evaluation", "orthopedics", "outpatient", [
          hpiSection(1),
          { id: "ortho-exam", type: "text", title: "Musculoskeletal Examination", order: 2,
            fields: [
              { key: "ortho_joint", label: "Joint/Region Examined", fieldType: "text", order: 1 },
              { key: "ortho_rom", label: "Range of Motion", fieldType: "textarea", order: 2 },
              { key: "ortho_strength", label: "Strength Testing", fieldType: "textarea", order: 3 },
              { key: "ortho_special_tests", label: "Special Tests", fieldType: "textarea", order: 4 },
              { key: "ortho_neurovascular", label: "Neurovascular Status", fieldType: "text", order: 5 },
              { key: "ortho_imaging", label: "Imaging Review", fieldType: "textarea", order: 6 },
            ] },
          assessmentPlanSection(3),
        ]),
      ],
    },
    // 16. General Surgery
    {
      specialty: "general-surgery",
      templates: [
        makeTemplate("Surgical Pre-Op Note", "general-surgery", "inpatient", [
          { id: "preop-header", type: "header", title: "PRE-OPERATIVE NOTE", order: 0, fields: [] },
          { id: "preop-info", type: "text", title: "Pre-Operative Information", order: 1,
            fields: [
              { key: "preop_procedure", label: "Planned Procedure", fieldType: "textarea", order: 1, validation: { required: true } },
              { key: "preop_indication", label: "Indication", fieldType: "textarea", order: 2 },
              { key: "preop_asa", label: "ASA Classification", fieldType: "select", order: 3, allowedValues: ["I", "II", "III", "IV", "V", "VI"] },
              { key: "preop_consent", label: "Consent Obtained", fieldType: "checkbox", order: 4 },
              { key: "preop_site_marked", label: "Surgical Site Marked", fieldType: "checkbox", order: 5 },
              { key: "preop_antibiotics", label: "Prophylactic Antibiotics", fieldType: "text", order: 6 },
            ] },
          pmhSection(2), medicationsSection(3), peSection(4),
        ]),
        makeTemplate("Operative Report", "general-surgery", "inpatient", [
          { id: "op-header", type: "header", title: "OPERATIVE REPORT", order: 0, fields: [] },
          { id: "op-info", type: "text", title: "Operative Details", order: 1,
            fields: [
              { key: "op_preop_dx", label: "Pre-Operative Diagnosis", fieldType: "textarea", order: 1, validation: { required: true } },
              { key: "op_postop_dx", label: "Post-Operative Diagnosis", fieldType: "textarea", order: 2, validation: { required: true } },
              { key: "op_procedure_name", label: "Procedure Performed", fieldType: "textarea", order: 3, validation: { required: true } },
              { key: "op_surgeon", label: "Surgeon", fieldType: "text", order: 4 },
              { key: "op_assistants", label: "Assistants", fieldType: "text", order: 5 },
              { key: "op_anesthesia", label: "Anesthesia Type", fieldType: "select", order: 6, allowedValues: ["General", "Spinal", "Epidural", "Regional", "Local", "MAC"] },
              { key: "op_findings", label: "Findings", fieldType: "textarea", order: 7 },
              { key: "op_technique", label: "Technique", fieldType: "textarea", order: 8 },
              { key: "op_specimens", label: "Specimens", fieldType: "textarea", order: 9 },
              { key: "op_ebl", label: "EBL (mL)", fieldType: "number", order: 10 },
              { key: "op_complications", label: "Complications", fieldType: "text", order: 11, defaults: "None" },
              { key: "op_disposition", label: "Disposition", fieldType: "text", order: 12 },
            ] },
        ]),
      ],
    },
    // 17. Anesthesia
    {
      specialty: "anesthesia",
      templates: [
        makeTemplate("Anesthesia Pre-Assessment", "anesthesia", "inpatient", [
          { id: "anes-eval", type: "text", title: "Anesthesia Evaluation", order: 1,
            fields: [
              { key: "anes_airway", label: "Airway Assessment (Mallampati)", fieldType: "select", order: 1, allowedValues: ["I", "II", "III", "IV"] },
              { key: "anes_asa", label: "ASA Classification", fieldType: "select", order: 2, allowedValues: ["I", "II", "III", "IV", "V", "VI"] },
              { key: "anes_npo_status", label: "NPO Status", fieldType: "text", order: 3 },
              { key: "anes_plan", label: "Anesthesia Plan", fieldType: "select", order: 4, allowedValues: ["General", "Spinal", "Epidural", "Regional Block", "MAC", "Local"] },
              { key: "anes_risk_discuss", label: "Risks Discussed", fieldType: "checkbox", order: 5 },
            ] },
          pmhSection(2), medicationsSection(3),
        ]),
      ],
    },
    // 18. ICU/Critical Care
    {
      specialty: "icu-critical-care",
      templates: [
        makeTemplate("ICU Daily Progress Note", "icu-critical-care", "inpatient", [
          { id: "icu-header", type: "header", title: "ICU DAILY PROGRESS NOTE", order: 0, fields: [] },
          { id: "icu-24", type: "text", title: "24-Hour Events", order: 1,
            fields: [
              { key: "icu_overnight", label: "Overnight Events", fieldType: "textarea", order: 1 },
              { key: "icu_vent_settings", label: "Ventilator Settings", fieldType: "text", order: 2 },
              { key: "icu_pressors", label: "Vasopressors/Drips", fieldType: "textarea", order: 3 },
              { key: "icu_io", label: "I/O Balance", fieldType: "text", order: 4 },
            ] },
          { id: "icu-systems", type: "text", title: "Systems Review", order: 2,
            fields: [
              { key: "icu_neuro", label: "Neuro", fieldType: "textarea", order: 1 },
              { key: "icu_cv", label: "Cardiovascular", fieldType: "textarea", order: 2 },
              { key: "icu_resp", label: "Respiratory", fieldType: "textarea", order: 3 },
              { key: "icu_gi", label: "GI/Nutrition", fieldType: "textarea", order: 4 },
              { key: "icu_renal", label: "Renal/Fluids", fieldType: "textarea", order: 5 },
              { key: "icu_id", label: "Infectious Disease", fieldType: "textarea", order: 6 },
              { key: "icu_heme", label: "Heme", fieldType: "textarea", order: 7 },
              { key: "icu_endo", label: "Endocrine", fieldType: "textarea", order: 8 },
              { key: "icu_prophylaxis", label: "Prophylaxis (DVT/GI/etc)", fieldType: "textarea", order: 9 },
            ] },
          assessmentPlanSection(3),
        ]),
      ],
    },
    // 19. Dermatology
    {
      specialty: "dermatology",
      templates: [
        makeTemplate("Dermatology Visit", "dermatology", "outpatient", [
          hpiSection(1),
          { id: "derm-exam", type: "text", title: "Skin Examination", order: 2,
            fields: [
              { key: "derm_location", label: "Location(s)", fieldType: "text", order: 1 },
              { key: "derm_morphology", label: "Morphology", fieldType: "textarea", order: 2 },
              { key: "derm_distribution", label: "Distribution", fieldType: "text", order: 3 },
              { key: "derm_size", label: "Size", fieldType: "text", order: 4 },
              { key: "derm_biopsy", label: "Biopsy Performed", fieldType: "checkbox", order: 5 },
            ] },
          assessmentPlanSection(3),
        ]),
      ],
    },
    // 20. Ophthalmology
    {
      specialty: "ophthalmology",
      templates: [
        makeTemplate("Ophthalmology Exam", "ophthalmology", "outpatient", [
          hpiSection(1),
          { id: "eye-exam", type: "text", title: "Ophthalmic Examination", order: 2,
            fields: [
              { key: "eye_va_od", label: "VA OD (Right)", fieldType: "text", order: 1 },
              { key: "eye_va_os", label: "VA OS (Left)", fieldType: "text", order: 2 },
              { key: "eye_iop_od", label: "IOP OD", fieldType: "number", order: 3 },
              { key: "eye_iop_os", label: "IOP OS", fieldType: "number", order: 4 },
              { key: "eye_slit_lamp", label: "Slit Lamp Exam", fieldType: "textarea", order: 5 },
              { key: "eye_fundus", label: "Fundoscopy", fieldType: "textarea", order: 6 },
            ] },
          assessmentPlanSection(3),
        ]),
      ],
    },
    // 21. ENT
    {
      specialty: "ent-otolaryngology",
      templates: [
        makeTemplate("ENT Evaluation", "ent-otolaryngology", "outpatient", [
          hpiSection(1),
          { id: "ent-exam", type: "text", title: "ENT Examination", order: 2,
            fields: [
              { key: "ent_ears", label: "Ears (Otoscopy)", fieldType: "textarea", order: 1 },
              { key: "ent_hearing", label: "Hearing Assessment", fieldType: "textarea", order: 2 },
              { key: "ent_nose", label: "Nasal Exam", fieldType: "textarea", order: 3 },
              { key: "ent_throat", label: "Throat/Oral Cavity", fieldType: "textarea", order: 4 },
              { key: "ent_neck", label: "Neck (Lymph nodes, thyroid)", fieldType: "textarea", order: 5 },
              { key: "ent_laryngoscopy", label: "Laryngoscopy", fieldType: "textarea", order: 6 },
            ] },
          assessmentPlanSection(3),
        ]),
      ],
    },
    // 22. Gastroenterology
    {
      specialty: "gastroenterology",
      templates: [
        makeTemplate("GI Consult", "gastroenterology", "any", [
          hpiSection(1),
          { id: "gi-specific", type: "text", title: "GI History", order: 2,
            fields: [
              { key: "gi_symptoms", label: "GI Symptoms", fieldType: "textarea", order: 1 },
              { key: "gi_bowel", label: "Bowel Habits", fieldType: "text", order: 2 },
              { key: "gi_diet", label: "Diet", fieldType: "text", order: 3 },
              { key: "gi_prior_scope", label: "Prior Endoscopy/Colonoscopy", fieldType: "textarea", order: 4 },
            ] },
          peSection(3), assessmentPlanSection(4),
        ]),
      ],
    },
    // 23. Oncology
    {
      specialty: "oncology",
      templates: [
        makeTemplate("Oncology Follow-Up", "oncology", "outpatient", [
          hpiSection(1),
          { id: "onc-status", type: "text", title: "Cancer Status", order: 2,
            fields: [
              { key: "onc_diagnosis", label: "Cancer Diagnosis/Stage", fieldType: "textarea", order: 1 },
              { key: "onc_treatment", label: "Current Treatment", fieldType: "textarea", order: 2 },
              { key: "onc_cycle", label: "Treatment Cycle", fieldType: "text", order: 3 },
              { key: "onc_toxicity", label: "Treatment Toxicity", fieldType: "textarea", order: 4 },
              { key: "onc_response", label: "Response Assessment", fieldType: "textarea", order: 5 },
            ] },
          peSection(3), assessmentPlanSection(4),
        ]),
      ],
    },
    // 24. Hematology
    {
      specialty: "hematology",
      templates: [
        makeTemplate("Hematology Consult", "hematology", "any", [
          hpiSection(1),
          { id: "heme-labs", type: "text", title: "Hematologic Data", order: 2,
            fields: [
              { key: "heme_cbc", label: "CBC Summary", fieldType: "textarea", order: 1 },
              { key: "heme_coags", label: "Coagulation Studies", fieldType: "textarea", order: 2 },
              { key: "heme_smear", label: "Peripheral Smear", fieldType: "textarea", order: 3 },
              { key: "heme_transfusion", label: "Transfusion History", fieldType: "textarea", order: 4 },
            ] },
          peSection(3), assessmentPlanSection(4),
        ]),
      ],
    },
    // 25. Radiology
    {
      specialty: "radiology",
      templates: [
        makeTemplate("Radiology Report Template", "radiology", "any", [
          { id: "rad-info", type: "text", title: "Study Information", order: 1,
            fields: [
              { key: "rad_modality", label: "Modality", fieldType: "select", order: 1, allowedValues: ["XR", "CT", "MRI", "US", "NM", "PET", "Fluoro", "Mammo"] },
              { key: "rad_body_part", label: "Body Part", fieldType: "text", order: 2 },
              { key: "rad_clinical_hx", label: "Clinical History", fieldType: "textarea", order: 3 },
              { key: "rad_comparison", label: "Comparison", fieldType: "textarea", order: 4 },
              { key: "rad_technique", label: "Technique", fieldType: "textarea", order: 5 },
            ] },
          { id: "rad-findings", type: "text", title: "Findings", order: 2,
            fields: [
              { key: "rad_findings", label: "Findings", fieldType: "textarea", order: 1 },
            ] },
          { id: "rad-impression", type: "text", title: "Impression", order: 3,
            fields: [
              { key: "rad_impression", label: "Impression", fieldType: "textarea", order: 1, validation: { required: true } },
            ] },
        ]),
      ],
    },
    // 26. Laboratory
    {
      specialty: "laboratory",
      templates: [
        makeTemplate("Lab Order Workflow Note", "laboratory", "any", [
          { id: "lab-order", type: "text", title: "Lab Order Information", order: 1,
            fields: [
              { key: "lab_tests_ordered", label: "Tests Ordered", fieldType: "textarea", order: 1 },
              { key: "lab_clinical_indication", label: "Clinical Indication", fieldType: "textarea", order: 2 },
              { key: "lab_specimen_type", label: "Specimen Type", fieldType: "text", order: 3 },
              { key: "lab_priority", label: "Priority", fieldType: "select", order: 4, allowedValues: ["Routine", "STAT", "Timed", "ASAP"] },
              { key: "lab_fasting", label: "Fasting Required", fieldType: "checkbox", order: 5 },
            ] },
          { id: "lab-results", type: "text", title: "Results Review", order: 2,
            fields: [
              { key: "lab_critical_values", label: "Critical Values", fieldType: "textarea", order: 1 },
              { key: "lab_interpretation", label: "Interpretation", fieldType: "textarea", order: 2 },
            ] },
        ]),
      ],
    },
    // 27. Nursing
    {
      specialty: "nursing",
      templates: [
        makeTemplate("Nursing Shift Note", "nursing", "inpatient", [
          { id: "nurse-header", type: "header", title: "NURSING SHIFT NOTE", order: 0, fields: [] },
          { id: "nurse-assess", type: "text", title: "Nursing Assessment", order: 1,
            fields: [
              { key: "nurse_neuro", label: "Neuro/Mental Status", fieldType: "textarea", order: 1 },
              { key: "nurse_cv", label: "Cardiovascular", fieldType: "textarea", order: 2 },
              { key: "nurse_resp", label: "Respiratory", fieldType: "textarea", order: 3 },
              { key: "nurse_gi", label: "GI/Nutrition", fieldType: "textarea", order: 4 },
              { key: "nurse_gu", label: "GU", fieldType: "textarea", order: 5 },
              { key: "nurse_skin", label: "Skin/Wound", fieldType: "textarea", order: 6 },
              { key: "nurse_pain", label: "Pain Assessment", fieldType: "text", order: 7 },
              { key: "nurse_safety", label: "Safety (fall risk, restraints)", fieldType: "textarea", order: 8 },
            ] },
          { id: "nurse-io", type: "text", title: "Intake/Output", order: 2,
            fields: [
              { key: "nurse_intake", label: "Total Intake (mL)", fieldType: "number", order: 1 },
              { key: "nurse_output", label: "Total Output (mL)", fieldType: "number", order: 2 },
              { key: "nurse_ivf", label: "IV Fluids", fieldType: "text", order: 3 },
            ] },
          { id: "nurse-handoff", type: "text", title: "Handoff Notes", order: 3,
            fields: [
              { key: "nurse_handoff", label: "Handoff to Next Shift", fieldType: "textarea", order: 1 },
            ] },
        ]),
      ],
    },
    // 28. Physical Therapy
    {
      specialty: "physical-therapy",
      templates: [
        makeTemplate("PT Evaluation", "physical-therapy", "any", [
          hpiSection(1),
          { id: "pt-eval", type: "text", title: "Functional Assessment", order: 2,
            fields: [
              { key: "pt_rom", label: "Range of Motion", fieldType: "textarea", order: 1 },
              { key: "pt_strength", label: "Strength", fieldType: "textarea", order: 2 },
              { key: "pt_balance", label: "Balance/Coordination", fieldType: "textarea", order: 3 },
              { key: "pt_gait", label: "Gait Analysis", fieldType: "textarea", order: 4 },
              { key: "pt_functional", label: "Functional Limitations", fieldType: "textarea", order: 5 },
              { key: "pt_goals", label: "Treatment Goals", fieldType: "textarea", order: 6 },
              { key: "pt_plan", label: "Treatment Plan", fieldType: "textarea", order: 7 },
            ] },
        ]),
      ],
    },
    // 29. Rehabilitation
    {
      specialty: "rehabilitation",
      templates: [
        makeTemplate("Rehab Progress Note", "rehabilitation", "inpatient", [
          { id: "rehab-status", type: "text", title: "Rehabilitation Status", order: 1,
            fields: [
              { key: "rehab_fim", label: "FIM Score", fieldType: "number", order: 1 },
              { key: "rehab_goals_progress", label: "Goals Progress", fieldType: "textarea", order: 2 },
              { key: "rehab_therapy_summary", label: "Therapy Summary", fieldType: "textarea", order: 3 },
              { key: "rehab_discharge_plan", label: "Discharge Planning", fieldType: "textarea", order: 4 },
            ] },
          assessmentPlanSection(2),
        ]),
      ],
    },
    // 30. Dental
    {
      specialty: "dental",
      templates: [
        makeTemplate("Dental Evaluation", "dental", "outpatient", [
          hpiSection(1),
          { id: "dental-exam", type: "text", title: "Oral/Dental Examination", order: 2,
            fields: [
              { key: "dental_soft_tissue", label: "Soft Tissue Exam", fieldType: "textarea", order: 1 },
              { key: "dental_hard_tissue", label: "Hard Tissue/Teeth", fieldType: "textarea", order: 2 },
              { key: "dental_periodontal", label: "Periodontal Status", fieldType: "textarea", order: 3 },
              { key: "dental_radiographs", label: "Radiographic Findings", fieldType: "textarea", order: 4 },
              { key: "dental_occlusion", label: "Occlusion", fieldType: "text", order: 5 },
            ] },
          assessmentPlanSection(3),
        ]),
      ],
    },
    // 31. Infectious Disease
    {
      specialty: "infectious-disease",
      templates: [
        makeTemplate("ID Consult", "infectious-disease", "any", [
          hpiSection(1),
          { id: "id-cultures", type: "text", title: "Microbiology Data", order: 2,
            fields: [
              { key: "id_cultures", label: "Culture Results", fieldType: "textarea", order: 1 },
              { key: "id_sensitivities", label: "Sensitivities", fieldType: "textarea", order: 2 },
              { key: "id_antibiotics", label: "Current Antibiotics", fieldType: "textarea", order: 3 },
              { key: "id_duration", label: "Duration of Treatment", fieldType: "text", order: 4 },
              { key: "id_source", label: "Suspected Source", fieldType: "text", order: 5 },
            ] },
          peSection(3), assessmentPlanSection(4),
        ]),
      ],
    },
    // 32. Urology
    {
      specialty: "urology",
      templates: [
        makeTemplate("Urology Evaluation", "urology", "outpatient", [
          hpiSection(1),
          { id: "uro-specific", type: "text", title: "Urologic Assessment", order: 2,
            fields: [
              { key: "uro_lower_tract", label: "Lower Urinary Tract Symptoms", fieldType: "textarea", order: 1 },
              { key: "uro_ipss", label: "IPSS Score", fieldType: "number", order: 2 },
              { key: "uro_psa", label: "PSA", fieldType: "number", order: 3 },
              { key: "uro_dre", label: "Digital Rectal Exam", fieldType: "textarea", order: 4 },
            ] },
          assessmentPlanSection(3),
        ]),
      ],
    },
    // 33. Rheumatology
    {
      specialty: "rheumatology",
      templates: [
        makeTemplate("Rheumatology Consult", "rheumatology", "outpatient", [
          hpiSection(1),
          { id: "rheum-joints", type: "text", title: "Joint Assessment", order: 2,
            fields: [
              { key: "rheum_active_joints", label: "Active Joints", fieldType: "textarea", order: 1 },
              { key: "rheum_swollen_count", label: "Swollen Joint Count", fieldType: "number", order: 2 },
              { key: "rheum_tender_count", label: "Tender Joint Count", fieldType: "number", order: 3 },
              { key: "rheum_morning_stiffness", label: "Morning Stiffness (minutes)", fieldType: "number", order: 4 },
              { key: "rheum_labs", label: "Rheumatologic Labs", fieldType: "textarea", order: 5 },
            ] },
          peSection(3), assessmentPlanSection(4),
        ]),
      ],
    },
    // 34. Family Planning
    {
      specialty: "family-planning",
      templates: [
        makeTemplate("Family Planning Visit", "family-planning", "outpatient", [
          hpiSection(1),
          { id: "fp-assess", type: "text", title: "Reproductive Health Assessment", order: 2,
            fields: [
              { key: "fp_lmp", label: "LMP", fieldType: "date", order: 1 },
              { key: "fp_current_method", label: "Current Contraceptive Method", fieldType: "text", order: 2 },
              { key: "fp_desired_method", label: "Desired Method", fieldType: "text", order: 3 },
              { key: "fp_obstetric_hx", label: "Obstetric History (G/P)", fieldType: "text", order: 4 },
              { key: "fp_counseling", label: "Counseling Provided", fieldType: "textarea", order: 5 },
            ] },
          assessmentPlanSection(3),
        ]),
      ],
    },
    // 35. Palliative Care
    {
      specialty: "palliative-care",
      templates: [
        makeTemplate("Palliative Care Consult", "palliative-care", "any", [
          hpiSection(1),
          { id: "pall-goals", type: "text", title: "Goals of Care", order: 2,
            fields: [
              { key: "pall_prognosis", label: "Prognosis Discussion", fieldType: "textarea", order: 1 },
              { key: "pall_goals", label: "Patient/Family Goals", fieldType: "textarea", order: 2 },
              { key: "pall_advance_directive", label: "Advance Directive Status", fieldType: "select", order: 3, allowedValues: ["Full Code", "DNR", "DNR/DNI", "Comfort Measures Only", "Not Discussed"] },
              { key: "pall_symptoms", label: "Symptom Burden", fieldType: "textarea", order: 4 },
              { key: "pall_spiritual", label: "Spiritual/Psychosocial Needs", fieldType: "textarea", order: 5 },
            ] },
          medicationsSection(3), assessmentPlanSection(4),
        ]),
      ],
    },
    // 36. Geriatrics
    {
      specialty: "geriatrics",
      templates: [
        makeTemplate("Geriatric Assessment", "geriatrics", "outpatient", [
          hpiSection(1),
          { id: "geri-functional", type: "text", title: "Functional Assessment", order: 2,
            fields: [
              { key: "geri_adl", label: "ADLs", fieldType: "textarea", order: 1 },
              { key: "geri_iadl", label: "IADLs", fieldType: "textarea", order: 2 },
              { key: "geri_falls", label: "Fall History", fieldType: "textarea", order: 3 },
              { key: "geri_cognition", label: "Cognitive Screen (MMSE/MoCA)", fieldType: "text", order: 4 },
              { key: "geri_nutrition", label: "Nutritional Status", fieldType: "textarea", order: 5 },
              { key: "geri_polypharmacy", label: "Polypharmacy Review", fieldType: "textarea", order: 6 },
            ] },
          medicationsSection(3), socialHistorySection(4), assessmentPlanSection(5),
        ]),
      ],
    },
    // 37. Allergy/Immunology
    {
      specialty: "allergy-immunology",
      templates: [
        makeTemplate("Allergy/Immunology Consult", "allergy-immunology", "outpatient", [
          hpiSection(1),
          { id: "allergy-eval", type: "text", title: "Allergy Evaluation", order: 2,
            fields: [
              { key: "allg_triggers", label: "Known Triggers", fieldType: "textarea", order: 1 },
              { key: "allg_testing", label: "Allergy Testing Results", fieldType: "textarea", order: 2 },
              { key: "allg_immunotherapy", label: "Immunotherapy Status", fieldType: "text", order: 3 },
              { key: "allg_emergency_plan", label: "Emergency Action Plan", fieldType: "checkbox", order: 4 },
            ] },
          peSection(3), assessmentPlanSection(4),
        ]),
      ],
    },
    // 38. Vascular Surgery
    {
      specialty: "vascular-surgery",
      templates: [
        makeTemplate("Vascular Surgery Consult", "vascular-surgery", "any", [
          hpiSection(1),
          { id: "vasc-assess", type: "text", title: "Vascular Assessment", order: 2,
            fields: [
              { key: "vasc_pulses", label: "Peripheral Pulses", fieldType: "textarea", order: 1 },
              { key: "vasc_abi", label: "ABI Results", fieldType: "text", order: 2 },
              { key: "vasc_duplex", label: "Duplex/Imaging Results", fieldType: "textarea", order: 3 },
              { key: "vasc_wounds", label: "Wound Assessment", fieldType: "textarea", order: 4 },
            ] },
          peSection(3), assessmentPlanSection(4),
        ]),
      ],
    },
    // 39. Plastic Surgery
    {
      specialty: "plastic-surgery",
      templates: [
        makeTemplate("Plastic Surgery Consult", "plastic-surgery", "any", [
          hpiSection(1),
          { id: "plastics-assess", type: "text", title: "Plastic Surgery Assessment", order: 2,
            fields: [
              { key: "plastics_indication", label: "Indication", fieldType: "textarea", order: 1 },
              { key: "plastics_wound", label: "Wound/Defect Description", fieldType: "textarea", order: 2 },
              { key: "plastics_photos", label: "Photos Obtained", fieldType: "checkbox", order: 3 },
              { key: "plastics_plan", label: "Reconstruction Plan", fieldType: "textarea", order: 4 },
            ] },
          assessmentPlanSection(3),
        ]),
      ],
    },
    // 40. Podiatry
    {
      specialty: "podiatry",
      templates: [
        makeTemplate("Podiatry Evaluation", "podiatry", "outpatient", [
          hpiSection(1),
          { id: "pod-exam", type: "text", title: "Foot Examination", order: 2,
            fields: [
              { key: "pod_skin_nails", label: "Skin/Nails", fieldType: "textarea", order: 1 },
              { key: "pod_vascular", label: "Vascular Status", fieldType: "textarea", order: 2 },
              { key: "pod_neuro", label: "Neurological (monofilament)", fieldType: "textarea", order: 3 },
              { key: "pod_msk", label: "Musculoskeletal", fieldType: "textarea", order: 4 },
              { key: "pod_biomech", label: "Biomechanical", fieldType: "textarea", order: 5 },
            ] },
          assessmentPlanSection(3),
        ]),
      ],
    },
    // 41. Nutrition/Dietetics
    {
      specialty: "nutrition-dietetics",
      templates: [
        makeTemplate("Nutrition Assessment", "nutrition-dietetics", "any", [
          { id: "nutr-assess", type: "text", title: "Nutritional Assessment", order: 1,
            fields: [
              { key: "nutr_diet_hx", label: "Diet History", fieldType: "textarea", order: 1 },
              { key: "nutr_weight", label: "Weight/BMI", fieldType: "text", order: 2 },
              { key: "nutr_labs", label: "Nutrition Labs", fieldType: "textarea", order: 3 },
              { key: "nutr_requirements", label: "Caloric/Protein Requirements", fieldType: "text", order: 4 },
              { key: "nutr_restrictions", label: "Dietary Restrictions", fieldType: "textarea", order: 5 },
              { key: "nutr_recommendations", label: "Recommendations", fieldType: "textarea", order: 6 },
            ] },
        ]),
      ],
    },
    // 42. Social Work
    {
      specialty: "social-work",
      templates: [
        makeTemplate("Social Work Assessment", "social-work", "any", [
          { id: "sw-assess", type: "text", title: "Psychosocial Assessment", order: 1,
            fields: [
              { key: "sw_reason", label: "Reason for Referral", fieldType: "textarea", order: 1 },
              { key: "sw_living", label: "Living Situation", fieldType: "textarea", order: 2 },
              { key: "sw_support", label: "Support System", fieldType: "textarea", order: 3 },
              { key: "sw_financial", label: "Financial/Insurance Concerns", fieldType: "textarea", order: 4 },
              { key: "sw_safety", label: "Safety Concerns", fieldType: "textarea", order: 5 },
              { key: "sw_plan", label: "Social Work Plan", fieldType: "textarea", order: 6 },
              { key: "sw_resources", label: "Resources/Referrals Provided", fieldType: "textarea", order: 7 },
            ] },
        ]),
      ],
    },
    // 43. Clinical Pharmacy
    {
      specialty: "pharmacy-clinical",
      templates: [
        makeTemplate("Clinical Pharmacy Review", "pharmacy-clinical", "any", [
          { id: "pharm-review", type: "text", title: "Medication Review", order: 1,
            fields: [
              { key: "pharm_med_list", label: "Current Medications", fieldType: "textarea", order: 1, mappingTarget: { vistaReadRpc: "ORWPS ACTIVE", vistaReadStatus: "available" } },
              { key: "pharm_interactions", label: "Drug Interactions Identified", fieldType: "textarea", order: 2 },
              { key: "pharm_duplicates", label: "Therapeutic Duplications", fieldType: "textarea", order: 3 },
              { key: "pharm_dose_adjust", label: "Dose Adjustments Recommended", fieldType: "textarea", order: 4 },
              { key: "pharm_monitoring", label: "Monitoring Recommendations", fieldType: "textarea", order: 5 },
              { key: "pharm_recommendations", label: "Pharmacist Recommendations", fieldType: "textarea", order: 6 },
            ] },
        ]),
      ],
    },
    // 44. Wound Care
    {
      specialty: "wound-care",
      templates: [
        makeTemplate("Wound Care Assessment", "wound-care", "any", [
          { id: "wound-assess", type: "text", title: "Wound Assessment", order: 1,
            fields: [
              { key: "wound_location", label: "Wound Location", fieldType: "text", order: 1 },
              { key: "wound_type", label: "Wound Type", fieldType: "select", order: 2, allowedValues: ["Pressure Injury", "Surgical", "Diabetic Ulcer", "Venous Ulcer", "Arterial Ulcer", "Traumatic", "Burn", "Other"] },
              { key: "wound_stage", label: "Stage/Grade", fieldType: "text", order: 3 },
              { key: "wound_size", label: "Size (L x W x D cm)", fieldType: "text", order: 4 },
              { key: "wound_bed", label: "Wound Bed Description", fieldType: "textarea", order: 5 },
              { key: "wound_edges", label: "Wound Edges/Periwound", fieldType: "textarea", order: 6 },
              { key: "wound_exudate", label: "Exudate", fieldType: "text", order: 7 },
              { key: "wound_treatment", label: "Treatment Applied", fieldType: "textarea", order: 8 },
            ] },
          assessmentPlanSection(2),
        ]),
      ],
    },
    // 45. Pain Management
    {
      specialty: "pain-management",
      templates: [
        makeTemplate("Pain Management Evaluation", "pain-management", "outpatient", [
          hpiSection(1),
          { id: "pain-assess", type: "text", title: "Pain Assessment", order: 2,
            fields: [
              { key: "pain_location", label: "Pain Location(s)", fieldType: "textarea", order: 1 },
              { key: "pain_type", label: "Pain Type", fieldType: "select", order: 2, allowedValues: ["Nociceptive", "Neuropathic", "Mixed", "Central Sensitization", "Visceral"] },
              { key: "pain_intensity", label: "Pain Intensity (0-10)", fieldType: "number", order: 3, validation: { min: 0, max: 10 } },
              { key: "pain_functional_impact", label: "Functional Impact", fieldType: "textarea", order: 4 },
              { key: "pain_prior_treatments", label: "Prior Treatments", fieldType: "textarea", order: 5 },
              { key: "pain_opioid_risk", label: "Opioid Risk Assessment", fieldType: "textarea", order: 6 },
              { key: "pain_pdmp_reviewed", label: "PDMP Reviewed", fieldType: "checkbox", order: 7 },
            ] },
          medicationsSection(3), assessmentPlanSection(4),
        ]),
      ],
    },
    // Additional cross-cutting templates
    // Discharge Summary (used by multiple specialties)
    {
      specialty: "internal-medicine" as SpecialtyTag,
      templates: [
        makeTemplate("Discharge Summary", "internal-medicine", "inpatient", [
          { id: "dc-header", type: "header", title: "DISCHARGE SUMMARY", order: 0, fields: [] },
          { id: "dc-info", type: "text", title: "Discharge Information", order: 1,
            fields: [
              { key: "dc_admit_date", label: "Admission Date", fieldType: "date", order: 1 },
              { key: "dc_discharge_date", label: "Discharge Date", fieldType: "date", order: 2 },
              { key: "dc_admit_dx", label: "Admitting Diagnosis", fieldType: "textarea", order: 3 },
              { key: "dc_discharge_dx", label: "Discharge Diagnosis", fieldType: "textarea", order: 4, validation: { required: true } },
              { key: "dc_hospital_course", label: "Hospital Course", fieldType: "textarea", order: 5, validation: { required: true } },
              { key: "dc_procedures", label: "Procedures Performed", fieldType: "textarea", order: 6 },
              { key: "dc_discharge_meds", label: "Discharge Medications", fieldType: "textarea", order: 7 },
              { key: "dc_discharge_instructions", label: "Discharge Instructions", fieldType: "textarea", order: 8 },
              { key: "dc_followup", label: "Follow-up Appointments", fieldType: "textarea", order: 9 },
              { key: "dc_condition", label: "Condition at Discharge", fieldType: "select", order: 10, allowedValues: ["Stable", "Improved", "Fair", "Guarded", "Critical"] },
            ] },
        ], ["internal-medicine", "discharge"], "Inpatient discharge summary template"),
      ],
    },
  ];
}
