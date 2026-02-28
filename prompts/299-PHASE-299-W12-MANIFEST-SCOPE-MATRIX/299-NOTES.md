# Phase 299 -- W12-P1 NOTES

## Context
- BASE_PHASE computed as 299 (max existing prefix 298 + 1)
- Wave 12 covers 10 phases: 299-308
- Existing codebase already has substantial writeback routes (TIU, orders, ADT, eMAR)
- Wave 12 adds: command bus safety wrapper, contract tests, deep domain coverage

## Decisions
- All folder prefixes match phase IDs (299-308) -- no collision risk
- Scope matrix documents existing read/write paths per domain
- OSS ADRs confirm existing choices (OHIF, Orthanc, Jitsi, built-in HL7 engine)
- Command bus (P300) is the critical dependency -- all write phases depend on it

## Risks
- VistA sandbox may not support all write RPCs (known limitation)
- Dry-run + replay mode mitigates this for CI
- Production validation requires live VistA instance
