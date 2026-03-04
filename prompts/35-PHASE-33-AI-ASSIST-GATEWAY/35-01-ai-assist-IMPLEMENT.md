# 35-01 — Phase 33: AI ASSIST (governed) — IMPLEMENT

## User Request

Implement Phase 33: AI Gateway with governed, grounded, safe AI assist.

Three initial use cases:

1. Intake summary — clinician-ready note draft grounded in patient chart
2. Lab education — patient portal "explain this lab term" feature
3. Portal search — navigation assistant for the patient portal

NOT ALLOWED: diagnosis, treatment plans, prescribing guidance, autonomous ordering.

## Implementation Steps

1. Create core type system (`apps/api/src/ai/types.ts`)
2. Model registry with stub provider seeded
3. Versioned prompt templates with SHA-256 hashes
4. Safety layer blocking 6 disallowed categories
5. PHI redaction engine (10 patterns)
6. RAG engine with role-based source access
7. Audit trail (ring buffer, hashed IDs)
8. AI Gateway orchestrator (11-step pipeline)
9. REST routes (clinician + portal endpoints)
10. CPRS AI Assist panel (Intake Summary + Lab Education + Audit sub-tabs)
11. Portal AI Help page (Lab Education + Portal Search)
12. Documentation (governance, risk controls, runbook)
13. Wire into CPRS tabs + portal nav
14. TSC clean all 3 apps

## Verification Steps

- `npx tsc --noEmit` on apps/api, apps/web, apps/portal
- Manual: `curl /ai/health` returns ok
- Manual: `curl /ai/models` lists stub-v1
- Manual: `curl /ai/prompts` lists 3 templates
- Safety block: diagnosis input returns blocked

## Files Touched

### New

- `apps/api/src/ai/types.ts`
- `apps/api/src/ai/model-registry.ts`
- `apps/api/src/ai/prompt-registry.ts`
- `apps/api/src/ai/safety-layer.ts`
- `apps/api/src/ai/redaction.ts`
- `apps/api/src/ai/rag-engine.ts`
- `apps/api/src/ai/ai-audit.ts`
- `apps/api/src/ai/ai-gateway.ts`
- `apps/api/src/ai/providers/stub-provider.ts`
- `apps/api/src/ai/providers/index.ts`
- `apps/api/src/routes/ai-gateway.ts`
- `apps/web/src/components/cprs/panels/AIAssistPanel.tsx`
- `apps/portal/src/app/dashboard/ai-help/page.tsx`
- `docs/ai/ai-governance.md`
- `docs/ai/ai-risk-controls.md`
- `docs/runbooks/phase33-ai.md`

### Modified

- `apps/api/src/index.ts`
- `apps/web/src/components/cprs/panels/index.ts`
- `apps/web/src/components/cprs/CPRSTabStrip.tsx`
- `apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx`
- `apps/web/src/lib/contracts/data/tabs.json`
- `apps/portal/src/lib/api.ts`
- `apps/portal/src/components/portal-nav.tsx`
