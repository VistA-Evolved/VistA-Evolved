# Jurisdiction Packs

> Phase 44 -- Authoritative Importer Reference Data per Country

## Overview

Each jurisdiction pack provides a curated, authoritative source of payer data
for a specific country or region. Packs are loaded from snapshot files in
`reference/payer-sources/` and transformed by importers in
`apps/api/src/rcm/payerDirectory/importers/`.

## Pack: Philippines (PH)

**Source**: Insurance Commission of the Philippines - HMO Register  
**Snapshot**: `reference/payer-sources/philippines/ic-hmo-list.json`  
**Importer**: `ph-insurance-commission`

### Payers

| Payer ID            | Name                 | Type     |
| ------------------- | -------------------- | -------- |
| PH-PHILHEALTH       | PhilHealth           | NATIONAL |
| PH-HMO-MAXICARE     | Maxicare Healthcare  | PRIVATE  |
| PH-HMO-INTELLICARE  | Intellicare          | PRIVATE  |
| PH-HMO-MEDICARD     | Medicard Philippines | PRIVATE  |
| ... (27 HMOs total) |                      |          |

### Integration

- PhilHealth: `NATIONAL_GATEWAY` channel via `philhealth` connector
- HMOs: `PORTAL_BATCH` channel via `portal-batch` connector

---

## Pack: Australia (AU)

**Source**: APRA Register of Private Health Insurers  
**Snapshot**: `reference/payer-sources/australia/apra-insurers.json`  
**Importer**: `au-apra`

### Payers

| Payer ID                     | Name                           | Type       |
| ---------------------------- | ------------------------------ | ---------- |
| AU-MEDICARE                  | Medicare Australia             | NATIONAL   |
| AU-DVA                       | Department of Veterans Affairs | GOVERNMENT |
| AU-MEDIBANK                  | Medibank Private               | PRIVATE    |
| AU-BUPA                      | Bupa Health Insurance          | PRIVATE    |
| ... (20 APRA insurers total) |                                |            |

### Integration

- Medicare AU / DVA: `NATIONAL_GATEWAY` channel via `eclipse-au` connector
- Private insurers: `EDI_CLEARINGHOUSE` channel via `eclipse-au` connector

---

## Pack: United States (US)

**Source**: CMS + clearinghouse rosters  
**Importers**: `us-clearinghouse`, `us-availity`, `us-officeally`

### Federal Payers

| Payer ID      | Name             | Type       |
| ------------- | ---------------- | ---------- |
| US-MEDICARE-A | Medicare Part A  | NATIONAL   |
| US-MEDICARE-B | Medicare Part B  | NATIONAL   |
| US-MEDICAID   | Medicaid         | GOVERNMENT |
| US-TRICARE    | TRICARE          | GOVERNMENT |
| US-VA         | Veterans Affairs | GOVERNMENT |

### Network Entities

| Payer ID                    | Name        | Type          |
| --------------------------- | ----------- | ------------- |
| US-NETWORK-AVAILITY         | Availity    | NETWORK       |
| US-CLEARINGHOUSE-OFFICEALLY | Office Ally | CLEARINGHOUSE |
| US-CLEARINGHOUSE-STEDI      | Stedi       | CLEARINGHOUSE |

### Integration

- Federal payers: `EDI_CLEARINGHOUSE` channel
- Networks: route through their respective connectors (availity, officeally, stedi)
- Roster-based import: `importFromFile()` for CSV/JSON clearinghouse rosters

---

## Pack: Singapore (SG)

**Source**: Ministry of Health  
**Importer**: `sg-nz-gateways`

| Payer ID      | Name            | Type       |
| ------------- | --------------- | ---------- |
| SG-NPHC       | NPHC Gateway    | NATIONAL   |
| SG-MEDISAVE   | MediSave        | GOVERNMENT |
| SG-MEDISHIELD | MediShield Life | GOVERNMENT |

### Integration

- All: `NATIONAL_GATEWAY` channel via `nphc-sg` connector

---

## Pack: New Zealand (NZ)

**Source**: ACC + major private insurers  
**Importer**: `sg-nz-gateways`

| Payer ID         | Name                            | Type     |
| ---------------- | ------------------------------- | -------- |
| NZ-ACC           | ACC (Accident Compensation)     | NATIONAL |
| NZ-SOUTHERNCROSS | Southern Cross Health Insurance | PRIVATE  |

### Integration

- ACC: `DIRECT_API` channel via `acc-nz` connector
- Southern Cross: `DIRECT_API` channel via `acc-nz` connector

---

## Adding a New Jurisdiction

1. Create snapshot file: `reference/payer-sources/<country>/<source>.json`
2. Create importer: `apps/api/src/rcm/payerDirectory/importers/<country>.ts`
3. Register in `importers/index.ts` ALL_IMPORTERS array
4. Add connector mapping in `routing.ts` JURISDICTION_FALLBACK
5. Run `POST /rcm/directory/refresh` to load
6. Add documentation to this file
