/**
 * Conformance Routes — Phase 499 (W34-P9)
 *
 * Admin-only endpoints to run per-pack regulatory conformance checks
 * and produce evidence bundles. Uses the runtime country policy hook
 * to validate enforcement wiring.
 */

import type { FastifyInstance } from "fastify";
import { listCountryPacks, getCountryPack } from "../platform/country-pack-loader.js";
import { getConsentProfile } from "../services/consent-engine.js";
import { isValidDataRegion } from "../platform/data-residency.js";
import { buildRetentionPolicy } from "../services/retention-engine.js";

interface ConformanceGate {
  gate: string;
  status: "pass" | "fail" | "warn";
  detail: string;
}

interface PackEvidence {
  countryCode: string;
  gates: ConformanceGate[];
  overall: "pass" | "fail";
  timestamp: string;
}

function gateCheck(name: string, condition: boolean, detail: string): ConformanceGate {
  return { gate: name, status: condition ? "pass" : "fail", detail };
}

export async function conformanceRoutes(app: FastifyInstance): Promise<void> {

  // POST /conformance/run — run conformance for all packs (or single pack)
  app.post("/conformance/run", async (request) => {
    const body = (request.body as Record<string, unknown>) || {};
    const filterPack = body.countryCode as string | undefined;

    const packsList = listCountryPacks();
    const targets = filterPack
      ? packsList.filter((p) => p.countryCode === filterPack)
      : packsList;

    const evidence: PackEvidence[] = [];

    for (const packMeta of targets) {
      const gates: ConformanceGate[] = [];
      const cc = packMeta.countryCode;

      // Gate 1: Pack loads
      const packResult = getCountryPack(cc);
      if (!packResult) {
        gates.push(gateCheck("pack-load", false, `Failed to load pack ${cc}`));
        evidence.push({ countryCode: cc, gates, overall: "fail", timestamp: new Date().toISOString() });
        continue;
      }
      gates.push(gateCheck("pack-load", true, `Loaded ${cc} v${packResult.pack.packVersion}`));
      const pack = packResult.pack;

      // Gate 2: Regulatory profile
      const reg = pack.regulatoryProfile;
      gates.push(gateCheck("regulatory-framework",
        !!reg?.framework,
        `framework: ${reg?.framework || "MISSING"}`));
      gates.push(gateCheck("consent-required",
        typeof reg?.consentRequired === "boolean",
        `consentRequired: ${reg?.consentRequired}`));
      gates.push(gateCheck("consent-granularity",
        typeof reg?.consentGranularity === "string",
        `consentGranularity: ${reg?.consentGranularity || "MISSING"}`));

      // Gate 3: Consent profile
      const profile = reg?.framework ? getConsentProfile(reg.framework) : undefined;
      gates.push(gateCheck("consent-profile",
        !!profile,
        profile ? `${profile.framework} profile with ${profile.policies.length} policies` : "No matching profile"));

      // Gate 4: Data residency
      const dr = pack.dataResidency;
      gates.push(gateCheck("residency-region",
        typeof dr?.region === "string" && isValidDataRegion(dr.region),
        `region: ${dr?.region || "MISSING"}`));
      gates.push(gateCheck("residency-cross-border",
        typeof dr?.crossBorderTransferAllowed === "boolean",
        `crossBorderTransferAllowed: ${dr?.crossBorderTransferAllowed}`));

      // Gate 5: Retention
      const retPolicy = buildRetentionPolicy(reg);
      gates.push(gateCheck("retention-min-years",
        retPolicy.retentionMinYears > 0,
        `retentionMinYears: ${retPolicy.retentionMinYears}`));

      // Gate 6: DSAR rights
      gates.push(gateCheck("dsar-erasure",
        typeof reg?.rightToErasure === "boolean",
        `rightToErasure: ${reg?.rightToErasure}`));
      gates.push(gateCheck("dsar-portability",
        typeof reg?.dataPortability === "boolean",
        `dataPortability: ${reg?.dataPortability}`));

      // Gate 7: Locales
      const locales = pack.supportedLocales || [pack.defaultLocale || "en"];
      gates.push(gateCheck("locales-defined",
        locales.length > 0,
        `${locales.length} locales: ${locales.join(", ")}`));

      // Gate 8: Terminology
      const term = pack.terminologyDefaults;
      gates.push(gateCheck("terminology-dx",
        !!term?.diagnosisCodeSystem,
        `diagnosisCodeSystem: ${term?.diagnosisCodeSystem || "MISSING"}`));
      gates.push(gateCheck("terminology-proc",
        !!term?.procedureCodeSystem,
        `procedureCodeSystem: ${term?.procedureCodeSystem || "MISSING"}`));

      const overall = gates.some((g) => g.status === "fail") ? "fail" : "pass";
      evidence.push({
        countryCode: cc,
        gates,
        overall,
        timestamp: new Date().toISOString(),
      });
    }

    const allPassed = evidence.every((e) => e.overall === "pass");

    return {
      ok: true,
      allPassed,
      evidence,
      total: evidence.length,
      summary: evidence.map((e) => ({
        countryCode: e.countryCode,
        overall: e.overall,
        passed: e.gates.filter((g) => g.status === "pass").length,
        failed: e.gates.filter((g) => g.status === "fail").length,
      })),
    };
  });

  // GET /conformance/gates — list all conformance gates
  app.get("/conformance/gates", async () => {
    return {
      ok: true,
      gates: [
        { id: "pack-load", phase: "P1", description: "Country pack loads and parses" },
        { id: "regulatory-framework", phase: "P2", description: "Regulatory framework is set" },
        { id: "consent-required", phase: "P4", description: "Consent required flag is boolean" },
        { id: "consent-granularity", phase: "P4", description: "Consent granularity is set" },
        { id: "consent-profile", phase: "P4", description: "Consent profile exists for framework" },
        { id: "residency-region", phase: "P5", description: "Data residency region is valid" },
        { id: "residency-cross-border", phase: "P5", description: "Cross-border flag is boolean" },
        { id: "retention-min-years", phase: "P6", description: "Retention minimum > 0" },
        { id: "dsar-erasure", phase: "P6", description: "Right to erasure is boolean" },
        { id: "dsar-portability", phase: "P6", description: "Data portability is boolean" },
        { id: "locales-defined", phase: "P7", description: "Supported locales are defined" },
        { id: "terminology-dx", phase: "P7", description: "Diagnosis code system is set" },
        { id: "terminology-proc", phase: "P7", description: "Procedure code system is set" },
      ],
    };
  });
}
