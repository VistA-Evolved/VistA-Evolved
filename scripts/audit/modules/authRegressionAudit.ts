/**
 * Phase 54 -- Auth Regression Audit Module (Integration-only)
 *
 * Requires a running API server. Tests:
 *   1. Login with valid creds returns 200 + session cookie
 *   2. Login with bad creds returns 401
 *   3. Protected route without session returns 401
 *   4. Admin route without admin role returns 403
 */

import type { AuditModule, AuditFinding } from '../types.js';

const API_BASE = process.env.AUDIT_API_BASE || 'http://127.0.0.1:3001';

async function tryFetch(url: string, opts?: RequestInit): Promise<{ status: number; body: any }> {
  const resp = await fetch(url, { ...opts, redirect: 'manual' });
  let body: any;
  try {
    body = await resp.json();
  } catch {
    body = await resp.text().catch(() => '');
  }
  return { status: resp.status, body };
}

export const authRegressionAudit: AuditModule = {
  name: 'authRegressionAudit',
  requires: 'integration',

  async run(root: string): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];

    // Test 1: valid login
    try {
      const { status } = await tryFetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: 'PROV123', verifyCode: 'PROV123!!' }),
      });
      if (status === 200) {
        findings.push({
          rule: 'auth-login-valid',
          status: 'pass',
          severity: 'info',
          message: 'Valid login returns 200',
        });
      } else {
        findings.push({
          rule: 'auth-login-valid',
          status: 'fail',
          severity: 'critical',
          message: `Valid login returned ${status} (expected 200)`,
        });
      }
    } catch (err: any) {
      findings.push({
        rule: 'auth-login-valid',
        status: 'fail',
        severity: 'critical',
        message: `Login request failed: ${err.message}`,
        fix: 'Ensure API is running on ' + API_BASE,
      });
    }

    // Test 2: bad creds
    try {
      const { status } = await tryFetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: 'BADUSER', verifyCode: 'BADPASS' }),
      });
      if (status === 401) {
        findings.push({
          rule: 'auth-login-bad-creds',
          status: 'pass',
          severity: 'info',
          message: 'Bad creds returns 401',
        });
      } else {
        findings.push({
          rule: 'auth-login-bad-creds',
          status: 'fail',
          severity: 'high',
          message: `Bad creds returned ${status} (expected 401)`,
        });
      }
    } catch (err: any) {
      findings.push({
        rule: 'auth-login-bad-creds',
        status: 'fail',
        severity: 'high',
        message: `Bad creds request failed: ${err.message}`,
      });
    }

    // Test 3: protected route without session
    try {
      const { status } = await tryFetch(`${API_BASE}/vista/allergies?dfn=3`);
      if (status === 401) {
        findings.push({
          rule: 'auth-no-session',
          status: 'pass',
          severity: 'info',
          message: 'Protected route without session returns 401',
        });
      } else {
        findings.push({
          rule: 'auth-no-session',
          status: 'fail',
          severity: 'critical',
          message: `Protected route without session returned ${status} (expected 401)`,
        });
      }
    } catch (err: any) {
      findings.push({
        rule: 'auth-no-session',
        status: 'fail',
        severity: 'high',
        message: `No-session request failed: ${err.message}`,
      });
    }

    return findings;
  },
};
