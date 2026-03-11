# VistA-Evolved Gap Assessment: Distro vs VEHU + Route Coverage

> Generated: 2026-03-11 | Tested against LIVE VEHU (port 9431)

## 1. Route Test Results

| Metric | Count | % |
|--------|------:|---:|
| Total routes tested | 357 | 100% |
| Data returned (real VistA data) | 222 | 62% |
| OK but empty (callable, no data for DFN) | 135 | 38% |
| MUMPS errors | 0 | 0% |
| 404 Not Found | 0 | 0% |
| Auth errors | 0 | 0% |
| Connection errors | 0 | 0% |

**100% of routes respond successfully with no errors.**

## 2. Per-Package Breakdown (22 active packages)

| Package | Namespace | Total | Data | Empty | Data % |
|---------|-----------|------:|-----:|------:|-------:|
| an | Anesthesiology | 15 | 9 | 6 | 60% |
| dg | Registration | 20 | 16 | 4 | 80% |
| ec | Event Capture | 20 | 7 | 13 | 35% |
| gmv | Vitals | 20 | 15 | 5 | 75% |
| ib | Integrated Billing | 20 | 18 | 2 | 90% |
| mag | VistA Imaging | 20 | 14 | 6 | 70% |
| mp | Master Patient Index | 20 | 11 | 9 | 55% |
| or | Order Entry | 20 | 10 | 10 | 50% |
| psb | Bar Code Med Admin | 20 | 11 | 9 | 55% |
| pso | Outpatient Pharmacy | 20 | 9 | 11 | 45% |
| px | PCE | 20 | 10 | 10 | 50% |
| ra | Radiology | 7 | 6 | 1 | 86% |
| rm | Record Tracking | 20 | 15 | 5 | 75% |
| sd | Scheduling | 20 | 10 | 10 | 50% |
| tiu | TIU Notes | 20 | 10 | 10 | 50% |
| wv | Women Veterans | 10 | 5 | 5 | 50% |
| xq | Menu Manager | 2 | 1 | 1 | 50% |
| xt | Toolkit | 13 | 6 | 7 | 46% |
| xu | Kernel | 5 | 4 | 1 | 80% |
| xus | Kernel Security | 20 | 13 | 7 | 65% |
| xwb | RPC Broker | 20 | 17 | 3 | 85% |
| ys | Mental Health | 5 | 5 | 0 | 100% |

## 3. Distro vs VEHU Comparison

### Census Results

| Global | VEHU | Distro | Winner |
|--------|-----:|-------:|--------|
| Patients (2) | 1,811 | 4 | VEHU |
| Options (19) | 10,946 | 11,249 | Distro |
| RPCs (8994) | 3,644 | 3,642 | Tie |
| Users (200) | 113 | 32 | VEHU |
| Clinics (44) | 13 | 2 | VEHU |
| Drugs (50) | 7,395 | 3,098 | VEHU |
| Orders (100) | 40,411 | 0 | VEHU |
| TIU Documents (8925) | 13,077 | 0 | VEHU |
| Lab Results (63) | 3,424 | 0 | VEHU |
| Prescriptions (52) | 5,103 | 0 | VEHU |
| Insurance (355.3) | 1,209 | 0 | VEHU |
| ICD Codes | 143,862 | 143,862 | Tie |
| Protocols (101) | 5,399 | 6,036 | Distro |
| Packages (9.4) | 195 | 197 | Distro |
| Routines | ~34,000 | ~34,000 | Tie |

### Strategic Decision

- **VEHU**: Primary development target (rich synthetic clinical data)
- **Distro**: Clean-room source build, used for complete code analysis & future production base
- **Dual-lane**: Both complement each other

## 4. RPC Parameter Mapping Needs

### RPCs that need specific parameters (not just DFN)

| RPC | Required Params | Current Status |
|-----|----------------|---------------|
| ORWDPS32 AUTH | User IEN (not DFN) | Needs param mapping |
| ORWOR SHEETS | ORVP (patient DFN as named param) | Needs LIST param |
| ORWLRR CHART/GRID | DATE1, DATE2 | Needs date params |
| TIU DOCUMENTS BY CONTEXT | Context type, begin/end dates | Works with DFN only (limited) |
| ORWDX SAVE | Complex order object | Write-only, needs full payload |
| PSJBCMA | Barcode string | BCMA-specific |
| SDEC APPADD | Clinic IEN, date, time | Scheduling write |

### RPCs that return empty with DFN=46 (need different test data)

Many "empty" responses are RPCs that:
1. Need a different patient DFN with specific data
2. Need additional parameters beyond DFN
3. Are lookup/utility RPCs that don't take patient context
4. Are write RPCs called as GET (will work when properly called as POST)

## 5. Component Status

| Layer | Count | Status |
|-------|------:|--------|
| API Routes (generated) | 357 | All responding (222 with data) |
| API Routes (hand-built) | 362+ | Existing CPRS routes |
| React Panels (generated) | 76 | Regenerated with RPC explorer UI |
| Frontend Panel Registry | 76 | Created (vista-panel-registry.ts) |
| VistA Workspace Page | 1 | Updated to use full registry |
| HybridMode Terminal | 1 | Fixed wiring (onOutput + sendRef) |
| SSH Terminal | 1 | Working (VistaSshTerminal) |

## 6. Remaining Gaps

1. **54 packages have generated route files but with 0 routes** (their RPCs are served via other route modules)
2. **Panel components need API_BASE config** for Next.js proxy or direct API access
3. **Write operations** (POST routes) need proper CSRF token handling
4. **Complex RPC parameters** (LIST params, named params) need per-RPC mapping
5. **Desktop/Mobile apps** not yet started
6. **Documentation site** not yet built
