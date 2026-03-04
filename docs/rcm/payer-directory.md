# Payer Directory Engine

> Phase 44 -- Global Payer Directory with Authoritative Importers

## Overview

The Payer Directory Engine maintains a canonical, jurisdiction-aware registry
of payers sourced from authoritative regulatory bodies and commercial
clearinghouse rosters. It replaces ad-hoc seed files with a structured
import-normalize-diff-apply pipeline.

## Architecture

```
Reference Sources (JSON snapshots)
        |
        v
  Importers (PH/AU/US/SG/NZ)
        |
        v
  ImportResult[] (raw payer records)
        |
        v
  Normalization Pipeline (dedup, merge channels)
        |
        v
  Diff Engine (added/removed/modified)
        |
        v
  Apply to Runtime Registry (upsertPayer)
        |
        v
  Audit Trail (directory.refreshed)
```

## Key Files

| File                                                 | Purpose                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| `apps/api/src/rcm/payerDirectory/types.ts`           | Canonical schema (DirectoryPayer, PayerImporter, EnrollmentPacket) |
| `apps/api/src/rcm/payerDirectory/normalization.ts`   | Pipeline: normalize, diff, apply, enrollment store                 |
| `apps/api/src/rcm/payerDirectory/routing.ts`         | Claim routing engine (jurisdiction + payer -> connector)           |
| `apps/api/src/rcm/payerDirectory/importers/index.ts` | Central importer registry                                          |
| `apps/api/src/rcm/payerDirectory/importers/*.ts`     | Individual country importers                                       |
| `reference/payer-sources/`                           | Authoritative source snapshots                                     |

## Importers

| ID                        | Country | Source                        | Payers                               |
| ------------------------- | ------- | ----------------------------- | ------------------------------------ |
| `ph-insurance-commission` | PH      | Insurance Commission HMO list | 28 (PhilHealth + 27 HMOs)            |
| `au-apra`                 | AU      | APRA registered insurers      | 22 (Medicare AU + DVA + 20 insurers) |
| `us-clearinghouse`        | US      | Generic clearinghouse         | 8 (3 networks + 5 federal payers)    |
| `us-availity`             | US      | Availity network              | Roster-based (file import)           |
| `us-officeally`           | US      | Office Ally network           | Roster-based (file import)           |
| `sg-nz-gateways`          | SG/NZ   | MoH + ACC                     | 5 (3 SG + 2 NZ)                      |

## API Endpoints

### Directory

| Method | Path                        | Description                                                |
| ------ | --------------------------- | ---------------------------------------------------------- |
| GET    | `/rcm/directory/stats`      | Directory statistics                                       |
| GET    | `/rcm/directory/importers`  | List registered importers                                  |
| GET    | `/rcm/directory/history`    | Refresh history                                            |
| GET    | `/rcm/directory/payers`     | List directory payers (filter: country, payerType, search) |
| GET    | `/rcm/directory/payers/:id` | Single directory payer detail                              |
| POST   | `/rcm/directory/refresh`    | Run all importers and refresh (admin)                      |
| POST   | `/rcm/directory/import/:id` | Run single importer (with optional file upload)            |

### Enrollment

| Method | Path                       | Description                       |
| ------ | -------------------------- | --------------------------------- |
| GET    | `/rcm/enrollment`          | List all enrollment packets       |
| GET    | `/rcm/enrollment/:payerId` | Get enrollment packet for a payer |
| POST   | `/rcm/enrollment/:payerId` | Create/update enrollment packet   |

### Routing

| Method | Path                    | Description                             |
| ------ | ----------------------- | --------------------------------------- |
| POST   | `/rcm/claims/:id/route` | Resolve route for a claim               |
| GET    | `/rcm/routing/resolve`  | Resolve route by payerId + jurisdiction |

## Routing Engine

The routing engine resolves the best connector for claim submission:

1. Check directory payer channels (preferred)
2. Fall back to base payer registry endpoints
3. Fall back to jurisdiction default connector
4. Return `ROUTE_NOT_FOUND` with remediation steps

### Jurisdiction Defaults

| Country | Default Connector |
| ------- | ----------------- |
| US      | clearinghouse     |
| PH      | philhealth        |
| AU      | eclipse-au        |
| SG      | nphc-sg           |
| NZ      | acc-nz            |

## Enrollment Packets

Each payer can have an enrollment packet tracking:

- Organization identifiers (NPI, Tax ID, etc.)
- Certification requirements
- Go-live checklist with step tracking
- Contacts
- Testing steps
- Status: NOT_STARTED -> IN_PROGRESS -> TESTING -> LIVE -> SUSPENDED

## Data Classification

- **DirectoryPayer**: Public payer info from regulatory sources. Not PHI.
- **EnrollmentPacket**: Organization-level business data. Not PHI but sensitive.
- **Routing decisions**: Logged to audit trail. No PHI in route selection.
