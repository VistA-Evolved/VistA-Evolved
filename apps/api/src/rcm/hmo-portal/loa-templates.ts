/**
 * LOA Templates -- Phase 97B: Per-HMO LOA Configuration
 *
 * Defines per-HMO LOA request templates with required fields,
 * specialty-specific rules, and payer-specific formatting.
 *
 * These templates drive the LOA packet generation in loa-workflow.ts.
 * They are NOT clinical templates -- they define what information
 * each payer requires for pre-authorization.
 *
 * VistA-first: all clinical data fields reference VistA source RPCs.
 */

/* -- LOA Template Types --------------------------------------- */

export interface LoaRequiredField {
  field: string;
  label: string;
  required: boolean;
  vistaSource: string | null; // RPC or file ref if available
  vistaStatus: 'available' | 'integration_pending';
  notes?: string;
}

export interface LoaSpecialtyRule {
  specialty: string; // e.g. "surgery", "radiology", "laboratory"
  additionalFields: string[]; // extra required fields for this specialty
  turnaroundDays: number | null; // expected turnaround from payer (null = unknown)
  notes: string;
}

export interface LoaTemplateConfig {
  payerId: string;
  payerName: string;
  submissionMethod: 'portal' | 'email' | 'fax' | 'manual';
  portalUrl: string | null;
  requiredFields: LoaRequiredField[];
  specialtyRules: LoaSpecialtyRule[];
  defaultTurnaroundDays: number | null;
  attachmentRequirements: string[];
  loaValidityDays: number | null; // how long approved LOA is valid
  notes: string[];
}

/* -- Common required fields (shared across all HMOs) ---------- */

const COMMON_REQUIRED_FIELDS: LoaRequiredField[] = [
  {
    field: 'patientName',
    label: 'Patient Full Name',
    required: true,
    vistaSource: 'ORWPT SELECT (DFN lookup)',
    vistaStatus: 'available',
  },
  {
    field: 'memberId',
    label: 'HMO Member/Card Number',
    required: true,
    vistaSource: null,
    vistaStatus: 'integration_pending',
    notes: 'VistA IBCNS insurance file -- empty in sandbox',
  },
  {
    field: 'dateOfBirth',
    label: 'Date of Birth',
    required: true,
    vistaSource: 'ORWPT SELECT (DOB field)',
    vistaStatus: 'available',
  },
  {
    field: 'diagnosisCodes',
    label: 'ICD-10 Diagnosis Codes',
    required: true,
    vistaSource: 'ORQQPL LIST (Problem List) / ORWPCE DIAG',
    vistaStatus: 'available',
  },
  {
    field: 'procedureCodes',
    label: 'CPT/HCPCS Procedure Codes',
    required: true,
    vistaSource: 'ORWPCE PCE4NOTE (encounter CPT codes)',
    vistaStatus: 'available',
  },
  {
    field: 'attendingPhysician',
    label: 'Attending Physician Name + PRC License',
    required: true,
    vistaSource: 'ORWU NEWPERS (provider lookup)',
    vistaStatus: 'available',
    notes: 'PRC license number not in VistA -- manual entry required',
  },
  {
    field: 'facilityName',
    label: 'Facility / Hospital Name',
    required: true,
    vistaSource: 'Institution file (#4)',
    vistaStatus: 'available',
  },
  {
    field: 'clinicalJustification',
    label: 'Clinical Justification / Medical Necessity',
    required: true,
    vistaSource: 'TIU DOCUMENTS BY CONTEXT (clinical notes)',
    vistaStatus: 'available',
  },
];

/* -- Common specialty rules ----------------------------------- */

const SURGERY_RULE: LoaSpecialtyRule = {
  specialty: 'surgery',
  additionalFields: ['estimatedDuration', 'anesthesiaType', 'surgicalApproach', 'roomType'],
  turnaroundDays: null,
  notes: 'Most HMOs require pre-authorization for all surgical procedures',
};

const RADIOLOGY_RULE: LoaSpecialtyRule = {
  specialty: 'radiology',
  additionalFields: ['modalityType', 'bodyPart', 'contrastRequired'],
  turnaroundDays: null,
  notes: 'CT/MRI/PET typically require pre-authorization; X-ray may not',
};

