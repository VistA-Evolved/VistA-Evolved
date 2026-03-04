# Wave 12 Manifest -- Departmental Depth Writeback + Enterprise Interfaces at Scale

**Generated:** 2026-03-01
**BASE_PHASE:** 299 (computed from max prompt prefix 298 + 1)
**Phases:** 299-308 (10 phases, sequential, no gaps)

## Phase Map

| Phase ID | Folder Prefix | Slug    | Title                                      | Status  | Dependencies |
| -------- | ------------- | ------- | ------------------------------------------ | ------- | ------------ |
| 299      | 299           | W12-P1  | Manifest + Scope Matrix + OSS Reuse ADRs   | Planned | --           |
| 300      | 300           | W12-P2  | Clinical Writeback Command Bus             | Planned | P299         |
| 301      | 301           | W12-P3  | TIU Notes Writeback (draft/edit/sign)      | Planned | P300         |
| 302      | 302           | W12-P4  | Orders Writeback Core (create/discontinue) | Planned | P300         |
| 303      | 303           | W12-P5  | Pharmacy Deep Writeback                    | Planned | P302         |
| 304      | 304           | W12-P6  | Lab Deep Writeback                         | Planned | P302         |
| 305      | 305           | W12-P7  | Inpatient ADT Writeback + Bedboard         | Planned | P300         |
| 306      | 306           | W12-P8  | Imaging/PACS Production Validation         | Planned | P302         |
| 307      | 307           | W12-P9  | Telehealth Provider Hardening              | Planned | P300         |
| 308      | 308           | W12-P10 | Departmental Certification Runner          | Planned | P301-P307    |

## Dependency Graph

```
P299 (Manifest + Scope Matrix)
 └── P300 (Clinical Writeback Command Bus)
      ├── P301 (TIU Notes Writeback)
      ├── P302 (Orders Writeback Core)
      │    ├── P303 (Pharmacy Deep Writeback)
      │    ├── P304 (Lab Deep Writeback)
      │    └── P306 (Imaging/PACS Validation)
      ├── P305 (Inpatient ADT Writeback)
      └── P307 (Telehealth Hardening)
           └── P308 (Certification Runner) [depends on all above]
```

## ADR References

| ADR                  | Path                                  | Decision                        |
| -------------------- | ------------------------------------- | ------------------------------- |
| PACS Viewer          | docs/adrs/ADR-PACS-viewer.md          | Keep OHIF                       |
| DICOM Store          | docs/adrs/ADR-DICOM-store.md          | Keep Orthanc                    |
| Telehealth Providers | docs/adrs/ADR-telehealth-providers.md | Keep Jitsi + provider interface |
| HL7 Ops              | docs/adrs/ADR-HL7-ops.md              | Keep built-in HL7 engine        |

## Existing Code Inventory (pre-Wave 12)

### Writeback Routes Already Present

- **Notes (TIU):** create, sign, addendum, edit in `tiu-notes.ts` + `wave2-routes.ts`
- **Orders (OR):** draft, verify, dc, flag, sign, lab quick-order in `orders-cpoe.ts` + `wave2-routes.ts`
- **Pharmacy (PS):** quick-order med in `wave2-routes.ts`, active meds read
- **Labs (LR):** lab order in `orders-cpoe.ts`, ack in `wave2-routes.ts`
- **ADT:** admit/transfer/discharge in `adt/index.ts`
- **eMAR:** administer, barcode-scan in `emar/index.ts`
- **Scheduling:** create/cancel/checkin/checkout in `scheduling/index.ts`

### Safety Infrastructure Already Present

- **Idempotency:** DB-backed middleware in `middleware/idempotency.ts` (24h TTL)
- **Audit:** 3 hash-chained audit trails (immutable, imaging, RCM)
- **Feature Flags:** `tenant_feature_flag` PG table + admin API
- **RPC Registry:** 137 RPCs + 59 exceptions, domain-tagged
- **Circuit Breaker:** `rpc-resilience.ts` (5 failures -> open, 30s half-open)
- **Store Policy:** 50+ stores registered with classification/durability

### What Wave 12 Adds

- **Command Bus:** Unified safety wrapper for ALL writebacks (not just idempotency)
- **Dry-run mode:** Record intended RPC call without executing
- **Contract tests:** Record/replay fixtures for write RPCs
- **Deep pharmacy/lab:** Lifecycle visibility beyond basic ordering
- **Inpatient bedboard:** Ward census + movement visualization
- **Imaging production:** Orthanc/OHIF hardening + tenant isolation
- **Telehealth hardening:** Encounter linkage + consent posture
- **Certification runner:** Hospital-day scenario automation

## Notes

- All writeback features default OFF behind tenant feature gates
- Dry-run mode is mandatory for all command bus commands
- Contract tests use record/replay pattern for deterministic CI
- No PHI in evidence, logs, or audit trails
