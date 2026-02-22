# Phase 64 — Secure Messaging v1 (MailMan-Backed) + Portal Messaging Posture

## User Request
Close the Phase 61 messaging gap using VistA MailMan where feasible.
Provide clinician secure messaging via MailMan, patient messaging posture
(patient -> clinic/team inbox via MailMan group OR explicit pending if not supported).
No fake messaging.

## Implementation Steps
1. Build MailMan plan artifact — discover RPCs, identifiers, baskets/groups
2. Create secure-messaging adapter (separate from HL7/HLO messaging adapter)
3. API routes: clinician inbox list, message detail, compose/send, portal message request
4. Clinician UI: inbox view, message view, compose dialog
5. Portal: messages page with "New message to clinic" (or pending)
6. Security: never log message bodies, role gates, rate limits
7. Add immutable audit actions for messaging
8. Wire into index.ts, security.ts AUTH_RULES

## Verification Steps
- All verify gates pass (scripts/verify-phase64-secure-messaging.ps1)
- TSC clean
- No console.log
- No message body content in audit logs
- Dead clicks = 0

## Files Touched
- artifacts/phase64/mailman-plan.json (NEW)
- apps/api/src/services/secure-messaging.ts (NEW)
- apps/api/src/routes/messaging/index.ts (NEW)
- apps/api/src/lib/immutable-audit.ts (EDIT: add messaging actions)
- apps/api/src/middleware/security.ts (EDIT: add /messaging/ auth rule)
- apps/api/src/index.ts (EDIT: register messaging routes)
- apps/web/src/app/cprs/messages/page.tsx (NEW)
- apps/portal/src/app/dashboard/messages/page.tsx (EDIT: wire MailMan posture)
- config/capabilities.json (EDIT: add messaging capabilities)
- scripts/verify-phase64-secure-messaging.ps1 (NEW)
- docs/runbooks/phase64-secure-messaging.md (NEW)
- ops/phase64-summary.md (NEW)
- ops/phase64-notion-update.json (NEW)
