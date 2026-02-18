/**
 * Specialty Packs: Primary Care, Pediatrics, OB/GYN, Cardiology, Behavioral Health
 * These add specialty-specific items on top of complaint packs
 */
import type { IntakePack } from "../types.js";

export const primaryCarePack: IntakePack = {
  packId: "specialty-primary-care-v1", version: "1.0.0",
  title: "Primary Care Intake Supplement", description: "Annual wellness, preventive screening, medication reconciliation",
  languages: ["en"],
  applicableContexts: { departments: ["primary_care", "family_medicine", "internal_medicine"], specialties: ["primary_care", "family_medicine", "internal_medicine"], visitTypes: ["annual_wellness", "new_patient", "follow_up"] },
  requiredCoverage: ["medications", "allergies", "social_hx", "preventive"],
  items: [
    { linkId: "pc-med-changes", type: "boolean", text: "Have your medications changed since your last visit?", section: "medications", required: true, order: 60 },
    { linkId: "pc-med-list", type: "string", text: "Please list any medication changes (new, stopped, dose changes):", section: "medications", required: false, order: 61, enableWhen: [{ question: "pc-med-changes", operator: "=", answer: true }] },
    { linkId: "pc-allergy-changes", type: "boolean", text: "Any new allergies or reactions to medications?", section: "allergies", required: true, order: 62, vistaTarget: { rpc: "ORWDAL32 SAVE ALLERGY", field: "GMRAGNT", integrationStatus: "available" } },
    { linkId: "pc-allergy-detail", type: "string", text: "Describe the new allergy/reaction:", section: "allergies", required: false, order: 63, enableWhen: [{ question: "pc-allergy-changes", operator: "=", answer: true }] },
    { linkId: "pc-tobacco", type: "choice", text: "Tobacco use status:", section: "social_hx", required: true, order: 70, answerOption: [{ value: "never", display: "Never smoked" }, { value: "former", display: "Former smoker" }, { value: "current", display: "Current smoker" }, { value: "vape", display: "E-cigarettes/vaping" }] },
    { linkId: "pc-alcohol", type: "choice", text: "Alcohol use:", section: "social_hx", required: true, order: 71, answerOption: [{ value: "none", display: "None" }, { value: "social", display: "Social/occasional" }, { value: "moderate", display: "1-2 drinks daily" }, { value: "heavy", display: "3+ drinks daily" }] },
    { linkId: "pc-exercise", type: "choice", text: "Physical activity level:", section: "social_hx", required: true, order: 72, answerOption: [{ value: "none", display: "Sedentary" }, { value: "light", display: "Light (walking)" }, { value: "moderate", display: "Moderate (30min 3x/week)" }, { value: "active", display: "Active (most days)" }] },
    { linkId: "pc-falls", type: "boolean", text: "Have you had any falls in the past year?", section: "preventive", required: true, order: 80 },
    { linkId: "pc-vaccines", type: "boolean", text: "Are you up to date on vaccinations (flu, COVID, pneumonia, shingles)?", section: "preventive", required: true, order: 81 },
    { linkId: "pc-screening", type: "boolean", text: "Are you up to date on cancer screenings (colonoscopy, mammogram, etc.)?", section: "preventive", required: true, order: 82 },
  ],
  complaintClusters: [], specialtyTags: ["primary_care", "family_medicine", "internal_medicine"], departmentTags: ["primary_care"], priority: 50,
  outputTemplates: { hpiTemplate: "", rosTemplate: "", noteTemplate: "MEDICATIONS: Changes: {{pc-med-changes}}. {{pc-med-list}}\nALLERGIES: New: {{pc-allergy-changes}}. {{pc-allergy-detail}}\nSOCIAL: Tobacco {{pc-tobacco}}, alcohol {{pc-alcohol}}, exercise {{pc-exercise}}.\nPREVENTIVE: Falls {{pc-falls}}, vaccines current {{pc-vaccines}}, screenings current {{pc-screening}}." },
  scoringThresholds: [],
};

