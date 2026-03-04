/**
 * PhilHealth eClaims 3.0 — Export Generators
 *
 * Phase 96: Generate export artifacts from a ClaimPacket.
 *
 * Three export formats:
 *   1. JSON canonical — complete ClaimPacket as pretty-printed JSON
 *   2. PDF text — human-readable text summary for print-ready manual submission
 *   3. XML placeholder — delegated to xml-generator.ts
 *
 * The PDF text format is a plain-text representation suitable for rendering
 * as a printable document. It contains all the data a billing clerk needs
 * to manually key into the PhilHealth portal if automated submission is
 * not yet available.
 */

import { randomBytes } from 'node:crypto';
import type { ClaimPacket, ExportBundle, ExportArtifact, ExportFormat } from './types.js';
import { generatePlaceholderXml } from './xml-generator.js';

/* ── Bundle ID ──────────────────────────────────────────────── */

function newBundleId(): string {
  return `bndl-${Date.now().toString(36)}-${randomBytes(6).toString('hex')}`;
}

/* ── JSON Canonical Export ──────────────────────────────────── */

function generateJsonExport(packet: ClaimPacket): ExportArtifact {
  const content = JSON.stringify(packet, null, 2);
  const now = new Date().toISOString();
  return {
    format: 'json',
    filename: `eclaims3_${packet.packetId}_${now.slice(0, 10)}.json`,
    content,
    contentType: 'application/json',
    sizeBytes: Buffer.byteLength(content, 'utf-8'),
    generatedAt: now,
  };
}

/* ── PDF Text Export (print-ready) ──────────────────────────── */

function pad(s: string, len: number): string {
  return s.padEnd(len);
}

function line(label: string, value: string | undefined): string {
  return `  ${pad(label + ':', 32)} ${value ?? 'N/A'}`;
}

function separator(): string {
  return '─'.repeat(72);
}

function generatePdfTextExport(packet: ClaimPacket): ExportArtifact {
  const now = new Date().toISOString();
  const lines: string[] = [];

  lines.push(separator());
  lines.push('  PHILHEALTH eCLAIMS 3.0 — CLAIM SUMMARY FOR MANUAL SUBMISSION');
  lines.push(separator());
  lines.push('');
  lines.push(`  Packet ID:     ${packet.packetId}`);
  lines.push(`  Generated:     ${now.slice(0, 19).replace('T', ' ')}`);
  lines.push(`  eClaims Ver:   ${packet.eclaimsVersion}`);
  lines.push(`  Content Hash:  ${packet.contentHash.slice(0, 16)}...`);
  lines.push('');

  // Facility
  lines.push(separator());
  lines.push('  FACILITY INFORMATION (CF1)');
  lines.push(separator());
  lines.push(line('Facility Code', packet.facility.facilityCode));
  lines.push(line('Facility Name', packet.facility.facilityName));
  lines.push(line('Accreditation No.', packet.facility.accreditationNumber));
  lines.push(line('TIN', packet.facility.tinNumber));
  lines.push('');

  // Patient
  lines.push(separator());
  lines.push('  PATIENT INFORMATION (CF1)');
  lines.push(separator());
  lines.push(
    line(
      'Name',
      `${packet.patient.lastName}, ${packet.patient.firstName} ${packet.patient.middleName ?? ''}`
    )
  );
  lines.push(line('Date of Birth', packet.patient.dob));
  lines.push(line('Sex', packet.patient.sex));
  lines.push(line('PhilHealth PIN', packet.patient.philhealthPin));
  lines.push(line('Member PIN', packet.patient.memberPin));
  lines.push(
    line(
      'Relationship',
      packet.patient.memberRelationship === 'S'
        ? 'Self'
        : packet.patient.memberRelationship === 'D'
          ? 'Dependent'
          : 'Parent'
    )
  );
  lines.push(line('Patient Type', packet.patientType === 'I' ? 'Inpatient' : 'Outpatient'));
  lines.push(line('Admission Date', packet.admissionDate));
  lines.push(line('Discharge Date', packet.dischargeDate));
  lines.push(line('VistA Encounter IEN', packet.encounterIen));
  lines.push('');

  // Case Rate
  if (packet.caseRateCode) {
    lines.push(line('Case Rate Code', packet.caseRateCode));
    lines.push(line('Case Rate Description', packet.caseRateDescription));
    lines.push('');
  }

  // Diagnoses (CF2)
  lines.push(separator());
  lines.push('  DIAGNOSES (CF2)');
  lines.push(separator());
  for (const dx of packet.diagnoses) {
    lines.push(`  [${dx.type.toUpperCase().padEnd(9)}] ${dx.icdCode}  ${dx.description ?? ''}`);
  }
  lines.push('');

  // Procedures (CF2)
  if (packet.procedures.length > 0) {
    lines.push(separator());
    lines.push('  PROCEDURES (CF2)');
    lines.push(separator());
    for (const proc of packet.procedures) {
      const lat = proc.laterality ? ` (${proc.laterality})` : '';
      lines.push(`  ${proc.code}${lat}  ${proc.description ?? ''}`);
    }
    lines.push('');
  }

  // Professional Fees (CF3)
  if (packet.professionalFees.length > 0) {
    lines.push(separator());
    lines.push('  PROFESSIONAL FEES (CF3)');
    lines.push(separator());
    for (const fee of packet.professionalFees) {
      lines.push(`  ${fee.physicianName} (PRC: ${fee.physicianLicense})`);
      lines.push(
        `    Fee: PHP ${fee.feeAmount.toFixed(2)}  Date: ${fee.serviceDate}  Proc: ${fee.procedureCode ?? 'N/A'}`
      );
    }
    lines.push(`  TOTAL PROFESSIONAL FEES: PHP ${packet.totals.totalProfessionalFees.toFixed(2)}`);
    lines.push('');
  }

  // Charges (CF4 / SOA)
  if (packet.charges.length > 0) {
    lines.push(separator());
    lines.push('  CHARGES / STATEMENT OF ACCOUNT (CF4)');
    lines.push(separator());
    lines.push(
      `  ${'Category'.padEnd(20)} ${'Description'.padEnd(25)} ${'Qty'.padStart(4)} ${'Net Amt'.padStart(12)}`
    );
    lines.push(`  ${'─'.repeat(20)} ${'─'.repeat(25)} ${'─'.repeat(4)} ${'─'.repeat(12)}`);
    for (const c of packet.charges) {
      lines.push(
        `  ${c.category.padEnd(20)} ${c.description.slice(0, 25).padEnd(25)} ${String(c.quantity).padStart(4)} ${('PHP ' + c.netAmount.toFixed(2)).padStart(12)}`
      );
    }
    lines.push('');
  }

  // Totals
  lines.push(separator());
  lines.push('  TOTALS');
  lines.push(separator());
  lines.push(line('Total Charges', `PHP ${packet.totals.totalCharges.toFixed(2)}`));
  lines.push(line('Total Discount', `PHP ${packet.totals.totalDiscount.toFixed(2)}`));
  lines.push(line('Net Amount', `PHP ${packet.totals.totalNetAmount.toFixed(2)}`));
  lines.push(line('PhilHealth Coverage', `PHP ${packet.totals.totalPhicCoverage.toFixed(2)}`));
  lines.push(line('Patient Share', `PHP ${packet.totals.totalPatientShare.toFixed(2)}`));
  lines.push('');

  // Footer
  lines.push(separator());
  lines.push('  ** THIS IS A SYSTEM-GENERATED SUMMARY FOR MANUAL PORTAL SUBMISSION **');
  lines.push('  ** Verify all data against VistA source records before uploading.    **');
  lines.push(separator());

  const content = lines.join('\n');
  return {
    format: 'pdf_text',
    filename: `eclaims3_${packet.packetId}_${now.slice(0, 10)}_summary.txt`,
    content,
    contentType: 'text/plain',
    sizeBytes: Buffer.byteLength(content, 'utf-8'),
    generatedAt: now,
  };
}

