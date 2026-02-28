/**
 * Claim Scrubber Engine -- Phase 111
 *
 * Evaluates DB-backed scrub rules against a claim draft.
 * Produces errors (block submission), warnings, and suggestions.
 * Returns a readiness score 0-100.
 *
 * Hard rule: No invented payer rules. Rules are loaded from the scrub_rule
 * table and each rule must have an evidenceSource. Rules with
 * evidenceSource = "contracting_needed" trigger a workflow flag.
 *
 * Extends the Phase 38 validation engine pattern but uses DB-backed rules
 * instead of hardcoded ValidationRule objects.
 */

import type { ClaimDraftRow } from "./claim-draft-repo.js";
import {
  listScrubRules,
  storeScrubResults,
  getScrubResultStats,
  type ScrubRuleRow,
  type ScrubResultRow,
} from "./scrub-rule-repo.js";
import { updateScrubScore, transitionClaimDraft } from "./claim-draft-repo.js";
import { getPgDb } from "../../platform/pg/pg-db.js";
import { scrubResult as srTable, claimDraft as cdTable } from "../../platform/pg/pg-schema.js";
import { eq, desc, count as countFn } from "drizzle-orm";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface ScrubOutcome {
  claimDraftId: string;
  score: number;
  passed: boolean;
  blockingCount: number;
  warningCount: number;
  suggestionCount: number;
  contractingNeeded: boolean;
  results: ScrubResultRow[];
}

/* ------------------------------------------------------------------ */
/* Condition Evaluator                                                 */
/* ------------------------------------------------------------------ */

/**
 * Evaluate a scrub rule condition against a claim draft.
 *
 * Condition JSON format:
 *   { "operator": "missing_field", "field": "diagnoses" }
 *   { "operator": "min_items", "field": "lines", "value": 1 }
 *   { "operator": "max_charge", "value": 99999999 }
 *   { "operator": "required_attachment_type", "value": "authorization" }
 *   { "operator": "regex", "field": "patientId", "value": "^[0-9]+$" }
 *   { "operator": "date_within_days", "field": "dateOfService", "value": 365 }
 *   { "operator": "always" }  -- always triggers (use for manual review rules)
 *
 * Returns true if the rule FIRES (i.e., there IS a problem).
 */
function evaluateCondition(draft: ClaimDraftRow, condition: any): boolean {
  if (!condition || typeof condition !== "object") return false;
  const op = condition.operator;
  const field = condition.field as keyof ClaimDraftRow | undefined;

  switch (op) {
    case "missing_field": {
      if (!field) return false;
      const val = (draft as any)[field];
      return val === null || val === undefined || val === "" ||
        (Array.isArray(val) && val.length === 0);
    }

    case "min_items": {
      if (!field) return false;
      const arr = (draft as any)[field];
      const min = Number(condition.value ?? 1);
      return !Array.isArray(arr) || arr.length < min;
    }

    case "max_charge": {
      return draft.totalChargeCents > Number(condition.value ?? 99999999);
    }

    case "required_attachment_type": {
      const needed = condition.value;
      if (!needed) return false;
      return !draft.attachments.some((a: any) => a.type === needed);
    }

    case "regex": {
      if (!field) return false;
      const val = String((draft as any)[field] ?? "");
      try {
        // Safety: limit regex length to prevent ReDoS
        const pattern = String(condition.value ?? "");
        if (pattern.length > 500) return false;
        return !new RegExp(pattern).test(val);
      } catch {
        return false;
      }
    }

    case "date_within_days": {
      if (!field) return false;
      const dateStr = (draft as any)[field];
      if (!dateStr) return true; // missing date = problem
      const daysDiff = Math.abs(
        (Date.now() - new Date(dateStr).getTime()) / 86400000
      );
      return daysDiff > (condition.value ?? 365);
    }

    case "always":
      return true;

    default:
      return false;
  }
}

/* ------------------------------------------------------------------ */
/* Scrubber                                                            */
/* ------------------------------------------------------------------ */

/**
 * Run the scrubber against a claim draft.
 *
 * 1. Loads active rules for the claim's payer (+ global rules with payerId=null).
 * 2. Evaluates each rule condition.
 * 3. Stores results in scrub_result table.
 * 4. Updates the claim's scrub score.
 * 5. Optionally transitions to "scrubbed" status.
 */
