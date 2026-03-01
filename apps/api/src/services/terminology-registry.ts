/**
 * Terminology Resolver Registry — Phase 313
 *
 * Pluggable terminology service pattern. Code systems are declared in
 * country packs and resolved at runtime through this registry.
 *
 * See ADR-terminology-model.md for architecture decision.
 */

// ── Types ──────────────────────────────────────────────────────

export type TermDomain =
  | "diagnosis"
  | "procedure"
  | "lab"
  | "drug"
  | "allergy";

export interface TermCode {
  code: string;
  display: string;
  system: string;        // URI (e.g. "http://hl7.org/fhir/sid/icd-10-cm")
  version?: string;
}

export interface TerminologyResolver {
  readonly id: string;
  readonly codeSystem: string;
  readonly domain: TermDomain;
  readonly description: string;

  /** Resolve VistA-internal code to standard code */
  resolve(vistaCode: string, vistaFile?: number): TermCode | null;

  /** Validate that a code is valid in this system */
  validate(code: string): boolean;

  /** Search/lookup by text */
  search(text: string, limit?: number): TermCode[];
}

// ── Registry ───────────────────────────────────────────────────

const resolvers = new Map<string, TerminologyResolver>();

/**
 * Register a terminology resolver.
 */
export function registerResolver(resolver: TerminologyResolver): void {
  const key = `${resolver.domain}:${resolver.codeSystem}`;
  resolvers.set(key, resolver);
}

/**
 * Get a resolver for a domain + code system.
 */
export function getResolver(
  domain: TermDomain,
  codeSystem: string
): TerminologyResolver | undefined {
  return resolvers.get(`${domain}:${codeSystem}`);
}

/**
 * List all registered resolvers.
 */
export function listResolvers(): Array<{
  id: string;
  domain: TermDomain;
  codeSystem: string;
  description: string;
}> {
  return [...resolvers.values()].map((r) => ({
    id: r.id,
    domain: r.domain,
    codeSystem: r.codeSystem,
    description: r.description,
  }));
}

/**
 * Resolve a VistA code using the appropriate resolver for the given domain.
 * Falls back to PassthroughResolver if no specific resolver is registered.
 */
export function resolveCode(
  domain: TermDomain,
  codeSystem: string,
  vistaCode: string,
  vistaFile?: number
): TermCode {
  const resolver = getResolver(domain, codeSystem);
  if (resolver) {
    const result = resolver.resolve(vistaCode, vistaFile);
    if (result) return result;
  }

  // Fallback: passthrough
  const passthrough = getResolver(domain, "passthrough");
  if (passthrough) {
    const result = passthrough.resolve(vistaCode, vistaFile);
    if (result) return result;
  }

  // Ultimate fallback: return VistA code as-is
  return {
    code: vistaCode,
    display: vistaCode,
    system: `urn:vista:file:${vistaFile || "unknown"}`,
  };
}

// ── Built-In Resolvers ─────────────────────────────────────────

/**
 * Passthrough resolver — returns VistA codes as-is.
 * Used as fallback when no terminology mapping is available.
 */
class PassthroughResolver implements TerminologyResolver {
  constructor(public readonly domain: TermDomain) {}

  get id() { return `passthrough-${this.domain}`; }
  get codeSystem() { return "passthrough"; }
  get description() { return `Passthrough (returns VistA codes for ${this.domain})`; }

  resolve(vistaCode: string, vistaFile?: number): TermCode {
    return {
      code: vistaCode,
      display: vistaCode,
      system: `urn:vista:file:${vistaFile || "unknown"}`,
    };
  }

  validate(_code: string): boolean { return true; }
  search(_text: string, _limit?: number): TermCode[] { return []; }
}

/**
 * ICD-10-CM resolver scaffold.
 * Maps VistA File 80 codes to ICD-10-CM.
 * In production, this would load a mapping table from VistA or an
 * external terminology service. For now, it validates format only.
 */
class ICD10CMResolver implements TerminologyResolver {
  readonly id = "icd10cm";
  readonly codeSystem = "ICD-10-CM";
  readonly domain: TermDomain = "diagnosis";
  readonly description = "ICD-10-CM (US Clinical Modification)";

  private readonly SYSTEM_URI = "http://hl7.org/fhir/sid/icd-10-cm";
  private readonly CODE_PATTERN = /^[A-Z]\d{2}(\.\d{1,4})?$/;

  resolve(vistaCode: string, _vistaFile?: number): TermCode | null {
    // VistA File 80 stores ICD codes natively — pass through with validation
    if (this.validate(vistaCode)) {
      return {
        code: vistaCode,
        display: vistaCode, // Full display would come from terminology service
        system: this.SYSTEM_URI,
      };
    }
    return null;
  }

  validate(code: string): boolean {
    return this.CODE_PATTERN.test(code);
  }

  search(_text: string, _limit?: number): TermCode[] { return []; }
}

/**
 * ICD-10 WHO resolver scaffold.
 * Used by Philippines and Ghana (WHO version, not CM).
 */