const LABORATORY_RULE: LoaSpecialtyRule = {
  specialty: 'laboratory',
  additionalFields: ['testCategories', 'urgency'],
  turnaroundDays: null,
  notes: 'Most routine labs do not require LOA; specialized panels may',
};

const MATERNITY_RULE: LoaSpecialtyRule = {
  specialty: 'maternity',
  additionalFields: ['gestationalAge', 'complicationRisk', 'deliveryType'],
  turnaroundDays: null,
  notes: 'Pre-natal care often covered; delivery requires separate LOA',
};

const COMMON_SPECIALTY_RULES: LoaSpecialtyRule[] = [
  SURGERY_RULE,
  RADIOLOGY_RULE,
  LABORATORY_RULE,
  MATERNITY_RULE,
];

/* -- Per-HMO LOA Template Configurations ---------------------- */

function makeTemplate(
  payerId: string,
  payerName: string,
  overrides: Partial<LoaTemplateConfig> = {}
): LoaTemplateConfig {
  return {
    payerId,
    payerName,
    submissionMethod: overrides.submissionMethod ?? 'manual',
    portalUrl: overrides.portalUrl ?? null,
    requiredFields: overrides.requiredFields ?? [...COMMON_REQUIRED_FIELDS],
    specialtyRules: overrides.specialtyRules ?? [...COMMON_SPECIALTY_RULES],
    defaultTurnaroundDays: overrides.defaultTurnaroundDays ?? null,
    attachmentRequirements: overrides.attachmentRequirements ?? [
      'Clinical notes / history',
      'Laboratory results (if applicable)',
      'Imaging reports (if applicable)',
    ],
    loaValidityDays: overrides.loaValidityDays ?? null,
    notes: overrides.notes ?? [],
  };
}

/**
 * All 27 IC-licensed HMO LOA template configurations.
 *
 * Top-5 portal-capable HMOs have portal submission method + portal URLs.
 * Other L1 HMOs have known digital presence but integration is pending.
 * L3 HMOs default to manual submission.
 */
