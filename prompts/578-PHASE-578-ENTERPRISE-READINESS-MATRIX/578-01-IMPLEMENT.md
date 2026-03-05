# Phase 578 -- ENTERPRISE READINESS MATRIX (PROOF-LINKED)

## Objective

Produce a single, executive- and engineering-readable matrix showing what is
PROVEN end-to-end, what is PARTIAL, what is PENDING, and what evidence proves
each claim. This is the document that prevents "this repo is impressive but
confusing."

## Implementation

### 1. Generator script: `scripts/qa/generate-enterprise-readiness-matrix.mjs`

Parses these source docs (required -- exits non-zero if missing):

- `docs/KNOWN_ISSUES.md` -- open/closed blockers
- `docs/VISTA_CONNECTIVITY_RESULTS.md` -- RPC capability truth
- `docs/TIER0_PROOF.md` -- Tier-0 definition
- `docs/QA_GAUNTLET_FAST_RESULTS.md` -- current fast gate truth

Optional (enrichment):

- `.github/workflows/ci-vehu-smoke.yml` -- CI proof exists

### 2. Output: `docs/ENTERPRISE_READINESS_MATRIX.md`

Sections:

- **Header**: generated timestamp, commit SHA, description, regen command
- **SDLC Alignment**: Build/Verify/Release/Operate mapping
- **Readiness Table**: 13+ rows, each with Status / Evidence / Blockers / Next Proof

### Readiness rows (minimum)

| Row                        | What it covers                             |
| -------------------------- | ------------------------------------------ |
| Platform health            | API startup, /health                       |
| VistA RPC connectivity     | Core 6/6 tests, 87/87 probe                |
| Outpatient clinical reads  | Tier-0 journey (vitals/allergies/problems) |
| Notes (TIU) write/read     | TIU CREATE/SET/GET RPCs                    |
| Orders (CPOE) read + guard | ORWDX SAVE, ORWOR1 SIG, writeback guard    |
| Labs read                  | ORWLRR INTERIM/CHART                       |
| Meds read                  | ORWPS ACTIVE                               |
| ADT / Inpatient            | ZVEADT/DGPM RPCs, PG status                |
| Interop HL7/HLO            | VE INTEROP RPCs, KI-002                    |
| Billing safety             | No silent mock, IB/PRCA subsystem          |
| Security posture           | Gauntlet G3 scan                           |
| Multi-tenancy / RLS        | Posture gate status                        |
| Imaging + Scheduling PG    | Durability status                          |

## Files Touched

- `scripts/qa/generate-enterprise-readiness-matrix.mjs` -- new generator
- `docs/ENTERPRISE_READINESS_MATRIX.md` -- generated output
- `prompts/578-PHASE-578-ENTERPRISE-READINESS-MATRIX/` -- prompt files
