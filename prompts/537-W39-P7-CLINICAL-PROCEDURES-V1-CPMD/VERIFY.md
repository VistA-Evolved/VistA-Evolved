# Phase 537 — VERIFY — Clinical Procedures v1 (CP/MD)

## Gates (12)

| #   | Gate                                          | Check                                     |
| --- | --------------------------------------------- | ----------------------------------------- |
| G1  | Route file exists                             | `clinical-procedures/index.ts` present    |
| G2  | GET /vista/clinical-procedures route          | Pattern in route file                     |
| G3  | GET /vista/clinical-procedures/:id route      | Detail route present                      |
| G4  | GET /vista/clinical-procedures/medicine route | Medicine route present                    |
| G5  | integration-pending pattern                   | `integration-pending` string in route     |
| G6  | vistaGrounding metadata                       | `vistaGrounding` object in responses      |
| G7  | rpcRegistry has MD RPCs                       | At least 5 MD domain RPCs registered      |
| G8  | capabilities.json entries                     | clinical.procedures.\* capabilities exist |
| G9  | modules.json route pattern                    | clinical-procedures in clinical module    |
| G10 | ClinicalProceduresPanel.tsx exists            | Panel file created                        |
| G11 | Panel barrel export                           | index.ts exports ClinicalProceduresPanel  |
| G12 | register-routes.ts wired                      | Import + register in register-routes      |
