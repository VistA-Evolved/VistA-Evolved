# Phase 312 — NOTES

## Decisions Made

1. **8 consent categories** — covers TPO (treatment/payment/operations), research,
   data sharing, cross-border, telehealth, analytics.
2. **3 profiles** — HIPAA (US, category-level), DPA_PH (Philippines, all-or-nothing),
   DPA_GH (Ghana, all-or-nothing).
3. **HIPAA TPO defaults to granted** — under HIPAA, treatment/payment/operations
   consent is implied. Research and data sharing require explicit consent.
4. **PH/GH default to denied** — both DPA frameworks require explicit consent
   for all processing activities.
5. **Consent is immutable** — revocation creates a new record linked to the
   original. Preserves the audit chain.

## Key Constraints

- `patientDfn` is stored in consent records for matching but MUST NOT appear
  in audit logs (Phase 151 PHI redaction applies).
- Evidence hash is SHA-256 truncated to 16 chars — enough for integrity but
  not the full evidence content.
- In-memory store follows Phase 23 pattern. DB backing via store-resolver later.