export const pediatricsPack: IntakePack = {
  packId: "specialty-pediatrics-v1", version: "1.0.0",
  title: "Pediatrics Intake Supplement", description: "Growth, development, immunizations, school",
  languages: ["en"],
  applicableContexts: { departments: ["pediatrics"], specialties: ["pediatrics"], visitTypes: ["well_child", "new_patient", "sick_visit"], ageRange: { minYears: 0, maxYears: 17 } },
  requiredCoverage: ["growth", "development", "immunizations"],
  items: [
    { linkId: "ped-who-filling", type: "choice", text: "Who is filling out this form?", section: "demographics", required: true, order: 25, answerOption: [{ value: "parent", display: "Parent" }, { value: "guardian", display: "Legal guardian" }, { value: "self", display: "Patient (teen)" }] },
    { linkId: "ped-growth-concern", type: "boolean", text: "Any concerns about growth or weight?", section: "growth", required: true, order: 60 },
    { linkId: "ped-development", type: "boolean", text: "Any concerns about development (speech, motor, learning)?", section: "development", required: true, order: 61 },
    { linkId: "ped-behavior", type: "boolean", text: "Any behavioral concerns?", section: "development", required: true, order: 62 },
    { linkId: "ped-school", type: "choice", text: "How is school going?", section: "development", required: false, order: 63, answerOption: [{ value: "well", display: "Doing well" }, { value: "some_issues", display: "Some difficulties" }, { value: "struggling", display: "Struggling" }, { value: "not_applicable", display: "Not school age" }] },
    { linkId: "ped-immunizations", type: "boolean", text: "Are immunizations up to date?", section: "immunizations", required: true, order: 70 },
    { linkId: "ped-diet", type: "choice", text: "How would you describe the child's diet?", section: "social_hx", required: true, order: 71, answerOption: [{ value: "balanced", display: "Balanced/varied" }, { value: "picky", display: "Picky eater" }, { value: "restricted", display: "Restricted diet" }] },
    { linkId: "ped-sleep-hours", type: "choice", text: "How many hours of sleep per night?", section: "social_hx", required: true, order: 72, answerOption: [{ value: "adequate", display: "Age-appropriate amount" }, { value: "insufficient", display: "Less than recommended" }, { value: "excessive", display: "More than recommended" }] },
    { linkId: "ped-screen-time", type: "choice", text: "Average daily screen time:", section: "social_hx", required: true, order: 73, answerOption: [{ value: "minimal", display: "Under 1 hour" }, { value: "moderate", display: "1-2 hours" }, { value: "high", display: "2-4 hours" }, { value: "excessive", display: "Over 4 hours" }] },
  ],
  complaintClusters: [], specialtyTags: ["pediatrics"], departmentTags: ["pediatrics"], priority: 50,
  outputTemplates: { hpiTemplate: "", rosTemplate: "", noteTemplate: "PEDIATRIC: Respondent: {{ped-who-filling}}. Growth concerns: {{ped-growth-concern}}. Development: {{ped-development}}. Behavior: {{ped-behavior}}. School: {{ped-school}}.\nIMMUNIZATIONS: Current: {{ped-immunizations}}.\nSOCIAL: Diet {{ped-diet}}, sleep {{ped-sleep-hours}}, screen time {{ped-screen-time}}." },
  scoringThresholds: [],
};

export const obgynPack: IntakePack = {
  packId: "specialty-obgyn-v1", version: "1.0.0",
  title: "OB/GYN Intake Supplement", description: "Menstrual, obstetric, and gynecologic history",
  languages: ["en"],
  applicableContexts: { departments: ["obgyn", "womens_health"], specialties: ["obstetrics", "gynecology", "obgyn"], visitTypes: ["*"], sexAtBirth: "female" },
  requiredCoverage: ["menstrual_hx", "ob_hx"],
  items: [
    { linkId: "ob-lmp", type: "string", text: "Date of last menstrual period (LMP):", section: "menstrual_hx", required: true, order: 60 },
    { linkId: "ob-cycle-regular", type: "boolean", text: "Are your periods regular?", section: "menstrual_hx", required: true, order: 61 },
    { linkId: "ob-cycle-length", type: "choice", text: "Average cycle length:", section: "menstrual_hx", required: true, order: 62, answerOption: [{ value: "short", display: "Less than 21 days" }, { value: "normal", display: "21-35 days" }, { value: "long", display: "More than 35 days" }, { value: "irregular", display: "Very irregular" }] },
    { linkId: "ob-bleeding-heavy", type: "boolean", text: "Heavy or prolonged bleeding?", section: "menstrual_hx", required: true, order: 63 },
    { linkId: "ob-pregnant-now", type: "choice", text: "Current pregnancy status:", section: "ob_hx", required: true, order: 70, answerOption: [{ value: "not_pregnant", display: "Not pregnant" }, { value: "possibly", display: "Possibly pregnant" }, { value: "confirmed", display: "Confirmed pregnant" }, { value: "postpartum", display: "Postpartum" }, { value: "na", display: "Not applicable" }] },
    { linkId: "ob-gravida", type: "integer", text: "Total number of pregnancies (gravida):", section: "ob_hx", required: true, order: 71 },
    { linkId: "ob-para", type: "integer", text: "Number of deliveries (para):", section: "ob_hx", required: true, order: 72 },
    { linkId: "ob-contraception", type: "choice", text: "Current contraception method:", section: "ob_hx", required: false, order: 73, answerOption: [{ value: "none", display: "None" }, { value: "pill", display: "Birth control pill" }, { value: "iud", display: "IUD" }, { value: "implant", display: "Implant" }, { value: "condom", display: "Condom/barrier" }, { value: "surgical", display: "Surgical (tubal/vasectomy)" }, { value: "other", display: "Other" }] },
    { linkId: "ob-pap-date", type: "string", text: "Date of last Pap smear (if known):", section: "preventive", required: false, order: 80 },
    { linkId: "ob-mammogram-date", type: "string", text: "Date of last mammogram (if applicable):", section: "preventive", required: false, order: 81 },
  ],
  complaintClusters: [], specialtyTags: ["obstetrics", "gynecology", "obgyn"], departmentTags: ["obgyn", "womens_health"], priority: 50,
  outputTemplates: { hpiTemplate: "", rosTemplate: "", noteTemplate: "OB/GYN: LMP {{ob-lmp}}. Cycle: regular {{ob-cycle-regular}}, length {{ob-cycle-length}}, heavy {{ob-bleeding-heavy}}.\nOB HX: G{{ob-gravida}}P{{ob-para}}. Pregnancy status: {{ob-pregnant-now}}. Contraception: {{ob-contraception}}.\nPREVENTIVE: Last Pap {{ob-pap-date}}, last mammogram {{ob-mammogram-date}}." },
  scoringThresholds: [],
};

