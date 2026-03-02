# Phase 476 — W32-P4: Verify — VEHU VistA Runtime Profile

## Verification Steps

1. `docker compose --profile vehu config` parses without error
2. `docker compose --profile legacy config` parses without error
3. Install script accepts `-VistaUser vehu` parameter
4. README documents both profiles

## Acceptance Criteria

- [ ] docker-compose.yml has both wv (legacy) and vehu services
- [ ] Install script supports VistaUser parameter
- [ ] README has VEHU quickstart section
- [ ] Evidence captured
