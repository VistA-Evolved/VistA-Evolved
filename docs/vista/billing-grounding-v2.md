# VistA Billing Grounding v2 -- Phase 42 Claim Draft Source Map

> Identifies which VistA packages/files/routines are available in the WorldVistA
> Docker sandbox for billing and AR, and maps each claim draft object to its RPC
> or data source.

## 1. Package Availability (WorldVistA Docker)

| Package | Prefix | Key Global(s) | Sandbox Status | Notes |
|---------|--------|---------------|----------------|-------|
| PCE (Patient Care Encounter) | AUPN | ^AUPNVSIT, ^AUPNVCPT, ^AUPNVPOV | **POPULATED** | 68 visits, 32 CPT, 28 POV |
| Integrated Billing (IB) | IB | ^IB(350), ^IBE(350.1) | EMPTY (types populated) | 0 actions, 122 action types |
| Claims Tracking | DGCR | ^DGCR(399) | EMPTY | 0 claims |
| Accounts Receivable | PRCA | ^PRCA(430), ^PRCA(433) | EMPTY (2 seed payments) | Requires IB pipeline |
| Insurance Company | DIC(36) | ^DIC(36) | **POPULATED** | 2 insurance companies |
| Patient Insurance | DPT(.312) | ^DPT(N,.312) | **PARTIAL** | Some patients have coverage |
| Hospital Location | SC | ^SC(44) | **POPULATED** | 10 clinic locations |
| New Person (Provider) | VA(200) | ^VA(200) | **POPULATED** | Provider data with NPI potential |
| Institution (Facility) | DIC(4) | ^DIC(4) | **POPULATED** | Facility identifiers |

## 2. Claim Draft Object -> VistA Source Map

### 2a. Encounter Identifiers (LIVE)

| Object | RPC | Status | Parameters | Returns |
|--------|-----|--------|------------|---------|
| Visit list | `ORWPCE VISIT` | LIVE | DFN | Visit IEN, date, location, type |
| Visit detail | `ORWPCE GET VISIT` | LIVE | Visit IEN | Full visit header |
| Visit existence | `ORWPCE HASVISIT` | LIVE | Note IEN | Boolean |
| Service info | `ORWPCE GETSVC` | LIVE | DFN | Service-connected data |

### 2b. Diagnoses (LIVE)

| Object | RPC | Status | Parameters | Returns |
|--------|-----|--------|------------|---------|
| Encounter diagnoses | `ORWPCE DIAG` | LIVE | Visit IEN | ICD codes with qualifiers |
| ICD-10 lookup | `ORWPCE4 LEX` | LIVE | search text | Code + description |
| Code validation | `ORWPCE ACTIVE CODE` | LIVE | code | Active/inactive status |
| Lexicon code | `ORWPCE LEXCODE` | LIVE | IEN | Coded value |

### 2c. Procedures (LIVE)

| Object | RPC | Status | Parameters | Returns |
|--------|-----|--------|------------|---------|
| Encounter procedures | `ORWPCE PROC` | LIVE | Visit IEN | CPT codes + modifiers |
| Full PCE data | `ORWPCE PCE4NOTE` | LIVE | Note IEN | All PCE data for a note |
| All PCE data (IB) | `IBD GET ALL PCE DATA` | LIVE | Visit/Note IEN | Billing-oriented PCE data |

### 2d. Provider/Facility Identifiers (LIVE via wrapper)

| Object | Source | Status | Notes |
|--------|--------|--------|-------|
| Provider DUZ | Session (login) | LIVE | Always available from auth |
| Provider name | `XUS GET USER INFO` | LIVE | Returns DUZ, name |
| Provider NPI | `^VA(200,DUZ,41.99)` | NEEDS WRAPPER | NPI stored in New Person file |
| Facility name | `^DIC(4,IEN,0)` | NEEDS WRAPPER | Institution file |
| Facility NPI/TaxID | `^DIC(4,IEN,...)` | NEEDS WRAPPER | Tax ID in Institution file |

**Wrapper needed:** `VE RCM PROVIDER INFO` -- reads provider NPI and facility IDs from
FileMan safely, returns structured delimited output.

