# Phase 477 — W32-P5: Notes

## Decisions

- VEHU credentials use PRO1234 / PRO1234!! (published on Docker Hub, not secret)
- Legacy PROV123 creds kept but marked as legacy-only
- Helper script sets env vars in-session, does not modify .env.local
