# Phase 410 (W24-P2): Reference Environments as Code + Parity Proof

## Goal

Make environment creation reproducible and ensure staging mirrors pilot/prod.

## Steps

1. Create `infra/environments/pilot.yaml` (Helm overlay for pilot).
2. Create `infra/environments/dr-validate.yaml` (Helm overlay for DR validation).
3. Create `scripts/verify-env-parity.ps1` to validate parity across all envs.
4. Run parity check against staging (or simulated config).

## Files Created

- `infra/environments/pilot.yaml`
- `infra/environments/dr-validate.yaml`
- `scripts/verify-env-parity.ps1`
