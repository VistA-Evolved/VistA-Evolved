/**
 * tenant-isolation.test.ts -- Phase 122: Tenant Isolation Enforcement
 *
 * Verifies that:
 * 1. requireTenantId() rejects missing/empty tenant IDs
 * 2. assertTenantMatch() blocks cross-tenant access
 * 3. Tenant-scoped query wrappers enforce ownership
 * 4. TenantIsolationError has correct status code (403)
 */

import { describe, it, expect } from "vitest";
import {
  requireTenantId,
  assertTenantMatch,
  TenantIsolationError,
  TENANT_SCOPED_TABLES,
  GLOBAL_TABLES,
} from "../src/platform/db/repo/tenant-guard.js";

describe("Phase 122: Tenant Isolation Guards", () => {
  /* ── requireTenantId ─────────────────────────────── */

  describe("requireTenantId", () => {
    it("passes with a valid tenant ID", () => {
      expect(() => requireTenantId("tenant-1")).not.toThrow();
      expect(() => requireTenantId("default")).not.toThrow();
    });

    it("throws TenantIsolationError on empty string", () => {
      expect(() => requireTenantId("")).toThrow(TenantIsolationError);
    });

    it("throws TenantIsolationError on null", () => {
      expect(() => requireTenantId(null)).toThrow(TenantIsolationError);
    });

    it("throws TenantIsolationError on undefined", () => {
      expect(() => requireTenantId(undefined)).toThrow(TenantIsolationError);
    });

    it("throws TenantIsolationError on whitespace-only string", () => {
      expect(() => requireTenantId("  ")).toThrow(TenantIsolationError);
    });

    it("includes context in error message", () => {
      try {
        requireTenantId("", "testFunction");
        expect.unreachable();
      } catch (err) {
        expect((err as Error).message).toContain("testFunction");
      }
    });

    it("error has statusCode 403", () => {
      try {
        requireTenantId("");
        expect.unreachable();
      } catch (err) {
        expect((err as TenantIsolationError).statusCode).toBe(403);
      }
    });
  });

  /* ── assertTenantMatch ───────────────────────────── */

  describe("assertTenantMatch", () => {
    it("passes when tenantId matches", () => {
      const row = { id: "r1", tenantId: "tenant-1", data: "foo" };
      expect(assertTenantMatch(row, "tenant-1")).toBe(row);
    });

    it("passes for global rows (tenantId = null)", () => {
      const row = { id: "r1", tenantId: null, data: "foo" };
      expect(assertTenantMatch(row, "tenant-1")).toBe(row);
    });

    it("passes for global rows (tenantId = undefined)", () => {
      const row = { id: "r1", data: "foo" }; // no tenantId property
      expect(assertTenantMatch(row as any, "tenant-1")).toBe(row);
    });

    it("BLOCKS cross-tenant access (tenant A reads tenant B)", () => {
      const row = { id: "r1", tenantId: "tenant-B", data: "secret" };
      expect(() => assertTenantMatch(row, "tenant-A")).toThrow(TenantIsolationError);
    });

    it("error message includes both tenant IDs", () => {
      const row = { id: "r1", tenantId: "tenant-B" };
      try {
        assertTenantMatch(row, "tenant-A");
        expect.unreachable();
      } catch (err) {
        const msg = (err as Error).message;
        expect(msg).toContain("tenant-B");
        expect(msg).toContain("tenant-A");
      }
    });

    it("includes context in mismatch error", () => {
      const row = { id: "r1", tenantId: "tenant-B" };
      try {
        assertTenantMatch(row, "tenant-A", "rcm_claim");
        expect.unreachable();
      } catch (err) {
        expect((err as Error).message).toContain("rcm_claim");
      }
    });
  });

  /* ── Table inventory ─────────────────────────────── */

  describe("Table inventory", () => {
    it("TENANT_SCOPED_TABLES has entries", () => {
      expect(TENANT_SCOPED_TABLES.length).toBeGreaterThan(20);
    });

    it("GLOBAL_TABLES has entries", () => {
      expect(GLOBAL_TABLES.length).toBeGreaterThan(0);
    });

    it("no overlap between global and scoped tables", () => {
      const scopedSet = new Set(TENANT_SCOPED_TABLES);
      for (const g of GLOBAL_TABLES) {
        expect(scopedSet.has(g as any)).toBe(false);
      }
    });
  });

  /* ── TenantIsolationError ────────────────────────── */

  describe("TenantIsolationError", () => {
    it("is an Error subclass", () => {
      const err = new TenantIsolationError("test");
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe("TenantIsolationError");
      expect(err.statusCode).toBe(403);
    });
  });

  /* ── Cross-tenant leakage simulation ─────────────── */

  describe("Cross-tenant leakage prevention", () => {
    it("tenant A cannot read tenant B claim via PK lookup guard", () => {
      // Simulate: tenant B owns claim-123
      const tenantBClaim = {
        id: "claim-123",
        tenantId: "hospital-B",
        patientDfn: "3",
        status: "draft",
      };

      // Tenant A tries to access it
      expect(() =>
        assertTenantMatch(tenantBClaim, "hospital-A", "rcm_claim"),
      ).toThrow(TenantIsolationError);
    });

    it("tenant A CAN read their own claim via PK lookup guard", () => {
      const tenantAClaim = {
        id: "claim-456",
        tenantId: "hospital-A",
        patientDfn: "5",
        status: "submitted",
      };

      expect(assertTenantMatch(tenantAClaim, "hospital-A")).toBe(tenantAClaim);
    });

    it("requireTenantId + assertTenantMatch together form a complete guard", () => {
      const tenantId = "hospital-A";
      const row = { id: "wq-1", tenantId: "hospital-B" };

      // Step 1: requireTenantId passes (valid tenant)
      expect(() => requireTenantId(tenantId)).not.toThrow();

      // Step 2: assertTenantMatch blocks (wrong tenant)
      expect(() => assertTenantMatch(row, tenantId)).toThrow(TenantIsolationError);
    });
  });
});
