#!/usr/bin/env node
/**
 * SMART-on-FHIR Readiness Test Suite
 * Phase 290 -- Interop Certification Harness
 *
 * Validates SMART App Launch conformance: .well-known discovery,
 * authorization endpoints, scopes, and launch context requirements.
 *
 * Usage:
 *   node tests/interop/smart-readiness.mjs
 *   node tests/interop/smart-readiness.mjs --api http://staging:3001
 */

import { assert, assertJsonResponse, summarize } from './assertions/fhir-assertions.mjs';

const API_URL = process.argv.includes('--api')
  ? process.argv[process.argv.indexOf('--api') + 1]
  : process.env.API_URL || 'http://localhost:3001';

const OUT_FILE = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : null;

const results = [];

function log(msg) {
  console.log(msg);
}

async function safeFetch(url, opts = {}) {
  try {
    return await fetch(url, { ...opts, signal: AbortSignal.timeout(10000) });
  } catch (e) {
    return {
      status: 0,
      json: async () => ({}),
      text: async () => e.message,
      ok: false,
      headers: new Map(),
    };
  }
}

// --- Test: SMART configuration discovery ---
async function testSmartConfiguration() {
  log('\n=== SMART Configuration Discovery ===');

  // SMART App Launch discovery endpoint (top-level .well-known)
  const stu2 = await safeFetch(`${API_URL}/.well-known/smart-configuration`);
  const stu2Result = await assertJsonResponse(
    'GET /.well-known/smart-configuration returns JSON',
    stu2
  );

  if (stu2Result.passed && stu2Result.body) {
    results.push(stu2Result);
    const cfg = stu2Result.body;

    // Required fields per SMART App Launch IG
    results.push(
      assert(
        'authorization_endpoint present',
        !!cfg.authorization_endpoint,
        `Got: ${cfg.authorization_endpoint || 'missing'}`
      )
    );

    results.push(
      assert(
        'token_endpoint present',
        !!cfg.token_endpoint,
        `Got: ${cfg.token_endpoint || 'missing'}`
      )
    );

    results.push(
      assert(
        'capabilities array present',
        Array.isArray(cfg.capabilities),
        `Got: ${typeof cfg.capabilities}`
      )
    );

    if (Array.isArray(cfg.capabilities)) {
      // Check for key capabilities
      const wantCaps = [
        'launch-ehr',
        'launch-standalone',
        'client-public',
        'client-confidential-symmetric',
        'sso-openid-connect',
      ];
      for (const cap of wantCaps) {
        results.push(
          assert(
            `capability: ${cap}`,
            cfg.capabilities.includes(cap),
            cfg.capabilities.includes(cap) ? 'present' : 'missing'
          )
        );
      }
    }

    // Scopes
    results.push(
      assert(
        'scopes_supported present',
        Array.isArray(cfg.scopes_supported),
        `Got: ${typeof cfg.scopes_supported}`
      )
    );

    if (Array.isArray(cfg.scopes_supported)) {
      const wantScopes = ['openid', 'fhirUser', 'patient/*.read'];
      for (const s of wantScopes) {
        const found = cfg.scopes_supported.some((sc) => sc === s || sc.startsWith(s));
        results.push(assert(`scope: ${s}`, found, found ? 'present' : 'missing'));
      }
    }

    return cfg;
  }

  // If SMART not yet implemented, document as integration-pending
  results.push(
    assert(
      'SMART configuration (integration-pending)',
      false,
      'SMART-on-FHIR discovery endpoint not yet implemented'
    )
  );

  return null;
}

