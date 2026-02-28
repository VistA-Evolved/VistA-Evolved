# Phase 120 — Full System Audit + Evidence-Based Gap Matrix (IMPLEMENT)

## Goal
Produce a reliable, repeatable audit of the entire repo: what exists, what's wired, what's mocked, what's durable, what's missing, and what's drifting.

## Deliverables
1. `scripts/audit/system-audit.mjs` — Node 20+ audit script
2. `artifacts/system-audit.json` — full detail (gitignored)
3. `qa/gauntlet/system-gap-matrix.json` — small committed summary
4. `docs/audits/system-audit.md` — human-readable summary
5. `qa/gauntlet/gates/g10-system-audit.mjs` — gauntlet gate (RC/FULL only)
6. `pnpm audit:system` script in package.json

## Rules
- No new reports/ folders
- All output to docs/audits/, qa/gauntlet/, or artifacts/ only
- Evidence-based: every claim references file path + symbol/route
- VistA-first classification: wired_to_vista | integration_pending | local_only | mock
- Minimal edits, audit-centric only

## Files touched
- scripts/audit/system-audit.mjs (NEW)
- qa/gauntlet/gates/g10-system-audit.mjs (NEW)
- qa/gauntlet/system-gap-matrix.json (GENERATED)
- docs/audits/system-audit.md (GENERATED)
- package.json (add audit:system script)
