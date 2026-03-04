# ICU Flowsheet & Device — Runbook

## Overview

Phase 469. REST API for ICU admission management, flowsheets, ventilator tracking,
intake/output, severity scoring, and unit metrics.

## Endpoints

| Method | Path                          | Purpose                                         |
| ------ | ----------------------------- | ----------------------------------------------- |
| POST   | /icu/admissions               | Admit patient to ICU bed                        |
| GET    | /icu/admissions               | List admissions (?unit, ?status)                |
| GET    | /icu/admissions/:id           | Get single admission                            |
| POST   | /icu/admissions/:id/discharge | Discharge with disposition                      |
| GET    | /icu/beds                     | List ICU beds (?unit)                           |
| POST   | /icu/admissions/:id/flowsheet | Add flowsheet entry                             |
| GET    | /icu/admissions/:id/flowsheet | Get flowsheet (?category)                       |
| POST   | /icu/admissions/:id/vent      | Record vent settings                            |
| GET    | /icu/admissions/:id/vent      | Vent settings history                           |
| POST   | /icu/admissions/:id/io        | Record intake/output                            |
| GET    | /icu/admissions/:id/io        | I&O records + balance (?type)                   |
| POST   | /icu/admissions/:id/scores    | Record severity score                           |
| GET    | /icu/admissions/:id/scores    | Score history (?scoreType)                      |
| GET    | /icu/metrics                  | Unit metrics (occupancy, ventilated count, LOS) |

## ICU Workflow

1. Admit -> POST /icu/admissions (assigns bed, status: active)
2. Monitor -> POST flowsheet entries (vitals, hemodynamics, neuro, etc.)
3. Ventilator -> POST vent settings as changes occur
4. I&O -> POST intake/output records throughout shift
5. Assess -> POST severity scores (APACHE-II, SOFA, GCS, RASS, etc.)
6. Discharge -> POST /icu/admissions/:id/discharge (releases bed)

## Store

In-memory. 28 default beds across 4 units (MICU 8, SICU 8, CCU 6, NICU 6). Resets on restart.
