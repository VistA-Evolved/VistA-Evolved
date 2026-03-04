/**
 * ccda-parser.ts -- CCD/CCDA Document Parser (Phase 281)
 *
 * Parses CDA R2 (CCD/CCDA) XML documents into internal migration types.
 * Uses regex-based section extraction (no heavy XML library) to keep
 * dependencies at zero. Sections not yet fully mapped return
 * integration-pending markers with target VistA RPCs.
 *
 * Supported sections:
 *   - Patient demographics (recordTarget)
 *   - Problems (11450-4)
 *   - Medications (10160-0)
 *   - Allergies (48765-2)
 *   - Vitals (8716-3)
 */

import { createHash } from 'crypto';
import type { ImportEntityType, ValidationIssue } from './types.js';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface CcdaSectionResult {
  /** LOINC section code */
  sectionCode: string;
  /** Human-readable section title */
  title: string;
  /** Mapped entity type */
  entityType: ImportEntityType;
  /** Extracted records (key-value pairs) */
  records: Record<string, string>[];
  /** Whether extraction is fully functional */
  status: 'extracted' | 'integration-pending';
  /** If pending, what VistA targets to integrate with */
  vistaGrounding?: {
    targetRpcs: string[];
    vistaFiles: string[];
    migrationNote: string;
  };
}

export interface CcdaImportResult {
  ok: boolean;
  documentType: string;
  patientName: string;
  sections: CcdaSectionResult[];
  warnings: ValidationIssue[];
  /** SHA-256 hash of the entire document for reconciliation */
  contentHash: string;
}

/* ------------------------------------------------------------------ */
/* Section LOINC codes                                                 */
/* ------------------------------------------------------------------ */

const SECTION_CODES = {
  PROBLEMS: '11450-4',
  MEDICATIONS: '10160-0',
  ALLERGIES: '48765-2',
  VITALS: '8716-3',
  PROCEDURES: '47519-4',
  RESULTS: '30954-2',
  IMMUNIZATIONS: '11369-6',
} as const;

/* ------------------------------------------------------------------ */
/* Regex helpers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Extract text between XML-ish tags. Not a full XML parser --
 * good enough for CDA section extraction.
 */
function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 'si');
  const m = xml.match(re);
  return m ? m[1].trim() : '';
}

function extractSelfClosingAttr(xml: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}\\s*=\\s*"([^"]*)"[^>]*/?>`, 'si');
  const m = xml.match(re);
  return m ? m[1] : '';
}

/**
 * Find a CDA section by its LOINC code value.
 */
function findSectionByCode(xml: string, loincCode: string): string {
  // CDA sections have <code code="XXXXX-X" codeSystem="2.16.840.1.113883.6.1"/>
  const re = new RegExp(
    `<component>\\s*<section>(?:(?!</section>)[\\s\\S])*?` +
      `<code[^>]*code\\s*=\\s*"${loincCode}"[^>]*/?>` +
      `(?:(?!</section>)[\\s\\S])*?</section>\\s*</component>`,
    'i'
  );
  const m = xml.match(re);
  return m ? m[0] : '';
}

/* ------------------------------------------------------------------ */
/* Section Extractors                                                  */
/* ------------------------------------------------------------------ */

function extractPatientDemographics(xml: string): Record<string, string> {
  const fields: Record<string, string> = {};

  // recordTarget/patientRole/patient
  const rtMatch = xml.match(/<recordTarget>([\s\S]*?)<\/recordTarget>/i);
  if (!rtMatch) return fields;
  const rt = rtMatch[1];

  // Name
  const nameBlock = extractTag(rt, 'name');
  fields.givenName = extractTag(nameBlock, 'given');
  fields.familyName = extractTag(nameBlock, 'family');

  // Gender
  fields.gender =
    extractSelfClosingAttr(rt, 'administrativeGenderCode', 'displayName') ||
    extractSelfClosingAttr(rt, 'administrativeGenderCode', 'code');

  // DOB
  fields.dob = extractSelfClosingAttr(rt, 'birthTime', 'value');

  // Address
  const addr = extractTag(rt, 'addr');
  if (addr) {
    fields.streetAddress = extractTag(addr, 'streetAddressLine');
    fields.city = extractTag(addr, 'city');
    fields.state = extractTag(addr, 'state');
    fields.postalCode = extractTag(addr, 'postalCode');
  }

  // Telecom
  const phoneMatch = rt.match(/<telecom[^>]*value\s*=\s*"tel:([^"]*)"[^>]*\/?>/i);
  if (phoneMatch) fields.phone = phoneMatch[1];

  return fields;
}

