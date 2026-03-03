# Phase 535 — VERIFY: MHA v1 LForms Questionnaire Engine [W39-P5]

## Gates

| # | Gate | Check |
|---|------|-------|
| G1 | Instrument files exist | 5 files in `data/instruments/` with `.questionnaire.json` suffix |
| G2 | Instrument schema valid | Each instrument has resourceType=Questionnaire, item array, url, title |
| G3 | @lhncbc/lforms in deps | `apps/web/package.json` contains `@lhncbc/lforms` |
| G4 | API route file exists | `apps/api/src/routes/mha/index.ts` exists |
| G5 | RPC registry has MH RPCs | At least 5 RPCs with domain `mental-health` |
| G6 | Capabilities defined | `config/capabilities.json` contains `clinical.mha.*` entries |
| G7 | MHAPanel.tsx exists | Panel component at expected path |
| G8 | Panel exported from barrel | `index.ts` exports MHAPanel |
| G9 | register-routes.ts wired | Contains mha import and registration |
| G10 | Scoring engine exists | `apps/api/src/routes/mha/scoring.ts` exists |
| G11 | Module config updated | `config/modules.json` clinical module has `/vista/mha` pattern |
| G12 | No PHI in evidence | No SSN patterns, DOB, patient names in created files |
| G13 | Evidence directory created | evidence/wave-39/535-W39-P5-MHA-V1/ exists |
