#!/usr/bin/env node
/**
 * Phase 478 -- VistA Capability Snapshot Generator
 *
 * Calls GET /vista/capabilities on a running API and writes the response
 * to data/vista/capability-snapshot.json (overwrite) plus a timestamped
 * copy at data/vista/capability-snapshot-{ISO}.json.
 *
 * Usage:
 *   node scripts/vista-capability-snapshot.mjs [--api URL] [--refresh] [--no-timestamp]
 *
 * Options:
 *   --api URL          API base URL (default: http://127.0.0.1:3001)
 *   --refresh          Force a fresh RPC probe (bypass capability cache)
 *   --no-timestamp     Skip creating the timestamped copy
 *   --cookie FILE      Path to a cookie file for auth (one Set-Cookie value per line)
 *
 * Requires:
 *   - API running with VistA connected
 *   - Authenticated session (pass cookie file or have VISTA_SESSION_COOKIE env var)
 *
 * Output:
 *   data/vista/capability-snapshot.json          (latest, overwritten)
 *   data/vista/capability-snapshot-{ISO}.json    (timestamped archive)
 *
 * No PHI in output -- only RPC names, availability booleans, and counts.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'data', 'vista');

/* ---- CLI args ---- */
const args = process.argv.slice(2);
function flag(name) {
  return args.includes(name);
}
function opt(name, fallback) {
  const idx = args.indexOf(name);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
}

const API = opt('--api', process.env.API_BASE || 'http://127.0.0.1:3001');
const REFRESH = flag('--refresh');
const NO_TIMESTAMP = flag('--no-timestamp');
const COOKIE_FILE = opt('--cookie', null);

/* ---- Cookie handling ---- */
function loadCookie() {
  // Try explicit cookie file
  if (COOKIE_FILE && existsSync(COOKIE_FILE)) {
    let raw = readFileSync(COOKIE_FILE, 'utf-8').trim();
    // Strip BOM if present (BUG-064: PowerShell Set-Content adds UTF-8 BOM)
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    // Extract just the cookie key=value pairs
    const cookies = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        // Handle "Set-Cookie: name=value; ..." or just "name=value"
        const match = line.match(/^(?:Set-Cookie:\s*)?([^;]+)/i);
        return match ? match[1].trim() : '';
      })
      .filter(Boolean);
    return cookies.join('; ');
  }
  // Try env var
  if (process.env.VISTA_SESSION_COOKIE) {
    return process.env.VISTA_SESSION_COOKIE;
  }
  return '';
}

/* ---- Main ---- */
async function main() {
  console.log(`VistA Capability Snapshot Generator (Phase 478)`);
  console.log(`  API:     ${API}`);
  console.log(`  Refresh: ${REFRESH}`);
  console.log();

  const url = `${API}/vista/capabilities${REFRESH ? '?refresh=true' : ''}`;
  const cookie = loadCookie();
  const headers = { Accept: 'application/json' };
  if (cookie) headers['Cookie'] = cookie;

  let res;
  try {
    res = await fetch(url, { headers, signal: AbortSignal.timeout(60000) });
  } catch (err) {
    console.error(`FAIL  Cannot reach API at ${url}`);
    console.error(`      ${err.message}`);
    console.error(`      Is the API running? Try: npx tsx apps/api/src/index.ts`);
    process.exit(1);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '(no body)');
    console.error(`FAIL  API returned ${res.status}: ${text.substring(0, 200)}`);
    if (res.status === 401) {
      console.error(
        `      Auth required. Pass --cookie <file> or set VISTA_SESSION_COOKIE env var.`
      );
    }
    process.exit(1);
  }

  const snapshot = await res.json();
  if (!snapshot.ok) {
    console.error(`FAIL  API response ok=false:`, JSON.stringify(snapshot).substring(0, 200));
    process.exit(1);
  }

  // Ensure output directory
  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
  }

  // Write latest snapshot
  const latestPath = join(OUT_DIR, 'capability-snapshot.json');
  writeFileSync(latestPath, JSON.stringify(snapshot, null, 2) + '\n', 'utf-8');
  console.log(`OK    ${latestPath.replace(ROOT + '\\', '').replace(ROOT + '/', '')}`);

  // Write timestamped archive
  if (!NO_TIMESTAMP && snapshot.generatedAt) {
    const ts = snapshot.generatedAt.replace(/[:.]/g, '-').replace('Z', '');
    const archivePath = join(OUT_DIR, `capability-snapshot-${ts}.json`);
    writeFileSync(archivePath, JSON.stringify(snapshot, null, 2) + '\n', 'utf-8');
    console.log(`OK    ${archivePath.replace(ROOT + '\\', '').replace(ROOT + '/', '')}`);
  }

  // Summary
  const probe = snapshot.rpcProbe || {};
  const reg = snapshot.registry || {};
  console.log();
  console.log(`Summary:`);
  console.log(`  Instance:          ${snapshot.instanceId || 'unknown'}`);
  console.log(`  RPCs probed:       ${probe.totalProbed ?? '?'}`);
  console.log(`  Available:         ${probe.available ?? '?'}`);
  console.log(
    `  Missing:           ${probe.missing ?? '?'} (${probe.expectedMissing ?? '?'} expected)`
  );
  console.log(`  Unexpected missing: ${probe.unexpectedMissing ?? '?'}`);
  console.log(
    `  Registry total:    ${reg.totalRegistered ?? '?'} + ${reg.totalExceptions ?? '?'} exceptions`
  );
  console.log();

  if ((probe.unexpectedMissing || 0) > 0 && Array.isArray(probe.unexpectedMissingList)) {
    console.log(`  WARNING: ${probe.unexpectedMissing} unexpectedly missing RPCs:`);
    for (const rpc of probe.unexpectedMissingList) {
      console.log(`    - ${rpc}`);
    }
  }

  console.log(`DONE`);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