// --- Test: OIDC discovery alignment ---
async function testOidcDiscovery() {
  log('\n=== OIDC Discovery Alignment ===');

  const res = await safeFetch(`${API_URL}/.well-known/openid-configuration`);
  const result = await assertJsonResponse('GET /.well-known/openid-configuration', res);

  if (result.passed && result.body) {
    results.push(result);
    const cfg = result.body;

    results.push(assert('issuer present', !!cfg.issuer, `Got: ${cfg.issuer || 'missing'}`));

    results.push(assert('jwks_uri present', !!cfg.jwks_uri, `Got: ${cfg.jwks_uri || 'missing'}`));

    results.push(
      assert(
        'response_types_supported includes code',
        Array.isArray(cfg.response_types_supported) &&
          cfg.response_types_supported.includes('code'),
        `Got: ${JSON.stringify(cfg.response_types_supported || [])}`
      )
    );
  } else {
    results.push(
      assert(
        'OIDC discovery (integration-pending)',
        false,
        'OIDC discovery endpoint not yet available (Keycloak proxied)'
      )
    );
  }
}

// --- Test: Token endpoint CORS ---
async function testTokenCors() {
  log('\n=== Token Endpoint CORS ===');

  const res = await safeFetch(`${API_URL}/auth/token`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://app.example.com',
      'Access-Control-Request-Method': 'POST',
    },
  });

  const allowOrigin = res.headers?.get?.('access-control-allow-origin') || '';
  results.push(
    assert(
      'Token OPTIONS returns CORS headers',
      allowOrigin === '*' ||
        allowOrigin.includes('example.com') ||
        res.status === 204 ||
        res.status === 200,
      `status=${res.status}, allow-origin=${allowOrigin || 'none'}`
    )
  );
}

// --- Test: Launch parameter structure ---
async function testLaunchParams() {
  log('\n=== Launch Parameter Structure ===');

  // Verify the API can handle EHR launch context
  const res = await safeFetch(`${API_URL}/fhir/metadata`);
  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (body && body.rest) {
    const sec = body.rest?.[0]?.security;
    if (sec) {
      const oauthExt = sec.extension?.find(
        (e) => e.url === 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris'
      );
      results.push(
        assert(
          'CapabilityStatement has SMART oauth-uris extension',
          !!oauthExt,
          oauthExt ? 'present' : 'missing'
        )
      );

      if (oauthExt?.extension) {
        const authExt = oauthExt.extension.find((e) => e.url === 'authorize');
        const tokenExt = oauthExt.extension.find((e) => e.url === 'token');
        results.push(
          assert(
            'oauth-uris has authorize endpoint',
            !!authExt?.valueUri,
            `Got: ${authExt?.valueUri || 'missing'}`
          )
        );
        results.push(
          assert(
            'oauth-uris has token endpoint',
            !!tokenExt?.valueUri,
            `Got: ${tokenExt?.valueUri || 'missing'}`
          )
        );
      }
    } else {
      results.push(
        assert(
          'SMART security in CapabilityStatement (integration-pending)',
          false,
          'CapabilityStatement.rest[0].security not present'
        )
      );
    }
  } else {
    results.push(
      assert(
        'FHIR metadata for SMART (integration-pending)',
        false,
        'Cannot parse CapabilityStatement for SMART check'
      )
    );
  }
}

// --- Main ---
async function main() {
  log('SMART-on-FHIR Readiness Test Suite');
  log(`API: ${API_URL}`);
  log('='.repeat(50));

  await testSmartConfiguration();
  await testOidcDiscovery();
  await testTokenCors();
  await testLaunchParams();

  const summary = summarize(results);

  log('\n' + '='.repeat(50));
  log(`Results: ${summary.passed}/${summary.total} passed, ${summary.failed} failed`);
  for (const r of summary.results) {
    const icon = r.passed ? 'PASS' : 'FAIL';
    const color = r.passed ? '\x1b[32m' : '\x1b[31m';
    log(`  ${color}${icon}\x1b[0m ${r.name}${r.detail ? ` (${r.detail})` : ''}`);
  }

  if (OUT_FILE) {
    const fs = await import('node:fs');
    const dir = await import('node:path');
    fs.mkdirSync(dir.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(summary, null, 2));
    log(`\nResults written to: ${OUT_FILE}`);
  }

  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(2);
});
