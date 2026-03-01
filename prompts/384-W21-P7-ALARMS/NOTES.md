# Phase 384 — W21-P7 NOTES

## Design Decisions
- Priority order uses numeric mapping (low=0..crisis=3) for comparison.
- Routing rules evaluated in rulePriority order, first match wins. This
  aligns with IHE PCD ACM's escalation model.
- Acknowledgment silences escalation by default (silencesEscalation=true).
- Escalation level tracks how many times an alarm has been escalated,
  supporting multi-tier escalation chains.
- All alarm routes live under /devices/alarms/ so they inherit the admin
  AUTH_RULE from Phase 380's /devices/ catch-all.
- No separate service auth for alarm creation — alarms are created by
  the ingest pipeline (code-level), not by external gateways.
