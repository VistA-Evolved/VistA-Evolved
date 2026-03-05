# Phase 579 — Notes

> Wave 42: Production Remediation | Phase 579

## Why This Phase Exists

Phase 4 of the remediation plan: 200 stub routes (100 notes + 100 orders) must call real TIU and ORWDX/ORWOR RPCs. Notes and orders are the highest-volume clinical workflows.

## Key Decisions

- **LOCK/UNLOCK mandatory**: AGENTS.md gotcha 17 — forgetting UNLOCK leaves patient locked for other providers.
- **TIU template helpers**: Many ORWTIU RPCs are template/title helpers; wire all for UI completeness.
- **Order check flow**: ORWDXC ACCEPT/DISPLAY/SAVECHK may return empty in sandbox without drug data.

## Deferred Items

- Unsigned notes/orders visibility (BUG-030, BUG-033) — query both signed and unsigned contexts.
- Order dialog full UI — API wiring first; UI integration follows.
