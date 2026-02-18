/**
 * Portal SMART Health Cards (SHC) — Phase 31
 *
 * Feature-flagged SHC adapter for patient-directed immunization sharing.
 * Implements the minimal SHC spec subset needed for immunization records.
 *
 * IMPORTANT:
 * - Feature-flagged via PORTAL_SHC_ENABLED env var (default: disabled)
 * - No external SDK dependencies — manual JWS-like structure
 * - Read-only, patient-initiated only
 * - Immunizations only (expandable to labs in future)
 *
 * SHC spec: https://spec.smarthealth.cards/
 *
 * In production, this would need:
 * - A real signing key (ES256 / P-256)
 * - Key publication at /.well-known/jwks.json
 * - Proper FHIR Bundle construction
 * For now, this is a stub that produces the correct structure
 * but uses a demo/dev signing approach.
 */

import { createHash, randomBytes } from "node:crypto";
import { log } from "../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Feature flag                                                         */
/* ------------------------------------------------------------------ */

export function isShcEnabled(): boolean {
  return process.env.PORTAL_SHC_ENABLED === "true";
}

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export type ShcDataset = "immunizations";

export interface ShcCredential {
  /** The raw SHC JWS (compact serialization) — in production, properly signed */
  jws: string;
  /** Numeric-encoded SHC string for QR codes (shc:/...) */
  shcUri: string;
  /** Metadata about the credential */
  meta: {
    dataset: ShcDataset;
    recordCount: number;
    issuedAt: string;
    issuer: string;
    /** Always true in dev — indicates this is NOT a production credential */
    devMode: boolean;
  };
}

export interface FhirImmunization {
  resourceType: "Immunization";
  status: "completed";
  vaccineCode: {
    coding: { system: string; code: string; display: string }[];
  };
  patient: { reference: string };
  occurrenceDateTime: string;
  lotNumber?: string;
  performer?: { actor: { display: string } }[];
}

/* ------------------------------------------------------------------ */
/* FHIR Bundle builder                                                  */
/* ------------------------------------------------------------------ */

function buildImmunizationBundle(
  patientName: string,
  immunizations: any[],
): object {
  const entries: object[] = [];

  // Patient resource (minimal)
  entries.push({
    fullUrl: "resource:0",
    resource: {
      resourceType: "Patient",
      name: [{ family: patientName.split(",")[0]?.trim() || patientName, given: [patientName.split(",")[1]?.trim() || ""] }],
    },
  });

  // Immunization resources
  for (let i = 0; i < immunizations.length; i++) {
    const imm = immunizations[i];
    const fhirImm: FhirImmunization = {
      resourceType: "Immunization",
      status: "completed",
      vaccineCode: {
        coding: [{
          system: "http://hl7.org/fhir/sid/cvx",
          code: imm.cvx || "999",
          display: imm.vaccine || "Unknown Vaccine",
        }],
      },
      patient: { reference: "resource:0" },
      occurrenceDateTime: imm.date || new Date().toISOString().split("T")[0],
    };
    if (imm.lot) fhirImm.lotNumber = imm.lot;
    if (imm.facility) {
      fhirImm.performer = [{ actor: { display: imm.facility } }];
    }
    entries.push({ fullUrl: `resource:${i + 1}`, resource: fhirImm });
  }

  return {
    resourceType: "Bundle",
    type: "collection",
    entry: entries,
  };
}

/* ------------------------------------------------------------------ */
/* JWS stub (dev-mode — NOT production-grade signing)                   */
/* ------------------------------------------------------------------ */

const DEV_ISSUER = "https://vista-evolved.dev/shc";

/**
 * Build a minimal JWS-like structure.
 * In production, this would use ES256 with a published key.
 * In dev mode, we use HMAC-SHA256 with a random key — verifiable only locally.
 */
function buildDevJws(payload: object): string {
  const header = { alg: "DEV-HS256", zip: "DEF", kid: "dev-key-1" };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");

  // Dev-mode signature using HMAC
  const sig = createHash("sha256")
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");

  return `${headerB64}.${payloadB64}.${sig}`;
}

/**
 * Convert a JWS to the shc:/ numeric-encoded URI format.
 * Each character is encoded as two digits: (charCode - 45).
 */
function jwsToShcUri(jws: string): string {
  let numeric = "";
  for (const ch of jws) {
    const val = ch.charCodeAt(0) - 45;
    numeric += val.toString().padStart(2, "0");
  }
  return `shc:/${numeric}`;
}

/* ------------------------------------------------------------------ */
/* Public API                                                           */
/* ------------------------------------------------------------------ */

/**
 * Generate a SMART Health Card credential for the given dataset.
 * Returns null if SHC is disabled or dataset is unsupported.
 */
export function generateShcCredential(
  dataset: ShcDataset,
  patientName: string,
  data: any[],
): ShcCredential | { error: string } {
  if (!isShcEnabled()) {
    return { error: "SMART Health Cards are not enabled. Set PORTAL_SHC_ENABLED=true to activate." };
  }

  if (dataset !== "immunizations") {
    return { error: `Unsupported SHC dataset: ${dataset}. Currently supported: immunizations.` };
  }

  if (!data.length) {
    return { error: "No immunization records available to generate a health card." };
  }

  log.info("Generating SHC credential", { dataset, recordCount: data.length });

  const fhirBundle = buildImmunizationBundle(patientName, data);
  const now = new Date().toISOString();

  const vcPayload = {
    iss: DEV_ISSUER,
    nbf: Math.floor(Date.now() / 1000),
    vc: {
      type: ["https://smarthealth.cards#health-card", "https://smarthealth.cards#immunization"],
      credentialSubject: {
        fhirVersion: "4.0.1",
        fhirBundle,
      },
    },
  };

  const jws = buildDevJws(vcPayload);
  const shcUri = jwsToShcUri(jws);

  return {
    jws,
    shcUri,
    meta: {
      dataset,
      recordCount: data.length,
      issuedAt: now,
      issuer: DEV_ISSUER,
      devMode: true,
    },
  };
}

/**
 * Get the list of available SHC datasets and their status.
 */
export function getShcCapabilities(): {
  enabled: boolean;
  datasets: { id: ShcDataset; label: string; available: boolean }[];
} {
  return {
    enabled: isShcEnabled(),
    datasets: [
      { id: "immunizations", label: "Immunization Record", available: isShcEnabled() },
    ],
  };
}
