/**
 * Portal Sensitivity & Proxy Access — Phase 27
 *
 * Implements:
 * 1. Authorized representative (proxy) relationships
 * 2. Protected minor rules
 * 3. Sensitive content filtering
 * 4. Configurable policy engine per tenant/jurisdiction
 *
 * In-memory store for dev mode. Production: VistA DGMP (proxy) + local policy DB.
 *
 * VistA integration mapping:
 * - DG SENSITIVE RECORD ACCESS: Check if a patient record is sensitive
 * - DG SECURITY LOG: Audit access to sensitive records
 * - DGMP: Patient representative/proxy management
 */

import { randomBytes } from "node:crypto";
import { portalAudit } from "./portal-audit.js";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export interface ProxyRelationship {
  id: string;
  patientDfn: string;
  proxyDfn: string;
  proxyName: string;
  relationship: "parent" | "guardian" | "spouse" | "caregiver" | "legal_representative";
  accessLevel: "read_only" | "read_write";
  grantedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  active: boolean;
}

export type SensitivityRule = "protected_minor" | "behavioral_health" | "substance_abuse" | "hiv" | "reproductive" | "genetic";

export interface SensitivityPolicy {
  jurisdiction: string;
  rules: {
    rule: SensitivityRule;
    withholdFromProxy: boolean;
    withholdFromMinor: boolean;
    requireBreakGlass: boolean;
    minAgeForSelfAccess: number; // age in years
  }[];
}

export interface ContentFilter {
  section: string;
  withheld: boolean;
  reason: string;
  rule: SensitivityRule;
}

/* ------------------------------------------------------------------ */
/* Default policy (can be overridden per tenant)                        */
/* ------------------------------------------------------------------ */

const DEFAULT_POLICY: SensitivityPolicy = {
  jurisdiction: "default",
  rules: [
    { rule: "protected_minor", withholdFromProxy: false, withholdFromMinor: false, requireBreakGlass: false, minAgeForSelfAccess: 13 },
    { rule: "behavioral_health", withholdFromProxy: true, withholdFromMinor: false, requireBreakGlass: false, minAgeForSelfAccess: 13 },
    { rule: "substance_abuse", withholdFromProxy: true, withholdFromMinor: false, requireBreakGlass: true, minAgeForSelfAccess: 13 },
    { rule: "hiv", withholdFromProxy: true, withholdFromMinor: false, requireBreakGlass: true, minAgeForSelfAccess: 13 },
    { rule: "reproductive", withholdFromProxy: true, withholdFromMinor: false, requireBreakGlass: false, minAgeForSelfAccess: 12 },
    { rule: "genetic", withholdFromProxy: false, withholdFromMinor: false, requireBreakGlass: false, minAgeForSelfAccess: 18 },
  ],
};

/* ------------------------------------------------------------------ */
/* Stores                                                               */
/* ------------------------------------------------------------------ */

const proxyStore = new Map<string, ProxyRelationship>();
const policyStore = new Map<string, SensitivityPolicy>();

/* Phase 146: DB repo wiring */
let sensitivityDbRepo: { upsert(d: any): Promise<any> } | null = null;
export function initSensitivityStoreRepo(repo: typeof sensitivityDbRepo): void { sensitivityDbRepo = repo; }

// Initialize default policy
policyStore.set("default", DEFAULT_POLICY);

/* ------------------------------------------------------------------ */
/* Proxy management                                                     */
/* ------------------------------------------------------------------ */

export function grantProxy(
  patientDfn: string,
  proxyDfn: string,
  proxyName: string,
  relationship: ProxyRelationship["relationship"],
  accessLevel: ProxyRelationship["accessLevel"] = "read_only",
  expiresInDays: number | null = 365
): ProxyRelationship {
  const id = `proxy-${randomBytes(8).toString("hex")}`;
  const now = new Date();
  const proxy: ProxyRelationship = {
    id,
    patientDfn,
    proxyDfn,
    proxyName,
    relationship,
    accessLevel,
    grantedAt: now.toISOString(),
    expiresAt: expiresInDays ? new Date(now.getTime() + expiresInDays * 86400000).toISOString() : null,
    revokedAt: null,
    active: true,
  };
  proxyStore.set(id, proxy);

  // Phase 146: Write-through to PG
  sensitivityDbRepo?.upsert({ id, tenantId: 'default', entityId: patientDfn, entityType: 'proxy', policy: JSON.stringify(proxy) }).catch(() => {});

  portalAudit("portal.proxy.grant", "success", patientDfn, {
    detail: { proxyName, relationship, accessLevel },
  });

  return proxy;
}

export function revokeProxy(proxyId: string, revokedBy: string): boolean {
  const proxy = proxyStore.get(proxyId);
  if (!proxy || !proxy.active) return false;
  proxy.active = false;
  proxy.revokedAt = new Date().toISOString();

  portalAudit("portal.proxy.revoke", "success", revokedBy, {
    detail: { proxyId, proxyName: proxy.proxyName },
  });

  return true;
}

export function getProxiesForPatient(patientDfn: string): ProxyRelationship[] {
  const now = new Date().toISOString();
  return [...proxyStore.values()].filter(
    (p) => p.patientDfn === patientDfn && p.active && (!p.expiresAt || p.expiresAt > now)
  );
}

export function getProxiedPatients(proxyDfn: string): ProxyRelationship[] {
  const now = new Date().toISOString();
  return [...proxyStore.values()].filter(
    (p) => p.proxyDfn === proxyDfn && p.active && (!p.expiresAt || p.expiresAt > now)
  );
}

/* ------------------------------------------------------------------ */
/* Sensitivity engine                                                   */
/* ------------------------------------------------------------------ */

export function getPolicy(jurisdiction: string = "default"): SensitivityPolicy {
  return policyStore.get(jurisdiction) || DEFAULT_POLICY;
}

export function setPolicy(jurisdiction: string, policy: SensitivityPolicy): void {
  policyStore.set(jurisdiction, policy);
}

/**
 * Evaluate whether a data section should be withheld based on:
 * - Is viewer a proxy? What relationship?
 * - Is patient a minor?
 * - Does the data match a sensitive category?
 *
 * Returns list of filtered content sections with reasons.
 */
export function evaluateSensitivity(opts: {
  isProxy: boolean;
  isMinor: boolean;
  patientAge: number;
  dataCategories: SensitivityRule[];
  jurisdiction?: string;
}): ContentFilter[] {
  const policy = getPolicy(opts.jurisdiction);
  const filters: ContentFilter[] = [];

  for (const cat of opts.dataCategories) {
    const rule = policy.rules.find((r) => r.rule === cat);
    if (!rule) continue;

    if (opts.isProxy && rule.withholdFromProxy) {
      filters.push({
        section: cat,
        withheld: true,
        reason: "This information is restricted for proxy/representative access per privacy policy.",
        rule: cat,
      });
    }

    if (opts.isMinor && rule.withholdFromMinor) {
      filters.push({
        section: cat,
        withheld: true,
        reason: "This information is restricted for minor patients per privacy policy.",
        rule: cat,
      });
    }

    if (opts.patientAge < rule.minAgeForSelfAccess) {
      filters.push({
        section: cat,
        withheld: true,
        reason: `Patient must be ${rule.minAgeForSelfAccess}+ years old to access ${cat} records.`,
        rule: cat,
      });
    }
  }

  return filters;
}
