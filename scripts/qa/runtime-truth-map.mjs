import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:3001';
const ACCESS_CODE = process.env.LOGIN_ACCESS_CODE || process.env.VISTA_ACCESS_CODE || 'PRO1234';
const VERIFY_CODE = process.env.LOGIN_VERIFY_CODE || process.env.VISTA_VERIFY_CODE || 'PRO1234!!';
const PATIENT_DFN = process.env.RUNTIME_TRUTH_DFN || '46';
const OUTPUT_DIR = join(process.cwd(), 'artifacts', 'runtime-truth-map');
const OUTPUT_FILE = join(OUTPUT_DIR, 'latest.json');

function cookieHeaderFrom(response) {
  const rawCookies =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [response.headers.get('set-cookie')].filter(Boolean);
  return rawCookies.map((value) => value.split(';', 1)[0]).join('; ');
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return {
    ok: response.ok,
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: json ?? text,
    cookie: cookieHeaderFrom(response),
  };
}

async function main() {
  const report = {
    generatedAt: new Date().toISOString(),
    apiBase: API_BASE,
    patientDfn: PATIENT_DFN,
    checks: {},
  };

  report.checks.health = await request('/health');
  report.checks.ready = await request('/ready');

  const login = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessCode: ACCESS_CODE, verifyCode: VERIFY_CODE }),
  });
  report.checks.login = {
    ok: login.ok,
    status: login.status,
    role: login.body?.role || login.body?.session?.role || null,
  };

  if (!login.ok || !login.cookie || !login.body?.csrfToken) {
    throw new Error(`Login failed for runtime truth map: ${JSON.stringify(login.body)}`);
  }

  const authHeaders = {
    Cookie: login.cookie,
  };

  report.checks.modulesStatus = await request('/api/modules/status?tenantId=default', {
    headers: authHeaders,
  });

  report.checks.problems = await request(`/vista/problems?dfn=${PATIENT_DFN}`, {
    headers: authHeaders,
  });

  const idempotencyKey = `runtime-truth-${Date.now()}`;
  const orderHeaders = {
    ...authHeaders,
    'Content-Type': 'application/json',
    'X-CSRF-Token': login.body.csrfToken,
    'Idempotency-Key': idempotencyKey,
  };

  report.checks.orderSignFirst = await request('/vista/cprs/orders/sign', {
    method: 'POST',
    headers: orderHeaders,
    body: JSON.stringify({ dfn: PATIENT_DFN, orderIds: ['999999'] }),
  });

  report.checks.orderSignReplay = await request('/vista/cprs/orders/sign', {
    method: 'POST',
    headers: orderHeaders,
    body: JSON.stringify({ dfn: PATIENT_DFN, orderIds: ['999999'] }),
  });

  report.summary = {
    healthOk: report.checks.health.ok,
    readyOk: report.checks.ready.ok,
    loginOk: report.checks.login.ok,
    modulesStatusOk: report.checks.modulesStatus.ok,
    problemsOk: report.checks.problems.ok,
    problemsCount: report.checks.problems.body?.count ?? null,
    problemsRpc: report.checks.problems.body?.rpcUsed ?? null,
    firstSignStatus: report.checks.orderSignFirst.body?.status ?? null,
    replayHeader: report.checks.orderSignReplay.headers['idempotency-replayed'] || null,
    replayStatus: report.checks.orderSignReplay.body?.status ?? null,
  };

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
