# ADR: Bulk Data — FHIR Bulk Data IG Posture

- **Status**: Accepted
- **Date**: 2026-03-01
- **Phase**: 399 (W23-P1)

## Context

Population-level data export/import is required for analytics, HIE onboarding,
data migrations, and public health reporting. The FHIR Bulk Data Access IG
(STU2) defines a standard approach using NDJSON files.

## Decision

**Implement FHIR Bulk Data IG-aligned export/import** with tenant isolation,
job controls, and signed/encrypted output packages.

### Key Design Points

1. **Export jobs** are tenant-scoped and produce NDJSON files per resource type.
2. **Import jobs** validate NDJSON, use idempotency keys, and support dry-run.
3. **Security**: step-up auth required, reason code logged, rate-limited.
4. **Output**: signed + optionally encrypted packages (reuse existing security).
5. **Status tracking**: async job model with polling endpoint.

## Alternatives Considered

| Option                    | Pros                              | Cons                            |
| ------------------------- | --------------------------------- | ------------------------------- |
| Custom CSV export         | Simple                            | Not interoperable               |
| FHIR Bundle export        | Standard                          | Not scalable for large datasets |
| **Bulk Data IG (chosen)** | Standard, scalable, interoperable | More complex                    |

## Consequences

**Positive:**

- Aligns with ONC/TEFCA expectations for population data access
- NDJSON is streamable and tool-friendly (jq, pandas, Spark)
- Reuse of existing export/encryption infrastructure

**Negative:**

- Must implement async job model with status polling
- Large exports need disk/object-store staging
