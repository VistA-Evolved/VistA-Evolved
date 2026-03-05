# Phase 569: Tier-0 Outpatient Proof Run -- VERIFY

## Verification Steps

1. TypeScript compiles cleanly: `pnpm -C apps/api exec tsc --noEmit`
2. T0 journey ID is in ALL_JOURNEYS array
3. T0 journey has exactly 6 steps (health, patient-list, vitals, allergies, problems, logout)
4. `scripts/verify-tier0.ps1` exists and has 4 gates
5. `scripts/verify-tier0.sh` exists and has 4 gates
6. `docs/TIER0_PROOF.md` exists with required sections
7. G14 is in `scripts/verify-rc.ps1` as optional gate
8. G14 is documented in `docs/release/RC_SCOPE.md`
9. No em-dash or non-ASCII characters in .ps1 files (BUG-055)
10. clinic-day-runner.mjs supports `--artifact-name` argument

## Acceptance Criteria

- T0 journey uses ONLY outpatient-safe RPCs (no LOCK/UNLOCK, no order writes)
- `verify-tier0.ps1` exits non-zero on any failure
- Timestamped artifacts written to `artifacts/` directory
- G14 is non-blocking in verify-rc (Required=$false)
- Documentation covers: what it proves, how to run, expected output, troubleshooting

## Acceptance Criteria

- [ ] Implementation steps completed
- [ ] All verification gates pass
