# SaaS Billing & Marketing — Operations Summary

> Covers Phases A-E of the SaaS commercialization initiative.

## What Changed

### Phase A: Stabilize Foundation
- Fixed TypeScript errors across billing, signup, and provisioning routes
- Resolved module guard conflicts for /billing/ and /signup/ paths
- Fixed RBAC permissions for billing routes (session auth, not admin)

### Phase B: Admin Write-Backs
- Wired admin provisioning to create billing subscriptions on tenant creation
- Billing subscription now persisted in PostgreSQL (`billing_subscription` table)
- Subscription lifecycle: active → cancelled with timestamp tracking

### Phase C: Docker Orchestration + Signup
- Marketing site (Next.js static export, port 3004) with landing, pricing, signup
- Multi-step signup wizard with entity type selection and provisioning
- API signup route with rate limiting (5 requests/hour per IP)

### Phase D: Stripe Billing Wiring
- `StripeBillingProvider` using raw fetch to Stripe REST API (no SDK)
- Billing provider interface: `createSubscription`, `cancelSubscription`, `getSubscription`, `listPlans`, `handleWebhook`
- `BillingRepository` with PG persistence (3 tables: billing_subscription, billing_plan, billing_event)
- Grace period support for failed payments
- Mock provider for development, Stripe for production

### Phase E: Production Hardening
- **E1**: Mock billing blocked in rc/prod runtime modes (`blocksMockBilling()`)
- **E2**: Stripe webhooks reject unverified payloads in rc/prod
- **E3**: Marketing site polish — SEO meta tags, OG/Twitter cards, robots.txt, sitemap, favicon, testimonials, FAQ, 4-column footer, shared Nav/Footer components, per-page metadata
- **E4**: Customer-facing getting started guide
- **E5**: Webhook error responses sanitized (no Stripe internals leaked)
- CORS updated to include portal (3002) and marketing (3004) origins
- Entity type mismatch fixed (MULTI_CLINIC, SPECIALTY_CENTER added to API)
- All 9 billing-related env vars documented in `.env.example`

## Files Touched

### API (apps/api/src/)
- `billing/index.ts` — Provider factory with production guards
- `billing/billing-routes.ts` — REST endpoints, sanitized error responses
- `billing/stripe-provider.ts` — Stripe REST API integration, webhook verification
- `billing/billing-repo.ts` — PG persistence layer
- `middleware/billing-gate.ts` — Subscription enforcement middleware
- `middleware/security.ts` — CORS origins updated
- `routes/signup.ts` — Entity type map expanded
- `platform/pg/pg-migrate.ts` — 3 billing tables
- `.env.example` — 9 new env vars documented

### Marketing (apps/marketing/)
- `src/app/layout.tsx` — SEO metadata, OG tags, Twitter cards
- `src/app/page.tsx` — How It Works, Testimonials, FAQ, Footer
- `src/app/pricing/page.tsx` — Per-page metadata, shared Nav/Footer
- `src/app/signup/page.tsx` — Shared Nav/Footer
- `src/app/signup/layout.tsx` — Signup page metadata
- `src/components/Nav.tsx` — Shared navigation component
- `src/components/Footer.tsx` — Shared footer component
- `public/robots.txt` — Search engine directives
- `public/sitemap.xml` — 3-page sitemap
- `public/favicon.svg` — SVG favicon
- `.env.example` — Marketing env vars documented

### Docs
- `docs/customer-getting-started.md` — Customer onboarding guide

## How to Test

```powershell
# 1. Verify Docker
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"

# 2. Start API
cd apps/api
npx tsx --env-file=.env.local src/index.ts

# 3. Health check
curl.exe -s http://127.0.0.1:3001/health

# 4. Billing plans (public, no auth)
curl.exe -s http://127.0.0.1:3001/billing/plans

# 5. Login + billing subscription
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt http://127.0.0.1:3001/billing/subscription

# 6. Signup
curl.exe -s -X POST http://127.0.0.1:3001/signup/register -H "Content-Type: application/json" -d '{"name":"Test Clinic","contactEmail":"test@example.com","country":"US","entityType":"SOLO_CLINIC"}'

# 7. Marketing site
cd apps/marketing
pnpm build && npx serve out -l 3004
# Visit http://localhost:3004
```

## Production Deployment Notes

1. Set `PLATFORM_RUNTIME_MODE=prod` — blocks mock billing, enforces OIDC
2. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` — required in rc/prod
3. Set `STRIPE_PRICE_*` env vars for each entity type
4. Set `BILLING_GATE_ENABLED=true` to enforce subscription checks
5. Set `CLAIM_SUBMISSION_ENABLED=false` (default) until payer connectivity verified
6. Build marketing site with `NEXT_PUBLIC_API_URL` pointing to production API
7. Serve marketing static export via CDN or nginx

## Follow-Ups

- [ ] Stripe webhook endpoint registration in Stripe Dashboard
- [ ] Real Stripe price IDs for each entity type tier
- [ ] Payment method collection UI (Stripe Elements or Checkout)
- [ ] Subscription upgrade/downgrade flow
- [ ] Usage metering for per-user billing
- [ ] Marketing site: responsive design for mobile
- [ ] Marketing site: analytics integration (PostHog/Plausible)
- [ ] Legal pages (Privacy Policy, Terms of Service, HIPAA Notice)
