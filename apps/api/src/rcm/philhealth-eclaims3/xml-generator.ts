/**
 * PhilHealth eClaims 3.0 — XML Generator (Placeholder)
 *
 * Phase 96: Strict interface with "spec pending" implementation.
 *
 * This module defines the strict XmlGeneratorInterface contract and provides
 * a placeholder implementation that generates clearly-marked non-production XML.
 *
 * When the official eClaims 3.0 XML schema becomes available:
 *   1. Load the XSD/schema into this module
 *   2. Replace generatePlaceholderXml with schema-compliant generation
 *   3. Set specAvailable = true
 *   4. Implement real validate() against the schema
 *
 * NEVER ship the placeholder XML as-if it were real. The output is clearly
 * marked with SPEC_PENDING comments and metadata.
 */

import type {
  ClaimPacket,
  XmlGeneratorInterface,
  XmlGeneratorResult,
  XmlValidationResult,
} from './types.js';

/* ── XML Escaping ───────────────────────────────────────────── */

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/* ── Placeholder Implementation ─────────────────────────────── */

/**
 * Placeholder XML generator. Produces structurally representative XML
 * but is NOT schema-compliant (schema not yet available).
 *
 * Every output includes:
 *   - XML comment: "SPEC_PENDING — NOT FOR PRODUCTION SUBMISSION"
 *   - specBased: false in metadata
 */
