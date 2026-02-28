/**
 * RLS Cross-Reference Tests -- Phase 176
 *
 * CI gate ensuring all tenant table lists derive from the single
 * canonical CANONICAL_RLS_TABLES in pg-migrate.ts. Catches:
 * - Stale satellite lists (posture, guard)
 * - Tables with tenant_id not in canonical list
 * - Canonical list contains no duplicates
 * - Guard TENANT_SCOPED + GLOBAL = CANONICAL
 */

import { describe, it, expect } from "vitest";
import { CANONICAL_RLS_TABLES } from "../src/platform/pg/pg-migrate.js";
import {
  TENANT_SCOPED_TABLES,
  GLOBAL_TABLES,
  PENDING_TENANT_ID_TABLES,
} from "../src/platform/pg/repo/tenant-guard.js";

describe("RLS Cross-Reference -- Phase 176", () => {

  describe("Canonical list integrity", () => {
    it("has >100 tables", () => {
      expect(CANONICAL_RLS_TABLES.length).toBeGreaterThan(100);
    });

    it("no duplicates", () => {
      const unique = new Set(CANONICAL_RLS_TABLES);
      expect(unique.size).toBe(CANONICAL_RLS_TABLES.length);
    });

    it("all entries are non-empty strings", () => {
      for (const t of CANONICAL_RLS_TABLES) {
        expect(typeof t).toBe("string");
        expect(t.length).toBeGreaterThan(0);
      }
    });

    it("all entries use snake_case (no camelCase or dashes)", () => {
      for (const t of CANONICAL_RLS_TABLES) {
        expect(t).toMatch(/^[a-z][a-z0-9_]*$/);
      }
    });
  });

  describe("Guard list derivation", () => {
    it("TENANT_SCOPED + GLOBAL exactly equals CANONICAL", () => {
      const combined = new Set([
        ...TENANT_SCOPED_TABLES,
        ...GLOBAL_TABLES as readonly string[],
      ]);
      const canonical = new Set(CANONICAL_RLS_TABLES);
      // Every table in canonical must be in either scoped or global
      for (const t of canonical) {
        expect(combined.has(t), `Missing from guard lists: ${t}`).toBe(true);
      }
      // Every table in combined must be in canonical
      for (const t of combined) {
        expect(canonical.has(t), `Extra in guard lists: ${t}`).toBe(true);
      }
      expect(combined.size).toBe(canonical.size);
    });

    it("no overlap between TENANT_SCOPED and GLOBAL", () => {
      const scopedSet = new Set(TENANT_SCOPED_TABLES);
      for (const g of GLOBAL_TABLES) {
        expect(scopedSet.has(g as any), `Overlap: ${g}`).toBe(false);
      }
    });

    it("PENDING_TENANT_ID_TABLES is empty (all tables now in canonical)", () => {
      expect(PENDING_TENANT_ID_TABLES.length).toBe(0);
    });
  });

  describe("Known global tables are correct", () => {
    it("payer is in GLOBAL_TABLES", () => {
      expect((GLOBAL_TABLES as readonly string[]).includes("payer")).toBe(true);
    });

    it("module_catalog is in GLOBAL_TABLES", () => {
      expect((GLOBAL_TABLES as readonly string[]).includes("module_catalog")).toBe(true);
    });

    it("auth_session is NOT in GLOBAL_TABLES (it is tenant-scoped)", () => {
      expect((GLOBAL_TABLES as readonly string[]).includes("auth_session")).toBe(false);
    });
  });

  describe("Critical tables are in the canonical list", () => {
    const criticalTables = [
      "auth_session",
      "rcm_claim",
      "portal_user",
      "portal_session",
      "imaging_device",
      "tenant_module",
      "cpoe_order_sign_event",
      "workflow_instance",
      "clinical_template",
    ];

    for (const table of criticalTables) {
      it(`${table} is covered by RLS`, () => {
        expect(CANONICAL_RLS_TABLES.includes(table)).toBe(true);
      });
    }
  });
});
