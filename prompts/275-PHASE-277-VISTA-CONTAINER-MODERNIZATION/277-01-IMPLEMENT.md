# Phase 277 — VistA Container Modernization

## User Request

Modernize VistA Docker sandbox: add healthcheck, resource limits, named volumes,
so `integration-pending` can become `integration-done` for routine reads. Align
the dev sandbox with the distro lane patterns from Phase 148.

## Inventory

- `services/vista/docker-compose.yml` (14 lines) — bare dev sandbox, no healthcheck
- `services/vista-distro/docker-compose.yml` (58 lines) — modern, healthcheck, limits
- `services/vista-distro/health-check.sh` — TCP probe script
- `scripts/install-vista-routines.ps1` — unified routine installer (Phase 155)

## Implementation Steps

1. Modernize `services/vista/docker-compose.yml`:
   - Add healthcheck (TCP probe on port 9430)
   - Add resource limits (2G memory, 2 CPU)
   - Add named volume for VistA globals persistence
   - Add `deploy.restart_policy`

2. Create `services/vista/health-check.sh` for dev sandbox TCP probe

3. Create `scripts/qa-gates/vista-container-gate.mjs`:
   - Validates docker-compose has healthcheck
   - Validates resource limits present
   - Validates named volume present
   - Reports modernization status

## Verification Steps

- docker-compose.yml has healthcheck, resource limits, named volume
- QA gate script passes all checks
