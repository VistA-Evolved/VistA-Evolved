# Phase 308 -- W12-P10 NOTES
## Departmental Certification Runner

### Architecture Decisions

1. **17 checks across 4 categories** — Infrastructure (4), Domain (6), Telehealth (3),
   Safety (4). This covers the complete Wave 12 writeback surface.

2. **Non-destructive** — All checks are read-only or use dry-run mode. Domain checks
   invoke executor.dryRun() with synthetic commands, never executor.execute().
   No VistA RPCs are called during certification.

3. **Admin-only endpoint** — `/writeback/certification` is caught by the existing
   `/writeback/*` AUTH_RULES pattern (requires admin session). The lightweight
   `/writeback/certification/summary` endpoint provides quick health check data.

4. **Three-tier status** — `certified` (all pass), `partial` (warnings but no failures),
   `not_certified` (any failure). Default state with writeback disabled is `partial`
   (gates warn about being disabled, which is the safe default).

5. **Domain executor dry-run** — Each domain check creates a synthetic ClinicalCommand
   with `_certification: true` marker and calls dryRun(). If no executor is registered
   (startup wiring not done), the check returns `warn` not `fail`, since registration
   is a runtime concern, not a code defect.

### What Gets Checked
| Category | Check ID | What |
|----------|----------|------|
| infra | infra.command-bus | Command store operational |
| infra | infra.gates | Feature gates configured |
| infra | infra.audit | Audit actions registered |
| infra | infra.store-policy | Store entries declared |
| domain | domain.tiu | TIU executor registered + dry-run |
| domain | domain.orders | Orders executor registered + dry-run |
| domain | domain.pharm | Pharmacy executor registered + dry-run |
| domain | domain.lab | Labs executor registered + dry-run |
| domain | domain.adt | ADT executor registered + dry-run |
| domain | domain.img | Imaging executor registered + dry-run |
| telehealth | telehealth.encounter-link | Encounter link store operational |
| telehealth | telehealth.consent | Consent posture config valid |
| telehealth | telehealth.session-hardening | Hardening config valid |
| safety | safety.dry-run | Dry-run default is ON |
| safety | safety.kill-switch | Global kill-switch state |
| safety | safety.intent-mapping | 19 intents across 6 domains |
| safety | safety.phi-guard | patientRefHash used, not raw DFN |
