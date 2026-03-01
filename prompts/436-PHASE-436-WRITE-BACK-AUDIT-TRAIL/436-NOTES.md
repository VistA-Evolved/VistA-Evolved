# Phase 436 — Notes

## Key Insight
The `write.allergy`, `write.vitals`, `write.note`, `write.problem` actions were defined in
immutable-audit.ts since Phase 35 but never emitted from any code path. This phase activates them.

## Store Policy
Added classification "critical" (not "audit") to match store-policy schema; the domain is "clinical".
