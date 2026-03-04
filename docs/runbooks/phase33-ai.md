# Phase 33 — AI Gateway Runbook

> Governed AI assist with intake summary, lab education, and portal search.

## Overview

Phase 33 adds an AI Gateway to VistA-Evolved with:

- Pluggable model registry (stub provider for dev)
- Versioned prompt templates with SHA-256 hashes
- Safety layer blocking diagnosis/treatment/prescribing/ordering
- PHI redaction engine (10 patterns)
- RAG grounding from VistA patient chart data
- Full audit trail with hashed user/patient IDs
- Facility-level policy controls
- Three initial use cases: intake summary, lab education, portal search

## Prerequisites

- API server running (`npx tsx --env-file=.env.local src/index.ts`)
- No additional dependencies required (stub provider has no external calls)

## API Endpoints

### Clinician Endpoints (session auth required)

| Method | Path              | Description                                                |
| ------ | ----------------- | ---------------------------------------------------------- |
| POST   | `/ai/request`     | Submit an AI request (intake-summary, lab-education, etc.) |
| POST   | `/ai/confirm/:id` | Confirm or reject an AI output                             |
| GET    | `/ai/models`      | List registered models                                     |
| GET    | `/ai/prompts`     | List prompt templates                                      |
| GET    | `/ai/audit`       | Query audit log (admin only)                               |
| GET    | `/ai/audit/stats` | Audit statistics (admin only)                              |
| GET    | `/ai/policy`      | Get facility AI policy                                     |
| PUT    | `/ai/policy`      | Update facility AI policy (admin only)                     |
| GET    | `/ai/health`      | AI subsystem health check                                  |

### Portal Endpoints (portal session required)

| Method | Path                   | Description                 |
| ------ | ---------------------- | --------------------------- |
| POST   | `/ai/portal/education` | Lab education for patients  |
| POST   | `/ai/portal/search`    | Portal navigation assistant |

## Request Examples

### Intake Summary

```bash
curl -X POST http://127.0.0.1:3001/ai/request \
  -H "Content-Type: application/json" \
  -b "session=<cookie>" \
  -d '{
    "useCase": "intake-summary",
    "patientDfn": "3",
    "userRole": "clinician",
    "input": "Generate intake summary for this patient"
  }'
```

### Lab Education (Portal)

```bash
curl -X POST http://127.0.0.1:3001/ai/portal/education \
  -H "Content-Type: application/json" \
  -b "portal_session=<cookie>" \
  -d '{"labName": "Hemoglobin A1c", "labValue": "7.2%"}'
```

### Portal Search

```bash
curl -X POST http://127.0.0.1:3001/ai/portal/search \
  -H "Content-Type: application/json" \
  -b "portal_session=<cookie>" \
  -d '{"query": "How do I request a medication refill?"}'
```

### Confirm/Reject AI Output

```bash
curl -X POST http://127.0.0.1:3001/ai/confirm/abc123 \
  -H "Content-Type: application/json" \
  -b "session=<cookie>" \
  -d '{"confirmed": true}'
```

### Facility Policy Update (Admin)

```bash
curl -X PUT http://127.0.0.1:3001/ai/policy \
  -H "Content-Type: application/json" \
  -b "session=<cookie>" \
  -d '{"maxRequestsPerUserPerHour": 50}'
```

## Files Changed

### New Files — API AI Gateway

- `apps/api/src/ai/types.ts` — Core type system
- `apps/api/src/ai/model-registry.ts` — Model registry
- `apps/api/src/ai/prompt-registry.ts` — Prompt template registry
- `apps/api/src/ai/safety-layer.ts` — Safety layer (category blocking)
- `apps/api/src/ai/redaction.ts` — PHI redaction engine
- `apps/api/src/ai/rag-engine.ts` — RAG grounding with role-based access
- `apps/api/src/ai/ai-audit.ts` — Audit trail (ring buffer)
- `apps/api/src/ai/ai-gateway.ts` — Main gateway orchestrator
- `apps/api/src/ai/providers/stub-provider.ts` — Development stub provider
- `apps/api/src/ai/providers/index.ts` — Provider registry
- `apps/api/src/routes/ai-gateway.ts` — REST endpoints

### New Files — CPRS

- `apps/web/src/components/cprs/panels/AIAssistPanel.tsx` — AI Assist tab

### New Files — Portal

- `apps/portal/src/app/dashboard/ai-help/page.tsx` — Patient AI help page

### New Files — Docs

- `docs/ai/ai-governance.md` — Governance framework
- `docs/ai/ai-risk-controls.md` — Risk controls
- `docs/runbooks/phase33-ai.md` — This runbook

### Modified Files

- `apps/api/src/index.ts` — Added AI gateway route registration
- `apps/web/src/components/cprs/panels/index.ts` — Added AIAssistPanel export
- `apps/web/src/components/cprs/CPRSTabStrip.tsx` — Added aiassist module
- `apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx` — Added AI Assist tab
- `apps/web/src/lib/contracts/data/tabs.json` — Added CT_AIASSIST entry
- `apps/portal/src/lib/api.ts` — Added AI API functions
- `apps/portal/src/components/portal-nav.tsx` — Added AI Help nav item

## Configuration

No new environment variables required. The stub provider runs without configuration.

Future model providers may require:

- `AI_PROVIDER` — Provider name (default: `"stub"`)
- `AI_MODEL_ENDPOINT` — External model API endpoint
- `AI_MODEL_API_KEY` — API key for external model

## Testing

### Quick Smoke Test

```bash
# Health check
curl http://127.0.0.1:3001/ai/health

# List models
curl http://127.0.0.1:3001/ai/models -b "session=<cookie>"

# List prompts
curl http://127.0.0.1:3001/ai/prompts -b "session=<cookie>"
```

### Safety Layer Test

The safety layer should block requests containing diagnosis/treatment language:

```bash
# This should be blocked
curl -X POST http://127.0.0.1:3001/ai/request \
  -H "Content-Type: application/json" \
  -b "session=<cookie>" \
  -d '{"useCase": "custom", "input": "Diagnose this patient with diabetes"}'
```

## Architecture

```
┌─────────────┐  ┌──────────────┐  ┌────────────────┐
│  CPRS Panel  │  │ Portal Pages │  │   Admin API    │
│  (AI Assist) │  │  (AI Help)   │  │ (Policy/Audit) │
└──────┬───────┘  └──────┬───────┘  └───────┬────────┘
       │                 │                   │
       └────────┬────────┴────────┬──────────┘
                │                 │
    ┌───────────▼─────────────────▼──────────┐
    │          AI Gateway (11-step)           │
    │  Rate Limit → Safety → Model → Audit   │
    ├────────────────────────────────────────-┤
    │  RAG Engine │ Redaction │ Prompt Render │
    ├────────────────────────────────────────-┤
    │    Model Registry │ Provider Registry   │
    └────────────────────────────────────────-┘
                │
    ┌───────────▼──────────┐
    │  Stub Provider (dev) │
    │  Future: OpenAI, etc │
    └──────────────────────┘
```
