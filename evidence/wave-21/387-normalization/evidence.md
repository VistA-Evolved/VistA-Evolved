# Evidence: Phase 387 — W21-P10 LOINC/UCUM Normalization

## Phase ID
387

## Wave
21 — Device + Modality Integration Platform

## Title
LOINC/UCUM Normalization Engine + Terminology Mapping Tables

## Artifacts Created
| File | Lines | Purpose |
|------|-------|---------|
| `normalization-engine.ts` | ~230 | Mapping tables: 13 MDC, 24 lab, 30 UCUM + engine |
| `normalization-routes.ts` | ~120 | 7 REST endpoints |

## LOINC Mapping Coverage
| Domain | Source System | Count | Examples |
|--------|-------------|-------|---------|
| Vital Signs | MDC | 13 | SpO2→59408-5, HR→8867-4, BP→8480-6 |
| Chemistry | ASTM | 9 | GLU→2345-7, NA→2951-2, K→2823-3 |
| Blood Gas | ASTM | 5 | pH→2744-1, pCO2→2019-8, pO2→2703-7 |
| Hematology | ASTM | 5 | HGB→718-7, WBC→6690-2, PLT→777-3 |
| Coagulation | ASTM | 3 | PT→5902-2, INR→6301-6, aPTT→3173-2 |
| POCT | POCT1A | 2 | GLUCOSE→2345-7, LACTATE→2524-7 |

## UCUM Conversion Coverage
| Category | Count | Notable |
|----------|-------|---------|
| Identity (already UCUM) | 22 | %, bpm, mmHg, mg/dL, etc. |
| Temperature conversion | 2 | F→Cel (5/9 factor) |
| Case normalization | 6 | mg/dl→mg/dL, etc. |

## Endpoint Inventory (7 endpoints)
| Method | Path | Auth |
|--------|------|------|
| POST | `/devices/normalize` | admin |
| POST | `/devices/normalize/batch` | admin |
| GET | `/devices/normalize/mappings` | admin |
| GET | `/devices/normalize/mappings/loinc` | admin |
| GET | `/devices/normalize/mappings/ucum` | admin |
| POST | `/devices/normalize/validate` | admin |
| GET | `/devices/normalize/stats` | admin |

## Commit
Pending — `phase(387): W21-P10 LOINC/UCUM Normalization`
