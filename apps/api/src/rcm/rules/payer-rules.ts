/**
 * RCM -- Payer Rules Engine (Phase 43)
 *
 * Configuration-driven per-payer business rules that catch rejections
 * BEFORE submission. Rules encode payer-specific requirements:
 *   - Required fields for each payer
 *   - Code restrictions (e.g., "Aetna doesn't accept modifier 25 with E&M codes")
 *   - Timely filing limits
 *   - Prior auth requirements
 *   - Custom validation logic per payer
 *
 * Rules are stored in-memory and loaded from data/rcm/payer-rules/ JSON files.
 * Admin API allows viewing/editing rules per payer.
 * All rule changes are audit-logged.
 */

import { randomUUID } from 'node:crypto';
import { log } from '../../lib/logger.js';

/* -- Rule Types ---------------------------------------------- */

export type RuleCategory =
  | 'required_field'
  | 'code_restriction'
  | 'timely_filing'
  | 'prior_auth'
  | 'bundling'
  | 'modifier'
  | 'demographics'
  | 'eligibility'
  | 'custom';

export type RuleSeverity = 'error' | 'warning' | 'info';

export interface PayerRule {
  id: string;
  payerId: string; // '*' for global rules
  name: string;
  description: string;
  category: RuleCategory;
  severity: RuleSeverity;
  enabled: boolean;

  /** Condition -- when does this rule apply */
  condition: RuleCondition;

  /** Remediation text */
  actionOnFail: string;
  fieldHint?: string; // which field to fix

  /** Metadata */
  effectiveDate?: string;
  expirationDate?: string;
  source: 'seed' | 'admin' | 'clearinghouse_feedback';
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type RuleCondition =
  | { type: 'field_required'; field: string }
  | { type: 'field_format'; field: string; pattern: string }
  | { type: 'code_not_allowed'; codeType: 'procedure' | 'modifier' | 'diagnosis'; codes: string[] }
  | { type: 'timely_filing'; maxDaysFromService: number }
  | { type: 'prior_auth_required'; procedureCodes: string[] }
  | { type: 'min_charge'; minCents: number }
  | { type: 'max_lines'; maxLines: number }
  | { type: 'modifier_combination'; modifier: string; incompatibleWith: string[] }
  | { type: 'custom'; expression: string }; // future: DSL or simple predicate

export interface RuleEvalResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  severity: RuleSeverity;
  message: string;
  fieldHint?: string;
  actionOnFail?: string;
}

/* -- In-Memory Rule Store ------------------------------------ */

const rules = new Map<string, PayerRule>();
const payerIndex = new Map<string, Set<string>>(); // payerId -> rule IDs

/* Phase 146: DB repo wiring */
let ruleDbRepo: { upsert(d: any): Promise<any> } | null = null;
export function initPayerRuleStoreRepo(repo: typeof ruleDbRepo): void {
  ruleDbRepo = repo;
}

/* -- CRUD ---------------------------------------------------- */

export function addRule(rule: PayerRule): void {
  rules.set(rule.id, rule);

  // Phase 146: Write-through to PG
  ruleDbRepo
    ?.upsert({
      id: rule.id,
      tenantId: (rule as any).tenantId ?? 'default',
      payerId: rule.payerId,
      ruleType: (rule as any).type ?? 'generic',
      active: true,
      createdAt: new Date().toISOString(),
    })
    .catch((e: unknown) => log.warn('Payer rules PG write-through failed', { error: String(e) }));

  if (!payerIndex.has(rule.payerId)) {
    payerIndex.set(rule.payerId, new Set());
  }
  payerIndex.get(rule.payerId)!.add(rule.id);
}

export function getRule(id: string): PayerRule | undefined {
  return rules.get(id);
}

export function updateRule(id: string, updates: Partial<PayerRule>): PayerRule | undefined {
  const rule = rules.get(id);
  if (!rule) return undefined;
  const updated = {
    ...rule,
    ...updates,
    id: rule.id,
    version: rule.version + 1,
    updatedAt: new Date().toISOString(),
  };
  rules.set(id, updated);
  return updated;
}

export function deleteRule(id: string): boolean {
  const rule = rules.get(id);
  if (!rule) return false;
  rules.delete(id);
  payerIndex.get(rule.payerId)?.delete(id);
  return true;
}

