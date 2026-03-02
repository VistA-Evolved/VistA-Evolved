/**
 * apps/api/src/migration/recon-engine.ts
 *
 * Phase 460 (W30-P5). Reconciliation engine for migration validation.
 * Compares records between VistA source and migration target,
 * detects discrepancies, and tracks resolution workflow.
 */

import { randomBytes } from "crypto";

// ── Types ──────────────────────────────────────────────────────────

export type ReconEntityType = "patient" | "problem" | "medication" | "allergy" | "encounter";

export type DiscrepancyCategory =
  | "missing-in-target"
  | "missing-in-source"
  | "field-mismatch"
  | "data-quality";

export type ResolutionStatus =
  | "open"
  | "auto-resolved"
  | "manual-review"
  | "accepted"
  | "resolved";

export interface ReconRule {
  entityType: ReconEntityType;
  matchKeys: string[];       // Fields used to match records across systems
  compareFields: string[];   // Fields compared for discrepancies
  autoResolveRules?: AutoResolveRule[];
}

export interface AutoResolveRule {
  field: string;
  condition: "case-insensitive" | "whitespace-trim" | "date-format";
}

export interface Discrepancy {
  id: string;
  reconJobId: string;
  entityType: ReconEntityType;
  category: DiscrepancyCategory;
  sourceRecordId: string;
  targetRecordId?: string;
  field?: string;
  sourceValue?: unknown;
  targetValue?: unknown;
  resolution: ResolutionStatus;
  resolvedBy?: string;
  resolvedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface ReconJob {
  id: string;
  entityType: ReconEntityType;
  status: "running" | "completed" | "failed";
  createdAt: string;
  completedAt?: string;
  createdBy: string;
  sourceCount: number;
  targetCount: number;
  matchedCount: number;
  discrepancyCount: number;
  autoResolvedCount: number;
}

export interface ReconStats {
  totalJobs: number;
  totalDiscrepancies: number;
  openDiscrepancies: number;
  resolvedDiscrepancies: number;
  byCategory: Record<string, number>;
  byEntity: Record<string, number>;
}

// ── In-memory stores ───────────────────────────────────────────────

const reconJobs = new Map<string, ReconJob>();
const discrepancies = new Map<string, Discrepancy>();

// ── Default rules ──────────────────────────────────────────────────

const DEFAULT_RULES: ReconRule[] = [
  {
    entityType: "patient",
    matchKeys: ["patientId", "ssn", "dob"],
    compareFields: ["lastName", "firstName", "gender", "dob", "address", "phone"],
    autoResolveRules: [
      { field: "lastName", condition: "case-insensitive" },
      { field: "firstName", condition: "case-insensitive" },
    ],
  },
  {
    entityType: "problem",
    matchKeys: ["patientId", "icdCode"],
    compareFields: ["description", "status", "onsetDate"],
    autoResolveRules: [
      { field: "description", condition: "whitespace-trim" },
    ],
  },
  {
    entityType: "medication",
    matchKeys: ["patientId", "drugName"],
    compareFields: ["dose", "route", "frequency", "status"],
  },
  {
    entityType: "allergy",
    matchKeys: ["patientId", "allergen"],
    compareFields: ["reaction", "severity", "status"],
    autoResolveRules: [
      { field: "allergen", condition: "case-insensitive" },
    ],
  },
];

// ── Engine ─────────────────────────────────────────────────────────

export class ReconEngine {
  private rules: ReconRule[] = [...DEFAULT_RULES];

  getRules(): ReconRule[] {
    return this.rules;
  }

  setRules(rules: ReconRule[]): void {
    this.rules = rules;
  }

