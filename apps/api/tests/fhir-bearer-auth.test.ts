/**
 * Phase 231 — FHIR Bearer Auth Tests.
 *
 * Tests for SMART-on-FHIR bearer token authentication:
 *   - extractBearerToken()
 *   - validateFhirBearerToken() — mock OIDC/JWT validation
 *   - principalFromSession()
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  extractBearerToken,
  validateFhirBearerToken,
  principalFromSession,
  type FhirPrincipal,
} from "../src/fhir/fhir-bearer-auth.js";

/* ================================================================== */
/* Mock OIDC + JWT modules                                              */
/* ================================================================== */

vi.mock("../src/auth/oidc-provider.js", () => ({
  getOidcConfig: vi.fn(),
}));

vi.mock("../src/auth/jwt-validator.js", () => ({
  validateJwt: vi.fn(),
}));

vi.mock("../src/lib/logger.js", () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { getOidcConfig } from "../src/auth/oidc-provider.js";
import { validateJwt } from "../src/auth/jwt-validator.js";

const mockGetOidcConfig = vi.mocked(getOidcConfig);
const mockValidateJwt = vi.mocked(validateJwt);

/* ================================================================== */
/* Fixtures                                                             */
/* ================================================================== */

function makeFakeRequest(headers: Record<string, string> = {}): any {
  return { headers };
}

const VALID_CLAIMS = {
  sub: "user-123",
  iss: "http://localhost:8180/realms/vista-evolved",
  aud: "vista-evolved-api",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000) - 60,
  duz: "87",
  name: "PROVIDER,CLYDE WV",
  preferred_username: "clyde.provider",
  scope: "openid profile fhirUser patient/Patient.read patient/Observation.read launch/patient",
  realm_roles: ["provider", "admin"],
  patient: "3",
  tenant_id: "tenant-abc",
};

/* ================================================================== */
/* extractBearerToken                                                   */
/* ================================================================== */

describe("extractBearerToken", () => {
  it("returns token from valid Authorization: Bearer header", () => {
    const req = makeFakeRequest({ authorization: "Bearer abc.def.ghi" });
    expect(extractBearerToken(req)).toBe("abc.def.ghi");
  });

  it("returns null when no authorization header", () => {
    const req = makeFakeRequest({});
    expect(extractBearerToken(req)).toBeNull();
  });

  it("returns null for non-Bearer auth scheme", () => {
    const req = makeFakeRequest({ authorization: "Basic dXNlcjpwYXNz" });
    expect(extractBearerToken(req)).toBeNull();
  });

  it("trims whitespace from token", () => {
    const req = makeFakeRequest({ authorization: "Bearer   tok.en.here  " });
    expect(extractBearerToken(req)).toBe("tok.en.here");
  });

  it("returns null for 'Bearer ' with no token", () => {
    const req = makeFakeRequest({ authorization: "Bearer " });
    expect(extractBearerToken(req)).toBeNull();
  });
});

/* ================================================================== */
/* validateFhirBearerToken                                              */
/* ================================================================== */

