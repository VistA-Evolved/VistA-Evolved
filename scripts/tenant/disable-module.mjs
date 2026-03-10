#!/usr/bin/env node
/**
 * Disable Module CLI -- Phase 135
 *
 * Disables a module for a tenant via the admin API.
 *
 * Usage:
 *   node scripts/tenant/disable-module.mjs --tenant-id facility-42 --module rcm
 *   node scripts/tenant/disable-module.mjs --tenant-id facility-42 --module telehealth --reason "Contract expired"
 */

const API_BASE = process.env.API_URL || 'http://127.0.0.1:3001';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tenant-id' && args[i + 1]) opts.tenantId = args[++i];
    else if (args[i] === '--module' && args[i + 1]) opts.moduleId = args[++i];
    else if (args[i] === '--reason' && args[i + 1]) opts.reason = args[++i];
    else if (args[i] === '--help') {
      console.log(
        'Usage: node scripts/tenant/disable-module.mjs --tenant-id <id> --module <moduleId> [--reason <text>]'
      );
      process.exit(0);
    }
  }
  return opts;
}

async function getSession() {
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accessCode: process.env.VISTA_ACCESS_CODE || 'PROV123',
      verifyCode: process.env.VISTA_VERIFY_CODE || 'PROV123!!',
    }),
  });
  if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
  const loginData = await loginRes.json();
  const cookies = loginRes.headers.getSetCookie?.() || [];
  const cookieStr = cookies.map((c) => c.split(';')[0]).join('; ');
  return { cookieStr, csrfToken: loginData.csrfToken || '' };
}

async function main() {
  const opts = parseArgs();
  if (!opts.tenantId || !opts.moduleId) {
    console.error('ERROR: --tenant-id and --module are required');
    process.exit(1);
  }

  const session = await getSession();

  const res = await fetch(`${API_BASE}/admin/modules/entitlements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: session.cookieStr,
      'x-csrf-token': session.csrfToken,
    },
    body: JSON.stringify({
      tenantId: opts.tenantId,
      moduleId: opts.moduleId,
      enabled: false,
      reason: opts.reason || `CLI disable-module`,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error(`FAIL: ${res.status} - ${JSON.stringify(data)}`);
    process.exit(1);
  }

  console.log(`Module '${opts.moduleId}' DISABLED for tenant '${opts.tenantId}'.`);
  if (data.entitlement) {
    console.log(`  Disabled at: ${data.entitlement.disabledAt}`);
  }
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