class ICD10WHOResolver implements TerminologyResolver {
  readonly id = "icd10who";
  readonly codeSystem = "ICD-10-WHO";
  readonly domain: TermDomain = "diagnosis";
  readonly description = "ICD-10 (WHO International Classification)";

  private readonly SYSTEM_URI = "http://hl7.org/fhir/sid/icd-10";
  private readonly CODE_PATTERN = /^[A-Z]\d{2}(\.\d{1,3})?$/;

  resolve(vistaCode: string, _vistaFile?: number): TermCode | null {
    if (this.validate(vistaCode)) {
      return { code: vistaCode, display: vistaCode, system: this.SYSTEM_URI };
    }
    return null;
  }

  validate(code: string): boolean { return this.CODE_PATTERN.test(code); }
  search(_text: string, _limit?: number): TermCode[] { return []; }
}

/**
 * CPT resolver scaffold.
 */
class CPTResolver implements TerminologyResolver {
  readonly id = "cpt";
  readonly codeSystem = "CPT";
  readonly domain: TermDomain = "procedure";
  readonly description = "CPT (Current Procedural Terminology)";

  private readonly SYSTEM_URI = "http://www.ama-assn.org/go/cpt";
  private readonly CODE_PATTERN = /^\d{5}$/;

  resolve(vistaCode: string, _vistaFile?: number): TermCode | null {
    if (this.validate(vistaCode)) {
      return { code: vistaCode, display: vistaCode, system: this.SYSTEM_URI };
    }
    return null;
  }

  validate(code: string): boolean { return this.CODE_PATTERN.test(code); }
  search(_text: string, _limit?: number): TermCode[] { return []; }
}

/**
 * LOINC resolver scaffold.
 */
class LOINCResolver implements TerminologyResolver {
  readonly id = "loinc";
  readonly codeSystem = "LOINC";
  readonly domain: TermDomain = "lab";
  readonly description = "LOINC (Logical Observation Identifiers Names and Codes)";

  private readonly SYSTEM_URI = "http://loinc.org";
  private readonly CODE_PATTERN = /^\d{1,5}-\d$/;

  resolve(vistaCode: string, _vistaFile?: number): TermCode | null {
    if (this.validate(vistaCode)) {
      return { code: vistaCode, display: vistaCode, system: this.SYSTEM_URI };
    }
    return null;
  }

  validate(code: string): boolean { return this.CODE_PATTERN.test(code); }
  search(_text: string, _limit?: number): TermCode[] { return []; }
}

/**
 * NDC resolver scaffold.
 */
class NDCResolver implements TerminologyResolver {
  readonly id = "ndc";
  readonly codeSystem = "NDC";
  readonly domain: TermDomain = "drug";
  readonly description = "NDC (National Drug Code)";

  private readonly SYSTEM_URI = "http://hl7.org/fhir/sid/ndc";
  // NDC can be 10 or 11 digits with various dash patterns
  private readonly CODE_PATTERN = /^\d{4,5}-\d{3,4}-\d{1,2}$/;

  resolve(vistaCode: string, _vistaFile?: number): TermCode | null {
    if (this.validate(vistaCode)) {
      return { code: vistaCode, display: vistaCode, system: this.SYSTEM_URI };
    }
    return null;
  }

  validate(code: string): boolean { return this.CODE_PATTERN.test(code); }
  search(_text: string, _limit?: number): TermCode[] { return []; }
}

// ── Initialization ─────────────────────────────────────────────

/**
 * Register all built-in terminology resolvers.
 * Call this once at server startup.
 */
export function initTerminologyResolvers(): void {
  // Passthrough for all domains
  for (const domain of ["diagnosis", "procedure", "lab", "drug", "allergy"] as TermDomain[]) {
    registerResolver(new PassthroughResolver(domain));
  }

  // Standard resolvers
  registerResolver(new ICD10CMResolver());
  registerResolver(new ICD10WHOResolver());
  registerResolver(new CPTResolver());
  registerResolver(new LOINCResolver());
  registerResolver(new NDCResolver());
}

// ── Terminology Defaults (per country pack) ────────────────────

export interface TerminologyDefaults {
  diagnosisCodeSystem: string;
  procedureCodeSystem: string;
  labCodeSystem: string;
  drugCodeSystem: string;
}

export const US_TERMINOLOGY_DEFAULTS: TerminologyDefaults = {
  diagnosisCodeSystem: "ICD-10-CM",
  procedureCodeSystem: "CPT",
  labCodeSystem: "LOINC",
  drugCodeSystem: "NDC",
};

export const PH_TERMINOLOGY_DEFAULTS: TerminologyDefaults = {
  diagnosisCodeSystem: "ICD-10-WHO",
  procedureCodeSystem: "CPT",  // PhilHealth uses RVS but maps from CPT
  labCodeSystem: "LOINC",
  drugCodeSystem: "passthrough", // Philippines uses local drug codes
};

export const GH_TERMINOLOGY_DEFAULTS: TerminologyDefaults = {
  diagnosisCodeSystem: "ICD-10-WHO",
  procedureCodeSystem: "passthrough",
  labCodeSystem: "passthrough",
  drugCodeSystem: "passthrough",
};
