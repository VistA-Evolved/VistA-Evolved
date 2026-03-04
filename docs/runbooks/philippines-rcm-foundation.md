# Philippines RCM Foundation — Runbook

> Phase 87 | PayerOps Core | 2025-01-XX

## Overview

The PayerOps module adds Philippines-specific payer operations capabilities
to the existing RCM subsystem:

- **Facility-Payer Enrollment** tracking (accreditation lifecycle)
- **LOA (Letter of Authorization)** workflow with status FSM
- **Credential Vault** for accreditation documents (AES-256-GCM encrypted)
- **Manual + Portal adapters** (no fake automation)

All routes live under `/rcm/payerops/*` and are gated by the RCM module toggle.

## Architecture

```
apps/api/src/rcm/payerOps/
  types.ts                — Domain types + adapter interface
  store.ts                — In-memory stores (enrollment, LOA, credential vault)
  credential-encryption.ts — AES-256-GCM envelope encryption
  payerops-routes.ts      — Fastify route definitions (20+ endpoints)
  manual-adapter.ts       — ManualAdapter + submission pack generator
  portal-adapter.ts       — PortalAdapter + portal config registry

apps/web/src/app/cprs/admin/payerops/
  page.tsx                — Admin UI (4 tabs)
```

## API Endpoints

| Method | Path                                 | Description                          |
| ------ | ------------------------------------ | ------------------------------------ |
| GET    | /rcm/payerops/health                 | Subsystem health + encryption status |
| GET    | /rcm/payerops/stats                  | Aggregate stats                      |
| GET    | /rcm/payerops/enrollments            | List enrollments                     |
| GET    | /rcm/payerops/enrollments/:id        | Get enrollment                       |
| POST   | /rcm/payerops/enrollments            | Create enrollment                    |
| PUT    | /rcm/payerops/enrollments/:id/status | Update enrollment status             |
| GET    | /rcm/payerops/loa                    | List LOA cases                       |
| GET    | /rcm/payerops/loa/:id                | Get LOA case                         |
| POST   | /rcm/payerops/loa                    | Create LOA case                      |
| PUT    | /rcm/payerops/loa/:id/status         | Transition LOA status                |
| POST   | /rcm/payerops/loa/:id/attachments    | Attach credential to LOA             |
| POST   | /rcm/payerops/loa/:id/submit         | Submit LOA via adapter               |
| POST   | /rcm/payerops/loa/:id/pack           | Generate submission pack             |
| GET    | /rcm/payerops/credentials            | List credentials                     |
| GET    | /rcm/payerops/credentials/:id        | Get credential                       |
| POST   | /rcm/payerops/credentials            | Create credential entry              |
| DELETE | /rcm/payerops/credentials/:id        | Delete credential                    |
| GET    | /rcm/payerops/credentials/expiring   | Expiring credentials                 |
| GET    | /rcm/payerops/adapters               | List adapters                        |

## LOA Status Machine

```
draft --> pending_submission --> submitted --> under_review --> approved
                                         \                 \-> partially_approved
                                          \-> denied
approved --> expired
partially_approved --> expired
draft --> cancelled
pending_submission --> cancelled
submitted --> cancelled
```

## Credential Encryption

- Algorithm: AES-256-GCM (12-byte IV, 16-byte auth tag)
- Master key: `PAYEROPS_CREDENTIAL_KEY` env var (64 hex chars = 32 bytes)
- Dev fallback: ephemeral key generated on startup (warning logged)
- Envelope format: `base64(iv + authTag + ciphertext)`

### Production Setup

```bash
# Generate a master key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Set in .env.local
PAYEROPS_CREDENTIAL_KEY=<64-hex-chars>
```

## Adapter Modes

| Mode       | Description                              | Returns           |
| ---------- | ---------------------------------------- | ----------------- |
| **Manual** | Print packs, checklists, email templates | `manual_required` |
| **Portal** | Portal URL + step-by-step navigation     | `manual_required` |
| **API**    | Direct payer integration (future)        | TBD               |

All adapters currently return `manual_required` status. This is intentional.
No operation pretends to succeed. The submission pack generator provides
actionable output for manual workflows.

## In-Memory Store — Migration Plan

1. **Current**: In-memory Map (resets on API restart)
2. **Phase N+1**: SQLite file-backed (multi-instance deploy)
3. **Phase N+2**: PostgreSQL (SaaS multi-tenant)
4. **Phase N+3**: VistA file-backed (when IB/AR files available)

## Feature Flag

PayerOps routes are gated by the RCM module in `config/modules.json`.
When the RCM module is disabled, all `/rcm/payerops/*` endpoints return 403.

## Known Integration-Pending Items

1. **PhilHealth eClaims API LOA submission** — requires live API credentials
2. **HMO portal scraping** — each HMO has a different portal; PortalAdapter stores URLs only
3. **File upload** — credential vault stores metadata only; actual file upload needs S3/blob storage
4. **VistA IB/AR integration** — when production VistA has billing data populated
5. **PDF generation** — submission packs return JSON; client-side or server-side PDF rendering needed

## Troubleshooting

### PayerOps routes return 403

- Check RCM module is enabled in the SKU or tenant override
- `GET /api/modules` should show `rcm` as enabled

### Encryption shows "degraded"

- Set `PAYEROPS_CREDENTIAL_KEY` env var
- Must be exactly 64 hex characters (32 bytes)

### LOA transition fails with 422

- Check the status FSM: not all transitions are valid
- Use `POST /rcm/payerops/loa/:id/status` with valid target status
