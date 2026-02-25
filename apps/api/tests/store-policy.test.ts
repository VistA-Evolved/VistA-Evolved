/**
 * Store Policy Tests — Phase 136
 *
 * Validates the store-policy module inventory, classification,
 * and query helpers work correctly.
 */

import { describe, it, expect } from "vitest";
import {
  STORE_INVENTORY,
  getStoresByClassification,
  getStoresByDomain,
  getCriticalInMemoryStores,
  getCacheStoresWithoutLimits,
  getStoreInventorySummary,
} from "../src/platform/store-policy.js";

describe("Store Policy — Phase 136", () => {
  describe("Inventory completeness", () => {
    it("has at least 80 store entries", () => {
      expect(STORE_INVENTORY.length).toBeGreaterThanOrEqual(80);
    });

    it("every entry has required fields", () => {
      for (const entry of STORE_INVENTORY) {
        expect(entry.id).toBeTruthy();
        expect(entry.file).toBeTruthy();
        expect(entry.variable).toBeTruthy();
        expect(entry.description).toBeTruthy();
        expect(entry.classification).toBeTruthy();
        expect(entry.durability).toBeTruthy();
        expect(entry.domain).toBeTruthy();
      }
    });

    it("has no duplicate IDs", () => {
      const ids = STORE_INVENTORY.map((e) => e.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it("uses valid classification values", () => {
      const validClassifications = [
        "critical",
        "cache",
        "rate_limiter",
        "registry",
        "audit",
        "dev_only",
      ];
      for (const entry of STORE_INVENTORY) {
        expect(validClassifications).toContain(entry.classification);
      }
    });

    it("uses valid durability values", () => {
      const validDurabilities = [
        "pg_backed",
        "sqlite_backed",
        "jsonl_backed",
        "file_seeded",
        "vista_passthrough",
        "in_memory_only",
        "env_gated",
      ];
      for (const entry of STORE_INVENTORY) {
        expect(validDurabilities).toContain(entry.durability);
      }
    });
  });

  describe("Classification queries", () => {
    it("getStoresByClassification returns correct entries", () => {
      const critical = getStoresByClassification("critical");
      expect(critical.length).toBeGreaterThan(0);
      expect(critical.every((s) => s.classification === "critical")).toBe(true);

      const caches = getStoresByClassification("cache");
      expect(caches.length).toBeGreaterThan(0);
      expect(caches.every((s) => s.classification === "cache")).toBe(true);
    });

    it("getStoresByDomain returns correct entries", () => {
      const rcm = getStoresByDomain("rcm");
      expect(rcm.length).toBeGreaterThan(10);
      expect(rcm.every((s) => s.domain === "rcm")).toBe(true);

      const portal = getStoresByDomain("portal");
      expect(portal.length).toBeGreaterThan(5);
      expect(portal.every((s) => s.domain === "portal")).toBe(true);
    });
  });

  describe("Policy enforcement", () => {
    it("getCriticalInMemoryStores returns only critical+in_memory_only", () => {
      const violations = getCriticalInMemoryStores();
      for (const v of violations) {
        expect(v.classification).toBe("critical");
        expect(v.durability).toBe("in_memory_only");
      }
    });

    it("all critical+in_memory_only stores have migrationTarget", () => {
      const violations = getCriticalInMemoryStores();
      for (const v of violations) {
        expect(v.migrationTarget).toBeTruthy();
      }
    });

    it("getCacheStoresWithoutLimits identifies unbounded caches", () => {
      const unbounded = getCacheStoresWithoutLimits();
      for (const u of unbounded) {
        expect(u.classification).toBe("cache");
        // These should have NEITHER ttlMs > 0 NOR maxSize > 0
        const hasTtl = u.ttlMs !== undefined && u.ttlMs > 0;
        const hasMaxSize = u.maxSize !== undefined && u.maxSize > 0;
        expect(hasTtl || hasMaxSize).toBe(false);
      }
    });
  });

  describe("Summary report", () => {
    it("getStoreInventorySummary has correct structure", () => {
      const summary = getStoreInventorySummary();
      expect(summary.total).toBe(STORE_INVENTORY.length);
      expect(summary.byClassification).toBeDefined();
      expect(summary.byDurability).toBeDefined();
      expect(summary.byDomain).toBeDefined();
      expect(typeof summary.criticalInMemoryCount).toBe("number");
      expect(typeof summary.cacheWithoutLimitsCount).toBe("number");
      expect(Array.isArray(summary.policyViolations)).toBe(true);
    });

    it("summary classification counts sum to total", () => {
      const summary = getStoreInventorySummary();
      const classSum = Object.values(summary.byClassification).reduce(
        (a, b) => a + b,
        0
      );
      expect(classSum).toBe(summary.total);
    });

    it("summary durability counts sum to total", () => {
      const summary = getStoreInventorySummary();
      const durSum = Object.values(summary.byDurability).reduce(
        (a, b) => a + b,
        0
      );
      expect(durSum).toBe(summary.total);
    });
  });

  describe("Domain coverage", () => {
    const expectedDomains = [
      "auth",
      "portal",
      "rcm",
      "imaging",
      "telehealth",
      "scheduling",
      "clinical",
      "infrastructure",
    ];

    for (const domain of expectedDomains) {
      it(`has stores for domain: ${domain}`, () => {
        const domainStores = getStoresByDomain(domain);
        expect(domainStores.length).toBeGreaterThan(0);
      });
    }
  });

  describe("Cache stores have limits", () => {
    it("most cache stores declare TTL or maxSize", () => {
      const caches = getStoresByClassification("cache");
      const withLimits = caches.filter(
        (s) =>
          (s.ttlMs !== undefined && s.ttlMs > 0) ||
          (s.maxSize !== undefined && s.maxSize > 0)
      );
      // Allow a small number without limits (e.g., rpcMetrics accumulator)
      const ratio = withLimits.length / caches.length;
      expect(ratio).toBeGreaterThan(0.7);
    });
  });
});