### 2e. Patient Coverage / Insurance (LIVE)

| Object | RPC | Status | Parameters | Returns |
|--------|-----|--------|------------|---------|
| Insurance query | `IBCN INSURANCE QUERY` | LIVE | DFN | Policy name, group, subscriber, dates |
| Insurance list | `IBCN INSURANCE LIST` | AVAILABLE | DFN | Insurance entries |

### 2f. Charge Items (INTEGRATION-PENDING)

| Object | Source | Status | Notes |
|--------|--------|--------|-------|
| IB Actions | ^IB(350) | EMPTY | No billing actions in sandbox |
| IB Action Types | ^IBE(350.1) | POPULATED (122) | Reference data only |
| Charge capture | Requires IB configuration | PENDING | Use PCE CPT codes as proxy |

**Workaround for sandbox:** Build charge lines from PCE CPT codes (ORWPCE PROC)
with estimated charges. In production, link to IB ACTION entries.

### 2g. Claims / AR (INTEGRATION-PENDING)

| Object | Global | Status | Migration |
|--------|--------|--------|-----------|
| Claims (BILL/CLAIMS) | ^DGCR(399) | EMPTY | Requires IB GENERATE CLAIM workflow |
| AR Transactions | ^PRCA(430) | EMPTY | Requires IB -> AR pipeline |
| AR Payments | ^PRCA(433) | 2 seed records | Requires active billing |

## 3. Claim Draft Builder Strategy

The `buildClaimDraftFromVista()` function uses this strategy:

1. **Encounters** -- Call `ORWPCE VISIT` for patient visit list (LIVE)
2. **Diagnoses** -- Call `ORWPCE DIAG` for each selected encounter (LIVE)
3. **Procedures** -- Call `ORWPCE PROC` for CPT codes (LIVE)
4. **Insurance** -- Call `IBCN INSURANCE QUERY` for payer info (LIVE)
5. **Provider** -- Call `VE RCM PROVIDER INFO` wrapper for NPI/facility (LIVE)
6. **Charges** -- Derive from CPT codes with `$0.00` placeholder (PENDING)
7. **Annotate** -- Mark missing fields with `missingFields[]` and `sourceMissing[]`

### Missing Field Annotations

| Field | Source | Sandbox Status | Missing Annotation |
|-------|--------|---------------|-------------------|
| IB charge amount | ^IB(350) | EMPTY | `ibChargeAmount: "IB billing empty in sandbox"` |
| Claim IEN | ^DGCR(399) | EMPTY | `vistaClaimIen: "No VistA claims in sandbox"` |
| Subscriber ID | ^DPT(.312) | PARTIAL | `subscriberId: "Patient may lack insurance"` |
| Provider NPI | ^VA(200,.NPI) | CHECK | `providerNpi: "NPI field may be empty"` |
| Facility Tax ID | ^DIC(4) | CHECK | `facilityTaxId: "Institution file may lack Tax ID"` |

## 4. New Wrapper RPC: VE RCM PROVIDER INFO

**Purpose:** Safely read provider NPI and facility identifiers not exposed
by standard CPRS RPCs.

**Parameters:**
- `DUZ` (provider internal entry number)

**Returns (delimited):**
```
PROVIDER_NAME^NPI^FACILITY_NAME^FACILITY_IEN^STATION_NUMBER
```

**MUMPS routine:** `ZVERCMP.m` (read-only, FileMan-safe)

**Install:** Via `install-rcm-wrappers.ps1`

## 5. Integration Path for Production VistA

| Phase | Action |
|-------|--------|
| 1 | Activate IB package (if not active) |
| 2 | Configure IB Action Types for facility |
| 3 | CPRS encounter checkout will create ^IB(350) entries |
| 4 | IB GENERATE CLAIM will create ^DGCR(399) entries |
| 5 | AR posting will populate ^PRCA(430) |
| 6 | Replace `buildClaimDraftFromVista()` charge derivation with real IB data |
| 7 | Remove integration-pending markers from endpoints |
