/**
 * PhilHealth Transport Client — Phase 515 (Wave 37 B3)
 *
 * Real HTTP transport layer for PhilHealth eClaims 3.0 API.
 * Supports mock and live modes via PHILHEALTH_MODE env var.
 *
 * Mock mode returns canned responses for testing.
 * Live mode calls the actual PhilHealth eClaims 3.0 REST API.
 *
 * All HTTP calls go through this module. The connector delegates here.
 */

import { randomBytes } from 'node:crypto';
import https from 'node:https';
import http from 'node:http';
import { readFileSync } from 'node:fs';

/* ── Types ───────────────────────────────────────────────── */

export interface PhTransportConfig {
  mode: 'mock' | 'live';
  apiEndpoint: string;
  facilityCode: string;
  apiToken: string;
  certPath?: string;
  certKeyPath?: string;
  testMode: boolean;
  timeoutMs: number;
}

export interface PhSubmitResult {
  success: boolean;
  claimRefNo?: string;
  transactionId: string;
  errors: Array<{ code: string; description: string; severity: string }>;
  rawResponse?: unknown;
}

export interface PhStatusResult {
  success: boolean;
  claimRefNo: string;
  status: string;
  statusDate?: string;
  remarks?: string;
  rawResponse?: unknown;
}

export interface PhEligibilityResult {
  success: boolean;
  memberPin?: string;
  eligible: boolean;
  memberName?: string;
  effectiveDate?: string;
  remarks?: string;
  rawResponse?: unknown;
}

export interface PhAttachmentResult {
  success: boolean;
  attachmentId?: string;
  errors: Array<{ code: string; description: string }>;
}

/* ── Config loader ───────────────────────────────────────── */

export function loadTransportConfig(): PhTransportConfig {
  return {
    mode: (process.env.PHILHEALTH_MODE as 'mock' | 'live') ?? 'mock',
    apiEndpoint: process.env.PHILHEALTH_API_ENDPOINT ?? 'https://eclaims3.philhealth.gov.ph/api/v3',
    facilityCode: process.env.PHILHEALTH_FACILITY_CODE ?? '',
    apiToken: process.env.PHILHEALTH_API_TOKEN ?? '',
    certPath: process.env.PHILHEALTH_CERT_PATH,
    certKeyPath: process.env.PHILHEALTH_CERT_KEY_PATH,
    testMode: process.env.PHILHEALTH_TEST_MODE !== 'false',
    timeoutMs: parseInt(process.env.PHILHEALTH_TIMEOUT_MS ?? '30000', 10),
  };
}

/* ── Mock transport ──────────────────────────────────────── */

const mockStore = new Map<string, { status: string; claimRefNo: string; submittedAt: string }>();

function mockSubmit(payload: unknown): PhSubmitResult {
  const claimRefNo = `PHIC-MOCK-${Date.now()}-${randomBytes(4).toString('hex')}`;
  const txId = `ph-mock-${randomBytes(6).toString('hex')}`;
  mockStore.set(claimRefNo, {
    status: 'queued',
    claimRefNo,
    submittedAt: new Date().toISOString(),
  });
  return {
    success: true,
    claimRefNo,
    transactionId: txId,
    errors: [],
    rawResponse: { mock: true, claimRefNo },
  };
}

function mockCheckStatus(claimRefNo: string): PhStatusResult {
  const entry = mockStore.get(claimRefNo);
  if (!entry) {
    return { success: false, claimRefNo, status: 'not_found', remarks: 'Mock: claim not found' };
  }
  return { success: true, claimRefNo, status: entry.status, statusDate: entry.submittedAt };
}

function mockCheckEligibility(pin: string): PhEligibilityResult {
  return {
    success: true,
    memberPin: pin,
    eligible: true,
    memberName: 'MOCK MEMBER',
    effectiveDate: '2024-01-01',
    remarks: 'Mock eligibility check',
  };
}

function mockUploadAttachment(_claimRefNo: string, _filename: string): PhAttachmentResult {
  return {
    success: true,
    attachmentId: `att-mock-${randomBytes(4).toString('hex')}`,
    errors: [],
  };
}

/* ── Live HTTP helper ────────────────────────────────────── */

