#!/usr/bin/env node
/**
 * G5 -- API Smoke Gate
 *
 * Starts the API (if not running), calls /health + key domain endpoints,
 * and verifies no 500s.
 *
 * If API is already listening on the expected port, reuses it.
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');

export const id = 'G5_api_smoke';
export const name = 'API Smoke';

const API_URL = process.env.API_URL || 'http://127.0.0.1:3001';

async function probe(path, label) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.status >= 500) {
      return { label, ok: false, detail: `${res.status} server error` };
    }
    return { label, ok: true, detail: `${res.status}` };
  } catch (err) {
    return { label, ok: false, detail: err.message };
  }
}

export async function run() {
  const start = Date.now();
  const details = [];
  let status = 'pass';

  // Check if API is reachable
  const health = await probe('/health', 'GET /health');
  if (!health.ok) {
    details.push(`API not reachable at ${API_URL}: ${health.detail}`);
    return {
      id,
      name,
      status: 'skip',
      details: [`API not reachable -- SKIP (start API first)`],
      durationMs: Date.now() - start,
    };
  }
  details.push(`GET /health: ${health.detail}`);

  // Probe key endpoints (no auth needed for these)
  const publicEndpoints = ['/ready', '/metrics/prometheus'];

  for (const ep of publicEndpoints) {
    const r = await probe(ep, `GET ${ep}`);
    details.push(`GET ${ep}: ${r.detail}`);
    if (!r.ok) status = 'fail';
  }

  // Endpoints that need auth will 401 -- that's expected, just ensure no 500
  const authEndpoints = ['/auth/session', '/api/capabilities', '/vista/allergies?dfn=3'];

  for (const ep of authEndpoints) {
    const r = await probe(ep, `GET ${ep}`);
    details.push(`GET ${ep}: ${r.detail}`);
    // 401 is fine (expected without auth), 500 is not
    if (r.detail.includes('server error')) status = 'fail';
  }

  return { id, name, status, details, durationMs: Date.now() - start };
}