/* ── Generate Full Export Bundle ─────────────────────────────── */

export interface ExportOptions {
  formats?: ExportFormat[];
  actor: string;
}

/**
 * Generate an ExportBundle containing all requested formats.
 * Default: all three (JSON, PDF text, XML placeholder).
 */
export function generateExportBundle(packet: ClaimPacket, opts: ExportOptions): ExportBundle {
  const formats = opts.formats ?? ['json', 'pdf_text', 'xml_placeholder'];
  const artifacts: ExportArtifact[] = [];

  for (const fmt of formats) {
    switch (fmt) {
      case 'json':
        artifacts.push(generateJsonExport(packet));
        break;
      case 'pdf_text':
        artifacts.push(generatePdfTextExport(packet));
        break;
      case 'xml_placeholder': {
        const xmlResult = generatePlaceholderXml(packet);
        artifacts.push({
          format: 'xml_placeholder',
          filename: `eclaims3_${packet.packetId}_placeholder.xml`,
          content: xmlResult.ok ? xmlResult.xml : xmlResult.placeholderXml,
          contentType: 'application/xml',
          sizeBytes: Buffer.byteLength(
            xmlResult.ok ? xmlResult.xml : xmlResult.placeholderXml,
            'utf-8'
          ),
          generatedAt: new Date().toISOString(),
        });
        break;
      }
    }
  }

  const now = new Date().toISOString();
  return {
    bundleId: newBundleId(),
    packetId: packet.packetId,
    sourceClaimDraftId: packet.sourceClaimDraftId,
    artifacts,
    generatedAt: now,
    generatedBy: opts.actor,
    xmlSpecAvailable: false,
    summary: {
      patientName: `${packet.patient.lastName}, ${packet.patient.firstName}`,
      patientType: packet.patientType,
      admissionDate: packet.admissionDate,
      totalCharges: packet.totals.totalCharges,
      diagnosisCount: packet.diagnoses.length,
      procedureCount: packet.procedures.length,
      formatCount: artifacts.length,
    },
  };
}
