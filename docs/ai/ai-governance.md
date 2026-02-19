# AI Governance Framework — VistA-Evolved

> Phase 33 — Governing document for AI features in VistA-Evolved.

## 1. Guiding Principles

1. **No autonomous clinical decisions.** AI never diagnoses, prescribes, or creates orders.
2. **Human-in-the-loop always.** Every AI output requires clinician confirmation before action.
3. **Grounded in chart data.** AI outputs are grounded in VistA patient data via RAG, not free-form generation.
4. **Audited end-to-end.** Every request, response, confirmation, and rejection is logged.
5. **PHI-safe by default.** Cloud models receive redacted data; on-premises models may receive full data per facility policy.
6. **Transparent provenance.** Every prompt template is versioned and content-hashed (SHA-256). Tampering is detectable.

## 2. Disallowed Categories (Hard Block)

The safety layer blocks any request or response that falls into these categories:

| Category | Examples |
|----------|----------|
| `diagnosis` | "The patient likely has...", "Differential includes..." |
| `treatment_plan` | "Recommended treatment is...", "Start the patient on..." |
| `prescribing_guidance` | "Prescribe 10mg...", "Change dose to..." |
| `autonomous_ordering` | "Order a CBC", "Schedule MRI" |
| `prognosis` | "Expected outcome is...", "5-year survival..." |
| `differential_diagnosis` | "Consider ruling out...", "DDx includes..." |

These are enforced at both the request (pre-model) and response (post-model) stages.

## 3. Approved Use Cases

### 3.1 Intake Summary (Clinician)
- **Input:** Patient DFN + chart context (medications, allergies, problems, vitals)
- **Output:** Structured note draft with citations to source data
- **Flow:** Generate → Clinician reviews → Confirm/Reject → (if confirmed) Copy to notes
- **Guardrail:** Output explicitly states "AI-generated draft — requires clinician review"

### 3.2 Lab Education (Patient Portal)
- **Input:** Lab name + optional value
- **Output:** Plain-language explanation of what the lab measures and what the value means
- **Flow:** Patient enters term → AI explains → Disclaimer displayed
- **Guardrail:** "This is for educational purposes only and does not replace medical advice"

### 3.3 Portal Search (Patient Portal)
- **Input:** Natural language question about portal navigation
- **Output:** Directions to the correct portal page/feature
- **Flow:** Patient asks → AI responds with portal navigation help
- **Guardrail:** Never provides clinical advice; only helps with portal usage

## 4. Model Approval Process

1. **Registration:** New models must be registered in `model-registry.ts` with deployment type, capabilities, and PHI clearance.
2. **Status Lifecycle:** `pending` → `approved` → `active` (or `suspended`/`retired`).
3. **PHI Clearance:** Only `on-premises` deployment models may receive raw PHI. Cloud models require `redactPhi: true` in facility policy.
4. **Capability Mapping:** Each model declares which use cases it supports.

Current approved models:
- `stub-v1` — Development stub (always available, no external calls)

## 5. Prompt Template Governance

- All prompts are stored in `prompt-registry.ts` with SHA-256 content hashes.
- Only `allowedVariables` may be interpolated into prompts (injection prevention).
- `approvedBy` field records who approved the prompt text.
- Changes to prompt text change the hash, making drift detectable.

## 6. Facility Policy Controls

Facilities can configure AI behavior via `/ai/policy` (admin only):

| Setting | Default | Description |
|---------|---------|-------------|
| `aiEnabled` | `true` | Master kill switch |
| `allowedUseCases` | all 3 | Which use cases are permitted |
| `redactPhi` | `true` | Force PHI redaction for all models |
| `cloudModelsAllowed` | `false` | Permit cloud-hosted models |
| `maxRequestsPerUserPerHour` | `30` | Per-user rate limit |
| `requireClinicianConfirmation` | `true` | Make confirm/reject mandatory |

## 7. Audit Trail

Every AI interaction produces an `AIAuditEvent` with:
- Hashed user and patient IDs (PHI-safe)
- Use case, model ID, prompt hash
- Request/response content (full, for compliance)
- Latency, token counts
- Outcome: `completed`, `blocked`, `error`, `confirmed`, `rejected`
- Timestamp

Admin endpoints: `GET /ai/audit`, `GET /ai/audit/stats`

## 8. Architecture

```
Request → Rate Limit → Safety Check → Model Resolution → RAG Assembly
  → PHI Redaction → Prompt Rendering → Model Call → Post-Safety Check
  → Audit Log → Response (with citations + confidence)
```

See `apps/api/src/ai/ai-gateway.ts` for the 11-step pipeline implementation.

## 9. Future Considerations

- External model integration (OpenAI, Anthropic, local LLMs)
- Prompt A/B testing with hash-based routing
- Feedback loop from confirm/reject rates to prompt improvement
- Patient consent tracking for AI features
- Multi-language lab education
