# Phase 439 — Notes

## Integration Points
- `classify()` can be called from any route handler or middleware to get regulatory context
- Future phases will add routes (`/regulatory/classify`, `/regulatory/posture`) and middleware
- Framework registry is extensible at runtime via `registerFramework()`
- Tenant→country mapping is in-memory; production should use tenant config table
