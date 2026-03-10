/**
 * Claim Packet Config -- Phase 97B: Per-HMO Claim Packet Configuration
 *
 * Defines per-HMO claim submission requirements including:
 * - Required documents and attachments
 * - Claim filing deadlines
 * - Format preferences (portal upload vs physical)
 * - VistA-first field annotations
 *
 * This config drives claim packet generation in claims-workflow.ts.
 * VistA IB/AR/PCE is the authoritative billing ledger -- this config
 * only describes what the PAYER needs from the provider.
 */

/* -- Types ---------------------------------------------------- */

export interface VistaFieldAnnotation {
  field: string;
  label: string;
  vistaFile: string | null; // e.g. "^IB(350)" or "^AUPNVSIT"
  vistaRpc: string | null; // e.g. "ORWPCE PCE4NOTE"
  vistaStatus: 'available' | 'integration_pending' | 'empty_in_sandbox';
  sandboxNote?: string;
}

export interface RequiredDocument {
  name: string;
  description: string;
  formats: string[]; // e.g. ["PDF", "JPG", "PNG"]
  required: boolean;
  vistaSource: string | null; // where this document originates
}

export interface ClaimPacketConfig {
  payerId: string;
  payerName: string;
  submissionFormat: 'portal_upload' | 'email_attachment' | 'physical' | 'mixed';
  filingDeadlineDays: number | null; // days from discharge/service
  appealWindowDays: number | null; // days to appeal denial
  soaFrequency: 'monthly' | 'quarterly' | 'on_request' | 'unknown';
  requiredDocuments: RequiredDocument[];
  vistaFieldAnnotations: VistaFieldAnnotation[];
  claimTypes: string[]; // "inpatient" | "outpatient" | "emergency" | "maternity"
  notes: string[];
}

/* -- Common VistA field annotations --------------------------- */

const COMMON_VISTA_FIELDS: VistaFieldAnnotation[] = [
  {
    field: 'encounterDate',
    label: 'Visit/Encounter Date',
    vistaFile: '^AUPNVSIT',
    vistaRpc: 'ORWCV VST',
    vistaStatus: 'available',
  },
  {
    field: 'diagnosisCodes',
    label: 'ICD-10 Diagnosis Codes',
    vistaFile: '^AUPNVPOV',
    vistaRpc: 'ORQQPL LIST',
    vistaStatus: 'available',
  },
  {
    field: 'procedureCodes',
    label: 'CPT Procedure Codes',
    vistaFile: '^AUPNVCPT',
    vistaRpc: 'ORWPCE PCE4NOTE',
    vistaStatus: 'available',
  },
  {
    field: 'totalCharges',
    label: 'Total Charges',
    vistaFile: '^IB(350)',
    vistaRpc: 'IBD GET CHARGE',
    vistaStatus: 'empty_in_sandbox',
    sandboxNote: 'IB charges file empty in WorldVistA Docker -- integration pending',
  },
  {
    field: 'subscriberId',
    label: 'Insurance Subscriber ID / Member Number',
    vistaFile: '^DPT(.312)',
    vistaRpc: 'IBCNS',
    vistaStatus: 'empty_in_sandbox',
    sandboxNote: 'Insurance entries empty in sandbox -- manual entry required',
  },
  {
    field: 'providerNpi',
    label: 'Provider NPI / PRC License',
    vistaFile: null,
    vistaRpc: 'XUSNPI',
    vistaStatus: 'integration_pending',
    sandboxNote: 'NPI may not be populated; PRC license not in VistA',
  },
  {
    field: 'attendingPhysician',
    label: 'Attending Physician',
    vistaFile: '^VA(200)',
    vistaRpc: 'ORWU NEWPERS',
    vistaStatus: 'available',
  },
  {
    field: 'admissionDate',
    label: 'Admission Date (inpatient)',
    vistaFile: '^DGPM',
    vistaRpc: 'ORWPT ADMITALL',
    vistaStatus: 'available',
  },
  {
    field: 'dischargeDate',
    label: 'Discharge Date (inpatient)',
    vistaFile: '^DGPM',
    vistaRpc: 'ORWPT ADMITALL',
    vistaStatus: 'available',
  },
];

/* -- Common required documents -------------------------------- */

