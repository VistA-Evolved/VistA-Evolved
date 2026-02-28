/**
 * RPC Contract Replay Tests — Phase 250
 *
 * Loads sanitized fixtures and validates:
 * 1. Fixture files exist and are valid JSON
 * 2. Response matches output schema (line counts, patterns)
 * 3. No PHI patterns in any fixture
 * 4. Failure-case fixtures exist for each contracted RPC
 *
 * Runs in CI without VistA dependency (REPLAY mode).
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  RPC_CONTRACTS,
  verifyNoPhiInFixture,
} from "../../src/vista/contracts/index.js";
import type { RpcFixture } from "../../src/vista/contracts/index.js";

const FIXTURE_ROOT = join(__dirname, "../fixtures/vista");

function loadFixture(rpcName: string, caseName: string): RpcFixture | null {
  const safeName = rpcName.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_]/g, "");
  const path = join(FIXTURE_ROOT, safeName, `${caseName}.json`);
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, "utf-8");
  // Strip BOM if present (PowerShell UTF8 issue, BUG-064)
  const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  return JSON.parse(clean) as RpcFixture;
}

describe("RPC Contract Replay Suite", () => {
  // --- Structural tests ---
  describe("Contract Registry", () => {
    it("has at least 10 contracted RPCs", () => {
      expect(RPC_CONTRACTS.length).toBeGreaterThanOrEqual(10);
    });

    it("all contracts have unique RPC names", () => {
      const names = RPC_CONTRACTS.map((c) => c.rpcName);
      expect(new Set(names).size).toBe(names.length);
    });

    it("all contracts have at least one failure case", () => {
      for (const contract of RPC_CONTRACTS) {
        expect(contract.failureCases.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // --- Per-RPC fixture tests ---
  for (const contract of RPC_CONTRACTS) {
    describe(`RPC: ${contract.rpcName}`, () => {
      it("has a success fixture", () => {
        const fixture = loadFixture(contract.rpcName, "success");
        expect(fixture).not.toBeNull();
        expect(fixture!.sanitized).toBe(true);
        expect(fixture!.rpcName).toBe(contract.rpcName);
      });

      it("success fixture meets output schema", () => {
        const fixture = loadFixture(contract.rpcName, "success");
        if (!fixture) return; // skip if no fixture

        const lines = fixture.response;
        expect(lines.length).toBeGreaterThanOrEqual(contract.outputSchema.minLines);
        if (contract.outputSchema.maxLines > 0) {
          expect(lines.length).toBeLessThanOrEqual(contract.outputSchema.maxLines);
        }

        // Check mustContain patterns
        if (contract.outputSchema.mustContain) {
          for (const pattern of contract.outputSchema.mustContain) {
            const found = lines.some((line) => pattern.test(line));
            expect(found).toBe(true);
          }
        }

        // Check mustNotContain patterns
        if (contract.outputSchema.mustNotContain) {
          for (const pattern of contract.outputSchema.mustNotContain) {
            const found = lines.some((line) => pattern.test(line));
            expect(found).toBe(false);
          }
        }
      });

      it("has an empty/failure fixture", () => {
        const fixture = loadFixture(contract.rpcName, "empty");
        expect(fixture).not.toBeNull();
        expect(fixture!.response).toEqual([]);
      });

      it("contains NO PHI patterns in any fixture", () => {
        for (const caseName of ["success", "empty"]) {
          const fixture = loadFixture(contract.rpcName, caseName);
          if (!fixture) continue;
          const violations = verifyNoPhiInFixture(fixture.response);
          expect(violations).toEqual([]);
        }
      });
    });
  }

  // --- Global PHI scan across all fixtures ---
  describe("Global PHI Safety", () => {
    it("no fixture file contains SSN patterns", () => {
      const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/;
      for (const contract of RPC_CONTRACTS) {
        for (const caseName of ["success", "empty"]) {
          const fixture = loadFixture(contract.rpcName, caseName);
          if (!fixture) continue;
          for (const line of fixture.response) {
            expect(ssnPattern.test(line)).toBe(false);
          }
        }
      }
    });

    it("no fixture file contains real patient name patterns", () => {
      // Real names: LAST,FIRST MIDDLE pattern
      const namePattern = /\b[A-Z][a-z]+,\s*[A-Z][a-z]+\s+[A-Z]\b/;
      for (const contract of RPC_CONTRACTS) {
        for (const caseName of ["success", "empty"]) {
          const fixture = loadFixture(contract.rpcName, caseName);
          if (!fixture) continue;
          for (const line of fixture.response) {
            expect(namePattern.test(line)).toBe(false);
          }
        }
      }
    });
  });
});
