/**
 * S3-compatible Object Store Client -- Phase 157
 *
 * Zero external dependency S3 client using AWS Signature V4.
 * Supports MinIO locally and S3 in production.
 *
 * Only implements the subset needed for audit shipping:
 *   - PUT object (upload chunk)
 *   - HEAD bucket (check connectivity)
 *   - PUT bucket (create if missing)
 *
 * Uses Node.js built-in `crypto` and `http`/`https` only.
 */

import { createHash, createHmac } from 'crypto';
import { log } from '../lib/logger.js';
import { safeErr } from '../lib/safe-error.js';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface S3ClientConfig {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  region: string;
  bucket: string;
  /** Use path-style (MinIO) vs virtual-hosted (AWS S3) */
  pathStyle: boolean;
}

export interface S3PutResult {
  ok: boolean;
  statusCode: number;
  etag?: string;
  error?: string;
}

/* ------------------------------------------------------------------ */
/* AWS Signature V4 helpers                                            */
/* ------------------------------------------------------------------ */

function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

function hmacSha256(key: string | Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Buffer {
  const kDate = hmacSha256('AWS4' + secretKey, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}

function toAmzDate(date: Date): { amzDate: string; dateStamp: string } {
  const iso = date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
  return {
    amzDate: iso, // 20260227T120000Z
    dateStamp: iso.slice(0, 8), // 20260227
  };
}

/* ------------------------------------------------------------------ */
/* HTTP request helper                                                 */
/* ------------------------------------------------------------------ */

async function s3Request(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: Buffer
): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
  const parsedUrl = new URL(url);
  const isHttps = parsedUrl.protocol === 'https:';
  const mod = isHttps ? await import('https') : await import('http');

  return new Promise((resolve, reject) => {
    const opts = {
      method,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      headers,
    };

    const req = mod.request(opts, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          headers: (res.headers || {}) as Record<string, string>,
          body: Buffer.concat(chunks).toString('utf-8'),
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(30_000, () => {
      req.destroy(new Error('S3 request timeout (30s)'));
    });

    if (body) req.write(body);
    req.end();
  });
}

/* ------------------------------------------------------------------ */
/* S3 Client                                                           */
/* ------------------------------------------------------------------ */

export class S3Client {
  private config: S3ClientConfig;

  constructor(config: S3ClientConfig) {
    this.config = config;
  }

  /** Build the full URL for an object key */
  private objectUrl(key: string): string {
    const { endpoint, bucket, pathStyle } = this.config;
    const cleanEndpoint = endpoint.replace(/\/+$/, '');
    const encodedKey = key.split('/').map(encodeURIComponent).join('/');
    if (pathStyle) {
      return `${cleanEndpoint}/${bucket}/${encodedKey}`;
    }
    // Virtual-hosted style (AWS S3)
    const parsed = new URL(cleanEndpoint);
    return `${parsed.protocol}//${bucket}.${parsed.host}/${encodedKey}`;
  }

  /** Build the bucket URL */
  private bucketUrl(): string {
    const { endpoint, bucket, pathStyle } = this.config;
    const cleanEndpoint = endpoint.replace(/\/+$/, '');
    if (pathStyle) {
      return `${cleanEndpoint}/${bucket}`;
    }
    const parsed = new URL(cleanEndpoint);
    return `${parsed.protocol}//${bucket}.${parsed.host}`;
  }

  /** Sign a request using AWS Signature V4 */
  private signRequest(
    method: string,
    url: string,
    headers: Record<string, string>,
    payloadHash: string
  ): Record<string, string> {
    const { accessKey, secretKey, region } = this.config;
    const parsedUrl = new URL(url);
    const now = new Date();
    const { amzDate, dateStamp } = toAmzDate(now);

    // Add required headers
    headers['x-amz-date'] = amzDate;
    headers['x-amz-content-sha256'] = payloadHash;

    // Canonical request
    const canonicalUri = parsedUrl.pathname;
    const canonicalQuerystring = parsedUrl.search.slice(1); // remove ?

    // Sort headers
    const signedHeaderKeys = Object.keys(headers)
      .map((k) => k.toLowerCase())
      .sort();
    const canonicalHeaders =
      signedHeaderKeys
        .map(
          (k) => `${k}:${headers[Object.keys(headers).find((h) => h.toLowerCase() === k)!]!.trim()}`
        )
        .join('\n') + '\n';
    const signedHeaders = signedHeaderKeys.join(';');

    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQuerystring,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    // String to sign
    const scope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');

    // Signature
    const signingKey = getSignatureKey(secretKey, dateStamp, region, 's3');
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    // Authorization header
    headers['Authorization'] =
      `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return headers;
  }

  /** Upload a Buffer to an S3 key. Returns result with etag. */
  async putObject(
    key: string,
    body: Buffer,
    contentType = 'application/x-ndjson'
  ): Promise<S3PutResult> {
    const url = this.objectUrl(key);
    const payloadHash = sha256(body);

    let headers: Record<string, string> = {
      Host: new URL(url).host,
      'Content-Type': contentType,
      'Content-Length': body.length.toString(),
    };

    headers = this.signRequest('PUT', url, headers, payloadHash);

    try {
      const res = await s3Request('PUT', url, headers, body);
      if (res.statusCode >= 200 && res.statusCode < 300) {
        return {
          ok: true,
          statusCode: res.statusCode,
          etag: res.headers['etag']?.replace(/"/g, ''),
        };
      }
      log.warn('S3 PUT failed', { key, statusCode: res.statusCode, body: res.body.slice(0, 200) });
      return { ok: false, statusCode: res.statusCode, error: res.body.slice(0, 200) };
    } catch (err: any) {
      log.error('S3 PUT error', { key, error: err.message });
      return { ok: false, statusCode: 0, error: safeErr(err) };
    }
  }

  /** Upload a manifest JSON alongside the chunk */
  async putManifest(key: string, manifest: Record<string, unknown>): Promise<S3PutResult> {
    const body = Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8');
    return this.putObject(key, body, 'application/json');
  }

  /** Check if the bucket exists (HEAD request) */
  async headBucket(): Promise<{ exists: boolean; error?: string }> {
    const url = this.bucketUrl();
    const payloadHash = sha256('');

    let headers: Record<string, string> = {
      Host: new URL(url).host,
    };

    headers = this.signRequest('HEAD', url, headers, payloadHash);

    try {
      const res = await s3Request('HEAD', url, headers);
      return { exists: res.statusCode === 200 };
    } catch (err: any) {
      return { exists: false, error: safeErr(err) };
    }
  }

  /** Create bucket (PUT). Idempotent on most S3-compatible stores. */
  async createBucket(): Promise<{ ok: boolean; error?: string }> {
    const url = this.bucketUrl();
    const payloadHash = sha256('');

    let headers: Record<string, string> = {
      Host: new URL(url).host,
    };

    headers = this.signRequest('PUT', url, headers, payloadHash);

    try {
      const res = await s3Request('PUT', url, headers);
      if (res.statusCode >= 200 && res.statusCode < 300) {
        return { ok: true };
      }
      // 409 = bucket already exists (OK)
      if (res.statusCode === 409) return { ok: true };
      return { ok: false, error: `HTTP ${res.statusCode}: ${res.body.slice(0, 200)}` };
    } catch (err: any) {
      return { ok: false, error: safeErr(err) };
    }
  }
}