const COMMON_REQUIRED_DOCS: RequiredDocument[] = [
  {
    name: 'LOA Approval / Reference Number',
    description: 'Approved Letter of Authorization from the HMO',
    formats: ['PDF', 'text'],
    required: true,
    vistaSource: 'LOA store (in-memory, Phase 94)',
  },
  {
    name: 'Itemized Statement of Account',
    description: 'Detailed breakdown of all charges',
    formats: ['PDF', 'Excel'],
    required: true,
    vistaSource: 'VistA IB ^IB(350) -- integration pending',
  },
  {
    name: 'Clinical Summary / Discharge Summary',
    description: 'Summary of clinical course and treatment',
    formats: ['PDF'],
    required: true,
    vistaSource: 'TIU DOCUMENTS BY CONTEXT (VistA notes)',
  },
  {
    name: 'Official Receipt / OR',
    description: 'Official receipt for payments made by patient',
    formats: ['PDF', 'JPG'],
    required: false,
    vistaSource: null,
  },
  {
    name: 'Laboratory Results',
    description: 'Lab results supporting the diagnosis/treatment',
    formats: ['PDF', 'JPG'],
    required: false,
    vistaSource: 'ORWLR REPORT (lab results RPC)',
  },
  {
    name: 'Imaging Results',
    description: 'Imaging/radiology reports',
    formats: ['PDF', 'DICOM viewer link'],
    required: false,
    vistaSource: 'DICOMweb proxy (Phase 24)',
  },
];

/* -- Per-HMO Claim Packet Configurations ---------------------- */

function makeConfig(
  payerId: string,
  payerName: string,
  overrides: Partial<ClaimPacketConfig> = {}
): ClaimPacketConfig {
  return {
    payerId,
    payerName,
    submissionFormat: overrides.submissionFormat ?? 'mixed',
    filingDeadlineDays: overrides.filingDeadlineDays ?? null,
    appealWindowDays: overrides.appealWindowDays ?? null,
    soaFrequency: overrides.soaFrequency ?? 'unknown',
    requiredDocuments: overrides.requiredDocuments ?? [...COMMON_REQUIRED_DOCS],
    vistaFieldAnnotations: overrides.vistaFieldAnnotations ?? [...COMMON_VISTA_FIELDS],
    claimTypes: overrides.claimTypes ?? ['outpatient', 'inpatient', 'emergency'],
    notes: overrides.notes ?? [],
  };
}

