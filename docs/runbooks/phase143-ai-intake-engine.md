# Phase 143 -- AI Intake Engine (Interchangeable Brain)

## Overview
Phase 143 introduces a pluggable brain plugin architecture for the Intake OS,
enabling the intake questionnaire engine to use different providers:

1. **Rules Engine** (default, always available) -- deterministic pack-driven
2. **LLM Provider** -- governed via AI Gateway (Phase 33), opt-in
3. **Third-Party Connector** -- external API adapters (e.g., Instant Medical History)

## Architecture

```
Patient -> Portal UI -> /intake/sessions/:id/brain/next
                               |
                     Brain Plugin Registry
                     /        |         \
              Rules Engine  LLM Provider  3P Connector
              (default)     (governed)    (adapter)
                               |
                         AI Gateway (Phase 33)
                         Safety + Redaction + Audit
```

## Key Files

| File | Purpose |
|------|---------|
| `apps/api/src/intake/brain/types.ts` | Core plugin interface + types |
| `apps/api/src/intake/brain/registry.ts` | Plugin registry + decision audit |
| `apps/api/src/intake/brain/rules-engine.ts` | Rules engine brain |
| `apps/api/src/intake/brain/llm-provider.ts` | LLM brain (AI Gateway bridge) |
| `apps/api/src/intake/brain/third-party-connector.ts` | 3P connector scaffold |
| `apps/api/src/intake/brain/index.ts` | Barrel + initialization |
| `apps/api/src/intake/brain-routes.ts` | API routes for brain system |
| `apps/portal/src/app/dashboard/intake/page.tsx` | Portal UI with provider selector |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/intake/providers` | session | List available brain providers |
| GET | `/intake/providers/health` | clinician | Health check all providers |
| POST | `/intake/sessions/:id/brain/start` | portal | Start brain session |
| POST | `/intake/sessions/:id/brain/next` | portal | Brain-driven next question |
| POST | `/intake/sessions/:id/brain/submit` | portal | Brain-driven answer submit |
| POST | `/intake/sessions/:id/brain/summary` | session | Brain-driven summary |
| POST | `/intake/sessions/:id/tiu-draft` | clinician | Generate TIU draft note |
| GET | `/intake/brain/audit` | clinician | Brain decision audit log |
| GET | `/intake/brain/audit/stats` | clinician | Brain audit statistics |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `INTAKE_LLM_ENABLED` | `false` | Enable LLM brain provider |
| `INTAKE_LLM_VARIANT` | `default` | LLM provider variant |
| `INTAKE_3P_VENDORS` | `` | Comma-separated 3P vendor IDs |
| `INTAKE_3P_<VENDOR>_API_KEY` | — | API key per 3P vendor |
| `INTAKE_BRAIN_PROVIDER` | `rules` | Default brain provider for new sessions |

## Governance

- All brain decisions are logged to the audit store
- LLM interactions go through AI Gateway safety + PHI redaction
- Brain never invents new medical questions (only selects from packs)
- Brain never makes diagnosis or treatment recommendations
- TIU draft notes always marked DRAFT and require clinician signature
- Fallback chain: requested provider -> rules_engine (always)

## Testing

```bash
# List providers
curl http://127.0.0.1:3001/intake/providers -b cookies.txt

# Start brain session
curl -X POST http://127.0.0.1:3001/intake/sessions/<id>/brain/start \
  -H "Content-Type: application/json" \
  -d '{"providerId":"rules_engine"}' -b cookies.txt

# Get next question via brain
curl -X POST http://127.0.0.1:3001/intake/sessions/<id>/brain/next \
  -H "Content-Type: application/json" \
  -d '{}' -b cookies.txt

# Generate TIU draft
curl -X POST http://127.0.0.1:3001/intake/sessions/<id>/tiu-draft \
  -b cookies.txt

# View brain audit
curl http://127.0.0.1:3001/intake/brain/audit -b cookies.txt
```

## Non-negotiables

1. **NO medical diagnosis** -- structured history-taking only
2. **Multi-language** -- i18n keys in en/fil/es
3. **Pluggable** -- providers registered at startup, resolved at runtime
4. **Governed** -- audit trail for every brain decision
5. **PHI safe** -- no PHI in audit hashes, LLM interactions redacted
6. **VistA-ready** -- TIU draft note export with filing posture

## Migration Path

Brain state stores are in-memory (Phase 143). Migration to PG:
1. `intake_brain_states` table for session brain state
2. `intake_brain_audit` table for decision audit log
3. PG repos following existing store-resolver pattern
