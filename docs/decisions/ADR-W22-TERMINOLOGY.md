# ADR: Terminology Posture — SNOMED CT, LOINC, UCUM, ICD, CPT

- **Status**: Accepted
- **Date**: 2026-03-01
- **Phase**: 389 (W22-P1)

## Context

Clinical content packs, CDS rules, lab results, imaging orders, and pharmacy
workflows all reference coded clinical concepts. Multiple terminology systems
are in use across the platform:

| System | Use Case | Licensing |
|--------|----------|-----------|
| SNOMED CT | Problems, diagnoses, clinical findings | NLM UMLS license (free for US users) |
| LOINC | Lab test codes, observation identifiers | Free, Regenstrief license |
| UCUM | Units of measure | Free, public domain |
| ICD-10-CM | Diagnosis coding for billing | Free (CMS) |
| ICD-10-PCS | Procedure coding (inpatient) | Free (CMS) |
| CPT/HCPCS | Procedure coding (professional) | **AMA license required** |
| NDC | Drug identification | Free (FDA) |
| RxNorm | Drug normalization | Free (NLM) |

The platform MUST handle coded values but must NOT embed proprietary code set
tables (specifically CPT descriptions) without licensing.

## Decision

**Reference-only posture for proprietary code sets; full posture for free
standards.**

### What we do

1. **LOINC** — full adoption:
   - Wave 21 normalization engine maps device codes to LOINC
   - Lab order catalogs reference LOINC codes
   - CDS rules reference LOINC for lab result triggers
   - We include LOINC code values in our codebase (free license)

2. **UCUM** — full adoption:
   - Unit normalization throughout (Wave 21 `normalization-engine.ts`)
   - Display preferences per locale (mg/dL vs mmol/L)
   - UCUM is public domain — no licensing concern

3. **SNOMED CT** — code reference only:
   - Content packs may reference SNOMED codes for clinical concepts
   - We do NOT embed the SNOMED hierarchy or descriptions
   - Lookup deferred to VistA Lexicon or external terminology server
   - US users: NLM UMLS license covers SNOMED CT use

4. **ICD-10-CM/PCS** — code reference only:
   - RCM workflows use ICD codes for diagnosis/procedure coding
   - Code values pass through as-is (free CMS distribution)
   - We do NOT embed the full ICD tabular index
   - Validation deferred to VistA or external code service

5. **CPT/HCPCS** — pass-through only:
   - RCM claim lines carry CPT codes
   - Code values are stored as strings, never with AMA descriptions
   - No CPT description table bundled in the platform
   - Clearinghouse/payer validates code set membership
   - This avoids AMA licensing requirements (per Phase 40 decision)

6. **NDC/RxNorm** — code reference:
   - Pharmacy workflows reference NDC and RxNorm for drug identification
   - VistA National Drug File is the master (via RPC reads)
   - No FDA NDC directory bundled — lookup via VistA or external

### Terminology Service Interface

```typescript
interface TerminologyLookup {
  lookupCode(system: string, code: string): Promise<CodeDisplay | null>;
  validateCode(system: string, code: string): Promise<boolean>;
  searchCodes(system: string, query: string, limit?: number): Promise<CodeDisplay[]>;
}
```

- Default implementation delegates to VistA Lexicon RPCs where available
- Stub implementation returns code-only (no display) for offline use
- External FHIR terminology server can be wired as a future enhancement

### Why not bundle all code sets?

- CPT requires AMA licensing ($$$) — we are an open-source project
- Embedding full SNOMED/ICD hierarchies adds hundreds of MB
- VistA already has these tables — duplicating creates sync drift
- Pass-through is sufficient for workflow; display comes from VistA/external

### Why not require an external terminology server?

- Adds deployment complexity for small/single-site installs
- VistA Lexicon covers most US clinical terminology needs
- PhilHealth and other markets have different code set requirements
- We provide the interface; implementers choose the backend

## Consequences

- Content packs use LOINC/UCUM freely (free license, embedded references ok)
- Content packs reference SNOMED/ICD/CPT codes but NOT descriptions
- Platform never displays CPT descriptions from bundled data
- Terminology lookups are async and can fail gracefully (show code only)
- VistA Lexicon is the default terminology backend for US deployments
- Multi-market packs can reference country-specific code systems via config
- Future: FHIR terminology server integration via the same interface