export const CLAIM_PACKET_CONFIGS: Record<string, ClaimPacketConfig> = {
  // -- Top-5 Portal-Capable (L1) ------------------------------
  'PH-MAXICARE': makeConfig('PH-MAXICARE', 'MaxiCare Healthcare Corp.', {
    submissionFormat: 'portal_upload',
    filingDeadlineDays: 30,
    appealWindowDays: 60,
    soaFrequency: 'monthly',
    claimTypes: ['outpatient', 'inpatient', 'emergency', 'maternity'],
    notes: ['Submit via MaxiLink portal', 'SOA generated monthly'],
  }),
  'PH-MEDICARD': makeConfig('PH-MEDICARD', 'MediCard Philippines, Inc.', {
    submissionFormat: 'portal_upload',
    filingDeadlineDays: 30,
    appealWindowDays: 60,
    soaFrequency: 'monthly',
    notes: ['Submit via MediCard Online portal'],
  }),
  'PH-INTELLICARE': makeConfig('PH-INTELLICARE', 'Intellicare Asia Corporation', {
    submissionFormat: 'portal_upload',
    filingDeadlineDays: 30,
    appealWindowDays: 60,
    soaFrequency: 'monthly',
    notes: ['Submit via IntellicareOnline'],
  }),
  'PH-PHILCARE': makeConfig('PH-PHILCARE', 'PhilCare, Inc.', {
    submissionFormat: 'portal_upload',
    filingDeadlineDays: 30,
    appealWindowDays: 60,
    soaFrequency: 'monthly',
    notes: ['Submit via PhilCare provider portal'],
  }),
  'PH-VALUCARE': makeConfig('PH-VALUCARE', 'Value Care Health Systems, Inc.', {
    submissionFormat: 'portal_upload',
    filingDeadlineDays: 30,
    appealWindowDays: 60,
    soaFrequency: 'monthly',
    notes: ['Submit via ValuCare provider portal'],
  }),

  // -- Other L1 HMOs -----------------------------------------
  'PH-INSULAR': makeConfig('PH-INSULAR', 'Insular Health Care, Inc.', {
    filingDeadlineDays: 30,
    notes: ['Large HMO -- portal integration pending'],
  }),
  'PH-COCOLIFE': makeConfig('PH-COCOLIFE', 'Cocolife Health Care, Inc.', {
    filingDeadlineDays: 30,
    notes: ['Portal integration pending'],
  }),
  'PH-PACIFIC-CROSS': makeConfig('PH-PACIFIC-CROSS', 'Pacific Cross Health Care, Inc.', {
    filingDeadlineDays: 30,
    notes: ['Digital submission may be available -- investigation pending'],
  }),

  // -- L3 HMOs ------------------------------------------------
  'PH-ASIANLIFE': makeConfig('PH-ASIANLIFE', 'AsianLife and General Assurance Corporation'),
  'PH-AVEGA': makeConfig('PH-AVEGA', 'Avega Managed Care, Inc.'),
  'PH-CAREHEALTH': makeConfig('PH-CAREHEALTH', 'CareHealth Plus Systems International, Inc.'),
  'PH-CAREWELL': makeConfig('PH-CAREWELL', 'Carewell Health Systems, Inc.'),
  'PH-CARITAS': makeConfig('PH-CARITAS', 'Caritas Health Shield, Inc.'),
  'PH-EASTWEST': makeConfig('PH-EASTWEST', 'EastWest Healthcare, Inc.'),
  'PH-FORTICARE': makeConfig('PH-FORTICARE', 'Forticare Health Systems International, Inc.'),
  'PH-HEALTHMAINT': makeConfig('PH-HEALTHMAINT', 'Health Maintenance, Inc.'),
  'PH-HEALTHPLAN': makeConfig('PH-HEALTHPLAN', 'Health Plan Philippines, Inc.'),
  'PH-HEALTHFIRST': makeConfig('PH-HEALTHFIRST', 'HealthFirst Healthcare, Inc.'),
  'PH-ICARE': makeConfig('PH-ICARE', 'i-Care Health Solutions, Inc.'),
  'PH-KAISER-INTL': makeConfig('PH-KAISER-INTL', 'Kaiser International Healthgroup, Inc.'),
  'PH-LIFEHEALTH': makeConfig('PH-LIFEHEALTH', 'Life and Health HMP, Inc.'),
  'PH-MEDILINK': makeConfig('PH-MEDILINK', 'MediLink Network, Inc.'),
  'PH-METROCARE': makeConfig('PH-METROCARE', 'Metrocare Health Systems, Inc.'),
  'PH-PHILBRITISH': makeConfig('PH-PHILBRITISH', 'Philippine British Assurance Company, Inc.'),
  'PH-PHCP': makeConfig('PH-PHCP', 'Philippine Health Care Providers, Inc.'),
  'PH-PHP': makeConfig('PH-PHP', 'Philippine Health Plan, Inc.'),
  'PH-STARCARE': makeConfig('PH-STARCARE', 'Starcare Health Systems, Inc.'),
};

/* -- Public API ----------------------------------------------- */

/**
 * Get claim packet configuration for a specific payer.
 */
export function getClaimPacketConfig(payerId: string): ClaimPacketConfig | null {
  return CLAIM_PACKET_CONFIGS[payerId] ?? null;
}

/**
 * List all claim packet configurations.
 */
export function listClaimPacketConfigs(): ClaimPacketConfig[] {
  return Object.values(CLAIM_PACKET_CONFIGS);
}

/**
 * Get VistA field annotations for a payer (or common if payer has no overrides).
 */
export function getVistaAnnotations(payerId: string): VistaFieldAnnotation[] {
  const config = CLAIM_PACKET_CONFIGS[payerId];
  return config?.vistaFieldAnnotations ?? [...COMMON_VISTA_FIELDS];
}

/**
 * Get required documents for a specific payer.
 */
export function getRequiredDocuments(payerId: string): RequiredDocument[] {
  const config = CLAIM_PACKET_CONFIGS[payerId];
  return config?.requiredDocuments ?? [...COMMON_REQUIRED_DOCS];
}