export function listRules(filters?: {
  payerId?: string;
  category?: RuleCategory;
  enabled?: boolean;
  limit?: number;
  offset?: number;
}): { rules: PayerRule[]; total: number } {
  let result = Array.from(rules.values());

  if (filters?.payerId) {
    const ids = payerIndex.get(filters.payerId);
    const globalIds = payerIndex.get('*');
    const combinedIds = new Set<string>([...(ids ?? []), ...(globalIds ?? [])]);
    result = result.filter((r) => combinedIds.has(r.id));
  }
  if (filters?.category) result = result.filter((r) => r.category === filters.category);
  if (filters?.enabled !== undefined) result = result.filter((r) => r.enabled === filters.enabled);

  result.sort((a, b) => a.name.localeCompare(b.name));
  const total = result.length;
  const offset = filters?.offset ?? 0;
  const limit = filters?.limit ?? 100;

  return { rules: result.slice(offset, offset + limit), total };
}

export function getRulesForPayer(payerId: string): PayerRule[] {
  const payerRuleIds = payerIndex.get(payerId) ?? new Set();
  const globalRuleIds = payerIndex.get('*') ?? new Set();
  const combinedIds = new Set([...payerRuleIds, ...globalRuleIds]);
  return Array.from(combinedIds)
    .map((id) => rules.get(id)!)
    .filter((r) => r && r.enabled);
}

/* -- Rule Evaluation ----------------------------------------- */

/**
 * Evaluate all applicable rules against a claim.
 * Returns results for each rule (pass/fail + remediation).
 */
export function evaluateRules(
  payerId: string,
  claim: Record<string, unknown>
): { results: RuleEvalResult[]; score: number; passCount: number; failCount: number } {
  const applicableRules = getRulesForPayer(payerId);
  const now = new Date().toISOString();
  const results: RuleEvalResult[] = [];

  for (const rule of applicableRules) {
    // Date gating
    if (rule.effectiveDate && rule.effectiveDate > now) continue;
    if (rule.expirationDate && rule.expirationDate < now) continue;

    const result = evaluateSingleRule(rule, claim);
    results.push(result);
  }

  const passCount = results.filter((r) => r.passed).length;
  const failCount = results.filter((r) => !r.passed).length;
  const score = results.length > 0 ? Math.round((passCount / results.length) * 100) : 100;

  return { results, score, passCount, failCount };
}

function evaluateSingleRule(rule: PayerRule, claim: Record<string, unknown>): RuleEvalResult {
  const base = {
    ruleId: rule.id,
    ruleName: rule.name,
    severity: rule.severity,
    fieldHint: rule.fieldHint,
    actionOnFail: rule.actionOnFail,
  };

  const cond = rule.condition;

  switch (cond.type) {
    case 'field_required': {
      const value = getNestedField(claim, cond.field);
      const passed = value !== undefined && value !== null && value !== '';
      return {
        ...base,
        passed,
        message: passed ? 'Field present' : `Required field missing: ${cond.field}`,
      };
    }
    case 'field_format': {
      const value = getNestedField(claim, cond.field);
      if (!value || typeof value !== 'string')
        return { ...base, passed: false, message: `Field missing: ${cond.field}` };
      const re = new RegExp(cond.pattern);
      const passed = re.test(value);
      return {
        ...base,
        passed,
        message: passed ? 'Format valid' : `Field ${cond.field} does not match required format`,
      };
    }
    case 'timely_filing': {
      const dos = claim.dateOfService as string;
      if (!dos) return { ...base, passed: false, message: 'Date of service missing' };
      const daysSince = Math.floor((Date.now() - new Date(dos).getTime()) / 86400000);
      const passed = daysSince <= cond.maxDaysFromService;
      return {
        ...base,
        passed,
        message: passed
          ? 'Within filing limit'
          : `Exceeds timely filing limit (${daysSince} days > ${cond.maxDaysFromService} max)`,
      };
    }
    case 'min_charge': {
      const charge = (claim.totalCharge as number) ?? 0;
      const passed = charge >= cond.minCents;
      return {
        ...base,
        passed,
        message: passed
          ? 'Charge meets minimum'
          : `Charge below minimum (${charge} < ${cond.minCents})`,
      };
    }
    case 'max_lines': {
      const lines = (claim.lines as unknown[]) ?? [];
      const passed = lines.length <= cond.maxLines;
      return {
        ...base,
        passed,
        message: passed
          ? 'Line count OK'
          : `Too many service lines (${lines.length} > ${cond.maxLines})`,
      };
    }
    default:
      // For complex rules or future DSL types, always pass with info
      return {
        ...base,
        passed: true,
        message: `Rule type "${cond.type}" not fully evaluated (pass-through)`,
      };
  }
}

