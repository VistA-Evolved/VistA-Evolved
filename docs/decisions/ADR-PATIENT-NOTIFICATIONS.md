# ADR: Patient Notifications

## Status
Accepted

## Context
Patient communications (appointment reminders, results available, medication refill)
must be:
1. PHI-safe by default — no patient names, diagnoses, or clinical details in messages
2. Localized — support en, fil, es at minimum
3. Auditable — every send attempt logged
4. Consent-gated — patients must opt in per channel (email, SMS)
5. Provider-abstracted — swap SMS/email providers without code changes

## Decision
- **Provider abstraction:** `NotificationProvider` interface with `send(channel, to, template, vars)`.
  Built-in providers: `stub` (dev/test), `smtp` (email), `twilio` (SMS scaffold).
- **PHI-safe defaults:** Default templates contain ONLY generic text:
  "You have an upcoming appointment" / "New results are available".
  **No PHI in any template unless tenant explicitly enables PHI mode.**
- **PHI mode:** Gated by `COMMS_PHI_ENABLED=true` + tenant policy flag
  `allowPhiInComms`. Both must be true. Even then, templates are reviewed
  and only include first name + appointment date (never diagnosis/results).
- **Consent model:** `patient_comm_preference` PG table with `(tenant_id, patient_dfn_hash,
  channel, opted_in, updated_at)`. DFN is SHA-256 hashed — never stored raw.
- **Localization:** Templates in `data/comms-templates/{locale}/{template-id}.txt`.
  Fallback chain: `fil` → `en`, `es` → `en`.
- **Audit:** Every send attempt → immutable audit with `{channel, templateId, recipientHash,
  status, providerResponse}`. No PHI in audit entries.

## Consequences
- Safe-by-default: even misconfigured systems don't leak PHI.
- Adding a new provider (e.g., WhatsApp) requires implementing `NotificationProvider`.
- Consent must be seeded for existing patients during migration.