export const LOA_TEMPLATES: Record<string, LoaTemplateConfig> = {
  // -- Top-5 Portal-Capable (L1) ------------------------------
  'PH-MAXICARE': makeTemplate('PH-MAXICARE', 'MaxiCare Healthcare Corp.', {
    submissionMethod: 'portal',
    portalUrl: 'https://provider.maxicare.com.ph/',
    defaultTurnaroundDays: 3,
    loaValidityDays: 30,
    notes: ['MaxiLink portal: LOA -> Claims -> SOA workflow integrated'],
  }),
  'PH-MEDICARD': makeTemplate('PH-MEDICARD', 'MediCard Philippines, Inc.', {
    submissionMethod: 'portal',
    portalUrl: 'https://online.medicard.com.ph/',
    defaultTurnaroundDays: 3,
    loaValidityDays: 30,
    notes: ['MediCard Online: LOA request via provider portal'],
  }),
  'PH-INTELLICARE': makeTemplate('PH-INTELLICARE', 'Intellicare Asia Corporation', {
    submissionMethod: 'portal',
    portalUrl: 'https://www.intelli-care.com.ph/',
    defaultTurnaroundDays: 3,
    loaValidityDays: 30,
    notes: ['IntellicareOnline: provider portal available'],
  }),
  'PH-PHILCARE': makeTemplate('PH-PHILCARE', 'PhilCare, Inc.', {
    submissionMethod: 'portal',
    portalUrl: 'https://philcare.com.ph/',
    defaultTurnaroundDays: 3,
    loaValidityDays: 30,
    notes: ['PhilCare provider portal available'],
  }),
  'PH-VALUCARE': makeTemplate('PH-VALUCARE', 'Value Care Health Systems, Inc.', {
    submissionMethod: 'portal',
    portalUrl: 'https://valucare.com.ph/',
    defaultTurnaroundDays: 5,
    loaValidityDays: 30,
    notes: ['ValuCare: provider portal; turnaround may vary'],
  }),

  // -- Other L1 HMOs (large, digital presence) ----------------
  'PH-INSULAR': makeTemplate('PH-INSULAR', 'Insular Health Care, Inc.', {
    submissionMethod: 'manual',
    defaultTurnaroundDays: 5,
    notes: ['Large HMO -- portal integration pending investigation'],
  }),
  'PH-COCOLIFE': makeTemplate('PH-COCOLIFE', 'Cocolife Health Care, Inc.', {
    submissionMethod: 'manual',
    defaultTurnaroundDays: 5,
    notes: ['Cocolife -- portal may exist; integration pending'],
  }),
  'PH-PACIFIC-CROSS': makeTemplate('PH-PACIFIC-CROSS', 'Pacific Cross Health Care, Inc.', {
    submissionMethod: 'manual',
    defaultTurnaroundDays: 5,
    notes: ['Pacific Cross -- digital presence exists; integration pending'],
  }),

  // -- L3 HMOs (smaller/regional, manual workflow) ------------
  'PH-ASIANLIFE': makeTemplate('PH-ASIANLIFE', 'AsianLife and General Assurance Corporation'),
  'PH-AVEGA': makeTemplate('PH-AVEGA', 'Avega Managed Care, Inc.'),
  'PH-CAREHEALTH': makeTemplate('PH-CAREHEALTH', 'CareHealth Plus Systems International, Inc.'),
  'PH-CAREWELL': makeTemplate('PH-CAREWELL', 'Carewell Health Systems, Inc.'),
  'PH-CARITAS': makeTemplate('PH-CARITAS', 'Caritas Health Shield, Inc.'),
  'PH-EASTWEST': makeTemplate('PH-EASTWEST', 'EastWest Healthcare, Inc.'),
  'PH-FORTICARE': makeTemplate('PH-FORTICARE', 'Forticare Health Systems International, Inc.'),
  'PH-HEALTHMAINT': makeTemplate('PH-HEALTHMAINT', 'Health Maintenance, Inc.'),
  'PH-HEALTHPLAN': makeTemplate('PH-HEALTHPLAN', 'Health Plan Philippines, Inc.'),
  'PH-HEALTHFIRST': makeTemplate('PH-HEALTHFIRST', 'HealthFirst Healthcare, Inc.'),
  'PH-ICARE': makeTemplate('PH-ICARE', 'i-Care Health Solutions, Inc.'),
  'PH-KAISER-INTL': makeTemplate('PH-KAISER-INTL', 'Kaiser International Healthgroup, Inc.'),
  'PH-LIFEHEALTH': makeTemplate('PH-LIFEHEALTH', 'Life and Health HMP, Inc.'),
  'PH-MEDILINK': makeTemplate('PH-MEDILINK', 'MediLink Network, Inc.'),
  'PH-METROCARE': makeTemplate('PH-METROCARE', 'Metrocare Health Systems, Inc.'),
  'PH-PHILBRITISH': makeTemplate('PH-PHILBRITISH', 'Philippine British Assurance Company, Inc.'),
  'PH-PHCP': makeTemplate('PH-PHCP', 'Philippine Health Care Providers, Inc.'),
  'PH-PHP': makeTemplate('PH-PHP', 'Philippine Health Plan, Inc.'),
  'PH-STARCARE': makeTemplate('PH-STARCARE', 'Starcare Health Systems, Inc.'),
};

/* -- Public API ----------------------------------------------- */

/**
 * Get LOA template configuration for a specific payer.
 * Returns null for unknown payers.
 */
export function getLoaTemplate(payerId: string): LoaTemplateConfig | null {
  return LOA_TEMPLATES[payerId] ?? null;
}

/**
 * List all LOA template configurations.
 */
export function listLoaTemplates(): LoaTemplateConfig[] {
  return Object.values(LOA_TEMPLATES);
}

/**
 * Get specialty-specific additional fields for a payer + specialty.
 */
export function getSpecialtyFields(
  payerId: string,
  specialty: string
): { fields: string[]; turnaroundDays: number | null; notes: string } | null {
  const template = LOA_TEMPLATES[payerId];
  if (!template) return null;

  const rule = template.specialtyRules.find(
    (r) => r.specialty.toLowerCase() === specialty.toLowerCase()
  );
  if (!rule) return null;

  return {
    fields: rule.additionalFields,
    turnaroundDays: rule.turnaroundDays ?? template.defaultTurnaroundDays,
    notes: rule.notes,
  };
}
