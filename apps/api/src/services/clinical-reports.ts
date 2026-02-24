/**
 * Enhanced VistA Clinical Report Pipeline — Phase 25B.
 *
 * Wraps the existing ORWRP REPORT TEXT / ORWRP REPORT LISTS RPCs with:
 *   - Per-user+patient caching (short TTL, prevents hammering VistA)
 *   - Audit logging (VIEW_CLINICAL_REPORT events)
 *   - HTML sanitization (escape potential injection)
 *   - Analytics event recording (usage.report)
 *   - Error handling via safeCallRpc
 *
 * VistA remains the single source of truth — this layer is read-through only.
 */

import { log } from "../lib/logger.js";
import { audit, type AuditAction } from "../lib/audit.js";
import {
  safeCallRpc,
} from "../lib/rpc-resilience.js";
import { connect, disconnect, callRpc } from "../vista/rpcBrokerClient.js";
import { validateCredentials } from "../vista/config.js";
import { recordAnalyticsEvent } from "./analytics-store.js";
import { safeErr } from "../lib/safe-error.js";

/* ================================================================== */
/* Types                                                                */
/* ================================================================== */

export interface ClinicalReportListItem {
  id: string;
  heading: string;
  qualifier: string;
  remote: string;
  rpcName: string;
  category: string;
}

export interface ClinicalReportListResponse {
  ok: boolean;
  count: number;
  reports: ClinicalReportListItem[];
  dateRanges: string[];
  hsTypes: string[];
  cached?: boolean;
  error?: string;
}

export interface ClinicalReportTextResponse {
  ok: boolean;
  text?: string;
  sanitizedText?: string;
  rpcUsed: string;
  cached?: boolean;
  error?: string;
}

/* ================================================================== */
/* Cache (per-user+patient, short TTL)                                  */
/* ================================================================== */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const reportListCache = new Map<string, CacheEntry<ClinicalReportListResponse>>();
const reportTextCache = new Map<string, CacheEntry<ClinicalReportTextResponse>>();

const CACHE_TTL_MS = Number(process.env.CLINICAL_REPORT_CACHE_TTL_MS || 30000); // 30s
const MAX_CACHE_ENTRIES = 200;

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
  // Evict oldest if at capacity
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

/* ================================================================== */
/* HTML sanitization                                                    */
/* ================================================================== */

/**
 * Escape < > & " ' to prevent injection when report text is rendered in a browser.
 * VistA report text is plain text but sometimes includes angle brackets.
 */
function sanitizeReportText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/* ================================================================== */
/* Report Pipeline Functions                                            */
/* ================================================================== */

/**
 * Get available clinical report list from VistA.
 * Uses ORWRP REPORT LISTS RPC with caching and audit.
 */
export async function getClinicalReportList(
  actor: { duz: string; name?: string; role?: string },
  tenantId: string,
): Promise<ClinicalReportListResponse> {
  const cacheKey = `reports:list:${actor.duz}`;
  const cached = getCached(reportListCache, cacheKey);
  if (cached) {
    recordAnalyticsEvent("usage.report", "report_list_view", 1, {
      unit: "count",
      tenantId,
      tags: { cached: "true" },
    });
    return { ...cached, cached: true };
  }

  try {
    validateCredentials();
    await connect();
    const lines = await callRpc("ORWRP REPORT LISTS", []);
    disconnect();

    const reports: ClinicalReportListItem[] = [];
    const dateRanges: string[] = [];
    const hsTypes: string[] = [];
    let currentSection = "";

    for (const line of lines) {
      if (line.includes("[DATE RANGES]")) { currentSection = "dateRanges"; continue; }
      if (line.includes("[HEALTH SUMMARY TYPES]")) { currentSection = "hsTypes"; continue; }
      if (line.includes("[REPORT LIST]")) { currentSection = "reportList"; continue; }
      if (currentSection === "dateRanges") { dateRanges.push(line); continue; }
      if (currentSection === "hsTypes") { hsTypes.push(line); continue; }
      if (currentSection === "reportList" && line.trim()) {
        const p = line.split("^");
        reports.push({
          id: (p[0] || "").trim(),
          heading: (p[1] || "").trim(),
          qualifier: (p[2] || "").trim(),
          remote: (p[6] || "").trim(),
          rpcName: (p[9] || "").trim(),
          category: (p[8] || "").trim(),
        });
      }
    }

    const result: ClinicalReportListResponse = { ok: true, count: reports.length, reports, dateRanges, hsTypes };
    setCache(reportListCache, cacheKey, result);

    audit("report.view" as AuditAction, "success", actor, {
      detail: { action: "list_clinical_reports", count: reports.length },
    });

    recordAnalyticsEvent("usage.report", "report_list_view", 1, {
      unit: "count",
      tenantId,
      tags: { cached: "false", count: String(reports.length) },
    });

    return result;
  } catch (err: any) {
    disconnect();
    log.error("Clinical report list failed", { error: err.message });
    return { ok: false, count: 0, reports: [], dateRanges: [], hsTypes: [], error: safeErr(err) };
  }
}

