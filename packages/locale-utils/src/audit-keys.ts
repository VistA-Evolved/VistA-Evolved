/**
 * Locale extraction audit — scans portal and web message files
 * to ensure key parity across all supported locales.
 *
 * Usage: node --import tsx/esm packages/locale-utils/src/audit-keys.ts
 * (or called from the Phase 310 verifier)
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

interface AuditResult {
  app: string;
  locales: string[];
  keyCountByLocale: Record<string, number>;
  missingKeys: Record<string, string[]>; // locale -> missing keys
  extraKeys: Record<string, string[]>; // locale -> extra keys vs en
  ok: boolean;
}

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenKeys(v as Record<string, unknown>, full));
    } else {
      keys.push(full);
    }
  }
  return keys.sort();
}

function auditApp(appName: string, messagesDir: string): AuditResult {
  const locales = ['en', 'fil', 'es'];
  const keysByLocale: Record<string, string[]> = {};
  const keyCountByLocale: Record<string, number> = {};

  for (const loc of locales) {
    const file = resolve(messagesDir, `${loc}.json`);
    if (!existsSync(file)) {
      keysByLocale[loc] = [];
      keyCountByLocale[loc] = 0;
      continue;
    }
    const raw = readFileSync(file, 'utf8');
    const json = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
    const keys = flattenKeys(json);
    keysByLocale[loc] = keys;
    keyCountByLocale[loc] = keys.length;
  }

  const enKeys = new Set(keysByLocale['en'] || []);
  const missingKeys: Record<string, string[]> = {};
  const extraKeys: Record<string, string[]> = {};

  for (const loc of locales) {
    if (loc === 'en') continue;
    const locKeys = new Set(keysByLocale[loc] || []);
    missingKeys[loc] = [...enKeys].filter((k) => !locKeys.has(k));
    extraKeys[loc] = [...locKeys].filter((k) => !enKeys.has(k));
  }

  const ok = Object.values(missingKeys).every((m) => m.length === 0);

  return { app: appName, locales, keyCountByLocale, missingKeys, extraKeys, ok };
}

// ── Main ────────────────────────────────────────────────────────

const portalResult = auditApp('portal', 'apps/portal/public/messages');
const webResult = auditApp('web', 'apps/web/public/messages');

const allOk = portalResult.ok && webResult.ok;

for (const r of [portalResult, webResult]) {
  console.log(`\n=== ${r.app} ===`);
  console.log(`Locales: ${r.locales.join(', ')}`);
  for (const [loc, count] of Object.entries(r.keyCountByLocale)) {
    console.log(`  ${loc}: ${count} keys`);
  }
  for (const [loc, missing] of Object.entries(r.missingKeys)) {
    if (missing.length > 0) {
      console.log(
        `  ${loc} MISSING ${missing.length} keys: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`
      );
    }
  }
  for (const [loc, extra] of Object.entries(r.extraKeys)) {
    if (extra.length > 0) {
      console.log(
        `  ${loc} EXTRA ${extra.length} keys: ${extra.slice(0, 5).join(', ')}${extra.length > 5 ? '...' : ''}`
      );
    }
  }
  console.log(`  Status: ${r.ok ? 'OK' : 'NEEDS ATTENTION'}`);
}

// Output JSON for CI consumption
const output = { portal: portalResult, web: webResult, allOk };
console.log(`\n__AUDIT_JSON__${JSON.stringify(output)}__END__`);

process.exit(allOk ? 0 : 1);
