# Phase 143 -- AI Intake Engine (Interchangeable Brain)

## User Request

Create a pluggable AI intake engine that can be rules-driven (deterministic),
LLM-assisted (governed), or integrated with 3rd-party APIs -- without locking
the system to any single provider.

## Implementation Steps

1. Extend `BrainProvider` type with typed provider identifiers (rules_engine, llm_provider:<name>, third_party:<name>)
2. Create `IntakeBrainPlugin` interface (startSession, nextQuestion, submitAnswer, finalizeSummary)
3. Build plugin registry in `apps/api/src/intake/brain/` with rules, LLM, 3P adapters
4. Bridge LLM provider to existing AI Gateway (Phase 33) for governed calls
5. Add governance audit store for intake brain decisions
6. New API routes: `/intake/providers`, `/intake/sessions/:id/tiu-draft`
7. Enhance portal intake UI with provider selection + TIU draft export
8. i18n messages for en/fil/es
9. PHI redaction + safety layer for all provider interactions

## Verification Steps

- TypeScript compile clean
- All existing intake routes still work
- New provider routes return correct shapes
- TIU draft note export produces valid note text
- Governance audit log captures brain decisions
- Safety layer blocks disallowed categories
- i18n keys present in all 3 locales

## Files Touched

- apps/api/src/intake/types.ts (extend)
- apps/api/src/intake/providers.ts (refactor)
- apps/api/src/intake/brain/ (new directory -- plugin architecture)
- apps/api/src/intake/intake-routes.ts (extend)
- apps/api/src/intake/intake-store.ts (extend)
- apps/api/src/intake/summary-provider.ts (extend)
- apps/api/src/ai/types.ts (extend AIUseCase)
- apps/portal/src/app/dashboard/intake/page.tsx (extend)
- apps/portal/public/messages/{en,fil,es}.json (extend)
- docs/runbooks/phase143-ai-intake-engine.md (new)