describe("validateFhirBearerToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when OIDC is not enabled", async () => {
    mockGetOidcConfig.mockReturnValue({
      enabled: false,
      issuer: "",
      clientId: "",
      jwksUri: "",
      audience: "",
    });

    const result = await validateFhirBearerToken("some.jwt.token");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("OIDC is not enabled");
    }
  });

  it("rejects invalid JWT (bad signature/expired/wrong issuer)", async () => {
    mockGetOidcConfig.mockReturnValue({
      enabled: true,
      issuer: "http://localhost:8180/realms/vista-evolved",
      clientId: "vista-evolved-api",
      jwksUri: "http://localhost:8180/realms/vista-evolved/protocol/openid-connect/certs",
      audience: "vista-evolved-api",
    });
    mockValidateJwt.mockResolvedValue({ valid: false, error: "JWT expired" });

    const result = await validateFhirBearerToken("expired.jwt.token");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("JWT expired");
    }
  });

  it("returns FhirPrincipal for valid JWT with full claims", async () => {
    mockGetOidcConfig.mockReturnValue({
      enabled: true,
      issuer: "http://localhost:8180/realms/vista-evolved",
      clientId: "vista-evolved-api",
      jwksUri: "http://localhost:8180/realms/vista-evolved/protocol/openid-connect/certs",
      audience: "vista-evolved-api",
    });
    mockValidateJwt.mockResolvedValue({ valid: true, claims: VALID_CLAIMS as any });

    const result = await validateFhirBearerToken("valid.jwt.token");
    expect(result.ok).toBe(true);
    if (result.ok) {
      const p = result.principal;
      expect(p.authMethod).toBe("bearer");
      expect(p.sub).toBe("user-123");
      expect(p.duz).toBe("87");
      expect(p.userName).toBe("PROVIDER,CLYDE WV");
      expect(p.roles).toEqual(["provider", "admin"]);
      expect(p.scopes).toContain("patient/Patient.read");
      expect(p.scopes).toContain("patient/Observation.read");
      expect(p.scopes).toContain("launch/patient");
      expect(p.patientContext).toBe("3");
      expect(p.tenantId).toBe("tenant-abc");
    }
  });

  it("handles JWT with realm_access.roles instead of realm_roles", async () => {
    mockGetOidcConfig.mockReturnValue({
      enabled: true, issuer: "x", clientId: "x", jwksUri: "x", audience: "x",
    });
    mockValidateJwt.mockResolvedValue({
      valid: true,
      claims: {
        ...VALID_CLAIMS,
        realm_roles: undefined,
        realm_access: { roles: ["nurse"] },
      } as any,
    });

    const result = await validateFhirBearerToken("jwt.with.realm_access");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.principal.roles).toEqual(["nurse"]);
    }
  });

  it("handles JWT with no patient context", async () => {
    mockGetOidcConfig.mockReturnValue({
      enabled: true, issuer: "x", clientId: "x", jwksUri: "x", audience: "x",
    });
    mockValidateJwt.mockResolvedValue({
      valid: true,
      claims: { ...VALID_CLAIMS, patient: undefined } as any,
    });

    const result = await validateFhirBearerToken("jwt.no.patient");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.principal.patientContext).toBeUndefined();
    }
  });

  it("handles JWT with no scopes", async () => {
    mockGetOidcConfig.mockReturnValue({
      enabled: true, issuer: "x", clientId: "x", jwksUri: "x", audience: "x",
    });
    mockValidateJwt.mockResolvedValue({
      valid: true,
      claims: { ...VALID_CLAIMS, scope: "" } as any,
    });

    const result = await validateFhirBearerToken("jwt.no.scopes");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.principal.scopes).toEqual([]);
    }
  });

  it("falls back to sub when duz/name claims missing", async () => {
    mockGetOidcConfig.mockReturnValue({
      enabled: true, issuer: "x", clientId: "x", jwksUri: "x", audience: "x",
    });
    mockValidateJwt.mockResolvedValue({
      valid: true,
      claims: {
        sub: "ext-user-456",
        iss: "x",
        aud: "x",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        scope: "openid",
      } as any,
    });

    const result = await validateFhirBearerToken("jwt.minimal.claims");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.principal.duz).toBe("ext-user-456");
      expect(result.principal.userName).toBe("ext-user-456");
      expect(result.principal.tenantId).toBe("default");
    }
  });
});

/* ================================================================== */
/* principalFromSession                                                 */
/* ================================================================== */

describe("principalFromSession", () => {
  it("creates FhirPrincipal from session data", () => {
    const p = principalFromSession({
      duz: "87",
      userName: "PROVIDER,CLYDE WV",
      role: "admin",
      tenantId: "t-1",
    });

    expect(p.authMethod).toBe("session");
    expect(p.sub).toBe("87");
    expect(p.duz).toBe("87");
    expect(p.userName).toBe("PROVIDER,CLYDE WV");
    expect(p.roles).toEqual(["admin"]);
    expect(p.scopes).toEqual(["user/*.read"]);
    expect(p.tenantId).toBe("t-1");
    expect(p.patientContext).toBeUndefined();
  });

  it("defaults tenantId to 'default' when missing", () => {
    const p = principalFromSession({
      duz: "42",
      userName: "NURSE,HELEN",
      role: "nurse",
    });

    expect(p.tenantId).toBe("default");
  });
});
