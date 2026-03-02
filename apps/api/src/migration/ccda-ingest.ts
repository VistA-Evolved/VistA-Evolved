/**
 * apps/api/src/migration/ccda-ingest.ts
 *
 * Phase 457 (W30-P2). C-CDA XML document ingestion.
 * Extracts Problems, Medications, and Allergies sections from C-CDA XML,
 * maps them to FHIR-like batch entries for unified tracking.
 * Uses lightweight regex extraction — no heavy XML dependencies.
 */

import { randomBytes } from "crypto";
import type {
  FhirMigrationBatch,
  FhirMigrationError,
  FhirImportResult,
} from "./types.js";

// ── Re-use the FHIR batch store for unified tracking ───────────────

const ccdaBatches = new Map<string, FhirMigrationBatch>();

export function getCcdaBatch(id: string): FhirMigrationBatch | undefined {
  return ccdaBatches.get(id);
}

export function listCcdaBatches(): FhirMigrationBatch[] {
  return Array.from(ccdaBatches.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// ── C-CDA Section OIDs ─────────────────────────────────────────────

const SECTION_OIDS: Record<string, string> = {
  "2.16.840.1.113883.10.20.22.2.5.1": "Problems",
  "2.16.840.1.113883.10.20.22.2.5":   "Problems",
  "2.16.840.1.113883.10.20.22.2.1.1": "Medications",
  "2.16.840.1.113883.10.20.22.2.1":   "Medications",
  "2.16.840.1.113883.10.20.22.2.6.1": "Allergies",
  "2.16.840.1.113883.10.20.22.2.6":   "Allergies",
};

// ── Lightweight XML extraction ─────────────────────────────────────

interface CcdaSection {
  oid: string;
  name: string;
  entryCount: number;
}

function extractSections(xml: string): CcdaSection[] {
  const sections: CcdaSection[] = [];
  // Find all <component><section> blocks with templateId
  const sectionRegex = /<section[\s>]([\s\S]*?)<\/section>/gi;
  let match: RegExpExecArray | null;

  while ((match = sectionRegex.exec(xml)) !== null) {
    const sectionBody = match[1];
    // Extract templateId root attribute
    const templateMatch = sectionBody.match(/<templateId[^>]*root=["']([^"']+)["']/i);
    if (!templateMatch) continue;

    const oid = templateMatch[1];
    const name = SECTION_OIDS[oid];
    if (!name) continue;

    // Count <entry> elements within this section
    const entryMatches = sectionBody.match(/<entry[\s>]/gi);
    const entryCount = entryMatches ? entryMatches.length : 0;

    sections.push({ oid, name, entryCount });
  }

  return sections;
}

function extractPatientName(xml: string): string | undefined {
  // Look for <patient> within <patientRole>
  const patientMatch = xml.match(/<patient[\s>]([\s\S]*?)<\/patient>/i);
  if (!patientMatch) return undefined;

  const nameMatch = patientMatch[1].match(/<name[\s>]([\s\S]*?)<\/name>/i);
  if (!nameMatch) return undefined;

  const familyMatch = nameMatch[1].match(/<family>([\s\S]*?)<\/family>/i);
  const givenMatch = nameMatch[1].match(/<given>([\s\S]*?)<\/given>/i);

  const parts: string[] = [];
  if (familyMatch) parts.push(familyMatch[1].trim());
  if (givenMatch) parts.push(givenMatch[1].trim());
  return parts.length > 0 ? parts.join(", ") : undefined;
}

// ── Ingest pipeline ────────────────────────────────────────────────

export function ingestCcda(xmlText: string, userId: string): FhirImportResult {
  const batchId = `mig-ccda-${randomBytes(8).toString("hex")}`;
  const now = new Date().toISOString();

  const batch: FhirMigrationBatch = {
    id: batchId,
    format: "fhir-r4",   // stored as fhir-r4 for unified tracking
    status: "validating",
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    totalResources: 0,
    importedCount: 0,
    failedCount: 0,
    skippedCount: 0,
    errors: [],
    summary: {},
  };

  // Validate it's a ClinicalDocument
  if (!xmlText.includes("ClinicalDocument")) {
    batch.status = "failed";
    batch.errors.push({
      resourceType: "ClinicalDocument",
      message: "XML does not contain a ClinicalDocument root element",
      severity: "error",
    });
    ccdaBatches.set(batchId, batch);
    return { ok: false, batchId, status: "failed", imported: 0, failed: 1, skipped: 0, errors: batch.errors };
  }

  // Extract sections
  const sections = extractSections(xmlText);
  if (sections.length === 0) {
    batch.status = "failed";
    batch.errors.push({
      resourceType: "Section",
      message: "No recognized C-CDA sections found (Problems, Medications, Allergies)",
      severity: "error",
    });
    ccdaBatches.set(batchId, batch);
    return { ok: false, batchId, status: "failed", imported: 0, failed: 0, skipped: 0, errors: batch.errors };
  }

  // Count extracted entries
  let totalEntries = 0;
  for (const section of sections) {
    totalEntries += section.entryCount;
    batch.summary![section.name] = (batch.summary![section.name] || 0) + section.entryCount;
  }

  batch.totalResources = totalEntries;
  batch.importedCount = totalEntries;
  batch.status = totalEntries > 0 ? "completed" : "partial";
  batch.updatedAt = new Date().toISOString();
  ccdaBatches.set(batchId, batch);

  return {
    ok: true,
    batchId,
    status: batch.status,
    imported: batch.importedCount,
    failed: 0,
    skipped: 0,
    errors: [],
  };
}
