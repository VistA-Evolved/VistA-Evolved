# Phase 312 — IMPLEMENT: Privacy/Consent Controls

> Wave 13-P4 (Regulatory/Compliance + Multi-Country Packaging)

## Objective

Implement patient consent management engine with regulatory profiles,
category-level consent, compliance checking, and consent lifecycle (grant/revoke).

## Deliverables

### 1. Consent Engine
- **File:** `apps/api/src/services/consent-engine.ts`
- 8 consent categories: treatment, payment, operations, research, data_sharing,
  cross_border, telehealth, analytics
- 3 regulatory profiles: HIPAA, DPA_PH (Philippines), DPA_GH (Ghana)
- Consent records are immutable — revocation creates new record
- Compliance checking: are all required consents granted?
- Evidence hash (SHA-256) for consent form tracking

### 2. Consent Routes
- **File:** `apps/api/src/routes/consent-routes.ts`
- `GET /consent/profiles` — list regulatory profiles
- `GET /consent/categories` — list consent categories
- `GET /consent/patient` — patient consent records
- `GET /consent/check` — compliance check
- `POST /consent/grant` — grant consent
- `POST /consent/revoke` — revoke consent
- `GET /consent/active` — check active consent for category

## Acceptance Criteria

- [ ] 8 consent categories defined
- [ ] 3 regulatory profiles with different granularity
- [ ] Consent immutability (revocation creates new record)
- [ ] Compliance check against regulatory profile
- [ ] Evidence hash for audit trail
- [ ] No PHI in audit logs
