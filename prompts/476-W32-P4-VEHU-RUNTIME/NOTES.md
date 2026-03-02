# Phase 476 — W32-P4: Notes

## Decisions

- worldvista/worldvista-ehr kept as "legacy" profile (not removed)
- worldvista/vehu is the new recommended baseline for dev/test
- VEHU has newer packages including SDES scheduling RPCs
- Port mapping avoids conflict: vehu uses 9431 if both run simultaneously