/**
 * Get clinical report text from VistA.
 * Uses ORWRP REPORT TEXT RPC with caching, sanitization, audit.
 */
export async function getClinicalReportText(
  dfn: string,
  reportId: string,
  hsType: string,
  actor: { duz: string; name?: string; role?: string },
  tenantId: string,
): Promise<ClinicalReportTextResponse> {
  const cacheKey = `reports:text:${actor.duz}:${dfn}:${reportId}:${hsType}`;
  const cached = getCached(reportTextCache, cacheKey);
  if (cached) {
    recordAnalyticsEvent("usage.report", "report_text_view", 1, {
      unit: "count",
      tenantId,
      tags: { cached: "true", reportId },
    });
    return { ...cached, cached: true };
  }

  const startMs = Date.now();

  try {
    validateCredentials();
    await connect();
    const lines = await callRpc("ORWRP REPORT TEXT", [
      String(dfn), String(reportId), String(hsType || ""), "", "0", "", "",
    ]);
    disconnect();

    const rawText = lines.join("\n");
    const sanitized = sanitizeReportText(rawText);
    const elapsedMs = Date.now() - startMs;

    const result: ClinicalReportTextResponse = {
      ok: true,
      text: rawText,
      sanitizedText: sanitized,
      rpcUsed: "ORWRP REPORT TEXT",
    };

    setCache(reportTextCache, cacheKey, result);

    // Audit: clinical report viewed (no PHI in audit detail)
    audit("report.view" as AuditAction, "success", actor, {
      detail: {
        action: "view_clinical_report",
        reportId,
        patientDfn: dfn,
        hsType,
        textLength: rawText.length,
        elapsedMs,
      },
    });

    // Analytics: report view + latency
    recordAnalyticsEvent("usage.report", "report_text_view", 1, {
      unit: "count",
      tenantId,
      tags: { cached: "false", reportId },
    });
    recordAnalyticsEvent("perf.rpc_duration", "report_text_latency", elapsedMs, {
      unit: "ms",
      tenantId,
      tags: { rpc: "ORWRP REPORT TEXT", reportId },
    });

    return result;
  } catch (err: any) {
    disconnect();
    const elapsedMs = Date.now() - startMs;
    log.error("Clinical report text fetch failed", {
      error: safeErr(err),
      dfn,
      reportId,
      elapsedMs,
    });

    recordAnalyticsEvent("ops.error", "report_text_error", 1, {
      unit: "count",
      tenantId,
      tags: { error: err.message.slice(0, 80) },
    });

    return { ok: false, rpcUsed: "ORWRP REPORT TEXT", error: safeErr(err) };
  }
}

/**
 * Get clinical report pipeline health.
 */
export function getClinicalReportHealth(): {
  listCacheSize: number;
  textCacheSize: number;
  cacheTtlMs: number;
  maxCacheEntries: number;
} {
  return {
    listCacheSize: reportListCache.size,
    textCacheSize: reportTextCache.size,
    cacheTtlMs: CACHE_TTL_MS,
    maxCacheEntries: MAX_CACHE_ENTRIES,
  };
}
