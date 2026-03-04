# Phase 165 — Specialty Coverage Score + QA Ladder Extension

## Overview

Adds a numeric specialty coverage scoring engine and QA ladder extension
that measures completeness of each of the 45 clinical specialty template
packs across four dimensions.

## Scoring Dimensions (25 pts each, 100 total)

| Dimension      | Full marks when                    |
| -------------- | ---------------------------------- |
| Pack existence | Specialty has a registered pack    |
| Template count | >= 3 templates in the pack         |
| Field coverage | Average >= 5 fields per template   |
| Section depth  | Average >= 3 sections per template |

## Grading Scale

| Grade | Score range |
| ----- | ----------- |
| A     | 90-100      |
| B     | 75-89       |
| C     | 60-74       |
| D     | 40-59       |
| F     | 0-39        |

## API Endpoints

| Method | Path                        | Purpose                                                |
| ------ | --------------------------- | ------------------------------------------------------ |
| GET    | /admin/coverage/score       | Overall score + distribution                           |
| GET    | /admin/coverage/specialties | Per-specialty breakdown (filter: ?grade=, ?specialty=) |
| GET    | /admin/coverage/gaps        | Top 10 specialties needing improvement                 |
| GET    | /admin/coverage/qa-ladder   | QA ladder gate result                                  |
| POST   | /admin/coverage/refresh     | Force-refresh cached report                            |
| GET    | /admin/coverage/tags        | List all 45 specialty tags                             |

## QA Ladder Gate

Gate ID: `G-SPECIALTY-COVERAGE`

Per-specialty checks:

- **hasPack**: pack exists -> pass; else fail
- **hasMultipleTemplates**: >=3 -> pass; >=1 -> warn; 0 -> fail
- **hasSufficientFields**: avgFields >=5 -> pass; >=2 -> warn; else fail
- **hasSufficientSections**: avgSections >=3 -> pass; >=1 -> warn; else fail

Aggregate status: fail if >30% specialties fail; warn if >30% warn; else pass.

## Files

- `apps/api/src/templates/coverage-scorer.ts` — Scoring engine
- `apps/api/src/templates/qa-ladder-ext.ts` — QA ladder gate
- `apps/api/src/routes/coverage-routes.ts` — REST endpoints
- `apps/web/src/app/cprs/admin/coverage/page.tsx` — Admin UI (4 tabs)

## Manual Test

```bash
curl http://localhost:3001/admin/coverage/score -b cookies.txt
curl http://localhost:3001/admin/coverage/specialties -b cookies.txt
curl http://localhost:3001/admin/coverage/gaps -b cookies.txt
curl http://localhost:3001/admin/coverage/qa-ladder -b cookies.txt
```
