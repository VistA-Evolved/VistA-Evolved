# Inpatient ADT Grounding — VistA FileMan + RPC Surface

> Phase 83 — VistA-first data grounding for inpatient operations

## 1. Core FileMan Files

| File # | Name                         | Global       | Purpose                                              |
| ------ | ---------------------------- | ------------ | ---------------------------------------------------- |
| 2      | PATIENT                      | ^DPT         | Master patient record; inpatient status field (.351) |
| 42     | WARD LOCATION                | ^DIC(42)     | Ward definitions; beds, treating specialty, service  |
| 405    | PATIENT MOVEMENT             | ^DGPM(405)   | Every admission/transfer/discharge event             |
| 405.1  | PATIENT MOVEMENT TYPE        | ^DGPM(405.1) | Movement event types (admit, transfer, discharge)    |
| 405.4  | ROOM-BED                     | ^DIC(42.4)   | Room/bed definitions per ward                        |
| 45     | PTF (Patient Treatment File) | ^DGPT(45)    | Discharge summary / disposition                      |
| 45.7   | TREATING SPECIALTY           | ^DIC(45.7)   | Specialty definitions                                |
| 200    | NEW PERSON                   | ^VA(200)     | Attending/admitting providers                        |

## 2. Key Fields

### PATIENT MOVEMENT (405)

| Field                       | #               | Description                                |
| --------------------------- | --------------- | ------------------------------------------ |
| PATIENT                     | .01             | Pointer to PATIENT (2)                     |
| DATE/TIME                   | .01 (node 0,p1) | Movement date/time (FileMan format)        |
| TRANSACTION                 | .02             | Type: 1=Admission, 2=Transfer, 3=Discharge |
| WARD LOCATION               | .06             | Pointer to WARD LOCATION (42)              |
| ROOM-BED                    | .07             | Pointer to ROOM-BED (405.4)                |
| FACILITY TREATING SPECIALTY | .09             | Pointer to TREATING SPECIALTY (45.7)       |
| ATTENDING PHYSICIAN         | .19             | Pointer to NEW PERSON (200)                |

### WARD LOCATION (42)

| Field              | #        | Description                           |
| ------------------ | -------- | ------------------------------------- |
| NAME               | .01      | Ward name                             |
| DIVISION           | .015     | Pointer to institution                |
| SERVICE            | .017     | W=Ward, D=Domiciliary, NH=NursingHome |
| TREATING SPECIALTY | .015     | Default specialty                     |
| TOTAL BEDS         | 0;12     | Bed capacity                          |
| CURRENT PATIENTS   | computed | Active admissions count               |

### ROOM-BED (405.4)

| Field  | #   | Description                       |
| ------ | --- | --------------------------------- |
| NAME   | .01 | Room-bed identifier (e.g., "3-A") |
| WARD   | .02 | Pointer to WARD LOCATION (42)     |
| STATUS | 1   | Active/Inactive/OOS               |

## 3. RPC Surface — Discovered & Used

### Live RPCs (Phase 67, confirmed in sandbox)

| RPC                       | Package | Used By                            | Returns                                   |
| ------------------------- | ------- | ---------------------------------- | ----------------------------------------- |
| `ORQPT WARDS`             | OR      | /vista/inpatient/wards             | IEN^NAME list of all wards                |
| `ORQPT WARD PATIENTS`     | OR      | /vista/inpatient/ward-census       | DFN^NAME per ward                         |
| `ORWPT16 ADMITLST`        | OR      | /vista/inpatient/patient-movements | DFN^NAME^DATE^WARD^ROOM admission history |
| `ORQPT PROVIDER PATIENTS` | OR      | Phase 67 only                      | DFN^NAME for provider's patients          |
| `ORQPT TEAMS`             | OR      | Phase 67 only                      | IEN^NAME team list                        |
| `ORQPT SPECIALTIES`       | OR      | Phase 67 only                      | IEN^NAME specialty list                   |
| `ORWU1 NEWLOC`            | OR      | Phase 67 only                      | Location search                           |

### Integration-Pending RPCs (DG package, not in sandbox context)

