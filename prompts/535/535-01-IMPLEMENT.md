# Phase 535 — MHA v1: LForms Questionnaire Engine [W39-P5]

## Objective
Deliver a Mental Health Assessment (MHA) engine built on NLM LHC-Forms
(`@lhncbc/lforms`). Instruments are defined as FHIR R4 Questionnaires,
rendered via LForms in the CPRS web client, and backed by VistA YTT/YTQZ
RPCs (read-path first; write-back is Phase 536).

## Deliverables

### 1. Instrument definition data (`data/instruments/`)
Five standard MHA instruments as FHIR R4 Questionnaire JSON:
- PHQ-9 (9 items, depression, scoring 0-27)
- GAD-7 (7 items, anxiety, scoring 0-21)
- PCL-5 (20 items, PTSD, scoring 0-80)
- C-SSRS (6 items, suicide severity, categorical)
- AUDIT-C (3 items, alcohol, scoring 0-12)

Each file: `data/instruments/<id>.questionnaire.json`

### 2. API route (`apps/api/src/routes/mha/index.ts`)
Prefix: `/vista/mha`
- `GET /vista/mha/instruments` — List available instruments
- `GET /vista/mha/instruments/:id` — Get instrument definition
- `GET /vista/mha/results?dfn=N` — Patient MH results history (YTT/YTQZ RPCs)
- `POST /vista/mha/administer` — Submit completed instrument (in-memory store; Phase 536 = VistA TIU)

### 3. RPC registry additions
Add 5 YTT/YTQZ RPCs to `rpcRegistry.ts` under domain `"mental-health"`:
- `YTT GET INSTRUMENT` (read)
- `YTQZ LISTTESTS` (read)
- `YTT SAVE RESULTS` (write)
- `YTQZ RESULTLIST` (read)
- `YTQZ DETAILLIST` (read)

### 4. Capabilities additions
Add MHA capabilities to `config/capabilities.json` under `clinical.mha.*`

### 5. CPRS Panel (`apps/web/src/components/cprs/panels/MHAPanel.tsx`)
- Instrument picker (list from API)
- LForms renderer via `@lhncbc/lforms` (dynamic import, no SSR)
- Score display with severity level
- Results history table
- Integration-pending banners for unimplemented VistA write-back

### 6. Module config
Add `/vista/mha` route patterns to `clinical` module in `config/modules.json`

## Architecture decisions
- LForms is an npm dependency, not vendored (meta-rule #6)
- Instruments are FHIR R4 Questionnaire JSON, not intake pack format
- Scoring is computed server-side from questionnaire response
- Results store is in-memory (Map) — write-through to VistA in Phase 536
- Reuses `requireSession` + `/vista/*` auth catch-all

## Files touched
- `apps/web/package.json` — add `@lhncbc/lforms`
- `apps/api/src/vista/rpcRegistry.ts` — add 5 MH RPCs
- `apps/api/src/routes/mha/index.ts` — new route file
- `apps/api/src/routes/mha/instruments.ts` — instrument loader
- `apps/api/src/routes/mha/scoring.ts` — server-side scoring engine
- `apps/api/src/server/register-routes.ts` — wire MHA routes
- `apps/web/src/components/cprs/panels/MHAPanel.tsx` — new panel
- `apps/web/src/components/cprs/panels/index.ts` — export
- `config/capabilities.json` — add MHA capabilities
- `config/modules.json` — add MHA route patterns
- `data/instruments/*.questionnaire.json` — 5 instrument files
