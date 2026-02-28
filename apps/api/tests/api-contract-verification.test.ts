/**
 * API Contract Verification — Phase 251
 *
 * Validates API route contracts structurally:
 * 1. Contract registry completeness and consistency
 * 2. FHIR CapabilityStatement structural conformance
 * 3. Response shape contracts per domain
 * 4. Auth level coverage
 *
 * Runs offline — no live server needed.
 */

import { describe, it, expect } from "vitest";
import {
  ROUTE_CONTRACTS,
  getContractsByDomain,
  getPublicContracts,
  getSessionContracts,
  getFhirContracts,
} from "../../src/api-contracts/index.js";
import type { RouteContract } from "../../src/api-contracts/index.js";

describe("API Contract Verification", () => {
  // --- Registry completeness ---
  describe("Contract Registry", () => {
    it("has at least 25 route contracts", () => {
      expect(ROUTE_CONTRACTS.length).toBeGreaterThanOrEqual(25);
    });

    it("all contracts have unique method+path", () => {
      const keys = ROUTE_CONTRACTS.map((c) => `${c.method} ${c.path}`);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it("all contracts have valid auth levels", () => {
      const validLevels = ["none", "session", "admin", "service", "bearer"];
      for (const c of ROUTE_CONTRACTS) {
        expect(validLevels).toContain(c.auth);
      }
    });

    it("all contracts have non-empty descriptions", () => {
      for (const c of ROUTE_CONTRACTS) {
        expect(c.description.length).toBeGreaterThan(0);
      }
    });

    it("all contracts have valid HTTP methods", () => {
      const validMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"];
      for (const c of ROUTE_CONTRACTS) {
        expect(validMethods).toContain(c.method);
      }
    });

    it("all success statuses are 2xx", () => {
      for (const c of ROUTE_CONTRACTS) {
        expect(c.successStatus).toBeGreaterThanOrEqual(200);
        expect(c.successStatus).toBeLessThan(300);
      }
    });
  });

  // --- Domain coverage ---
  describe("Domain Coverage", () => {
    const expectedDomains = ["infra", "auth", "clinical", "fhir", "admin"];

    for (const domain of expectedDomains) {
      it(`has contracts for domain: ${domain}`, () => {
        const contracts = getContractsByDomain(domain);
        expect(contracts.length).toBeGreaterThan(0);
      });
    }
  });

  // --- Public endpoints ---
  describe("Public Endpoints", () => {
    it("has at least 5 public endpoints", () => {
      const publics = getPublicContracts();
      expect(publics.length).toBeGreaterThanOrEqual(5);
    });

    it("public endpoints have unauthStatus = 200", () => {
      for (const c of getPublicContracts()) {
        expect(c.unauthStatus).toBe(200);
      }
    });

    it("includes health, ready, version, and vista/ping", () => {
      const paths = getPublicContracts().map((c) => c.path);
      expect(paths).toContain("/health");
      expect(paths).toContain("/ready");
      expect(paths).toContain("/version");
      expect(paths).toContain("/vista/ping");
    });
  });

  // --- Session-required endpoints ---
  describe("Session Endpoints", () => {
    it("has at least 7 session endpoints", () => {
      const sessions = getSessionContracts();
      expect(sessions.length).toBeGreaterThanOrEqual(7);
    });

    it("all session endpoints return 401 when unauthenticated", () => {
      for (const c of getSessionContracts()) {
        expect(c.unauthStatus).toBe(401);
      }
    });

    it("all session endpoints return ok key on success", () => {
      for (const c of getSessionContracts()) {
        expect(c.successKeys).toContain("ok");
      }
    });
  });

  // --- FHIR R4 contracts ---
  describe("FHIR R4 Contracts", () => {
    const fhirContracts = getFhirContracts();

    it("has at least 9 FHIR contracts", () => {
      expect(fhirContracts.length).toBeGreaterThanOrEqual(9);
    });

    it("includes CapabilityStatement (metadata)", () => {
      const meta = fhirContracts.find((c) => c.path === "/fhir/metadata");
      expect(meta).toBeDefined();
      expect(meta!.auth).toBe("none");
      expect(meta!.successKeys).toContain("resourceType");
      expect(meta!.successKeys).toContain("fhirVersion");
    });

    it("includes SMART discovery", () => {
      const smart = fhirContracts.find((c) =>
        c.path.includes("smart-configuration")
      );
      expect(smart).toBeDefined();
      expect(smart!.auth).toBe("none");
    });

    const fhirResourceTypes = [
      "Patient",
      "AllergyIntolerance",
      "Condition",
      "Observation",
      "MedicationRequest",
      "DocumentReference",
      "Encounter",
    ];

    for (const rt of fhirResourceTypes) {
      it(`has contract for /fhir/${rt}`, () => {
        const contract = fhirContracts.find(
          (c) => c.path === `/fhir/${rt}`
        );
        expect(contract).toBeDefined();
        expect(contract!.auth).toBe("bearer");
        expect(contract!.successKeys).toContain("resourceType");
      });
    }

    it("all FHIR search endpoints return Bundle shape", () => {
      const searches = fhirContracts.filter(
        (c) =>
          c.path.startsWith("/fhir/") &&
          c.path !== "/fhir/metadata" &&
          !c.path.includes("smart")
      );
      for (const c of searches) {
        expect(c.successKeys).toContain("resourceType");
        expect(c.successKeys).toContain("total");
      }
    });
  });

  // --- Auth flow contracts ---
  describe("Auth Flow", () => {
    it("has login endpoint", () => {
      const login = ROUTE_CONTRACTS.find(
        (c) => c.path === "/auth/login" && c.method === "POST"
      );
      expect(login).toBeDefined();
      expect(login!.auth).toBe("none");
      expect(login!.successKeys).toContain("ok");
      expect(login!.successKeys).toContain("session");
    });

    it("has session endpoint", () => {
      const session = ROUTE_CONTRACTS.find(
        (c) => c.path === "/auth/session" && c.method === "GET"
      );
      expect(session).toBeDefined();
      expect(session!.auth).toBe("session");
    });

    it("has logout endpoint", () => {
      const logout = ROUTE_CONTRACTS.find(
        (c) => c.path === "/auth/logout" && c.method === "POST"
      );
      expect(logout).toBeDefined();
    });
  });

  // --- Cross-cutting contract properties ---
  describe("Cross-Cutting Properties", () => {
    it("no endpoint allows both none and session auth (consistency)", () => {
      const publicPaths = new Set(getPublicContracts().map((c) => c.path));
      const sessionPaths = new Set(getSessionContracts().map((c) => c.path));
      const overlap = [...publicPaths].filter((p) => sessionPaths.has(p));
      expect(overlap).toEqual([]);
    });

    it("all clinical endpoints use /vista/ prefix", () => {
      const clinical = getContractsByDomain("clinical");
      for (const c of clinical) {
        expect(c.path).toMatch(/^\/vista\//);
      }
    });

    it("all FHIR endpoints use /fhir/ prefix or .well-known", () => {
      const fhir = getFhirContracts();
      for (const c of fhir) {
        expect(c.path).toMatch(/^\/(fhir\/|\.well-known\/)/);
      }
    });
  });
});
