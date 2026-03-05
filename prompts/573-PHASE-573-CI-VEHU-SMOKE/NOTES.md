# Phase 573 — Notes

- VEHU cannot be a GH Actions `services:` container because it requires
  `stdin_open: true`, `tty: true`, and has a 60s+ startup. Instead we
  use `docker compose` in a step and poll for readiness.
- The clinic-day runner needs the API running, so the workflow starts
  the API in background (`&`), waits for `/health`, then runs journeys.
- verify:vista connects directly to VistA via TCP (no API needed) using
  the VistaRpcBridge, so it runs before the API starts.
- Artifact uploads use `if: always()` to capture logs even on failure.
- The workflow does NOT run on `pull_request` — it's nightly + manual only.
