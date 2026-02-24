/**
 * Scrub Rule Repository — Phase 111
 *
 * DB-backed CRUD for payer-specific validation rules and scrub results.
 * Rules are evidence-backed: each rule must cite its source/date.
 * If unknown: mark as contracting_needed in evidenceSource.
 */

import { randomUUID } from "node:crypto";
import { eq, and, desc, count } from "drizzle-orm";
import { getDb } from "../../platform/db/db.js";
import { scrubRule, scrubResult } from "../../platform/db/schema.js";

/* ── Types ─────────────────────────────────────────────────── */

export interface ScrubRuleRow {
  id: string;
  tenantId: string;
  payerId: string | null;
  serviceType: string | null;
  ruleCode: string;
  category: string;
  severity: string;
  field: string;
  description: string;
  condition: unknown;
  suggestedFix: string | null;
  evidenceSource: string | null;
  evidenceDate: string | null;
  blocksSubmission: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ScrubResultRow {
  id: string;
  claimDraftId: string;
  tenantId: string;
  ruleId: string | null;
  ruleCode: string;
  severity: string;
  category: string;
  field: string;
  message: string;
  suggestedFix: string | null;
  blocksSubmission: boolean;
  score: number;
  scrubbedAt: string;
}

export interface CreateScrubRuleInput {
  tenantId?: string;
  payerId?: string;
  serviceType?: string;
  ruleCode: string;
  category: string;
  severity?: string;
  field: string;
  description: string;
  condition: unknown;
  suggestedFix?: string;
  evidenceSource?: string;
  evidenceDate?: string;
  blocksSubmission?: boolean;
  createdBy: string;
}

/* ── Helpers ────────────────────────────────────────────────── */

function safeJsonParse<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

function parseRule(row: any): ScrubRuleRow {
  return {
    id: row.id,
    tenantId: row.tenantId,
    payerId: row.payerId,
    serviceType: row.serviceType,
    ruleCode: row.ruleCode,
    category: row.category,
    severity: row.severity,
    field: row.field,
    description: row.description,
    condition: safeJsonParse(row.conditionJson, {}),
    suggestedFix: row.suggestedFix,
    evidenceSource: row.evidenceSource,
    evidenceDate: row.evidenceDate,
    blocksSubmission: row.blocksSubmission === 1,
    isActive: row.isActive === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
  };
}

function parseResult(row: any): ScrubResultRow {
  return {
    id: row.id,
    claimDraftId: row.claimDraftId,
    tenantId: row.tenantId,
    ruleId: row.ruleId,
    ruleCode: row.ruleCode,
    severity: row.severity,
    category: row.category,
    field: row.field,
    message: row.message,
    suggestedFix: row.suggestedFix,
    blocksSubmission: row.blocksSubmission === 1,
    score: row.score,
    scrubbedAt: row.scrubbedAt,
  };
}

/* ── Scrub Rule CRUD ──────────────────────────────────────── */

export function createScrubRule(input: CreateScrubRuleInput): ScrubRuleRow {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const tenantId = input.tenantId || "default";

  db.insert(scrubRule).values({
    id,
    tenantId,
    payerId: input.payerId || null,
    serviceType: input.serviceType || null,
    ruleCode: input.ruleCode,
    category: input.category,
    severity: input.severity || "error",
    field: input.field,
    description: input.description,
    conditionJson: JSON.stringify(input.condition),
    suggestedFix: input.suggestedFix || null,
    evidenceSource: input.evidenceSource || null,
    evidenceDate: input.evidenceDate || null,
    blocksSubmission: (input.blocksSubmission !== false) ? 1 : 0,
    isActive: 1,
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
  }).run();

  return getScrubRuleById(tenantId, id)!;
}

export function getScrubRuleById(tenantId: string, id: string): ScrubRuleRow | null {
  const db = getDb();
  const row = db
    .select()
    .from(scrubRule)
    .where(and(eq(scrubRule.tenantId, tenantId), eq(scrubRule.id, id)))
    .get();
  return row ? parseRule(row) : null;
}

export function listScrubRules(
  tenantId: string,
  filters?: { payerId?: string; category?: string; isActive?: boolean },
): ScrubRuleRow[] {
  const db = getDb();
  const conditions = [eq(scrubRule.tenantId, tenantId)];
  if (filters?.payerId) conditions.push(eq(scrubRule.payerId, filters.payerId));
  if (filters?.category) conditions.push(eq(scrubRule.category, filters.category));
  if (filters?.isActive !== undefined) conditions.push(eq(scrubRule.isActive, filters.isActive ? 1 : 0));

  return db
    .select()
    .from(scrubRule)
    .where(and(...conditions))
    .orderBy(desc(scrubRule.updatedAt))
    .all()
    .map(parseRule);
}

export function updateScrubRule(
  tenantId: string,
  id: string,
  updates: Partial<Pick<CreateScrubRuleInput,
    "description" | "condition" | "suggestedFix" | "severity" | "blocksSubmission" |
    "evidenceSource" | "evidenceDate"
  > & { isActive?: boolean }>,
): ScrubRuleRow | null {
  const db = getDb();
  const now = new Date().toISOString();
  const setClause: Record<string, any> = { updatedAt: now };

  if (updates.description !== undefined) setClause.description = updates.description;
  if (updates.condition !== undefined) setClause.conditionJson = JSON.stringify(updates.condition);
  if (updates.suggestedFix !== undefined) setClause.suggestedFix = updates.suggestedFix;
  if (updates.severity !== undefined) setClause.severity = updates.severity;
  if (updates.blocksSubmission !== undefined) setClause.blocksSubmission = updates.blocksSubmission ? 1 : 0;
  if (updates.evidenceSource !== undefined) setClause.evidenceSource = updates.evidenceSource;
  if (updates.evidenceDate !== undefined) setClause.evidenceDate = updates.evidenceDate;
  if (updates.isActive !== undefined) setClause.isActive = updates.isActive ? 1 : 0;

  db.update(scrubRule)
    .set(setClause)
    .where(and(eq(scrubRule.tenantId, tenantId), eq(scrubRule.id, id)))
    .run();

  return getScrubRuleById(tenantId, id);
}

export function deleteScrubRule(tenantId: string, id: string): boolean {
  const db = getDb();
  // Soft delete: set isActive = 0
  const result = db
    .update(scrubRule)
    .set({ isActive: 0, updatedAt: new Date().toISOString() })
    .where(and(eq(scrubRule.tenantId, tenantId), eq(scrubRule.id, id)))
    .run();
  return result.changes > 0;
}

export function countScrubRules(tenantId: string): number {
  const db = getDb();
  const result = db
    .select({ cnt: count() })
    .from(scrubRule)
    .where(and(eq(scrubRule.tenantId, tenantId), eq(scrubRule.isActive, 1)))
    .get();
  return (result as any)?.cnt ?? 0;
}

/* ── Scrub Result CRUD ────────────────────────────────────── */

export function storeScrubResults(
  claimDraftId: string,
  tenantId: string,
  results: Array<{
    ruleId?: string;
    ruleCode: string;
    severity: string;
    category: string;
    field: string;
    message: string;
    suggestedFix?: string;
    blocksSubmission: boolean;
    score: number;
  }>,
): ScrubResultRow[] {
  const db = getDb();
  const now = new Date().toISOString();

  // Clear previous results for this claim
  db.delete(scrubResult)
    .where(eq(scrubResult.claimDraftId, claimDraftId))
    .run();

  const stored: ScrubResultRow[] = [];
  for (const r of results) {
    const id = randomUUID();
    db.insert(scrubResult).values({
      id,
      claimDraftId,
      tenantId,
      ruleId: r.ruleId || null,
      ruleCode: r.ruleCode,
      severity: r.severity,
      category: r.category,
      field: r.field,
      message: r.message,
      suggestedFix: r.suggestedFix || null,
      blocksSubmission: r.blocksSubmission ? 1 : 0,
      score: r.score,
      scrubbedAt: now,
    }).run();
    const row = db.select().from(scrubResult).where(eq(scrubResult.id, id)).get();
    if (row) stored.push(parseResult(row));
  }
  return stored;
}

export function getScrubResults(claimDraftId: string): ScrubResultRow[] {
  const db = getDb();
  return db
    .select()
    .from(scrubResult)
    .where(eq(scrubResult.claimDraftId, claimDraftId))
    .all()
    .map(parseResult);
}

export function getScrubResultStats(tenantId: string): {
  totalScrubs: number;
  errorCount: number;
  warningCount: number;
  suggestionCount: number;
} {
  const db = getDb();
  const all = db
    .select()
    .from(scrubResult)
    .where(eq(scrubResult.tenantId, tenantId))
    .all();

  return {
    totalScrubs: all.length,
    errorCount: all.filter(r => r.severity === "error").length,
    warningCount: all.filter(r => r.severity === "warning").length,
    suggestionCount: all.filter(r => r.severity === "suggestion").length,
  };
}
