/**
 * Phase 74 -- Network Evidence Capture Helper
 *
 * Attaches to a Playwright page and records all API network requests/responses.
 * Writes structured evidence JSON for verification and audit trail.
 *
 * Usage:
 *   const evidence = new NetworkEvidence(page);
 *   evidence.start();
 *   // ... run tests ...
 *   await evidence.flush("artifacts/verify/phase74/e2e/network.json");
 */

import { type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface NetworkEntry {
  timestamp: string;
  url: string;
  method: string;
  status: number;
  durationMs: number;
  requestSize: number;
  responseSize: number;
  resourceType: string;
  /** Which test/screen triggered this request */
  context?: string;
}

export interface NetworkEvidenceReport {
  _meta: {
    tool: string;
    generatedAt: string;
    totalRequests: number;
    apiRequests: number;
    failedRequests: number;
  };
  entries: NetworkEntry[];
  summary: {
    byMethod: Record<string, number>;
    byStatus: Record<string, number>;
    avgDurationMs: number;
    totalTransferBytes: number;
  };
}

/* ------------------------------------------------------------------ */
/* API URL detection                                                    */
/* ------------------------------------------------------------------ */

const API_PATTERNS = [
  /localhost:3001/,
  /\/api\//,
  /\/vista\//,
  /\/auth\//,
  /\/rcm\//,
  /\/messaging\//,
  /\/admin\//,
  /\/telehealth\//,
  /\/imaging\//,
  /\/scheduling\//,
  /\/analytics\//,
  /\/iam\//,
  /\/portal\//,
  /\/intake\//,
  /\/security\//,
];

function isApiRequest(url: string): boolean {
  return API_PATTERNS.some((p) => p.test(url));
}

/* ------------------------------------------------------------------ */
/* NetworkEvidence class                                                */
/* ------------------------------------------------------------------ */

export class NetworkEvidence {
  private page: Page;
  private entries: NetworkEntry[] = [];
  private currentContext = 'unknown';
  private requestTimings = new Map<string, number>();
  private listening = false;

  constructor(page: Page) {
    this.page = page;
  }

  /** Set the test/screen context label for subsequent requests */
  setContext(ctx: string): void {
    this.currentContext = ctx;
  }

  /** Start recording network requests */
  start(): void {
    if (this.listening) return;
    this.listening = true;

    this.page.on('request', (req) => {
      if (isApiRequest(req.url())) {
        this.requestTimings.set(req.url() + req.method(), Date.now());
      }
    });

    this.page.on('response', async (res) => {
      const req = res.request();
      const url = req.url();
      if (!isApiRequest(url)) return;

      const key = url + req.method();
      const startTime = this.requestTimings.get(key) ?? Date.now();
      this.requestTimings.delete(key);

      let responseSize = 0;
      try {
        const body = await res.body();
        responseSize = body.length;
      } catch {
        // Response body not available (e.g. redirect)
      }

      const postData = req.postData();

      this.entries.push({
        timestamp: new Date().toISOString(),
        url: url.replace(/https?:\/\/[^/]+/, ''), // strip host for privacy
        method: req.method(),
        status: res.status(),
        durationMs: Date.now() - startTime,
        requestSize: postData ? postData.length : 0,
        responseSize,
        resourceType: req.resourceType(),
        context: this.currentContext,
      });
    });
  }

  /** Get current entries */
  getEntries(): NetworkEntry[] {
    return [...this.entries];
  }

  /** Get count of API requests */
  getApiRequestCount(): number {
    return this.entries.length;
  }

  /** Get count of failed (4xx/5xx) requests */
  getFailedCount(): number {
    return this.entries.filter((e) => e.status >= 400).length;
  }

  /** Build the structured report */
  buildReport(): NetworkEvidenceReport {
    const byMethod: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalDuration = 0;
    let totalBytes = 0;

    for (const e of this.entries) {
      byMethod[e.method] = (byMethod[e.method] || 0) + 1;
      const statusBucket = `${Math.floor(e.status / 100)}xx`;
      byStatus[statusBucket] = (byStatus[statusBucket] || 0) + 1;
      totalDuration += e.durationMs;
      totalBytes += e.requestSize + e.responseSize;
    }

    return {
      _meta: {
        tool: 'phase74-network-evidence',
        generatedAt: new Date().toISOString(),
        totalRequests: this.entries.length,
        apiRequests: this.entries.length,
        failedRequests: this.getFailedCount(),
      },
      entries: this.entries,
      summary: {
        byMethod,
        byStatus,
        avgDurationMs:
          this.entries.length > 0 ? Math.round(totalDuration / this.entries.length) : 0,
        totalTransferBytes: totalBytes,
      },
    };
  }

  /** Write evidence JSON to disk */
  async flush(outputPath: string): Promise<void> {
    const report = this.buildReport();
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
  }
}