| RPC                  | Package | Purpose                        | FileMan Target               |
| -------------------- | ------- | ------------------------------ | ---------------------------- |
| `DGPM NEW ADMISSION` | DG      | Admit patient                  | ^DGPM(405) new entry, type=1 |
| `DGPM NEW TRANSFER`  | DG      | Transfer patient between wards | ^DGPM(405) new entry, type=2 |
| `DGPM NEW DISCHARGE` | DG      | Discharge patient              | ^DGPM(405) new entry, type=3 |

### Custom RPCs Needed (ZVE\* namespace)

| Proposed RPC     | Purpose                                     | FileMan Reads            | Priority |
| ---------------- | ------------------------------------------- | ------------------------ | -------- |
| `ZVEWARD CENSUS` | Batch ward census with counts               | ^DIC(42), ^DGPM(405)     | Medium   |
| `ZVEBED LIST`    | Bed inventory per ward (occupied/empty/OOS) | ^DIC(42.4), ^DGPM(405)   | High     |
| `ZVEADTM LIST`   | Full movement chain for patient             | ^DGPM(405), ^DGPM(405.1) | High     |
| `ZVEADTM DETAIL` | Single movement detail with all fields      | ^DGPM(405) node 0        | Medium   |

## 4. Data Flow

```
ORQPT WARDS
    ├── Returns IEN^NAME for each ward in ^DIC(42)
    └── Used by: /vista/inpatient/wards (with census counts)

ORQPT WARD PATIENTS(wardIen)
    ├── Returns DFN^NAME for patients on a ward
    ├── Reads current admission in ^DGPM(405) where type=1 and no discharge
    └── Used by: /vista/inpatient/ward-census, /vista/inpatient/bedboard

ORWPT16 ADMITLST(dfn)
    ├── Returns admission episodes: DFN^NAME^ADMIT_DATE^WARD^ROOM
    ├── Reads ^DGPM(405,D0) for patient movements
    └── Used by: /vista/inpatient/ward-census (enrich), /vista/inpatient/patient-movements
```

## 5. Gaps & Migration Path

### Gap 1: Empty/OOS Bed Visibility

- **Problem:** ORQPT RPCs only return occupied beds (patients currently admitted)
- **Impact:** Bedboard cannot show empty beds or out-of-service beds
- **Solution:** Implement `ZVEBED LIST` RPC that reads ^DIC(42.4) to enumerate all room-beds for a ward with their current status
- **M routine sketch:**
  ```
  ZVEBED ; VistA Evolved - Bed inventory
   LIST(RESULT,WARD) ; List all beds for ward
   N BED,I,PAT,STATUS
   S I=0
   F  S BED=$O(^DIC(42.4,"C",WARD,BED)) Q:BED=""  D
   . S I=I+1
   . ; check ^DGPM(405) for current occupant
   . S RESULT(I)=BED_"^"_STATUS_"^"_PAT
   Q
  ```

### Gap 2: Full Movement Timeline

- **Problem:** ORWPT16 ADMITLST returns admission episodes, not individual transfers
- **Impact:** Movement timeline only shows admissions, not ward-to-ward transfers
- **Solution:** Implement `ZVEADTM LIST` RPC reading ^DGPM(405) movement chain
- **Reads:** ^DGPM(405,"APTT",DFN) cross-reference to walk all movements

### Gap 3: ADT Write Operations

- **Problem:** DG ADT write RPCs not in OR CPRS GUI CHART context
- **Impact:** Cannot admit/transfer/discharge patients through UI
- **Solution (Phase 83B):** Either add RPCs to context via VEMCTX3.m or implement ZVE\* wrapper RPCs

## 6. WorldVistA Sandbox Notes

- ORQPT WARDS returns 5-15 wards depending on sandbox configuration
- ORQPT WARD PATIENTS may return 0 patients (no active admissions in sandbox)
- ORWPT16 ADMITLST may return empty for patients never admitted
- ^DGPM(405) may have limited historical data
- Room-bed ^DIC(42.4) entries may be incomplete