export const cardiologyPack: IntakePack = {
  packId: "specialty-cardiology-v1", version: "1.0.0",
  title: "Cardiology Intake Supplement", description: "Cardiac history, functional status, risk factors",
  languages: ["en"],
  applicableContexts: { departments: ["cardiology"], specialties: ["cardiology"], visitTypes: ["*"] },
  requiredCoverage: ["cardiac_hx", "functional_status"],
  items: [
    { linkId: "card-hx-mi", type: "boolean", text: "History of heart attack?", section: "cardiac_hx", required: true, order: 60 },
    { linkId: "card-hx-stent", type: "boolean", text: "History of stent or bypass surgery?", section: "cardiac_hx", required: true, order: 61 },
    { linkId: "card-hx-afib", type: "boolean", text: "History of atrial fibrillation or irregular heartbeat?", section: "cardiac_hx", required: true, order: 62 },
    { linkId: "card-hx-valve", type: "boolean", text: "History of heart valve disease?", section: "cardiac_hx", required: true, order: 63 },
    { linkId: "card-hx-chf", type: "boolean", text: "History of heart failure?", section: "cardiac_hx", required: true, order: 64 },
    { linkId: "card-nyha", type: "choice", text: "Which describes your current activity level?", section: "functional_status", required: true, order: 70, answerOption: [{ value: "I", display: "No limitation - normal activities are fine" }, { value: "II", display: "Slight limitation - comfortable at rest, symptoms with ordinary activity" }, { value: "III", display: "Marked limitation - comfortable at rest, symptoms with less than ordinary activity" }, { value: "IV", display: "Unable to carry out any activity without symptoms; symptoms at rest" }] },
    { linkId: "card-chest-pain-now", type: "boolean", text: "Are you having chest pain right now?", section: "ros", required: true, order: 40, redFlag: { condition: "true", message: "Active chest pain in cardiology patient", severity: "critical" } },
    { linkId: "card-palpitations", type: "boolean", text: "Palpitations or irregular heartbeat recently?", section: "ros", required: true, order: 41 },
    { linkId: "card-syncope", type: "boolean", text: "Have you fainted or nearly fainted recently?", section: "ros", required: true, order: 42, redFlag: { condition: "true", message: "Syncope in cardiac patient - arrhythmia/structural concern", severity: "high" } },
    { linkId: "card-edema", type: "boolean", text: "Leg or ankle swelling?", section: "ros", required: true, order: 43 },
    { linkId: "card-weight-gain", type: "boolean", text: "Sudden weight gain (5+ lbs in a week)?", section: "ros", required: true, order: 44, redFlag: { condition: "true", message: "Rapid weight gain - CHF exacerbation", severity: "high" } },
  ],
  complaintClusters: [], specialtyTags: ["cardiology"], departmentTags: ["cardiology"], priority: 50,
  outputTemplates: { hpiTemplate: "", rosTemplate: "CV: Chest pain {{card-chest-pain-now}}, palpitations {{card-palpitations}}, syncope {{card-syncope}}, edema {{card-edema}}, weight gain {{card-weight-gain}}.", noteTemplate: "CARDIAC HX: MI {{card-hx-mi}}, stent/CABG {{card-hx-stent}}, AFib {{card-hx-afib}}, valve {{card-hx-valve}}, CHF {{card-hx-chf}}.\nNYHA Class: {{card-nyha}}." },
  scoringThresholds: [],
};

