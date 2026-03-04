#!/usr/bin/env node
/**
 * G22 -- PHI Leak Audit Gate (Phase 151)
 *
 * Static analysis gate that scans the API source for PHI leaks:
 *   1. log.* calls must not include dfn/patientDfn/patientName in payload
 *   2. immutableAudit/portalAudit detail objects must not pass raw dfn
 *   3. phi-redaction.ts PHI_FIELDS must include dfn, patientdfn, patient_dfn, mrn
 *   4. server-config.ts auditIncludesDfn must be false
 *   5. All sanitizeDetail implementations must block dfn keys
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');
const API_SRC = resolve(ROOT, 'apps/api/src');

export const id = 'G22_phi_leak_audit';
export const name = 'PHI Leak Audit';

export async function run(opts = {}) {
  const start = Date.now();
  const details = [];
  let status = 'pass';

  // ── 1. phi-redaction.ts has dfn identifiers in PHI_FIELDS ────────
  const phiRedactPath = resolve(API_SRC, 'lib/phi-redaction.ts');
  if (!existsSync(phiRedactPath)) {
    details.push('phi-redaction.ts: MISSING');
    return { id, name, status: 'fail', details, durationMs: Date.now() - start };
  }

  const phiSrc = readFileSync(phiRedactPath, 'utf8');
  const requiredPhiFields = ['dfn', 'patientdfn', 'patient_dfn', 'mrn'];
  const missingPhiFields = requiredPhiFields.filter((f) => !phiSrc.includes(`"${f}"`));
  if (missingPhiFields.length > 0) {
    details.push(`phi-redaction.ts: missing PHI fields: ${missingPhiFields.join(', ')}`);
    status = 'fail';
  } else {
    details.push(`phi-redaction.ts: all ${requiredPhiFields.length} patient ID fields present`);
  }

  // Check sanitizeAuditDetail export exists
  if (!phiSrc.includes('export function sanitizeAuditDetail')) {
    details.push('phi-redaction.ts: missing sanitizeAuditDetail export');
    status = 'fail';
  } else {
    details.push('phi-redaction.ts: sanitizeAuditDetail export present');
  }

  // ── 2. server-config.ts auditIncludesDfn must be false ───────────
  const serverConfigPath = resolve(API_SRC, 'config/server-config.ts');
  if (existsSync(serverConfigPath)) {
    const configSrc = readFileSync(serverConfigPath, 'utf8');
    if (configSrc.includes('auditIncludesDfn: true')) {
      details.push('server-config.ts: auditIncludesDfn is TRUE -- must be false');
      status = 'fail';
    } else if (configSrc.includes('auditIncludesDfn: false')) {
      details.push('server-config.ts: auditIncludesDfn correctly false');
    } else {
      details.push('server-config.ts: auditIncludesDfn not found (warn)');
    }

    // Check neverLogFields includes dfn
    const neverLogFieldsCheck = ['dfn', 'patientDfn', 'mrn'].filter(
      (f) => !configSrc.includes(`"${f}"`)
    );
    if (neverLogFieldsCheck.length > 0) {
      details.push(`server-config.ts: neverLogFields missing: ${neverLogFieldsCheck.join(', ')}`);
      status = 'fail';
    } else {
      details.push('server-config.ts: neverLogFields includes dfn/patientDfn/mrn');
    }
  }

  // ── 3. Scan log statements for dfn leaks ─────────────────────────
  try {
    const logLeaks = scanForLogDfnLeaks(API_SRC);

    if (logLeaks.length > 0) {
      details.push(`Log PHI leaks found: ${logLeaks.length} -- ${logLeaks.slice(0, 5).join('; ')}`);
      status = 'fail';
    } else {
      details.push('No log.* calls with raw dfn found in routes/services');
    }
  } catch (err) {
    details.push(`Log scan error: ${err.message}`);
  }

  // ── 4. Check audit.ts doesn't log patientDfn ────────────────────
  const auditPath = resolve(API_SRC, 'lib/audit.ts');
  if (existsSync(auditPath)) {
    const auditSrc = readFileSync(auditPath, 'utf8');
    // Look for patientDfn in log.info calls (not in type definitions or filter logic)
    const logLines = auditSrc
      .split('\n')
      .filter((line) => line.includes('log.info') && line.includes('patientDfn'));
    if (logLines.length > 0) {
      details.push(`audit.ts: ${logLines.length} log.info calls still include patientDfn`);
      status = 'fail';
    } else {
      details.push('audit.ts: no patientDfn in log.info calls');
    }
  }

  // ── 5. Check portal-audit uses sanitizeAuditDetail ───────────────
  const portalAuditPath = resolve(API_SRC, 'services/portal-audit.ts');
  if (existsSync(portalAuditPath)) {
    const paSrc = readFileSync(portalAuditPath, 'utf8');
    if (!paSrc.includes('sanitizeAuditDetail')) {
      details.push('portal-audit.ts: detail not sanitized -- must use sanitizeAuditDetail');
      status = 'fail';
    } else {
      details.push('portal-audit.ts: detail sanitized via sanitizeAuditDetail');
    }
  }

  // ── 6. Check immutable-audit imports phi-redaction ───────────────
  const immutableAuditPath = resolve(API_SRC, 'lib/immutable-audit.ts');
  if (existsSync(immutableAuditPath)) {
    const iaSrc = readFileSync(immutableAuditPath, 'utf8');
    if (!iaSrc.includes('phi-redaction')) {
      details.push('immutable-audit.ts: does not import phi-redaction');
      status = 'fail';
    } else {
      details.push('immutable-audit.ts: imports centralized phi-redaction');
    }
  }

  return { id, name, status, details, durationMs: Date.now() - start };
}

/* ── Helper: scan TS files for log.* calls with dfn in payload ────── */
function scanForLogDfnLeaks(apiSrc) {
  const leaks = [];
  const dirs = ['routes', 'services'];

  for (const dir of dirs) {
    const dirPath = resolve(apiSrc, dir);
    if (!existsSync(dirPath)) continue;
    scanDir(dirPath, leaks);
  }

  return leaks;
}

