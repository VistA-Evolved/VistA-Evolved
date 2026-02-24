# Phase 110 -- RCM Core v1: Credential Vault + LOA Engine (VERIFY)

## Verification Gates

1. Schema: 6 new tables exist (credential_artifact, credential_document, accreditation_status, accreditation_task, loa_request, loa_attachment)
2. API: POST /rcm/credentials creates credential artifact, GET returns it
3. API: POST /rcm/accreditation creates status record, GET lists by payer
4. API: POST /rcm/loa creates LOA request, returns draft status
5. API: POST /rcm/loa/:id/generate-packet returns packet data
6. API: POST /rcm/loa/:id/transition moves through FSM states
7. Audit: credential + LOA changes appear in /rcm/audit
8. Security: no PHI in logs, no secrets in code
9. Expiration: credentials with future expiry have correct renewal window
10. Adapter: stub adapter returns contracting_needed for unknown payers
11. TypeScript: `cd apps/api && npx tsc --noEmit` exits 0
12. Next.js: `cd apps/web && npx next build` exits 0