function makeRequest(
  config: PhTransportConfig,
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, config.apiEndpoint);
    const isHttps = url.protocol === 'https:';
    const mod = isHttps ? https : http;

    const options: https.RequestOptions = {
      method,
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiToken}`,
        'X-Facility-Code': config.facilityCode,
      },
      timeout: config.timeoutMs,
    };

    // TLS client certificate for eClaims 3.0
    if (isHttps && config.certPath && config.certKeyPath) {
      try {
        (options as any).cert = readFileSync(config.certPath);
        (options as any).key = readFileSync(config.certKeyPath);
      } catch {
        // Cert files not available — proceed without mTLS
      }
    }

    const req = mod.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8');
        try {
          resolve({ status: res.statusCode ?? 0, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode ?? 0, data: raw });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('PhilHealth API timeout'));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/* ── PhilHealth Transport Client ─────────────────────────── */

export class PhilHealthTransport {
  private config: PhTransportConfig;

  constructor(config?: Partial<PhTransportConfig>) {
    this.config = { ...loadTransportConfig(), ...config };
  }

  get mode(): string {
    return this.config.mode;
  }

  /**
   * Submit a claim (CF1-CF4 bundle) to PhilHealth eClaims 3.0 API.
   */
  async submitClaim(claimBundle: unknown): Promise<PhSubmitResult> {
    if (this.config.mode === 'mock') return mockSubmit(claimBundle);

    try {
      const { status, data } = await makeRequest(
        this.config,
        'POST',
        '/claims/submit',
        claimBundle
      );
      const d = data as any;

      if (status >= 200 && status < 300) {
        return {
          success: true,
          claimRefNo: d.claimReferenceNumber ?? d.claimRefNo,
          transactionId: d.transactionId ?? `ph-live-${randomBytes(4).toString('hex')}`,
          errors: [],
          rawResponse: d,
        };
      }

      return {
        success: false,
        transactionId: d.transactionId ?? '',
        errors: d.errors ?? [{ code: `HTTP-${status}`, description: String(d), severity: 'error' }],
        rawResponse: d,
      };
    } catch (err: any) {
      return {
        success: false,
        transactionId: '',
        errors: [{ code: 'TRANSPORT_ERROR', description: err.message, severity: 'error' }],
      };
    }
  }

  /**
   * Check claim status by reference number.
   */
  async checkClaimStatus(claimRefNo: string): Promise<PhStatusResult> {
    if (this.config.mode === 'mock') return mockCheckStatus(claimRefNo);

    try {
      const { status, data } = await makeRequest(
        this.config,
        'GET',
        `/claims/${encodeURIComponent(claimRefNo)}/status`
      );
      const d = data as any;

      return {
        success: status >= 200 && status < 300,
        claimRefNo,
        status: d.status ?? 'unknown',
        statusDate: d.statusDate,
        remarks: d.remarks,
        rawResponse: d,
      };
    } catch (err: any) {
      return { success: false, claimRefNo, status: 'error', remarks: err.message };
    }
  }

  /**
   * Check member eligibility via PIN.
   */
  async checkEligibility(memberPin: string): Promise<PhEligibilityResult> {
    if (this.config.mode === 'mock') return mockCheckEligibility(memberPin);

    try {
      const { status, data } = await makeRequest(
        this.config,
        'GET',
        `/members/${encodeURIComponent(memberPin)}/eligibility`
      );
      const d = data as any;

      return {
        success: status >= 200 && status < 300,
        memberPin,
        eligible: d.eligible ?? false,
        memberName: d.memberName,
        effectiveDate: d.effectiveDate,
        remarks: d.remarks,
        rawResponse: d,
      };
    } catch (err: any) {
      return { success: false, memberPin, eligible: false, remarks: err.message };
    }
  }

  /**
   * Upload supporting document / attachment for a claim.
   * eClaims 3.0 requires electronic SOA — scanned PDFs are rejected.
   */
  async uploadAttachment(
    claimRefNo: string,
    filename: string,
    content: Buffer,
    contentType: string = 'application/pdf'
  ): Promise<PhAttachmentResult> {
    if (this.config.mode === 'mock') return mockUploadAttachment(claimRefNo, filename);

    try {
      // Note: Actual PhilHealth API may use multipart/form-data.
      // This is a structural scaffold — production implementation would
      // need the exact multipart format from PHIC API docs.
      const base64 = content.toString('base64');
      const { status, data } = await makeRequest(
        this.config,
        'POST',
        `/claims/${encodeURIComponent(claimRefNo)}/attachments`,
        {
          filename,
          contentType,
          content: base64,
        }
      );
      const d = data as any;

      if (status >= 200 && status < 300) {
        return { success: true, attachmentId: d.attachmentId, errors: [] };
      }

      return {
        success: false,
        errors: d.errors ?? [{ code: `HTTP-${status}`, description: String(d) }],
      };
    } catch (err: any) {
      return {
        success: false,
        errors: [{ code: 'TRANSPORT_ERROR', description: err.message }],
      };
    }
  }

  /**
   * Health check — ping the PhilHealth eClaims API.
   */
  async healthCheck(): Promise<{ ok: boolean; mode: string; latencyMs: number }> {
    const start = Date.now();

    if (this.config.mode === 'mock') {
      return { ok: true, mode: 'mock', latencyMs: Date.now() - start };
    }

    try {
      const { status } = await makeRequest(this.config, 'GET', '/health');
      return { ok: status >= 200 && status < 300, mode: 'live', latencyMs: Date.now() - start };
    } catch {
      return { ok: false, mode: 'live', latencyMs: Date.now() - start };
    }
  }
}
