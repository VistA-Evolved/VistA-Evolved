# VistA Billing Capability Map

> Phase 39 -- Grounding the RCM module in real VistA data structures

## Summary

| Category | Status | VistA File(s) | Data in Sandbox |
|----------|--------|---------------|-----------------|
| **Encounters (PCE)** | LIVE | 9000010 (Visit), 9000010.18 (V CPT), 9000010.07 (V POV) | 68 visits, 32 CPT, 28 POV |
| **Insurance** | LIVE | 36 (Insurance Co), 2.312 (Patient Insurance) | 2 companies, partial patient data |
| **ICD/Diagnosis Search** | LIVE | Lexicon | Via ORWPCE4 LEX / ORWPCE LEX |
| **Hospital Locations** | LIVE | 44 (Hospital Location) | 10 locations |
| **IB Action Types** | LIVE (ref only) | 350.1 (IB Action Type) | 122 type definitions |
| **IB Charges** | INTEGRATION-PENDING | 350 (IB Action) | EMPTY |
| **Claims Tracking** | INTEGRATION-PENDING | 399 (Bill/Claims) | EMPTY |
| **AR Transactions** | INTEGRATION-PENDING | 430 (Accounts Receivable) | EMPTY |
| **AR Payments** | PARTIAL | 433 (AR Transaction) | 2 entries (seed) |

## RPC Inventory (85 billing-related RPCs found)

### Encounter RPCs (LIVE) -- 55 RPCs

| RPC | IEN | Purpose | Sandbox Status |
|-----|-----|---------|----------------|
| ORWPCE GET VISIT | 683 | Get encounter data | Available |
| ORWPCE DIAG | 320 | Diagnoses for encounter | Available |
| ORWPCE PROC | 321 | Procedures for encounter | Available |
| ORWPCE VISIT | 322 | Visit details | Available |
| ORWPCE PCE4NOTE | 329 | PCE data for a note | Available |
| ORWPCE HASVISIT | 739 | Check note has visit | Available |
| ORWPCE GETSVC | 831 | Service-connected conditions | Available |
| ORWPCE SAVE | 336 | Save encounter (write) | Available |
| ORWPCE4 LEX | 2930 | ICD-10 lexicon search | Available |
| ORWPCE LEX | 340 | Lexicon search (older) | Available |
| ORWPCE LEXCODE | 341 | Code for lexicon entry | Available |
| ORWPCE ACTIVE CODE | 1555 | Check ICD code active | Available |
| ORWPCE ICDVER | 2924 | ICD version date | Available |
| ORWPCE I10IMPDT | 2947 | ICD-10 impl date | Available |
| ORWPCE GET DX TEXT | 2837 | Diagnosis display text | Available |
| ORWPCE IMM | 447 | Immunizations | Available |
| ORWPCE SK | 448 | Skin tests | Available |
| ORWPCE PED | 449 | Patient education | Available |
| ORWPCE HF | 450 | Health factors | Available |
| ORWPCE TRT | 451 | Treatments | Available |
| ORWPCE XAM | 452 | Exams | Available |
| ... | ... | (55 total ORWPCE RPCs) | Available |

### Insurance RPCs (LIVE) -- 3 RPCs

| RPC | IEN | Purpose | Sandbox Status |
|-----|-----|---------|----------------|
| IBCN INSURANCE QUERY | 1497 | Query patient insurance | Available |
| IBCN INSURANCE QUERY TASK | 1498 | Tasked insurance query | Available |
| SPN MEANS & ELIGIBILITY | 2564 | Means test / eligibility | Available |

### IBD Form RPCs (LIVE) -- 12 RPCs

| RPC | IEN | Purpose | Sandbox Status |
|-----|-----|---------|----------------|
| IBD GET ALL PCE DATA | 113 | All PCE data for billing | Available |
| IBD GET FORMSPEC | 71 | Billing form spec | Available |
| IBD GET INPUT OBJECT BY CLINIC | 72 | Input objects per clinic | Available |
| IBD VALIDATE USER | 76 | Validate billing user | Available |
| IBD GET PAST APPT LIST | 114 | Past appointments | Available |
| IBD EXPAND FORMID | 70 | Expand form ID | Available |

### Pharmacy Billing RPCs (LIVE) -- 3 RPCs

| RPC | IEN | Purpose |
|-----|-----|---------|
| IBARXM QUERY ONLY | 769 | Pharmacy billing query |
| IBARXM TRANS DATA | 770 | Pharmacy transaction data |
| IBARXM TRANS BILL | 1117 | Pharmacy billing transaction |

### Means Test / Copay RPCs (LIVE) -- 2 RPCs

| RPC | IEN | Purpose |
|-----|-----|---------|
| IBO MT LTC COPAY QUERY | 1320 | Means test / LTC copay |
| DGBT CLAIM DEDUCTIBLE PAID | 2911 | Claim deductible status |

### Scheduling Wait-List RPCs (LIVE) -- 14 RPCs

| RPC | IEN | Purpose |
|-----|-----|---------|
| SD W/L RETRIVE FULL DATA | 1293 | Full wait-list data |
| SD W/L RETRIVE BRIEF | 1295 | Brief wait-list |
| SD W/L RETRIVE HOSP LOC(#44) | 1300 | Wait-list by location |
| SD W/L CREATE FILE | 1294 | Create wait-list entry |
| ... | ... | (14 total SD W/L RPCs) |

## VistA Routines Present

| Routine | Purpose | Status |
|---------|---------|--------|
| IBRFN | IB utility functions | Present |
| IBCNSP | IB insurance company search | Present |
| IBCNS | IB insurance company | Present |
| PRCAFN | AR utility functions | Present |
| PRCASER | AR service functions | Present |
| ORWPCE | PCE encounter form driver | Present |

## Integration-Pending: Migration Path

### IB Charges (File 350)
- **Current**: ^IB(350) is empty in sandbox
- **Target**: When IB billing is configured in production, IB ACTION entries
  are created by CPRS encounter checkout (via IBD RPCs) and pharmacy billing
  (via IBARXM RPCs)
- **Migration**: Read ^IB(350) via FileMan API or custom RPC wrapper
- **Routines**: IBCF (claim form), IBCE (claim extract), IBJP (claim print)

### Claims Tracking (File 399)
- **Current**: ^DGCR(399) is empty in sandbox
- **Target**: Claims are generated by IB GENERATE CLAIM workflow after IB
  ACTION entries exist
- **Migration**: Read ^DGCR(399) via FileMan or IBCF RPCs
- **Dependency**: Requires IB Actions first

### AR Transactions (File 430)
- **Current**: ^PRCA(430) is empty in sandbox
- **Target**: AR transactions created when claims are billed and payments posted
- **Migration**: Query via PRCA RPCs (PRCAFN, PRCASER routines present)
- **Dependency**: Requires Claims first

## Data Samples (from probe)

### Patient 3 Visits
```
Visit 7:  date=3050719.113608 loc=DR OFFICE
Visit 9:  date=3050708.1303   loc=DR OFFICE
Visit 18: date=3050721.085656 loc=DR OFFICE
Visit 21: date=3050721.153929 loc=DR OFFICE
Visit 24: date=3050723.161454 loc=DR OFFICE
```

### V CPT (Procedures)
```
CPT 5: code=99212 (Office visit, est patient, level 2) visit=1 provider=16
```

### V POV (Diagnoses)
```
POV 5: code=12827 visit=1
POV 6: code=9383  visit=1
```

## Machine-Readable Map

See `data/vista/capability-map-billing.json` for the complete JSON capability
map used by the API capability service.