function extractProblemsSection(sectionXml: string): Record<string, string>[] {
  if (!sectionXml) return [];
  const records: Record<string, string>[] = [];

  // Look for observation entries within the section
  const entries = sectionXml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];

  for (const entry of entries) {
    const fields: Record<string, string> = {};
    // Problem code
    const code = extractSelfClosingAttr(entry, 'value', 'code');
    const displayName = extractSelfClosingAttr(entry, 'value', 'displayName');
    const codeSystem = extractSelfClosingAttr(entry, 'value', 'codeSystem');

    if (displayName || code) {
      fields.conditionName = displayName;
      fields.icdCode = code;
      fields.codeSystem = codeSystem;

      // Status
      const statusCode = extractSelfClosingAttr(entry, 'statusCode', 'code');
      if (statusCode) fields.clinicalStatus = statusCode;

      // Onset
      const effectiveLow = extractSelfClosingAttr(entry, 'low', 'value');
      if (effectiveLow) fields.onsetDate = effectiveLow;

      records.push(fields);
    }
  }

  return records;
}

function extractMedicationsSection(sectionXml: string): Record<string, string>[] {
  if (!sectionXml) return [];
  const records: Record<string, string>[] = [];

  const entries = sectionXml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];

  for (const entry of entries) {
    const fields: Record<string, string> = {};
    // Medication code
    const code = extractSelfClosingAttr(entry, 'code', 'code');
    const displayName = extractSelfClosingAttr(entry, 'code', 'displayName');

    if (displayName || code) {
      fields.medicationName = displayName;
      fields.rxnormCode = code;

      // Dosage text
      const doseVal = extractSelfClosingAttr(entry, 'doseQuantity', 'value');
      const doseUnit = extractSelfClosingAttr(entry, 'doseQuantity', 'unit');
      if (doseVal) fields.dosageText = `${doseVal} ${doseUnit}`.trim();

      // Status
      const statusCode = extractSelfClosingAttr(entry, 'statusCode', 'code');
      if (statusCode) fields.status = statusCode;

      records.push(fields);
    }
  }

  return records;
}

function extractAllergiesSection(sectionXml: string): Record<string, string>[] {
  if (!sectionXml) return [];
  const records: Record<string, string>[] = [];

  const entries = sectionXml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];

  for (const entry of entries) {
    const fields: Record<string, string> = {};
    // Look for the participant/playingEntity which has the allergen
    const code = extractSelfClosingAttr(entry, 'code', 'code');
    const displayName = extractSelfClosingAttr(entry, 'code', 'displayName');

    if (displayName || code) {
      fields.allergenName = displayName;
      fields.allergenCode = code;

      // Severity
      const severity = extractSelfClosingAttr(entry, 'value', 'displayName');
      if (severity) fields.severity = severity;

      records.push(fields);
    }
  }

  return records;
}

