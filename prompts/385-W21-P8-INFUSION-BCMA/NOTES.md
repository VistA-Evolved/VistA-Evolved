# Phase 385 — W21-P8 Infusion/BCMA Safety Bridge — NOTES

## Design Decisions
- Right-6 verification is scaffold-level: drug/dose/route checks are present-checks
  not full VistA pharmacy lookups. Production would query VistA PSO files.
- Pump event ingest uses service auth (X-Service-Key) for gateway-to-API path.
- BCMA session lifecycle: scanning → verified (all 6 pass) → administered/refused/held.
- Time window: 1hr pass, 2hr warning, >2hr fail. Configurable in production.
- Pump events and BCMA sessions are separate stores — linked via pumpEventId on session.

## VistA Integration Targets
- `PSB MED LOG` — BCMA medication administration log
- `PSB ALLERGY` — pharmacy allergy check
- `ORWDX LOCK/UNLOCK` — order locking for concurrent safety
- `PSO VERIFY` — pharmacy order verification
- VistA files: BCM Administration (53.79), IV Fluid Order (100.1)

## Dependencies
- Phase 384 (alarms) — pump alarms route through alarm pipeline
- Phase 380 (device registry) — pump serial resolves via managed device store
- Phase 381 (HL7v2) — pump events may arrive as HL7v2 ORU messages