  /**
   * Run reconciliation comparing source records against target records.
   */
  runRecon(
    entityType: ReconEntityType,
    sourceRecords: Record<string, unknown>[],
    targetRecords: Record<string, unknown>[],
    userId: string
  ): ReconJob {
    const jobId = `recon-${randomBytes(8).toString("hex")}`;
    const now = new Date().toISOString();
    const rule = this.rules.find((r) => r.entityType === entityType);

    const job: ReconJob = {
      id: jobId,
      entityType,
      status: "running",
      createdAt: now,
      createdBy: userId,
      sourceCount: sourceRecords.length,
      targetCount: targetRecords.length,
      matchedCount: 0,
      discrepancyCount: 0,
      autoResolvedCount: 0,
    };

    if (!rule) {
      job.status = "failed";
      reconJobs.set(jobId, job);
      return job;
    }

    // Build target index using match keys
    const targetIndex = new Map<string, Record<string, unknown>>();
    for (const rec of targetRecords) {
      const key = rule.matchKeys.map((k) => String(rec[k] || "")).join("|");
      targetIndex.set(key, rec);
    }

    // Compare each source record
    const matchedTargetKeys = new Set<string>();

    for (const srcRec of sourceRecords) {
      const key = rule.matchKeys.map((k) => String(srcRec[k] || "")).join("|");
      const tgtRec = targetIndex.get(key);

      if (!tgtRec) {
        // Missing in target
        this.addDiscrepancy(jobId, entityType, "missing-in-target", String(srcRec["id"] || key), undefined, now);
        job.discrepancyCount++;
        continue;
      }

      matchedTargetKeys.add(key);
      job.matchedCount++;

      // Field-level comparison
      for (const field of rule.compareFields) {
        const sv = srcRec[field];
        const tv = tgtRec[field];

        if (JSON.stringify(sv) !== JSON.stringify(tv)) {
          // Check auto-resolve rules
          const autoRule = rule.autoResolveRules?.find((ar) => ar.field === field);
          const canAutoResolve = autoRule && this.tryAutoResolve(autoRule, sv, tv);

          const discId = this.addDiscrepancy(
            jobId, entityType, "field-mismatch",
            String(srcRec["id"] || key), String(tgtRec["id"] || key),
            now, field, sv, tv
          );

          if (canAutoResolve) {
            const disc = discrepancies.get(discId);
            if (disc) {
              disc.resolution = "auto-resolved";
              disc.resolvedAt = now;
              disc.resolvedBy = "system";
            }
            job.autoResolvedCount++;
          }
          job.discrepancyCount++;
        }
      }
    }

    // Check for records missing in source
    for (const tgtRec of targetRecords) {
      const key = rule.matchKeys.map((k) => String(tgtRec[k] || "")).join("|");
      if (!matchedTargetKeys.has(key)) {
        const srcKey = rule.matchKeys.map((k) => String(tgtRec[k] || "")).join("|");
        // Only create if there's no matching source record
        if (!sourceRecords.some((s) => rule.matchKeys.map((k) => String(s[k] || "")).join("|") === srcKey)) {
          this.addDiscrepancy(jobId, entityType, "missing-in-source", "", String(tgtRec["id"] || key), now);
          job.discrepancyCount++;
        }
      }
    }

    job.status = "completed";
    job.completedAt = new Date().toISOString();
    reconJobs.set(jobId, job);
    return job;
  }

  private addDiscrepancy(
    jobId: string, entityType: ReconEntityType, category: DiscrepancyCategory,
    sourceId: string, targetId: string | undefined, now: string,
    field?: string, sourceValue?: unknown, targetValue?: unknown
  ): string {
    const id = `disc-${randomBytes(6).toString("hex")}`;
    const disc: Discrepancy = {
      id, reconJobId: jobId, entityType, category,
      sourceRecordId: sourceId, targetRecordId: targetId,
      field, sourceValue, targetValue,
      resolution: "open", createdAt: now,
    };
    discrepancies.set(id, disc);
    return id;
  }

  private tryAutoResolve(rule: AutoResolveRule, sv: unknown, tv: unknown): boolean {
    const s = String(sv || "");
    const t = String(tv || "");
    switch (rule.condition) {
      case "case-insensitive": return s.toLowerCase() === t.toLowerCase();
      case "whitespace-trim": return s.trim() === t.trim();
      case "date-format": return s.replace(/[-/]/g, "") === t.replace(/[-/]/g, "");
      default: return false;
    }
  }

  // ── Query methods ──────────────────────────────────────────────

  getJob(id: string): ReconJob | undefined {
    return reconJobs.get(id);
  }

  listJobs(): ReconJob[] {
    return Array.from(reconJobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getDiscrepancy(id: string): Discrepancy | undefined {
    return discrepancies.get(id);
  }

  listDiscrepancies(jobId?: string, status?: ResolutionStatus): Discrepancy[] {
    let list = Array.from(discrepancies.values());
    if (jobId) list = list.filter((d) => d.reconJobId === jobId);
    if (status) list = list.filter((d) => d.resolution === status);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  resolveDiscrepancy(id: string, resolution: ResolutionStatus, userId: string, notes?: string): boolean {
    const disc = discrepancies.get(id);
    if (!disc) return false;
    disc.resolution = resolution;
    disc.resolvedBy = userId;
    disc.resolvedAt = new Date().toISOString();
    if (notes) disc.notes = notes;
    return true;
  }

  getStats(): ReconStats {
    const all = Array.from(discrepancies.values());
    const byCategory: Record<string, number> = {};
    const byEntity: Record<string, number> = {};
    let open = 0;
    let resolved = 0;

    for (const d of all) {
      byCategory[d.category] = (byCategory[d.category] || 0) + 1;
      byEntity[d.entityType] = (byEntity[d.entityType] || 0) + 1;
      if (d.resolution === "open" || d.resolution === "manual-review") open++;
      else resolved++;
    }

    return {
      totalJobs: reconJobs.size,
      totalDiscrepancies: all.length,
      openDiscrepancies: open,
      resolvedDiscrepancies: resolved,
      byCategory,
      byEntity,
    };
  }
}

// ── Singleton ──────────────────────────────────────────────────────

export const reconEngine = new ReconEngine();
