# Phase 26 — Portal & Telehealth: VistA-First Grounding + Contract + Skeleton — VERIFY

## Verification Checklist

### Build Gates

- [ ] `pnpm install` succeeds (installs portal dependencies)
- [ ] `pnpm -C apps/portal build` succeeds
- [ ] `pnpm -C apps/api build` succeeds (or `tsc --noEmit` passes)
- [ ] `pnpm -C apps/web build` succeeds (existing app unaffected)

### Contract Artifacts

- [ ] `docs/contracts/portal/vista-source-inventory.md` exists and lists 14+ RPCs
- [ ] `docs/contracts/portal/reference-repos-inventory.md` exists
- [ ] `docs/contracts/portal/competitive-baseline.md` exists
- [ ] `docs/contracts/portal/portal-contract-v1.yaml` exists with modules + rules
- [ ] `docs/contracts/portal/portal-capability-matrix.md` exists

### Portal Skeleton

- [ ] `apps/portal/package.json` exists with Next.js 16
- [ ] Login page renders (`/`)
- [ ] Dashboard page renders (`/dashboard`)
- [ ] Health Records page renders (`/dashboard/health`)
- [ ] Medications page renders (`/dashboard/medications`)
- [ ] Messages page renders (`/dashboard/messages`)
- [ ] Appointments page renders (`/dashboard/appointments`)
- [ ] Telehealth page renders (`/dashboard/telehealth`)
- [ ] Profile page renders (`/dashboard/profile`)
- [ ] No dead clicks in navigation (all links go to real routes)
- [ ] DataSourceBadge component shows on every data panel

### API Routes

- [ ] `POST /portal/auth/login` responds
- [ ] `POST /portal/auth/logout` responds
- [ ] `GET /portal/auth/session` responds (401 without cookie)
- [ ] All 10 `/portal/health/*` routes respond (401 without session)
- [ ] `GET /portal/audit/events` responds
- [ ] `GET /portal/audit/stats` responds

### License & Compliance

- [ ] `.\scripts\license-guard.ps1` passes all gates
- [ ] No AIOTP code in `apps/` or `services/`
- [ ] No VA-specific terms in portal UI strings
- [ ] `THIRD_PARTY_NOTICES.md` exists and lists all 3 reference repos

### Security

- [ ] Portal sessions use `portal_session` cookie (not `ehr_session`)
- [ ] Portal session has 30-min absolute TTL, 15-min idle TTL
- [ ] Login rate-limited (5 attempts / 15 min)
- [ ] Portal session never exposes raw DFN to client
- [ ] Portal audit uses hashed patient ID (no raw DFN in events)

### Documentation

- [ ] `prompts/28-PHASE-26-PORTAL-TELEHEALTH/` folder exists
- [ ] `docs/runbooks/portal-grounding.md` exists
- [ ] `ops/summary.md` exists
- [ ] `ops/notion-update.json` exists

### Regression

- [ ] Existing `verify-latest.ps1` still passes (Phase 22-25)
- [ ] Clinician app (`apps/web`) builds without errors
- [ ] API server starts without errors