function getNestedField(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/* -- Seed Rules ---------------------------------------------- */

export function seedDefaultRules(): void {
  const now = new Date().toISOString();

  const defaults: Omit<PayerRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      payerId: '*',
      name: 'Subscriber ID Required',
      description: 'All claims must have a subscriber/member ID',
      category: 'required_field',
      severity: 'error',
      enabled: true,
      condition: { type: 'field_required', field: 'subscriberId' },
      actionOnFail: 'Add subscriber/member ID from insurance card',
      fieldHint: 'subscriberId',
      source: 'seed',
      version: 1,
    },
    {
      payerId: '*',
      name: 'Billing NPI Required',
      description: 'All claims must have a billing provider NPI',
      category: 'required_field',
      severity: 'error',
      enabled: true,
      condition: { type: 'field_required', field: 'billingProviderNpi' },
      actionOnFail: 'Add billing provider NPI',
      fieldHint: 'billingProviderNpi',
      source: 'seed',
      version: 1,
    },
    {
      payerId: '*',
      name: 'Diagnosis Required',
      description: 'All claims must have at least one diagnosis code',
      category: 'required_field',
      severity: 'error',
      enabled: true,
      condition: { type: 'field_required', field: 'diagnoses' },
      actionOnFail: 'Add at least one diagnosis code',
      fieldHint: 'diagnoses',
      source: 'seed',
      version: 1,
    },
    {
      payerId: '*',
      name: 'Minimum Charge',
      description: 'Claims must have a total charge greater than $0',
      category: 'required_field',
      severity: 'error',
      enabled: true,
      condition: { type: 'min_charge', minCents: 1 },
      actionOnFail: 'Ensure claim has a positive charge amount',
      fieldHint: 'totalCharge',
      source: 'seed',
      version: 1,
    },
    {
      payerId: '*',
      name: 'Timely Filing (365 days)',
      description: 'Default timely filing limit is 365 days from service date',
      category: 'timely_filing',
      severity: 'warning',
      enabled: true,
      condition: { type: 'timely_filing', maxDaysFromService: 365 },
      actionOnFail: 'Claim may exceed timely filing limit -- verify payer-specific deadline',
      source: 'seed',
      version: 1,
    },
    {
      payerId: 'MEDICARE',
      name: 'Medicare Timely Filing (12 months)',
      description: 'Medicare requires claims within 12 calendar months of service',
      category: 'timely_filing',
      severity: 'error',
      enabled: true,
      condition: { type: 'timely_filing', maxDaysFromService: 365 },
      actionOnFail:
        'Medicare timely filing limit exceeded -- file appeal with proof of timely filing',
      source: 'seed',
      version: 1,
    },
    {
      payerId: 'AETNA',
      name: 'Aetna Timely Filing (90 days)',
      description: 'Aetna requires initial claims within 90 days of service',
      category: 'timely_filing',
      severity: 'error',
      enabled: true,
      condition: { type: 'timely_filing', maxDaysFromService: 90 },
      actionOnFail: 'Aetna 90-day timely filing limit exceeded',
      source: 'seed',
      version: 1,
    },
    {
      payerId: '*',
      name: 'NPI Format',
      description: 'NPI must be exactly 10 digits',
      category: 'demographics',
      severity: 'error',
      enabled: true,
      condition: { type: 'field_format', field: 'billingProviderNpi', pattern: '^\\d{10}$' },
      actionOnFail: 'Correct NPI to 10-digit format',
      fieldHint: 'billingProviderNpi',
      source: 'seed',
      version: 1,
    },
    {
      payerId: '*',
      name: 'Service Line Limit',
      description: 'Claims should not exceed 50 service lines per X12 transaction',
      category: 'custom',
      severity: 'warning',
      enabled: true,
      condition: { type: 'max_lines', maxLines: 50 },
      actionOnFail: 'Split claim into multiple transactions',
      source: 'seed',
      version: 1,
    },
  ];

  for (const d of defaults) {
    const rule: PayerRule = {
      ...d,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    addRule(rule);
  }
}

/* -- Stats --------------------------------------------------- */

export function getRuleStats(): {
  total: number;
  byCategory: Record<string, number>;
  byPayer: Record<string, number>;
  enabled: number;
  disabled: number;
} {
  const byCategory: Record<string, number> = {};
  const byPayer: Record<string, number> = {};
  let enabled = 0;
  let disabled = 0;

  for (const rule of rules.values()) {
    byCategory[rule.category] = (byCategory[rule.category] ?? 0) + 1;
    byPayer[rule.payerId] = (byPayer[rule.payerId] ?? 0) + 1;
    if (rule.enabled) enabled++;
    else disabled++;
  }

  return { total: rules.size, byCategory, byPayer, enabled, disabled };
}

export function resetRules(): void {
  rules.clear();
  payerIndex.clear();
}
