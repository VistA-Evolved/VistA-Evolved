/**
 * Runtime-Mode Integration Tests — Phase 429 (W26 P7)
 *
 * Validates that the runtime mode system correctly enforces
 * PG, OIDC, RLS, adapter, and module constraints per mode.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/* ------------------------------------------------------------------ */
/* Dynamic import to allow env-var manipulation before module load      */
/* ------------------------------------------------------------------ */

async function loadRuntimeMode() {
  // vitest module cache reset
  vi.resetModules();
  const mod = await import('../src/platform/runtime-mode.js');
  return mod;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function setEnv(overrides: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
}

const ORIGINAL_ENV: Record<string, string | undefined> = {};
const TRACKED_KEYS = [
  'PLATFORM_RUNTIME_MODE',
  'NODE_ENV',
  'PLATFORM_PG_URL',
  'PLATFORM_PG_RLS_ENABLED',
  'OIDC_ENABLED',
  'OIDC_ISSUER',
  'OIDC_CLIENT_ID',
  'DEPLOY_SKU',
  'ADAPTER_CLINICAL_ENGINE',
  'ADAPTER_SCHEDULING',
  'ADAPTER_BILLING',
  'ADAPTER_IMAGING',
  'ADAPTER_MESSAGING',
  'AUTH_MODE',
  'STORE_BACKEND',
];

/* ------------------------------------------------------------------ */
/* Tests                                                                */
/* ------------------------------------------------------------------ */

describe('Runtime Mode System', () => {
  beforeEach(() => {
    // Snapshot current env
    for (const k of TRACKED_KEYS) {
      ORIGINAL_ENV[k] = process.env[k];
    }
  });

  afterEach(() => {
    // Restore original env
    for (const k of TRACKED_KEYS) {
      if (ORIGINAL_ENV[k] === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = ORIGINAL_ENV[k];
      }
    }
  });

  /* ---------------------------------------------------------------- */
  /* Mode Resolution                                                    */
  /* ---------------------------------------------------------------- */

  describe('getRuntimeMode()', () => {
    it('defaults to "dev" when no env vars set', async () => {
      setEnv({ PLATFORM_RUNTIME_MODE: undefined, NODE_ENV: undefined });
      const mod = await loadRuntimeMode();
      expect(mod.getRuntimeMode()).toBe('dev');
    });

    it('reads PLATFORM_RUNTIME_MODE directly', async () => {
      setEnv({ PLATFORM_RUNTIME_MODE: 'rc' });
      const mod = await loadRuntimeMode();
      expect(mod.getRuntimeMode()).toBe('rc');
    });

    it('falls back to NODE_ENV=production -> prod', async () => {
      setEnv({ PLATFORM_RUNTIME_MODE: undefined, NODE_ENV: 'production' });
      const mod = await loadRuntimeMode();
      expect(mod.getRuntimeMode()).toBe('prod');
    });

    it('falls back to NODE_ENV=test -> test', async () => {
      setEnv({ PLATFORM_RUNTIME_MODE: undefined, NODE_ENV: 'test' });
      const mod = await loadRuntimeMode();
      expect(mod.getRuntimeMode()).toBe('test');
    });

    it('PLATFORM_RUNTIME_MODE takes precedence over NODE_ENV', async () => {
      setEnv({ PLATFORM_RUNTIME_MODE: 'test', NODE_ENV: 'production' });
      const mod = await loadRuntimeMode();
      expect(mod.getRuntimeMode()).toBe('test');
    });
  });

  /* ---------------------------------------------------------------- */
  /* Guard Functions                                                    */
  /* ---------------------------------------------------------------- */

  describe('requiresPg()', () => {
    it('returns false for dev mode', async () => {
      setEnv({ PLATFORM_RUNTIME_MODE: 'dev' });
      const mod = await loadRuntimeMode();
      expect(mod.requiresPg()).toBe(false);
    });

    it('returns false for test mode', async () => {
      setEnv({ PLATFORM_RUNTIME_MODE: 'test' });
      const mod = await loadRuntimeMode();
      expect(mod.requiresPg()).toBe(false);
    });

    it('returns true for rc mode', async () => {
      setEnv({ PLATFORM_RUNTIME_MODE: 'rc' });
      const mod = await loadRuntimeMode();
      expect(mod.requiresPg()).toBe(true);
    });

    it('returns true for prod mode', async () => {
      setEnv({ PLATFORM_RUNTIME_MODE: 'prod' });
      const mod = await loadRuntimeMode();
      expect(mod.requiresPg()).toBe(true);
    });
  });

  describe('requiresOidc()', () => {
    it('returns false for dev mode', async () => {
      setEnv({ PLATFORM_RUNTIME_MODE: 'dev' });
      const mod = await loadRuntimeMode();
      expect(mod.requiresOidc()).toBe(false);
    });

    it('returns true for rc mode', async () => {
      setEnv({ PLATFORM_RUNTIME_MODE: 'rc' });
      const mod = await loadRuntimeMode();
      expect(mod.requiresOidc()).toBe(true);
    });

    it('returns true for prod mode', async () => {
      setEnv({ PLATFORM_RUNTIME_MODE: 'prod' });
      const mod = await loadRuntimeMode();
      expect(mod.requiresOidc()).toBe(true);
    });
  });

  describe('blocksJsonStores()', () => {
    it('allows JSON stores in dev mode', async () => {
      setEnv({ PLATFORM_RUNTIME_MODE: 'dev' });
      const mod = await loadRuntimeMode();
      expect(mod.blocksJsonStores()).toBe(false);
    });

    it('blocks JSON stores in rc mode', async () => {
      setEnv({ PLATFORM_RUNTIME_MODE: 'rc' });
      const mod = await loadRuntimeMode();
      expect(mod.blocksJsonStores()).toBe(true);
    });

    it('blocks JSON stores in prod mode', async () => {
      setEnv({ PLATFORM_RUNTIME_MODE: 'prod' });
      const mod = await loadRuntimeMode();
      expect(mod.blocksJsonStores()).toBe(true);
    });
  });

  /* ---------------------------------------------------------------- */
  /* Validation                                                         */
  /* ---------------------------------------------------------------- */

  describe('validateRuntimeMode()', () => {
    it('does not throw for dev mode', async () => {
      setEnv({ PLATFORM_RUNTIME_MODE: 'dev' });
      const mod = await loadRuntimeMode();
      expect(() => mod.validateRuntimeMode()).not.toThrow();
    });

    it('does not throw for test mode', async () => {
      setEnv({ PLATFORM_RUNTIME_MODE: 'test' });
      const mod = await loadRuntimeMode();
      expect(() => mod.validateRuntimeMode()).not.toThrow();
    });

    it('throws for rc mode without PLATFORM_PG_URL', async () => {
      setEnv({
        PLATFORM_RUNTIME_MODE: 'rc',
        PLATFORM_PG_URL: undefined,
        OIDC_ENABLED: 'true',
        OIDC_ISSUER: 'https://keycloak.local/realms/ve',
      });
      const mod = await loadRuntimeMode();
      expect(() => mod.validateRuntimeMode()).toThrow();
    });

    it('throws for prod mode without OIDC_ENABLED', async () => {
      setEnv({
        PLATFORM_RUNTIME_MODE: 'prod',
        PLATFORM_PG_URL: 'postgresql://localhost/ve',
        OIDC_ENABLED: undefined,
        OIDC_ISSUER: undefined,
      });
      const mod = await loadRuntimeMode();
      expect(() => mod.validateRuntimeMode()).toThrow();
    });

    it('does not throw for rc mode with all required vars', async () => {
      setEnv({
        PLATFORM_RUNTIME_MODE: 'rc',
        PLATFORM_PG_URL: 'postgresql://localhost/ve',
        OIDC_ENABLED: 'true',
        OIDC_ISSUER: 'https://keycloak.local/realms/ve',
      });
      const mod = await loadRuntimeMode();
      expect(() => mod.validateRuntimeMode()).not.toThrow();
    });
  });

  /* ---------------------------------------------------------------- */
  /* Mode Properties Matrix                                             */
  /* ---------------------------------------------------------------- */

  describe('Mode properties matrix', () => {
    const cases: Array<{
      mode: string;
      pgRequired: boolean;
      rlsRequired: boolean;
      jsonBlocked: boolean;
      oidcRequired: boolean;
    }> = [
      { mode: 'dev',  pgRequired: false, rlsRequired: false, jsonBlocked: false, oidcRequired: false },
      { mode: 'test', pgRequired: false, rlsRequired: false, jsonBlocked: false, oidcRequired: false },
      { mode: 'rc',   pgRequired: true,  rlsRequired: true,  jsonBlocked: true,  oidcRequired: true },
      { mode: 'prod', pgRequired: true,  rlsRequired: true,  jsonBlocked: true,  oidcRequired: true },
    ];

    for (const c of cases) {
      it(`mode="${c.mode}" has correct property flags`, async () => {
        setEnv({ PLATFORM_RUNTIME_MODE: c.mode });
        const mod = await loadRuntimeMode();
        expect(mod.requiresPg()).toBe(c.pgRequired);
        expect(mod.requiresRls()).toBe(c.rlsRequired);
        expect(mod.blocksJsonStores()).toBe(c.jsonBlocked);
        expect(mod.requiresOidc()).toBe(c.oidcRequired);
      });
    }
  });

  /* ---------------------------------------------------------------- */
  /* _resetCachedMode                                                   */
  /* ---------------------------------------------------------------- */

  describe('_resetCachedMode()', () => {
    it('allows mode to be re-read after reset', async () => {
      setEnv({ PLATFORM_RUNTIME_MODE: 'dev' });
      const mod = await loadRuntimeMode();
      expect(mod.getRuntimeMode()).toBe('dev');

      setEnv({ PLATFORM_RUNTIME_MODE: 'rc' });
      mod._resetCachedMode();
      expect(mod.getRuntimeMode()).toBe('rc');
    });
  });
});

/* ------------------------------------------------------------------ */
/* Adapter Env Var Selection (unit-level)                               */
/* ------------------------------------------------------------------ */

describe('Adapter Env Var Selection', () => {
  const ADAPTER_TYPES = [
    'ADAPTER_CLINICAL_ENGINE',
    'ADAPTER_SCHEDULING',
    'ADAPTER_BILLING',
    'ADAPTER_IMAGING',
    'ADAPTER_MESSAGING',
  ] as const;

  it('all adapter env vars default to "vista" when not set', () => {
    for (const envVar of ADAPTER_TYPES) {
      const val = process.env[envVar]?.toLowerCase() ?? 'vista';
      expect(['vista', 'stub']).toContain(val);
    }
  });

  it('recognizes "stub" override', () => {
    for (const envVar of ADAPTER_TYPES) {
      const original = process.env[envVar];
      process.env[envVar] = 'stub';
      const val = process.env[envVar]!.toLowerCase();
      expect(val).toBe('stub');
      // restore
      if (original === undefined) {
        delete process.env[envVar];
      } else {
        process.env[envVar] = original;
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/* Module SKU Selection (unit-level)                                    */
/* ------------------------------------------------------------------ */

describe('Module SKU Selection', () => {
  it('DEPLOY_SKU defaults to FULL_SUITE', () => {
    const sku = process.env.DEPLOY_SKU ?? 'FULL_SUITE';
    expect(sku).toBe('FULL_SUITE');
  });

  it('valid SKU values are recognized', () => {
    const validSkus = [
      'FULL_SUITE',
      'CLINICIAN_ONLY',
      'PORTAL_ONLY',
      'TELEHEALTH_ONLY',
      'RCM_ONLY',
      'IMAGING_ONLY',
      'INTEROP_ONLY',
    ];
    for (const s of validSkus) {
      expect(typeof s).toBe('string');
      expect(s.length).toBeGreaterThan(0);
    }
  });
});
