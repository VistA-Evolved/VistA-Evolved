# Phase 392 -- W22-P4 Pharmacy Deep Workflows: NOTES

## Design Decisions

- **Bridges existing modules**: Unifies eMAR (Phase 85), writeback executor (Phase 303),
  BCMA (Phase 385/W21), med-rec (Phase 168), and MAR safety (Phase 168) into a single
  pharmacy lifecycle FSM.

- **11-state FSM**: Covers full lifecycle from pending through administered/discontinued.
  Transition validation prevents illegal state jumps. on_hold can resume to any active state.

- **Clinical checks are heuristic**: High-alert flagging uses ISMP list subset. Dose-range
  checks are placeholder. Real DDI/allergy checking should delegate to VistA's ORWDXC/ORQQAL
  or a terminology service.

- **BCMA integration via session linking**: AdminRecord.bcmaSessionId links to Wave 21
  `bcmaSessionStore` for barcode verification and right-6 checks. This avoids duplicating
  BCMA logic.

- **Step-up auth flagging**: PharmOrder.requiresStepUp is set for high-alert drug classes.
  Actual step-up enforcement defers to Phase 338 step-up middleware.

## VistA RPC Targets
- `ORWDX SAVE` -- place order (available via writeback executor)
- `ORWDXA DC` -- discontinue order (available via writeback executor)
- `PSB MED LOG` -- record administration (integration-pending, PSB package)
- `PSJBCMA` -- barcode verification (integration-pending)
- `PSO FILL` -- outpatient dispensing (integration-pending)
- `PSJ LM ORDER UPDATE` -- inpatient order update (integration-pending)
