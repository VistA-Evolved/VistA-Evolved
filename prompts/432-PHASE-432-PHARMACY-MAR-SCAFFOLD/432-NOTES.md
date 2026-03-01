# Phase 432 — Notes

## Key Decisions
- `getInpatientMeds` is the ONLY live method — it reuses ORWPS ACTIVE and filters
  for UD (Unit Dose) and IV medication types. This provides real inpatient med
  order data from the sandbox without requiring PSB/PSJ packages.
- All 5 write/BCMA methods return `integration-pending` with full vistaGrounding
  including VistA files, sandbox notes, and step-by-step migration paths.
- The PharmacyVerifyRequest/Result types follow the VistA PSJ verification
  workflow: orders must be pharmacist-verified before dispensing.

## VistA Package Dependencies
| RPC | Package | Files | Status |
|-----|---------|-------|--------|
| ORWPS ACTIVE | OR | 100 | Available (used for getInpatientMeds) |
| PSB MED LOG | PSB | 53.79, 53.795 | Not in sandbox |
| PSJBCMA | PSJ | 53.45, 50 | Not in sandbox |
| PSJ VERIFY | PSJ | 53.1, 55 | Not in sandbox |
| PSJ ORDER STATUS | PSJ | 53.1 | Not in sandbox |
| PSB VALIDATE ORDER | PSB | 53.79 | Not in sandbox |

## Migration Path (when PSB/PSJ available)
1. Install PSB (BCMA) + PSJ (Inpatient Pharmacy) packages
2. Wire `getMAR` and `getAdminHistory` to PSB MED LOG read mode
3. Wire `recordAdministration` to PSB MED LOG write mode
4. Wire `scanBarcode` to PSJBCMA with NDC/UPC resolution
5. Wire `verifyOrder` to PSJ VERIFY
6. Enable BCMA 5-rights verification workflow (right patient, drug, dose, route, time)
