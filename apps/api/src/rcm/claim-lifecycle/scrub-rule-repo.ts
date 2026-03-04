/**
 * Scrub Rule Repository — Phase 111
 *
 * DB-backed CRUD for payer-specific validation rules and scrub results.
 * Rules are evidence-backed: each rule must cite its source/date.
 * If unknown: mark as contracting_needed in evidenceSource.
 */

import { randomUUID } from 'node:crypto';
import { eq, and, desc, count } from 'drizzle-orm';
import { getPgDb } from '../../platform/pg/pg-db.js';
import { scrubRule, scrubResult } from '../../platform/pg/pg-schema.js';

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
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
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

export async function createScrubRule(input: CreateScrubRuleInput): Promise<ScrubRuleRow> {
  const db = getPgDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const tenantId = input.tenantId || 'default';

  await db.insert(scrubRule).values({
    id,
    tenantId,
    payerId: input.payerId || null,
    serviceType: input.serviceType || null,
    ruleCode: input.ruleCode,
    category: input.category,
    severity: input.severity || 'error',
    field: input.field,
    description: input.description,
    conditionJson: JSON.stringify(input.condition),
    suggestedFix: input.suggestedFix || null,
    evidenceSource: input.evidenceSource || null,
    evidenceDate: input.evidenceDate || null,
    blocksSubmission: input.blocksSubmission !== false ? 1 : 0,
    isActive: 1,
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
  });

  return (await getScrubRuleById(tenantId, id))!;
}

export async function getScrubRuleById(tenantId: string, id: string): Promise<ScrubRuleRow | null> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(scrubRule)
    .where(and(eq(scrubRule.tenantId, tenantId), eq(scrubRule.id, id)));
  const row = rows[0] ?? null;
  return row ? parseRule(row) : null;
}

export async function listScrubRules(
  tenantId: string,
  filters?: { payerId?: string; category?: string; isActive?: boolean }
): Promise<ScrubRuleRow[]> {
  const db = getPgDb();
  const conditions = [eq(scrubRule.tenantId, tenantId)];
  if (filters?.payerId) conditions.push(eq(scrubRule.payerId, filters.payerId));
  if (filters?.category) conditions.push(eq(scrubRule.category, filters.category));
  if (filters?.isActive !== undefined)
    conditions.push(eq(scrubRule.isActive, filters.isActive ? 1 : 0));

  const rows = await db
    .select()
    .from(scrubRule)
    .where(and(...conditions))
    .orderBy(desc(scrubRule.updatedAt));
  return rows.map(parseRule);
}

export async function updateScrubRule(
  tenantId: string,
  id: string,
  updates: Partial<
    Pick<
      CreateScrubRuleInput,
      | 'description'
      | 'condition'
      | 'suggestedFix'
      | 'severity'
      | 'blocksSubmission'
      | 'evidenceSource'
      | 'evidenceDate'
    > & { isActive?: boolean }
  >
): Promise<ScrubRuleRow | null> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const setClause: Record<string, any> = { updatedAt: now };

  if (updates.description !== undefined) setClause.description = updates.description;
  if (updates.condition !== undefined) setClause.conditionJson = JSON.stringify(updates.condition);
  if (updates.suggestedFix !== undefined) setClause.suggestedFix = updates.suggestedFix;
  if (updates.severity !== undefined) setClause.severity = updates.severity;
  if (updates.blocksSubmission !== undefined)
    setClause.blocksSubmission = updates.blocksSubmission ? 1 : 0;
  if (updates.evidenceSource !== undefined) setClause.evidenceSource = updates.evidenceSource;
  if (updates.evidenceDate !== undefined) setClause.evidenceDate = updates.evidenceDate;
  if (updates.isActive !== undefined) setClause.isActive = updates.isActive ? 1 : 0;

  await db
    .update(scrubRule)
    .set(setClause)
    .where(and(eq(scrubRule.tenantId, tenantId), eq(scrubRule.id, id)));

  return getScrubRuleById(tenantId, id);
}

export async function deleteScrubRule(tenantId: string, id: string): Promise<boolean> {
  const db = getPgDb();
  // Soft delete: set isActive = 0
  const result = await db
    .update(scrubRule)
    .set({ isActive: 0, updatedAt: new Date().toISOString() })
    .where(and(eq(scrubRule.tenantId, tenantId), eq(scrubRule.id, id)))
    .returning({ id: scrubRule.id });
  return result.length > 0;
}

export async function countScrubRules(tenantId: string): Promise<number> {
  const db = getPgDb();
  const rows = await db
    .select({ cnt: count() })
    .from(scrubRule)
    .where(and(eq(scrubRule.tenantId, tenantId), eq(scrubRule.isActive, 1)));
  return (rows[0] as any)?.cnt ?? 0;
}

/* ── Scrub Result CRUD ────────────────────────────────────── */

export async function storeScrubResults(
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
  }>
): Promise<ScrubResultRow[]> {
  const db = getPgDb();
  const now = new Date().toISOString();

  // Clear previous results for this claim
  await db.delete(scrubResult).where(eq(scrubResult.claimDraftId, claimDraftId));

  const stored: ScrubResultRow[] = [];
  for (const r of results) {
    const id = randomUUID();
    await db.insert(scrubResult).values({
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
    });
    const rows = await db.select().from(scrubResult).where(eq(scrubResult.id, id));
    const row = rows[0] ?? null;
    if (row) stored.push(parseResult(row));
  }
  return stored;
}

export async function getScrubResults(claimDraftId: string): Promise<ScrubResultRow[]> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(scrubResult)
    .where(eq(scrubResult.claimDraftId, claimDraftId));
  return rows.map(parseResult);
}

export async function getScrubResultStats(tenantId: string): Promise<{
  totalScrubs: number;
  errorCount: number;
  warningCount: number;
  suggestionCount: number;
}> {
  const db = getPgDb();
  const all = await db.select().from(scrubResult).where(eq(scrubResult.tenantId, tenantId));

  return {
    totalScrubs: all.length,
    errorCount: all.filter((r) => r.severity === 'error').length,
    warningCount: all.filter((r) => r.severity === 'warning').length,
    suggestionCount: all.filter((r) => r.severity === 'suggestion').length,
  };
}
