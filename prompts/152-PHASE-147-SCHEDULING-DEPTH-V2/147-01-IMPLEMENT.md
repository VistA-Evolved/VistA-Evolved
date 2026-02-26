# Phase 147 -- Scheduling Depth V2: SD Realism + Seeding (IMPLEMENT)

> **Placeholder -- implementation deferred to Phase 147.**

## Scope
Make the scheduling module provably end-to-end with real VistA SD RPCs
and seeded sandbox data. Target from Phase 145 priority backlog: Blocker #3.

## Key work
- Seed WorldVistA Docker with SD clinic/appointment data via `.m` routines
- Wire `SD APPOINTMENT` RPCs through standard broker flow
- Prove create/read/cancel appointment lifecycle end-to-end
- Add scheduling-specific Playwright domain journey tests
- Update scheduling adapter from stub to VistA-backed

## Constraints
- VistA-first: all scheduling data must originate from VistA SD files
- No fake appointment data in API stores
- Seeding routines go in `services/vista/` as `.m` files
