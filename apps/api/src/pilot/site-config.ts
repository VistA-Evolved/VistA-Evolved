/**
 * Site Configuration — Phase 246: Pilot Hospital Hardening
 *
 * Manages pilot site configurations. Each site represents a
 * hospital or clinic deployment target with its own settings,
 * environment details, and go-live readiness state.
 *
 * In-memory store; resets on API restart. Matches the imaging
 * worklist pattern from Phase 23 for consistency.
 */

import { randomBytes } from "node:crypto";
import { log } from "../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type SiteStatus =
  | "draft"
  | "configuring"
  | "preflight"
  | "ready"
  | "go-live"
  | "active"
  | "suspended";

export type SiteEnvironment = "sandbox" | "staging" | "production";

export interface SiteConfig {
  id: string;
  /** Site name (e.g., "Manila General Hospital") */
  name: string;
  /** Site code (short unique identifier) */
  code: string;
  /** Current status */
  status: SiteStatus;
  /** Target environment */
  environment: SiteEnvironment;
  /** Tenant ID this site maps to */
  tenantId: string;
  /** VistA connection host:port for this site */
  vistaEndpoint: string;
  /** Expected user count */
  expectedUsers: number;
  /** Go-live target date (ISO) */
  goLiveDate?: string;
  /** Contact person */
  siteContact?: string;
  /** Notes */
  notes?: string;
  /** Last preflight result summary */
  lastPreflightScore?: number;
  /** ISO timestamp */
  createdAt: string;
  updatedAt: string;
}

export interface CreateSiteRequest {
  name: string;
  code: string;
  environment: SiteEnvironment;
  tenantId?: string;
  vistaEndpoint?: string;
  expectedUsers?: number;
  goLiveDate?: string;
  siteContact?: string;
  notes?: string;
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

const siteStore = new Map<string, SiteConfig>();

function generateSiteId(): string {
  return `site-${randomBytes(6).toString("hex")}`;
}

export function createSite(req: CreateSiteRequest): SiteConfig {
  // Ensure unique code
  for (const site of siteStore.values()) {
    if (site.code === req.code) {
      throw new Error(`Site code '${req.code}' already exists`);
    }
  }

  const now = new Date().toISOString();
  const site: SiteConfig = {
    id: generateSiteId(),
    name: req.name,
    code: req.code,
    status: "draft",
    environment: req.environment || "sandbox",
    tenantId: req.tenantId || "default",
    vistaEndpoint: req.vistaEndpoint || "127.0.0.1:9430",
    expectedUsers: req.expectedUsers || 0,
    goLiveDate: req.goLiveDate,
    siteContact: req.siteContact,
    notes: req.notes,
    createdAt: now,
    updatedAt: now,
  };

  siteStore.set(site.id, site);
  log.info("Pilot site created", { siteId: site.id, code: site.code });
  return site;
}

export function getSite(id: string): SiteConfig | undefined {
  return siteStore.get(id);
}

export function listSites(): SiteConfig[] {
  return Array.from(siteStore.values());
}

export function updateSite(
  id: string,
  updates: Partial<Pick<SiteConfig, "name" | "status" | "environment" | "vistaEndpoint" | "expectedUsers" | "goLiveDate" | "siteContact" | "notes" | "lastPreflightScore">>,
): SiteConfig {
  const site = siteStore.get(id);
  if (!site) throw new Error(`Site not found: ${id}`);

  Object.assign(site, updates, { updatedAt: new Date().toISOString() });
  return site;
}

export function deleteSite(id: string): boolean {
  return siteStore.delete(id);
}

export function getSiteSummary(): {
  total: number;
  byStatus: Record<string, number>;
  byEnvironment: Record<string, number>;
} {
  const sites = Array.from(siteStore.values());
  const byStatus: Record<string, number> = {};
  const byEnvironment: Record<string, number> = {};
  for (const s of sites) {
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    byEnvironment[s.environment] = (byEnvironment[s.environment] || 0) + 1;
  }
  return { total: sites.length, byStatus, byEnvironment };
}