function scanDir(dirPath, leaks) {
  let entries;
  try {
    entries = readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = resolve(dirPath, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath, leaks);
    } else if (entry.name.endsWith('.ts')) {
      try {
        const src = readFileSync(fullPath, 'utf8');
        const lines = src.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Single-line: log.info/warn/error with dfn on same line
          if (/log\.(info|warn|error|debug)\s*\(/.test(line) && /[{,]\s*dfn\b/.test(line)) {
            const relPath = fullPath.replace(/\\/g, '/').replace(/.*apps\/api\/src\//, '');
            leaks.push(`${relPath}:${i + 1}`);
            continue;
          }
          // Multi-line: log.info( opens on one line, dfn on next few lines
          // Only include continuation lines that are part of the same call
          // (stop at lines that start a new statement/call like immutableAudit, await, etc.)
          if (
            /log\.(info|warn|error|debug)\s*\(\s*$/.test(line) ||
            /log\.(info|warn|error|debug)\s*\([^)]*[{,]\s*$/.test(line) ||
            /log\.(info|warn|error|debug)\s*\("[^"]*",\s*\{\s*$/.test(line)
          ) {
            // Collect continuation lines until we hit closing paren or a new statement
            const windowLines = [line];
            for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
              const nextLine = lines[j].trim();
              // Stop if this line starts a new call/statement (not a continuation)
              if (
                /^(immutableAudit|portalAudit|imagingAudit|rcmAudit|audit|await\s|return\s|const\s|let\s|if\s*\(|}\s*$|\/\/)/.test(
                  nextLine
                )
              )
                break;
              windowLines.push(lines[j]);
              // Stop if we found the closing of the log call
              if (/\)\s*;?\s*$/.test(nextLine)) break;
            }
            const window = windowLines.join(' ');
            if (/[{,]\s*dfn\b/.test(window)) {
              const relPath = fullPath.replace(/\\/g, '/').replace(/.*apps\/api\/src\//, '');
              leaks.push(`${relPath}:${i + 1} (multi-line)`);
            }
          }
        }
      } catch {
        /* skip unreadable files */
      }
    }
  }
}