function extractVitalsSection(sectionXml: string): Record<string, string>[] {
  if (!sectionXml) return [];
  const records: Record<string, string>[] = [];

  const entries = sectionXml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];

  for (const entry of entries) {
    // Multiple observations per organizer
    const observations = entry.match(/<observation[\s\S]*?<\/observation>/gi) ?? [];
    for (const obs of observations) {
      const fields: Record<string, string> = {};
      const code = extractSelfClosingAttr(obs, 'code', 'code');
      const displayName = extractSelfClosingAttr(obs, 'code', 'displayName');
      const value = extractSelfClosingAttr(obs, 'value', 'value');
      const unit = extractSelfClosingAttr(obs, 'value', 'unit');

      if (displayName || code) {
        fields.observationName = displayName;
        fields.loincCode = code;
        if (value) fields.value = value;
        if (unit) fields.unit = unit;

        const effectiveTime = extractSelfClosingAttr(obs, 'effectiveTime', 'value');
        if (effectiveTime) fields.effectiveDate = effectiveTime;

        records.push(fields);
      }
    }
  }

  return records;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Parse a CCD/CCDA XML document into migration-ready sections.
 */
export function parseCcdaDocument(xml: string): CcdaImportResult {
  const warnings: ValidationIssue[] = [];

  if (!xml || typeof xml !== 'string') {
    return {
      ok: false,
      documentType: 'unknown',
      patientName: '',
      sections: [],
      warnings: [{ severity: 'error', code: 'INVALID_INPUT', message: 'Input is not a string' }],
      contentHash: '',
    };
  }

  // Verify it looks like CDA
  const isCda = xml.includes('ClinicalDocument') || xml.includes('clinicaldocument');
  if (!isCda) {
    warnings.push({
      severity: 'warning',
      code: 'NOT_CDA',
      message: 'Document may not be a valid CDA/CCDA document',
    });
  }

  const contentHash = createHash('sha256').update(xml).digest('hex');

  // Patient demographics
  const patientFields = extractPatientDemographics(xml);
  const patientName = [patientFields.givenName, patientFields.familyName].filter(Boolean).join(' ');

  const sections: CcdaSectionResult[] = [];

  // Demographics section (always extracted)
  if (Object.keys(patientFields).length > 0) {
    sections.push({
      sectionCode: 'recordTarget',
      title: 'Patient Demographics',
      entityType: 'patient',
      records: [patientFields],
      status: 'extracted',
    });
  }

  // Problems
  const problemsXml = findSectionByCode(xml, SECTION_CODES.PROBLEMS);
  const problemRecords = extractProblemsSection(problemsXml);
  sections.push({
    sectionCode: SECTION_CODES.PROBLEMS,
    title: 'Problems',
    entityType: 'problem',
    records: problemRecords,
    status: problemRecords.length > 0 ? 'extracted' : 'integration-pending',
    ...(problemRecords.length === 0
      ? {
          vistaGrounding: {
            targetRpcs: ['ORQQPL ADD SAVE', 'ORQQPL EDIT SAVE'],
            vistaFiles: ['Problem List (9000011)'],
            migrationNote:
              'No problem entries found or section absent. ' +
              'Import requires ORQQPL ADD SAVE with proper problem IEN.',
          },
        }
      : {}),
  });

  // Medications
  const medsXml = findSectionByCode(xml, SECTION_CODES.MEDICATIONS);
  const medRecords = extractMedicationsSection(medsXml);
  sections.push({
    sectionCode: SECTION_CODES.MEDICATIONS,
    title: 'Medications',
    entityType: 'medication',
    records: medRecords,
    status: medRecords.length > 0 ? 'extracted' : 'integration-pending',
    ...(medRecords.length === 0
      ? {
          vistaGrounding: {
            targetRpcs: ['ORWDX SAVE', 'PSB MED LIST'],
            vistaFiles: ['Pharmacy Patient (55)', 'Prescription (52)'],
            migrationNote:
              'No medication entries found or section absent. ' +
              'Import requires ORWDX SAVE through the orders pipeline.',
          },
        }
      : {}),
  });

  // Allergies
  const allergiesXml = findSectionByCode(xml, SECTION_CODES.ALLERGIES);
  const allergyRecords = extractAllergiesSection(allergiesXml);
  sections.push({
    sectionCode: SECTION_CODES.ALLERGIES,
    title: 'Allergies',
    entityType: 'allergy',
    records: allergyRecords,
    status: allergyRecords.length > 0 ? 'extracted' : 'integration-pending',
    ...(allergyRecords.length === 0
      ? {
          vistaGrounding: {
            targetRpcs: ['ORWDAL32 SAVE ALLERGY'],
            vistaFiles: ['Patient Allergies (120.8)'],
            migrationNote:
              'No allergy entries found or section absent. ' +
              'Import uses ORWDAL32 SAVE ALLERGY with 6 mandatory OREDITED fields.',
          },
        }
      : {}),
  });

  // Vitals
  const vitalsXml = findSectionByCode(xml, SECTION_CODES.VITALS);
  const vitalRecords = extractVitalsSection(vitalsXml);
  sections.push({
    sectionCode: SECTION_CODES.VITALS,
    title: 'Vitals',
    entityType: 'note',
    records: vitalRecords,
    status: vitalRecords.length > 0 ? 'extracted' : 'integration-pending',
    ...(vitalRecords.length === 0
      ? {
          vistaGrounding: {
            targetRpcs: ['GMV ADD VM'],
            vistaFiles: ['Vital Measurement (120.5)'],
            migrationNote:
              'No vital entries found or section absent. ' +
              'Import requires GMV ADD VM with proper vital type IENs.',
          },
        }
      : {}),
  });

  // Pending sections (not yet extractable)
  const pendingSections: Array<{
    code: string;
    title: string;
    entityType: ImportEntityType;
    rpcs: string[];
    files: string[];
  }> = [
    {
      code: SECTION_CODES.PROCEDURES,
      title: 'Procedures',
      entityType: 'note',
      rpcs: ['ORWDX SAVE'],
      files: ['CPT (81)'],
    },
    {
      code: SECTION_CODES.RESULTS,
      title: 'Lab Results',
      entityType: 'note',
      rpcs: ['ORWLR REPORT', 'LR VERIFY'],
      files: ['Lab Data (63)'],
    },
    {
      code: SECTION_CODES.IMMUNIZATIONS,
      title: 'Immunizations',
      entityType: 'note',
      rpcs: ['PX SAVE DATA'],
      files: ['Immunization (9000010.11)'],
    },
  ];

  for (const pending of pendingSections) {
    const sectionXml = findSectionByCode(xml, pending.code);
    if (sectionXml) {
      sections.push({
        sectionCode: pending.code,
        title: pending.title,
        entityType: pending.entityType,
        records: [],
        status: 'integration-pending',
        vistaGrounding: {
          targetRpcs: pending.rpcs,
          vistaFiles: pending.files,
          migrationNote: `${pending.title} section present but parser not yet implemented.`,
        },
      });
    }
  }

  return {
    ok: true,
    documentType: isCda ? 'CDA/CCDA' : 'unknown-xml',
    patientName,
    sections,
    warnings,
    contentHash,
  };
}

/**
 * List all CCDA section codes this parser handles.
 */
export function listSupportedCcdaSections(): {
  code: string;
  title: string;
  status: 'implemented' | 'pending';
}[] {
  return [
    { code: 'recordTarget', title: 'Patient Demographics', status: 'implemented' },
    { code: SECTION_CODES.PROBLEMS, title: 'Problems', status: 'implemented' },
    { code: SECTION_CODES.MEDICATIONS, title: 'Medications', status: 'implemented' },
    { code: SECTION_CODES.ALLERGIES, title: 'Allergies', status: 'implemented' },
    { code: SECTION_CODES.VITALS, title: 'Vitals', status: 'implemented' },
    { code: SECTION_CODES.PROCEDURES, title: 'Procedures', status: 'pending' },
    { code: SECTION_CODES.RESULTS, title: 'Lab Results', status: 'pending' },
    { code: SECTION_CODES.IMMUNIZATIONS, title: 'Immunizations', status: 'pending' },
  ];
}