export async function scrubClaimDraft(
  draft: ClaimDraftRow,
  opts?: { autoTransition?: boolean },
): Promise<ScrubOutcome> {
  const tenantId = draft.tenantId;

  // Load rules: payer-specific + global (payerId = null treated as all)
  const payerRules = await listScrubRules(tenantId, { payerId: draft.payerId, isActive: true });
  const allRules = await listScrubRules(tenantId, { isActive: true });
  const globalRules = allRules.filter(
    (r) => !r.payerId
  );

  // Deduplicate by rule ID
  const ruleMap = new Map<string, ScrubRuleRow>();
  for (const r of [...globalRules, ...payerRules]) {
    ruleMap.set(r.id, r);
  }
  const rules = Array.from(ruleMap.values());

  // Evaluate
  const findings: Array<{
    ruleId: string;
    ruleCode: string;
    severity: string;
    category: string;
    field: string;
    message: string;
    suggestedFix?: string;
    blocksSubmission: boolean;
    score: number;
  }> = [];

  let contractingNeeded = false;

  for (const rule of rules) {
    // Merge rule.field into condition if not already specified
    const cond = typeof rule.condition === "object" && rule.condition
      ? { ...rule.condition as any, field: (rule.condition as any).field || rule.field }
      : { operator: "always", field: rule.field };
    const fires = evaluateCondition(draft, cond);
    if (!fires) continue;

    // Check if this rule requires contracting workflow
    if (rule.evidenceSource === "contracting_needed") {
      contractingNeeded = true;
    }

    const deduction = rule.blocksSubmission ? 20 : (rule.severity === "warning" ? 5 : 2);

    findings.push({
      ruleId: rule.id,
      ruleCode: rule.ruleCode,
      severity: rule.severity,
      category: rule.category,
      field: rule.field,
      message: rule.description,
      suggestedFix: rule.suggestedFix || undefined,
      blocksSubmission: rule.blocksSubmission,
      score: deduction,
    });
  }

  // Compute score: start at 100, deduct for each finding
  const totalDeductions = findings.reduce((sum, f) => sum + f.score, 0);
  const score = Math.max(0, 100 - totalDeductions);

  // Store results
  const stored = await storeScrubResults(draft.id, tenantId, findings);

  // Update scrub score on the claim
  await updateScrubScore(tenantId, draft.id, score);

  const blockingCount = findings.filter(f => f.blocksSubmission).length;
  const warningCount = findings.filter(f => f.severity === "warning").length;
  const suggestionCount = findings.filter(f => f.severity === "suggestion").length;
  const passed = blockingCount === 0;

  // Auto-transition to scrubbed if requested and claim is in draft
  if (opts?.autoTransition && (draft.status === "draft" || draft.status === "scrubbed")) {
    try {
      await transitionClaimDraft(tenantId, draft.id, "scrubbed", "scrubber", {
        reason: `Scrubbed: score=${score}, blocking=${blockingCount}, warnings=${warningCount}`,
      });
    } catch {
      // Transition may fail if already in scrubbed -- that's fine
    }
  }

  return {
    claimDraftId: draft.id,
    score,
    passed,
    blockingCount,
    warningCount,
    suggestionCount,
    contractingNeeded,
    results: stored,
  };
}

/* ------------------------------------------------------------------ */
/* Dashboard Metrics                                                   */
/* ------------------------------------------------------------------ */

export interface ScrubDashboardMetrics {
  totalScrubbed: number;
  avgScore: number | null;
  passRate: number | null;
  topFailingRules: Array<{ ruleCode: string; count: number }>;
  contractingNeededCount: number;
}

/**
 * Aggregate scrub metrics for dashboard display.
 * Operates on the claim_draft + scrub_result tables.
 */
export async function getScrubDashboardMetrics(tenantId: string): Promise<ScrubDashboardMetrics> {
  const stats = await getScrubResultStats(tenantId);

  const db = getPgDb();
  const topRulesRows = await db
    .select({
      ruleCode: srTable.ruleCode,
      cnt: countFn(),
    })
    .from(srTable)
    .where(eq(srTable.tenantId, tenantId))
    .groupBy(srTable.ruleCode)
    .orderBy(desc(countFn()))
    .limit(10);
  const topRules = topRulesRows
    .map((r: any) => ({ ruleCode: r.ruleCode, count: r.cnt }));

  // Rules with contracting_needed evidenceSource
  const contractingRulesAll = await listScrubRules(tenantId, { isActive: true });
  const contractingRules = contractingRulesAll.filter(
    r => r.evidenceSource === "contracting_needed"
  );

  // Pass rate: claims with scrubScore >= 80 / total scrubbed
  const allClaims = await db
    .select()
    .from(cdTable)
    .where(eq(cdTable.tenantId, tenantId));
  const scrubbedClaims = allClaims
    .filter((r: any) => r.scrubScore !== null);

  const totalScrubbed = scrubbedClaims.length;
  const passCount = scrubbedClaims.filter((r: any) => r.scrubScore >= 80).length;
  const avgScore = totalScrubbed > 0
    ? Math.round(scrubbedClaims.reduce((s: number, r: any) => s + r.scrubScore, 0) / totalScrubbed)
    : null;

  return {
    totalScrubbed,
    avgScore,
    passRate: totalScrubbed > 0 ? Math.round((passCount / totalScrubbed) * 1000) / 10 : null,
    topFailingRules: topRules,
    contractingNeededCount: contractingRules.length,
  };
}
