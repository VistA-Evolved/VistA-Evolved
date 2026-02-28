# Evidence — Phase 311: Data Residency & Region Routing

## Deliverables Produced

| # | Artifact | Path |
|---|----------|------|
| 1 | Data residency module | `apps/api/src/platform/data-residency.ts` |
| 2 | Data residency routes | `apps/api/src/routes/data-residency-routes.ts` |

## Types & Functions Exported

| Export | Type | Description |
|--------|------|-------------|
| `DataRegion` | type | 6-region union type |
| `DATA_REGIONS` | const | Array of region identifiers |
| `REGION_CATALOG` | const | Metadata for all regions |
| `isValidDataRegion()` | function | Type guard |
| `getRegionMetadata()` | function | Lookup region metadata |
| `resolveRegionPgUrl()` | function | Region-aware PG URL |
| `resolveRegionAuditBucket()` | function | Region-aware S3 bucket |
| `validateCrossBorderTransfer()` | function | Transfer validation |
| `DataTransferAgreement` | interface | Agreement record type |
| `TenantRegionAssignment` | interface | Region assignment type |
| `RegionHealth` | interface | Region health check type |

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/residency/regions` | List all regions |
| GET | `/residency/regions/:region` | Region details |
| GET | `/residency/tenant/:tenantId` | Tenant region |
| POST | `/residency/tenant/:tenantId/assign` | Assign region (immutable) |
| POST | `/residency/transfer-agreements` | Create agreement |
| GET | `/residency/transfer-agreements` | List agreements |
| POST | `/residency/validate-transfer` | Validate transfer |

## Verification

All 11 gates PASS.
