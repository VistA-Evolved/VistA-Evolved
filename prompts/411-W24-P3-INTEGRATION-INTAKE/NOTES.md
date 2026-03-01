# Phase 411 — W24-P3 Notes

- In-memory store (Map-based) — matches imaging worklist pattern (Phase 23)
- MAX_INTAKES=5000 with FIFO eviction
- Config generator dispatches by partnerType to type-specific generators
- Barrel export renamed to `pilotIntakeRoutes` in register-routes.ts to avoid
  collision with existing `intakeRoutes` (Phase 140 clinical intake)
- All routes behind admin auth
