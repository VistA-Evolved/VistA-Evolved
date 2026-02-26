/**
 * Payer Rulepacks — Phase 94: PH HMO Workflow Automation
 *
 * Payer-specific rule packs for LOA, claims submission, and denial
 * handling. Each rulepack contains ONLY evidence-backed data.
 * Fields without evidence are marked "unknown".
 *
 * Source: data/payers/ph-hmo-rulepacks.json
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname_resolved = typeof __dirname !== "undefined"
  ? __dirname
  : dirname(fileURLToPath(import.meta.url));

/* ── Types ──────────────────────────────────────────────────── */

export interface PayerRulepack {
  payerId: string;
  payerName: string;

  loa: {
    requiredFields: string[];
    optionalFields: string[];
    turnaroundSla?: string;           // e.g. "24h" — only if evidence
    turnaroundSlaEvidence?: string;
    notes: string;
  };

  claims: {
    requiredFields: string[];
    requiredDocuments: string[];
    filingDeadlineDays?: number;     // only if evidence
    filingDeadlineEvidence?: string;
    notes: string;
  };

  denials: {
    knownPatterns: Array<{
      code?: string;
      description: string;
      suggestedAction: string;
      evidence?: string;
    }>;
    appealWindowDays?: number;        // only if evidence
    appealWindowEvidence?: string;
    notes: string;
  };

  exclusions: {
    known: string[];                  // known exclusions (with evidence)
    notes: string;
  };
}

export interface PayerRulepacksData {
  _meta: {
    schema: string;
    description: string;
    lastUpdated: string;
    notes: string;
  };
  rulepacks: PayerRulepack[];
}

/* ── Store ──────────────────────────────────────────────────── */

const rulepackStore = new Map<string, PayerRulepack>();

/* Phase 146: DB repo wiring */
let rulepackDbRepo: { upsert(d: any): Promise<any> } | null = null;
export function initRulepackStoreRepo(repo: typeof rulepackDbRepo): void { rulepackDbRepo = repo; }
let loaded = false;

/* ── Loading ────────────────────────────────────────────────── */

export function loadPayerRulepacks(): { ok: boolean; count: number; error?: string } {
  if (loaded) return { ok: true, count: rulepackStore.size };

  const repoRoot = join(__dirname_resolved, "..", "..", "..", "..", "..");
  const path = join(repoRoot, "data", "payers", "ph-hmo-rulepacks.json");

  if (!existsSync(path)) {
    loaded = true;
    return { ok: false, count: 0, error: `Rulepacks file not found: ${path}` };
  }

  try {
    const raw = readFileSync(path, "utf-8");
    const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    const data: PayerRulepacksData = JSON.parse(clean);

    for (const rp of data.rulepacks) {
      rulepackStore.set(rp.payerId, rp);

      // Phase 146: Write-through to PG
      rulepackDbRepo?.upsert({ id: rp.payerId, tenantId: 'default', payerId: rp.payerId, name: (rp as any).name ?? rp.payerId, rulesJson: JSON.stringify((rp as any).rules ?? []), active: true, createdAt: new Date().toISOString() }).catch(() => {});

    }

    loaded = true;
    return { ok: true, count: rulepackStore.size };
  } catch (err) {
    loaded = true;
    return { ok: false, count: 0, error: `Parse error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/* ── Queries ────────────────────────────────────────────────── */

export function getPayerRulepack(payerId: string): PayerRulepack | undefined {
  if (!loaded) loadPayerRulepacks();
  return rulepackStore.get(payerId);
}

export function listPayerRulepacks(): PayerRulepack[] {
  if (!loaded) loadPayerRulepacks();
  return Array.from(rulepackStore.values()).sort((a, b) => a.payerName.localeCompare(b.payerName));
}

export function getRulepackStats(): {
  total: number;
  withLoaSla: number;
  withFilingDeadline: number;
  withDenialPatterns: number;
  withExclusions: number;
} {
  if (!loaded) loadPayerRulepacks();
  const all = Array.from(rulepackStore.values());
  return {
    total: all.length,
    withLoaSla: all.filter(r => r.loa.turnaroundSla).length,
    withFilingDeadline: all.filter(r => r.claims.filingDeadlineDays).length,
    withDenialPatterns: all.filter(r => r.denials.knownPatterns.length > 0).length,
    withExclusions: all.filter(r => r.exclusions.known.length > 0).length,
  };
}
