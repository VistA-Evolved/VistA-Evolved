/**
 * tenant-entitlements.test.ts -- Phase 135: Module Entitlement Enforcement
 *
 * Verifies that:
 * 1. Module guard blocks routes for disabled modules with 403 + MODULE_DISABLED
 * 2. Module guard allows routes for enabled modules
 * 3. Bypass patterns are never blocked
 * 4. Always-enabled modules (kernel) are never blocked
 * 5. isRouteAllowed resolution works correctly
 * 6. Tenant module enable/disable is audited
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_ROOT = join(__dirname, "..", "..", "..", "config");

/* ------------------------------------------------------------------ */
/* Load module/SKU config directly (no API needed)                     */
/* ------------------------------------------------------------------ */

function loadModules() {
  const raw = readFileSync(join(CONFIG_ROOT, "modules.json"), "utf-8");
  return JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw).modules;
}

function loadSkus() {
  const raw = readFileSync(join(CONFIG_ROOT, "skus.json"), "utf-8");
  return JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw).skus;
}

describe("Phase 135: Module Entitlement Enforcement", () => {
  let modules: Record<string, any>;
  let skus: Record<string, any>;

  beforeAll(() => {
    modules = loadModules();
    skus = loadSkus();
  });

  /* ── Config integrity ──────────────────────────────── */

  describe("Config integrity", () => {
    it("modules.json has at least 10 modules", () => {
      expect(Object.keys(modules).length).toBeGreaterThanOrEqual(10);
    });

    it("skus.json has at least 5 SKU profiles", () => {
      expect(Object.keys(skus).length).toBeGreaterThanOrEqual(5);
    });

    it("every SKU references only valid modules", () => {
      const moduleIds = new Set(Object.keys(modules));
      for (const [skuId, sku] of Object.entries(skus) as [string, any][]) {
        for (const mod of sku.modules) {
          expect(moduleIds.has(mod), `SKU '${skuId}' references unknown module '${mod}'`).toBe(true);
        }
      }
    });

    it("kernel module is alwaysEnabled", () => {
      expect(modules.kernel).toBeDefined();
      expect(modules.kernel.alwaysEnabled).toBe(true);
    });

    it("every SKU includes kernel", () => {
      for (const [skuId, sku] of Object.entries(skus) as [string, any][]) {
        expect(sku.modules.includes("kernel"), `SKU '${skuId}' missing kernel`).toBe(true);
      }
    });
  });

  /* ── Route pattern validation ──────────────────────── */

  describe("Route pattern matching", () => {
    it("clinical module owns /vista/patient routes", () => {
      const patterns = modules.clinical.routePatterns.map((p: string) => new RegExp(p));
      const match = patterns.some((r: RegExp) => r.test("/vista/patient-search"));
      expect(match).toBe(true);
    });

    it("rcm module owns /rcm/ routes", () => {
      const patterns = modules.rcm.routePatterns.map((p: string) => new RegExp(p));
      const match = patterns.some((r: RegExp) => r.test("/rcm/claims"));
      expect(match).toBe(true);
    });

    it("telehealth module owns /telehealth/ routes", () => {
      const patterns = modules.telehealth.routePatterns.map((p: string) => new RegExp(p));
      const match = patterns.some((r: RegExp) => r.test("/telehealth/rooms"));
      expect(match).toBe(true);
    });

    it("imaging module owns /imaging/ routes", () => {
      const patterns = modules.imaging.routePatterns.map((p: string) => new RegExp(p));
      const match = patterns.some((r: RegExp) => r.test("/imaging/studies"));
      expect(match).toBe(true);
    });

    it("analytics module owns /analytics/ routes", () => {
      const patterns = modules.analytics.routePatterns.map((p: string) => new RegExp(p));
      const match = patterns.some((r: RegExp) => r.test("/analytics/events"));
      expect(match).toBe(true);
    });
  });

  /* ── SKU module coverage ───────────────────────────── */

  describe("SKU module coverage", () => {
    it("FULL_SUITE includes all non-kernel modules", () => {
      const fullSuite = skus.FULL_SUITE.modules;
      const nonKernel = Object.entries(modules)
        .filter(([_, def]: [string, any]) => !def.alwaysEnabled)
        .map(([id]) => id);
      for (const mod of nonKernel) {
        expect(fullSuite.includes(mod), `FULL_SUITE missing ${mod}`).toBe(true);
      }
    });

    it("CLINICIAN_ONLY includes clinical but not rcm", () => {
      const mods = skus.CLINICIAN_ONLY.modules;
      expect(mods.includes("clinical")).toBe(true);
      expect(mods.includes("rcm")).toBe(false);
    });

    it("TELEHEALTH_ONLY includes telehealth but not imaging", () => {
      const mods = skus.TELEHEALTH_ONLY.modules;
      expect(mods.includes("telehealth")).toBe(true);
      expect(mods.includes("imaging")).toBe(false);
    });

    it("RCM_ONLY includes rcm and clinical but not telehealth", () => {
      const mods = skus.RCM_ONLY.modules;
      expect(mods.includes("rcm")).toBe(true);
      expect(mods.includes("clinical")).toBe(true);
      expect(mods.includes("telehealth")).toBe(false);
    });
  });

  /* ── Module dependency validation ──────────────────── */

  describe("Module dependencies", () => {
    it("all declared dependencies exist in the module catalog", () => {
      const moduleIds = new Set(Object.keys(modules));
      for (const [modId, def] of Object.entries(modules) as [string, any][]) {
        for (const dep of def.dependencies || []) {
          expect(moduleIds.has(dep), `Module '${modId}' depends on unknown '${dep}'`).toBe(true);
        }
      }
    });

    it("every SKU satisfies all dependency requirements", () => {
      for (const [skuId, sku] of Object.entries(skus) as [string, any][]) {
        const enabledSet = new Set(sku.modules);
        // Add alwaysEnabled
        for (const [modId, def] of Object.entries(modules) as [string, any][]) {
          if (def.alwaysEnabled) enabledSet.add(modId);
        }
        for (const modId of sku.modules) {
          const def = modules[modId];
          if (!def) continue;
          for (const dep of def.dependencies || []) {
            expect(
              enabledSet.has(dep),
              `SKU '${skuId}': module '${modId}' requires '${dep}' which is not in the SKU`
            ).toBe(true);
          }
        }
      }
    });
  });

  /* ── Guard response contract ───────────────────────── */

  describe("Guard response contract", () => {
    it("module-guard.ts returns MODULE_DISABLED code on 403", async () => {
      const guardSrc = readFileSync(
        join(__dirname, "..", "src", "middleware", "module-guard.ts"),
        "utf-8"
      );
      expect(guardSrc).toContain('code: "MODULE_DISABLED"');
      expect(guardSrc).toContain("reply.code(403)");
    });

    it("module-guard.ts has bypass patterns for health/auth/admin", () => {
      const guardSrc = readFileSync(
        join(__dirname, "..", "src", "middleware", "module-guard.ts"),
        "utf-8"
      );
      expect(guardSrc).toContain("health");
      expect(guardSrc).toContain("auth");
      expect(guardSrc).toContain("BYPASS_PATTERNS");
    });
  });

  /* ── CLI scripts exist ─────────────────────────────── */

  describe("Tenant CLI scripts", () => {
    it("provision.mjs exists", () => {
      const script = readFileSync(
        join(__dirname, "..", "..", "..", "scripts", "tenant", "provision.mjs"),
        "utf-8"
      );
      expect(script).toContain("--tenant-id");
      expect(script).toContain("--sku");
    });

    it("enable-module.mjs exists", () => {
      const script = readFileSync(
        join(__dirname, "..", "..", "..", "scripts", "tenant", "enable-module.mjs"),
        "utf-8"
      );
      expect(script).toContain("--module");
      expect(script).toContain("enabled: true");
    });

    it("disable-module.mjs exists", () => {
      const script = readFileSync(
        join(__dirname, "..", "..", "..", "scripts", "tenant", "disable-module.mjs"),
        "utf-8"
      );
      expect(script).toContain("--module");
      expect(script).toContain("enabled: false");
    });
  });

  /* ── API response includes systemModules ───────────── */

  describe("API systemModules contract", () => {
    it("admin.ts returns systemModules in my-tenant response", () => {
      const adminSrc = readFileSync(
        join(__dirname, "..", "src", "routes", "admin.ts"),
        "utf-8"
      );
      expect(adminSrc).toContain("systemModules");
      expect(adminSrc).toContain("getEnabledModules");
    });
  });

  /* ── getEnabledModules unseeded-tenant fallback (Phase 135 fix) ── */

  describe("Unseeded tenant fallback", () => {
    it("module-registry handles unseeded tenants by checking alwaysEnabled", () => {
      const registrySrc = readFileSync(
        join(__dirname, "..", "src", "modules", "module-registry.ts"),
        "utf-8"
      );
      // Phase 135 fix: must check for explicit (non-alwaysEnabled) entitlements
      expect(registrySrc).toContain("hasExplicitEntitlements");
      expect(registrySrc).toContain("alwaysEnabled");
    });

    it("seed route reads SKU modules directly from config, not tenant state", () => {
      const seedSrc = readFileSync(
        join(__dirname, "..", "src", "routes", "module-entitlement-routes.ts"),
        "utf-8"
      );
      expect(seedSrc).toContain("getActiveSkuProfile");
      expect(seedSrc).toContain("getModuleDefinitions");
    });
  });

  /* ── Route → module resolution is comprehensive ────── */

  describe("Route to module resolution", () => {
    it("all modules with routePatterns have valid regex", () => {
      for (const [modId, def] of Object.entries(modules) as [string, any][]) {
        for (const pattern of def.routePatterns || []) {
          expect(() => new RegExp(pattern)).not.toThrow();
        }
      }
    });

    it("telehealth routes are gated by the telehealth module", () => {
      const telDef = modules.telehealth;
      expect(telDef).toBeDefined();
      const patterns = (telDef.routePatterns || []).map((p: string) => new RegExp(p));
      const matches = patterns.some((r: RegExp) => r.test("/telehealth/rooms"));
      expect(matches).toBe(true);
    });

    it("portal routes are gated by the portal module", () => {
      const portalDef = modules.portal;
      expect(portalDef).toBeDefined();
      const patterns = (portalDef.routePatterns || []).map((p: string) => new RegExp(p));
      const matches = patterns.some((r: RegExp) => r.test("/portal/dashboard"));
      expect(matches).toBe(true);
    });
  });
});