export function generatePlaceholderXml(packet: ClaimPacket): XmlGeneratorResult {
  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<!-- ============================================================ -->');
  lines.push('<!-- SPEC_PENDING — NOT FOR PRODUCTION SUBMISSION                 -->');
  lines.push('<!-- This XML is a structural placeholder for eClaims 3.0.        -->');
  lines.push('<!-- Replace with schema-compliant output when spec is available.  -->');
  lines.push('<!-- ============================================================ -->');
  lines.push(
    `<eClaimsCF version="3.0" specStatus="PENDING" generatedAt="${escapeXml(packet.assembledAt)}">`
  );

  // CF1 — Facility + Patient
  lines.push('  <CF1>');
  lines.push(`    <FacilityCode>${escapeXml(packet.facility.facilityCode)}</FacilityCode>`);
  lines.push(`    <FacilityName>${escapeXml(packet.facility.facilityName)}</FacilityName>`);
  if (packet.facility.accreditationNumber) {
    lines.push(
      `    <AccreditationNumber>${escapeXml(packet.facility.accreditationNumber)}</AccreditationNumber>`
    );
  }
  if (packet.facility.tinNumber) {
    lines.push(`    <TIN>${escapeXml(packet.facility.tinNumber)}</TIN>`);
  }
  lines.push('    <Patient>');
  lines.push(`      <LastName>${escapeXml(packet.patient.lastName)}</LastName>`);
  lines.push(`      <FirstName>${escapeXml(packet.patient.firstName)}</FirstName>`);
  if (packet.patient.middleName) {
    lines.push(`      <MiddleName>${escapeXml(packet.patient.middleName)}</MiddleName>`);
  }
  if (packet.patient.dob) {
    lines.push(`      <DateOfBirth>${escapeXml(packet.patient.dob)}</DateOfBirth>`);
  }
  if (packet.patient.sex) {
    lines.push(`      <Sex>${packet.patient.sex}</Sex>`);
  }
  lines.push(`      <PhilHealthPIN>${escapeXml(packet.patient.philhealthPin)}</PhilHealthPIN>`);
  if (packet.patient.memberPin) {
    lines.push(`      <MemberPIN>${escapeXml(packet.patient.memberPin)}</MemberPIN>`);
  }
  lines.push(`      <MemberRelationship>${packet.patient.memberRelationship}</MemberRelationship>`);
  lines.push('    </Patient>');
  lines.push(`    <PatientType>${packet.patientType}</PatientType>`);
  lines.push(`    <AdmissionDate>${escapeXml(packet.admissionDate)}</AdmissionDate>`);
  if (packet.dischargeDate) {
    lines.push(`    <DischargeDate>${escapeXml(packet.dischargeDate)}</DischargeDate>`);
  }
  lines.push('  </CF1>');

  // CF2 — Diagnoses + Procedures
  lines.push('  <CF2>');
  lines.push(
    `    <ClaimType>${packet.patientType === 'I' ? 'inpatient' : 'outpatient'}</ClaimType>`
  );
  lines.push('    <Diagnoses>');
  for (const dx of packet.diagnoses) {
    lines.push(
      `      <Diagnosis type="${dx.type}" icdCode="${escapeXml(dx.icdCode)}"${dx.description ? ` description="${escapeXml(dx.description)}"` : ''} />`
    );
  }
  lines.push('    </Diagnoses>');
  if (packet.procedures.length > 0) {
    lines.push('    <Procedures>');
    for (const proc of packet.procedures) {
      lines.push(
        `      <Procedure code="${escapeXml(proc.code)}"${proc.description ? ` description="${escapeXml(proc.description)}"` : ''}${proc.laterality ? ` laterality="${proc.laterality}"` : ''} />`
      );
    }
    lines.push('    </Procedures>');
  }
  lines.push(
    `    <TotalActualCharges>${packet.totals.totalCharges.toFixed(2)}</TotalActualCharges>`
  );
  lines.push('  </CF2>');

  // CF3 — Professional Fees (if any)
  if (packet.professionalFees.length > 0) {
    lines.push('  <CF3>');
    for (const fee of packet.professionalFees) {
      lines.push(`    <ProfessionalFee>`);
      lines.push(`      <PhysicianName>${escapeXml(fee.physicianName)}</PhysicianName>`);
      lines.push(`      <License>${escapeXml(fee.physicianLicense)}</License>`);
      lines.push(`      <Amount>${fee.feeAmount.toFixed(2)}</Amount>`);
      lines.push(`      <ServiceDate>${escapeXml(fee.serviceDate)}</ServiceDate>`);
      lines.push(`    </ProfessionalFee>`);
    }
    lines.push(
      `    <TotalProfessionalFees>${packet.totals.totalProfessionalFees.toFixed(2)}</TotalProfessionalFees>`
    );
    lines.push('  </CF3>');
  }

  // CF4 — Charges (if any)
  if (packet.charges.length > 0) {
    lines.push('  <CF4>');
    for (const c of packet.charges) {
      lines.push(`    <ChargeItem category="${c.category}">`);
      lines.push(`      <Description>${escapeXml(c.description)}</Description>`);
      lines.push(`      <Quantity>${c.quantity}</Quantity>`);
      lines.push(`      <NetAmount>${c.netAmount.toFixed(2)}</NetAmount>`);
      lines.push(`      <PhicCoverage>${c.phicCoverage.toFixed(2)}</PhicCoverage>`);
      lines.push(`      <PatientShare>${c.patientShare.toFixed(2)}</PatientShare>`);
      lines.push(`    </ChargeItem>`);
    }
    lines.push(`    <GrandTotal>${packet.totals.totalCharges.toFixed(2)}</GrandTotal>`);
    lines.push('  </CF4>');
  }

  // Case Rate (if applicable)
  if (packet.caseRateCode) {
    lines.push('  <CaseRate>');
    lines.push(`    <Code>${escapeXml(packet.caseRateCode)}</Code>`);
    if (packet.caseRateDescription) {
      lines.push(`    <Description>${escapeXml(packet.caseRateDescription)}</Description>`);
    }
    lines.push('  </CaseRate>');
  }

  // Metadata
  lines.push('  <Metadata>');
  lines.push(`    <PacketId>${escapeXml(packet.packetId)}</PacketId>`);
  lines.push(`    <ContentHash>${packet.contentHash}</ContentHash>`);
  lines.push(`    <AssembledBy>${escapeXml(packet.assembledBy)}</AssembledBy>`);
  lines.push('    <SpecBased>false</SpecBased>');
  lines.push('  </Metadata>');

  lines.push('</eClaimsCF>');

  const xml = lines.join('\n');
  return { ok: false, reason: 'eClaims 3.0 XML schema not yet available.', placeholderXml: xml };
}

/* ── Placeholder Validator ──────────────────────────────────── */

export function validatePlaceholderXml(xml: string): XmlValidationResult {
  const errors: Array<{ path: string; message: string }> = [];

  if (!xml.includes('<?xml version="1.0"')) {
    errors.push({ path: '/', message: 'Missing XML declaration.' });
  }
  if (!xml.includes('SPEC_PENDING')) {
    errors.push({
      path: '/',
      message: 'Missing SPEC_PENDING marker — may be invalid placeholder.',
    });
  }
  if (!xml.includes('<eClaimsCF')) {
    errors.push({ path: '/eClaimsCF', message: 'Missing root element.' });
  }

  return {
    valid: errors.length === 0,
    errors,
    specBased: false,
  };
}

/* ── XmlGenerator instance (placeholder) ────────────────────── */

export const placeholderXmlGenerator: XmlGeneratorInterface = {
  specAvailable: false,
  schemaVersion: '3.0-placeholder',

  generate(packet: ClaimPacket): XmlGeneratorResult {
    return generatePlaceholderXml(packet);
  },

  validate(xml: string): XmlValidationResult {
    return validatePlaceholderXml(xml);
  },
};
