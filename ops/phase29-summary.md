# Phase 29 Summary — Portal IAM + Proxy Workflows + Access Logs

## What Changed

### A) Identity Architecture
- Created `PortalUser` entity with scrypt password hashing, account lockout (5 attempts / 15 min), MFA scaffolding (TOTP, feature-flagged), and device session tracking
- All user data in-memory (dev) — migration path to persistent store documented
- Dev seed: patient1/Patient1! (DFN 100022), patient2/Patient2! (DFN 100033)

### B) Proxy Invitation Workflow
- Guardian/caregiver proxy flow: invite → policy eval → accept/decline
- Policy engine enforces: max 10 proxies, minor age restrictions, sensitivity evaluation (behavioral health, substance abuse, HIV, reproductive)
- Protected minor (13-17) warnings integrated from Phase 27 sensitivity module
- 7-day invitation TTL with automatic expiry cleanup

### C) Access Logs (Patient-Visible)
- PHI-safe event logging with regex sanitization (SSN, DOB, LAST,FIRST)
- 21 event types covering sign-in/out, record views, exports, proxy actions, messages, refills
- Patient-facing Activity Log page with event type + date filters
- Max 5,000 entries/user, 100,000 total cap

### D) Security Posture
- CSRF: double-submit cookie pattern on all write endpoints
- Rate limiting: 5 auth attempts per 15 min per IP
- Account lockout: 5 failures → 15 min lockout
- Session: httpOnly + sameSite strict, 30 min absolute + 15 min idle TTL
- Device sessions: SHA-256 hashed tokens, 30-day TTL, revoke UI

### E) UI
- Account page: password change + device session management
- Family Access page: proxy invitation send/receive/cancel/accept/decline
- Activity Log page: event timeline with filters
- Portal nav updated with 3 new items

## Files Touched

### New (API backend)
- `apps/api/src/portal-iam/types.ts`
- `apps/api/src/portal-iam/portal-user-store.ts`
- `apps/api/src/portal-iam/proxy-store.ts`
- `apps/api/src/portal-iam/access-log-store.ts`
- `apps/api/src/portal-iam/csrf.ts`
- `apps/api/src/portal-iam/portal-iam-routes.ts`

### New (Portal UI)
- `apps/portal/src/app/dashboard/account/page.tsx`
- `apps/portal/src/app/dashboard/proxy/page.tsx`
- `apps/portal/src/app/dashboard/activity/page.tsx`

### New (Docs)
- `docs/security/portal-iam.md`
- `docs/runbooks/phase29-iam.md`
- `prompts/31-PHASE-29-PATIENT-IAM/31-01-patient-iam-IMPLEMENT.md`

### Modified
- `apps/api/src/index.ts` — registered portalIamRoutes + seedDevUsers
- `apps/portal/src/components/portal-nav.tsx` — added 3 nav items

## How to Test Manually

```bash
# 1. Start API
cd apps/api
npx tsx --env-file=.env.local src/index.ts

# 2. Start Portal
cd apps/portal
pnpm dev

# 3. Login as dev user
curl -c cookies.txt -H "Content-Type: application/json" \
  -X POST http://localhost:3001/portal/iam/login \
  -d '{"username":"patient1","password":"Patient1!"}'

# 4. Check session
curl -b cookies.txt http://localhost:3001/portal/iam/session

# 5. View activity log
curl -b cookies.txt "http://localhost:3001/portal/iam/activity?limit=10"

# 6. View stats
curl -b cookies.txt http://localhost:3001/portal/iam/stats
```

## Verifier Output

TSC compile check: all 3 apps (api, web, portal) compile clean with `--noEmit`.

## Follow-ups

- Phase 29 VERIFY: create `scripts/verify-phase1-to-phase29.ps1`
- Persistent storage migration (replace in-memory Maps)
- Real TOTP implementation (production HMAC, QR code generation)
- Email-based password reset delivery
- Identity verification workflow (selfie + ID document)
- VistA DGMP integration for proxy relationships
