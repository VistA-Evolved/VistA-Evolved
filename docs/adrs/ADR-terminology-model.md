# ADR: Terminology Model

**Status:** Accepted  
**Date:** 2026-03-01  
**Context:** Wave 13 Phase 309 (Regulatory/Compliance + Multi-Country Packaging)

## Decision

**Use a pluggable terminology service pattern** — terminology code systems are
declared in country packs and resolved at runtime through a registry, not
hardcoded in clinical logic.

## Context

Clinical terminology varies by country:

| Domain     | US           | Philippines             | Ghana            |
| ---------- | ------------ | ----------------------- | ---------------- |
| Diagnosis  | ICD-10-CM    | ICD-10 (WHO)            | ICD-10 (WHO)     |
| Procedures | CPT/HCPCS    | ICD-10-PCS / PhilHealth | ICD-10-PCS       |
| Lab codes  | LOINC        | LOINC (partial)         | Local            |
| Drugs      | NDC / RxNorm | PDPD / FDA-PH           | Local formulary  |
| Allergies  | SNOMED CT    | Free-text common        | Free-text common |

The challenge is that:

1. VistA uses VistA-internal file numbers (File 120.82, File 80, etc.)
2. CPRS RPCs return VistA-internal codes that must be mapped to standard terminologies
3. Claims/billing require the country-specific code system
4. Interop (HL7/FHIR) requires standard coded values

### Options Considered

1. **Hardcoded per-country mapping tables** — compile-time code per market
2. **Pluggable terminology registry** — runtime-resolved code system adapters
3. **External terminology server (FHIR $lookup)** — delegate all lookups to
   an external service

## Rationale

| Criterion          |  Hardcoded  | Pluggable registry | External server |
| ------------------ | :---------: | :----------------: | :-------------: |
| Offline capability |     Yes     |        Yes         |       No        |
| Latency            |    Best     |        Good        |    Variable     |
| New market cost    | High (code) |    Low (config)    |  Low (config)   |
| VistA alignment    |    Tight    |        Good        |      Loose      |
| Maintenance burden | Per-country |    Per-adapter     |    External     |

- **Pluggable registry** aligns with the values-driven country pack model
  (ADR-country-pack-model.md).
- VistA already has File 80 (ICD), File 81 (CPT), File 50 (Drug), File
  120.82 (GMR Allergies) — we map FROM these, not replace them.
- External terminology servers can be added as a resolver adapter later.

## Architecture

### Terminology Registry

```typescript
interface TerminologyResolver {
  readonly codeSystem: string; // e.g. "ICD-10-CM", "LOINC"
  readonly domain: TermDomain; // "diagnosis" | "procedure" | "lab" | "drug" | "allergy"

  /** Resolve VistA-internal code to standard code */
  resolve(vistaCode: string, vistaFile: number): TermCode | null;

  /** Validate that a code is valid in this system */
  validate(code: string): boolean;

  /** Search/lookup by text */
  search(text: string, limit?: number): TermCode[];
}

interface TermCode {
  code: string; // e.g. "J06.9"
  display: string; // e.g. "Acute upper respiratory infection, unspecified"
  system: string; // e.g. "http://hl7.org/fhir/sid/icd-10-cm"
  version?: string; // e.g. "2025"
}

type TermDomain = 'diagnosis' | 'procedure' | 'lab' | 'drug' | 'allergy';
```

### Resolution Flow

```
Country Pack values.json
  → terminologyDefaults.diagnosisCodeSystem = "ICD-10-CM"
    → TerminologyRegistry.getResolver("diagnosis", "ICD-10-CM")
      → ICD10CMResolver (maps VistA File 80 → ICD-10-CM codes)
```

### Built-in Resolvers (Initial)

| Resolver            | Domain    | Source        | Notes                    |
| ------------------- | --------- | ------------- | ------------------------ |
| ICD10CMResolver     | diagnosis | VistA File 80 | US standard              |
| ICD10WHOResolver    | diagnosis | VistA File 80 | WHO standard (PH, GH)    |
| CPTResolver         | procedure | VistA File 81 | US standard              |
| LOINCResolver       | lab       | VistA File 60 | Universal                |
| NDCResolver         | drug      | VistA File 50 | US standard              |
| PassthroughResolver | any       | any           | Returns VistA code as-is |

### Country Pack Integration

```jsonc
{
  "terminologyDefaults": {
    "diagnosisCodeSystem": "ICD-10-CM",
    "procedureCodeSystem": "CPT",
    "labCodeSystem": "LOINC",
    "drugCodeSystem": "NDC",
  },
  "terminologyOverrides": {
    // Optional per-domain overrides
    "allergy": {
      "codeSystem": "SNOMED-CT",
      "fallback": "passthrough", // If SNOMED mapping unavailable
    },
  },
}
```

### VistA Alignment

- Resolvers read FROM VistA files — they do not replace VistA's terminology.
- Write operations (adding allergies, creating orders) continue to use
  VistA-native codes. The resolver maps outbound only.
- Inbound terminology (e.g., from FHIR imports) uses reverse mapping.
- If no resolver is available for a code system, `PassthroughResolver`
  returns VistA codes as-is (no data loss, just no standardization).

## Consequences

- Each country pack declares its terminology defaults.
- Clinical display can show both VistA-native and standard codes.
- Billing serializers (X12, PhilHealth eClaims) use the country's code system.
- FHIR export uses the standard code system.
- New terminology systems = new resolver implementation, no core changes.
- `PassthroughResolver` ensures the system works even without mappings.

## Not In Scope (Yet)

- SNOMED CT licensing and distribution (requires NLM agreement for US).
- Full terminology server with $expand/$validate (future enhancement).
- Cross-terminology mapping (e.g., ICD-10-CM ↔ SNOMED CT).
- Drug-drug interaction checking (separate clinical decision support concern).

## Related

- Phase 38: Payer EDI requires correct code systems for claims
- Phase 39: VistA billing grounding (ICD/CPT from VistA files)
- Phase 40: X12 serializer, PhilHealth serializer
- ADR-country-pack-model.md
- ADR-data-residency-model.md
