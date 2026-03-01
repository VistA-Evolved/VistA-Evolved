# ADR: De-Identification Posture

## Status
Accepted

## Context
Analytics datasets must not leak PHI. Two approaches:

1. **Full de-identification (Safe Harbor / Expert Determination)** — removes
   or generalizes all 18 HIPAA identifiers. Requires statistical validation
   and potentially expert review. This is a compliance/legal decision.
2. **Pseudonymization** — replaces direct identifiers with deterministic
   tokens (keyed hashes). The data remains *personal data* under GDPR but
   is unlinkable without the key.

VistA-Evolved's analytics layer is an **engineering tool**, not a compliance
certification. The system provides configurable de-id and pseudonymization
primitives that organizations can tune to meet their regulatory posture.

## Decision

- **Default mode: `strict`** — all direct identifiers (name, SSN, DOB, MRN,
  address, phone, email, DFN) are redacted or pseudonymized before any
  dataset is materialized.
- **Pseudonymization uses tenant-scoped HMAC-SHA256** with a configurable
  secret. The same input always produces the same token within a tenant,
  enabling joins across pseudonymized datasets.
- **Free-text redaction** scans note/description fields for inline PHI
  patterns (SSN, DOB, VistA names) and replaces them with `[REDACTED]`.
- **Configuration is per-tenant** via `deid_config` with levels:
  `strict` (default), `pseudonymized`, `research` (approved researchers
  with IRB, future), `raw` (disabled — requires explicit override).
- **Denylist scan** runs as a post-step to verify no known identifier
  patterns survive in the output.
- **This is an engineering control, not legal advice.** Documentation
  explicitly states: "Consult your compliance officer and legal counsel
  before using de-identified datasets for any purpose."

## Consequences

- Strict mode is safe-by-default but loses analytic value for name/DOB fields.
- Pseudonymized mode allows cohort analysis but requires key management.
- The denylist scan catches common patterns but cannot guarantee zero leakage
  for unstructured free text (a limitation shared by all automated de-id).
- Research mode and raw mode are future placeholders gated by policy engine.
