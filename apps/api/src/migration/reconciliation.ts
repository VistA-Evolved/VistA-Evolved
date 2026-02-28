/**
 * reconciliation.ts -- Migration Reconciliation Engine (Phase 281)
 *
 * Compares source records to imported records and generates evidence
 * reports. Uses SHA-256 content hashing for integrity verification.
 * Produces a structured ReconciliationReport for audit compliance.
 */

import { createHash } from "crypto";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ReconciliationStatus =
  | "matched"
  | "mismatched"
  | "missing-in-target"
  | "extra-in-target";

export interface ReconciliationEntry {
  /** Source record identifier */
  sourceId: string;
  /** Target (imported) record identifier, if found */
  targetId?: string;
  /** Entity type */
  entityType: string;
  /** Match status */
  status: ReconciliationStatus;
  /** SHA-256 of source record */
  sourceHash: string;
  /** SHA-256 of target record (if it exists) */
  targetHash?: string;
  /** Field-level diff details for mismatches */
  diffs?: FieldDiff[];
}

export interface FieldDiff {
  field: string;
  sourceValue: string;
  targetValue: string;
}

export interface ReconciliationReport {
  /** Unique report ID */
  id: string;
  /** When the reconciliation was run */
  generatedAt: string;
  /** Summary counts */
  summary: {
    totalSource: number;
    totalTarget: number;
    matched: number;
    mismatched: number;
    missingInTarget: number;
    extraInTarget: number;
  };
  /** Per-entity-type breakdown */
  byEntityType: Record<
    string,
    {
      matched: number;
      mismatched: number;
      missingInTarget: number;
      extraInTarget: number;
    }
  >;
  /** Individual reconciliation entries */
  entries: ReconciliationEntry[];
  /** SHA-256 of the entire report for tamper detection */
  reportHash: string;
}

export interface ReconciliationRecord {
  /** Unique ID for matching */
  id: string;
  /** Entity type (patient, allergy, problem, etc.) */
  entityType: string;
  /** Key-value data fields */
  fields: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function hashRecord(record: ReconciliationRecord): string {
  const normalized = JSON.stringify({
    id: record.id,
    entityType: record.entityType,
    fields: Object.keys(record.fields)
      .sort()
      .reduce(
        (acc, k) => {
          acc[k] = record.fields[k];
          return acc;
        },
        {} as Record<string, string>,
      ),
  });
  return createHash("sha256").update(normalized).digest("hex");
}

function findFieldDiffs(
  source: Record<string, string>,
  target: Record<string, string>,
): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  const allKeys = new Set([...Object.keys(source), ...Object.keys(target)]);

  for (const key of allKeys) {
    const sv = source[key] ?? "";
    const tv = target[key] ?? "";
    if (sv !== tv) {
      diffs.push({ field: key, sourceValue: sv, targetValue: tv });
    }
  }

  return diffs;
}

function generateReportId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `recon-${ts}-${rand}`;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Reconcile source records against target (imported) records.
 *
 * Records are matched by (entityType + id). If IDs differ between
 * source and target systems, provide a mapping function.
 */
export function reconcileImport(
  sourceRecords: ReconciliationRecord[],
  targetRecords: ReconciliationRecord[],
  options?: {
    /** Custom ID mapping: source ID → target ID */
    idMapping?: Map<string, string>;
  },
): ReconciliationReport {
  const idMapping = options?.idMapping ?? new Map<string, string>();
  const entries: ReconciliationEntry[] = [];

  // Index targets by composite key (entityType:id)
  const targetIndex = new Map<string, ReconciliationRecord>();
  for (const t of targetRecords) {
    targetIndex.set(`${t.entityType}:${t.id}`, t);
  }
  const matchedTargetKeys = new Set<string>();

  // Walk source records
  for (const source of sourceRecords) {
    const mappedId = idMapping.get(source.id) ?? source.id;
    const key = `${source.entityType}:${mappedId}`;
    const target = targetIndex.get(key);
    const sourceHash = hashRecord(source);

    if (!target) {
      entries.push({
        sourceId: source.id,
        entityType: source.entityType,
        status: "missing-in-target",
        sourceHash,
      });
      continue;
    }

    matchedTargetKeys.add(key);
    const targetHash = hashRecord(target);

    if (sourceHash === targetHash) {
      entries.push({
        sourceId: source.id,
        targetId: target.id,
        entityType: source.entityType,
        status: "matched",
        sourceHash,
        targetHash,
      });
    } else {
      const diffs = findFieldDiffs(source.fields, target.fields);
      entries.push({
        sourceId: source.id,
        targetId: target.id,
        entityType: source.entityType,
        status: "mismatched",
        sourceHash,
        targetHash,
        diffs,
      });
    }
  }

  // Find extra records in target
  for (const t of targetRecords) {
    const key = `${t.entityType}:${t.id}`;
    if (!matchedTargetKeys.has(key)) {
      entries.push({
        sourceId: "",
        targetId: t.id,
        entityType: t.entityType,
        status: "extra-in-target",
        sourceHash: "",
        targetHash: hashRecord(t),
      });
    }
  }

  // Build summary
  const summary = {
    totalSource: sourceRecords.length,
    totalTarget: targetRecords.length,
    matched: entries.filter((e) => e.status === "matched").length,
    mismatched: entries.filter((e) => e.status === "mismatched").length,
    missingInTarget: entries.filter((e) => e.status === "missing-in-target").length,
    extraInTarget: entries.filter((e) => e.status === "extra-in-target").length,
  };

  // Per entity type breakdown
  const byEntityType: ReconciliationReport["byEntityType"] = {};
  for (const entry of entries) {
    if (!byEntityType[entry.entityType]) {
      byEntityType[entry.entityType] = {
        matched: 0,
        mismatched: 0,
        missingInTarget: 0,
        extraInTarget: 0,
      };
    }
    const bucket = byEntityType[entry.entityType];
    if (entry.status === "matched") bucket.matched++;
    else if (entry.status === "mismatched") bucket.mismatched++;
    else if (entry.status === "missing-in-target") bucket.missingInTarget++;
    else if (entry.status === "extra-in-target") bucket.extraInTarget++;
  }

  const reportId = generateReportId();
  const generatedAt = new Date().toISOString();

  // Hash the report for tamper detection
  const reportPayload = JSON.stringify({ reportId, generatedAt, summary, entries });
  const reportHash = createHash("sha256").update(reportPayload).digest("hex");

  return {
    id: reportId,
    generatedAt,
    summary,
    byEntityType,
    entries,
    reportHash,
  };
}

/**
 * Verify a previously generated reconciliation report integrity.
 */
export function verifyReportIntegrity(report: ReconciliationReport): boolean {
  const payload = JSON.stringify({
    reportId: report.id,
    generatedAt: report.generatedAt,
    summary: report.summary,
    entries: report.entries,
  });
  const computed = createHash("sha256").update(payload).digest("hex");
  return computed === report.reportHash;
}