export const behavioralHealthPack: IntakePack = {
  packId: "specialty-behavioral-health-v1", version: "1.0.0",
  title: "Behavioral Health Intake Supplement", description: "Psychiatric history, substance use, safety screening",
  languages: ["en"],
  applicableContexts: { departments: ["behavioral_health", "psychiatry", "psychology"], specialties: ["behavioral_health", "psychiatry", "psychology"], visitTypes: ["*"] },
  requiredCoverage: ["psych_hx", "substance_use", "safety"],
  items: [
    { linkId: "bh-prior-treatment", type: "boolean", text: "Have you received mental health treatment before?", section: "psych_hx", required: true, order: 60 },
    { linkId: "bh-current-therapy", type: "boolean", text: "Are you currently in therapy?", section: "psych_hx", required: true, order: 61 },
    { linkId: "bh-psych-meds", type: "boolean", text: "Are you taking psychiatric medications?", section: "psych_hx", required: true, order: 62 },
    { linkId: "bh-hospitalization", type: "boolean", text: "Any psychiatric hospitalizations?", section: "psych_hx", required: true, order: 63 },
    { linkId: "bh-trauma", type: "boolean", text: "History of significant trauma or abuse?", section: "psych_hx", required: false, order: 64 },
    // AUDIT-C
    { linkId: "bh-audit-freq", type: "choice", text: "How often do you have a drink containing alcohol?", section: "substance_use", required: true, order: 70,
      scoring: { instrument: "AUDIT-C", itemWeight: 1 },
      answerOption: [{ value: "0", display: "Never" }, { value: "1", display: "Monthly or less" }, { value: "2", display: "2-4 times a month" }, { value: "3", display: "2-3 times a week" }, { value: "4", display: "4+ times a week" }] },
    { linkId: "bh-audit-amount", type: "choice", text: "On a drinking day, how many drinks do you typically have?", section: "substance_use", required: true, order: 71,
      scoring: { instrument: "AUDIT-C", itemWeight: 1 },
      answerOption: [{ value: "0", display: "1-2" }, { value: "1", display: "3-4" }, { value: "2", display: "5-6" }, { value: "3", display: "7-9" }, { value: "4", display: "10+" }] },
    { linkId: "bh-audit-binge", type: "choice", text: "How often do you have 6+ drinks on one occasion?", section: "substance_use", required: true, order: 72,
      scoring: { instrument: "AUDIT-C", itemWeight: 1 },
      answerOption: [{ value: "0", display: "Never" }, { value: "1", display: "Less than monthly" }, { value: "2", display: "Monthly" }, { value: "3", display: "Weekly" }, { value: "4", display: "Daily or almost daily" }] },
    { linkId: "bh-drugs", type: "boolean", text: "Do you use recreational drugs or non-prescribed substances?", section: "substance_use", required: true, order: 73 },
    // Safety
    { linkId: "bh-si-current", type: "boolean", text: "Are you currently having thoughts of suicide?", section: "safety", required: true, order: 80, redFlag: { condition: "true", message: "ACTIVE SUICIDAL IDEATION - immediate assessment", severity: "critical" } },
    { linkId: "bh-si-past", type: "boolean", text: "Have you ever attempted suicide?", section: "safety", required: true, order: 81, redFlag: { condition: "true", message: "History of suicide attempt - elevated risk", severity: "high" } },
    { linkId: "bh-hi", type: "boolean", text: "Are you having thoughts of harming others?", section: "safety", required: true, order: 82, redFlag: { condition: "true", message: "HOMICIDAL IDEATION - immediate safety assessment", severity: "critical" } },
    { linkId: "bh-firearms", type: "boolean", text: "Do you have access to firearms?", section: "safety", required: true, order: 83 },
  ],
  complaintClusters: [], specialtyTags: ["behavioral_health", "psychiatry", "psychology"], departmentTags: ["behavioral_health", "psychiatry"], priority: 50,
  outputTemplates: { hpiTemplate: "", rosTemplate: "", noteTemplate: "PSYCH HX: Prior treatment {{bh-prior-treatment}}, current therapy {{bh-current-therapy}}, psych meds {{bh-psych-meds}}, hospitalizations {{bh-hospitalization}}.\nSUBSTANCE: Drugs {{bh-drugs}}.\nSAFETY: Current SI {{bh-si-current}}, past attempts {{bh-si-past}}, HI {{bh-hi}}, firearm access {{bh-firearms}}.\nAUDIT-C: Freq {{bh-audit-freq}}, amount {{bh-audit-amount}}, binge {{bh-audit-binge}}." },
  scoringThresholds: [{ instrument: "AUDIT-C", cutoff: 4, action: "flag_for_review", message: "AUDIT-C score >= 4 suggests problematic alcohol use (men); >= 3 for women" }],
};
