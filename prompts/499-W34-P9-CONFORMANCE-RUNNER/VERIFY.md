# 499-99-VERIFY — Country Conformance Runner

## Gates

1. `scripts/qa-gates/country-conformance-runner.mjs` exists and exits 0 for valid packs.
2. `/conformance/run` executes per-pack validation and returns evidence bundle.
3. Evidence bundle includes gate results for: pack-load, consent, residency, retention, DSAR rights, i18n.
4. All US/PH/GH packs produce evidence.
5. No PHI in any evidence output.
6. TypeScript compiles clean.
