# Phase 491 — W34-P1: Reservation + Manifest + Country Pack Coverage Matrix

## Objective

Reserve phases 491-499 for Wave 34 (Multi-Country + Regulatory v2 + UTF-8 Lane).
Produce the wave manifest and a comprehensive Country Pack Coverage Matrix that
documents which `CountryPackValues` fields are actively runtime-enforced vs
metadata-only, with gap analysis per subsystem.

## Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `docs/qa/prompt-phase-range-reservations.json` | EDIT | Add W34 reservation (491-499) |
| `prompts/WAVE_34_MANIFEST.md` | CREATE | Wave manifest with phase map |
| `prompts/491-W34-P1-MANIFEST-COVERAGE/491-01-IMPLEMENT.md` | CREATE | This file |
| `prompts/491-W34-P1-MANIFEST-COVERAGE/491-99-VERIFY.md` | CREATE | Verify prompt |
| `docs/architecture/country-pack-coverage-matrix.md` | CREATE | Coverage matrix |
| `docs/architecture/country-pack-enforcement-gaps.md` | CREATE | Gap analysis |

## Implementation Steps

### Step 1 — Reserve phases
Append Wave 34 entry to `prompt-phase-range-reservations.json`:
```json
{
  "wave": "34",
  "start": 491,
  "end": 499,
  "count": 9,
  "branch": "main",
  "owner": "agent",
  "status": "reserved"
}
```

### Step 2 — Wave manifest
Create `prompts/WAVE_34_MANIFEST.md` with:
- 9-phase map (P1-P9, IDs 491-499)
- Scope summary per phase
- Existing infrastructure inventory table
- Dependencies on Phase 314 (country packs), 312 (consent), 275 (tenant config)

### Step 3 — Country Pack Coverage Matrix
Create `docs/architecture/country-pack-coverage-matrix.md` analyzing every field
in `CountryPackValues` across these dimensions:

| Dimension | Question |
|-----------|----------|
| **Defined** | Is the field present in `CountryPackValues` type? |
| **Loaded** | Is it read from `values.json` and cached? |
| **Validated** | Does `validatePack()` check it? |
| **Routed** | Is there a REST endpoint exposing it? |
| **Enforced** | Is it used in a Fastify hook, middleware, or route logic at request time? |
| **UI-bound** | Does the web/portal read and display it? |

### Step 4 — Gap analysis
Create `docs/architecture/country-pack-enforcement-gaps.md` listing:
- Fields that are loaded + validated but NOT enforced at runtime
- Subsystem gaps (consent engine doesn't read pack consent config, etc.)
- Prioritized remediation targets for P2-P9

## Policy Decisions

1. **Coverage matrix is the canonical reference** for what's enforced. Future
   phases must update it when they wire a new field to runtime behavior.
2. **3 country packs (US, PH, GH)** are the current scope. Adding packs for
   new markets is a data file change, not code.
3. **No code changes in P1** — this is planning + documentation only.
4. **`TenantConfig` lacks countryPackId/locale/timezone** — this is the primary
   structural gap; remediated in P2.

## Verification

Run `prompts/491-W34-P1-MANIFEST-COVERAGE/491-99-VERIFY.md` checks.
