# Phase 28 -- Enterprise Intake OS -- Summary

## What Changed

### New Files (API -- `apps/api/src/intake/`)

- `types.ts` -- All TypeScript types for intake (sessions, events, QR snapshots, packs, providers, filing)
- `intake-store.ts` -- In-memory stores for sessions, events, snapshots, kiosk tokens
- `pack-registry.ts` -- Pack registry, context resolver, merge/dedup logic
- `providers.ts` -- NextQuestionProvider (rules-based adaptive engine, enableWhen evaluator)
- `summary-provider.ts` -- TemplateSummaryProvider (HPI narrative, 14-system ROS, red flags, med/allergy delta, contradictions)
- `intake-routes.ts` -- Fastify route plugin (patient, clinician, kiosk, pack, admin routes)
- `packs/` -- 23 clinical packs across 9 files (core, 16 complaints, 5 specialty, 2 department)

### New Files (Web -- CPRS)

- `IntakePanel.tsx` -- Clinician review panel (red flags, HPI, ROS, answers, actions)

### New Files (Portal)

- `dashboard/intake/page.tsx` -- Portal intake start page
- `dashboard/intake/[id]/page.tsx` -- Portal adaptive questionnaire form
- `kiosk/intake/page.tsx` -- Kiosk launcher
- `kiosk/intake/[id]/page.tsx` -- Kiosk adaptive form with idle timeout

### Modified Files

- `index.ts` (API) -- intake routes + pack loader registration
- `panels/index.ts` -- IntakePanel barrel export
- `[tab]/page.tsx` -- intake tab routing
- `CPRSTabStrip.tsx` -- intake module map
- `tabs.json` -- CT_INTAKE tab

## How to Test Manually

```bash
# 1. Start API
cd apps/api && npx tsx --env-file=.env.local src/index.ts

# 2. Check packs loaded
curl http://127.0.0.1:3001/intake/packs -H "Cookie: session=<token>"

# 3. CPRS: http://localhost:3000/cprs/chart/<dfn>/intake
# 4. Portal: http://localhost:3002/dashboard/intake
# 5. Kiosk: http://localhost:3002/kiosk/intake
```

## Verify Script

Phase 28 VERIFY script not yet created -- will be Phase 28 VERIFY task.

## Follow-ups

- Wire VistA filing RPCs
- LLM-constrained provider implementation
- Proxy authorization verification
- Appointment-linked intake
- Phase 28 VERIFY script
