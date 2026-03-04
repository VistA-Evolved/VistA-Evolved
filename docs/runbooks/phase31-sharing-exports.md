# Phase 31 — Patient-Directed Sharing + Exports + SHC

## Runbook: Sharing, Export, and SMART Health Cards

### Overview

Phase 31 enhances the patient portal's data sharing and export capabilities:

1. **Share-code lane** — Tighter security: 60-min TTL (was 72h), 3-attempt lockout (was 5), one-time redeem option, CAPTCHA stub
2. **Export lane** — PDF (existing, enhanced) + structured JSON for portability
3. **SHC lane** — Feature-flagged SMART Health Cards for immunizations
4. **VistA-first data sourcing** — All data from RPCs; "integration pending" when unavailable

### Prerequisites

- API server running (`npx tsx --env-file=.env.local src/index.ts` from `apps/api`)
- Portal running (`pnpm dev` from `apps/portal`)
- VistA Docker sandbox (optional — data will show "integration pending" without it)

---

## A. Share-Code Lane

### Create a Share Link

```bash
# Authenticate first (portal session cookie required)
curl -X POST http://localhost:3001/portal/shares \
  -H "Content-Type: application/json" \
  -b "portal_session=<token>" \
  -d '{
    "sections": ["medications", "allergies", "problems"],
    "label": "For Dr. Smith",
    "ttlMinutes": 30,
    "oneTimeRedeem": true
  }'
```

Response includes `accessCode` (shown ONLY at creation) and `token`.

### Verify a Share Link (public — no session)

```bash
curl -X POST http://localhost:3001/portal/share/verify/<token> \
  -H "Content-Type: application/json" \
  -d '{
    "accessCode": "ABC123",
    "patientDob": "1950-01-01",
    "captchaToken": "optional-stub"
  }'
```

### Security Parameters

| Parameter          | Phase 27   | Phase 31                                                       |
| ------------------ | ---------- | -------------------------------------------------------------- |
| Default TTL        | 72 hours   | 60 minutes                                                     |
| Max TTL            | 7 days     | 24 hours                                                       |
| Lockout threshold  | 5 attempts | 3 attempts                                                     |
| One-time redeem    | N/A        | Optional (auto-revokes after first access)                     |
| CAPTCHA            | None       | Stub (ready for real provider)                                 |
| Shareable sections | All        | Curated: medications, allergies, problems, immunizations, labs |

---

## B. Export Lane

### PDF Export (existing, enhanced)

```bash
# Single section
curl http://localhost:3001/portal/export/section/immunizations \
  -b "portal_session=<token>" -o immunizations.pdf

# Full record (now includes immunizations + labs)
curl http://localhost:3001/portal/export/full \
  -b "portal_session=<token>" -o health-record.pdf
```

### Structured JSON Export (Phase 31)

```bash
# All sections
curl http://localhost:3001/portal/export/json \
  -b "portal_session=<token>" -o health-record.json

# Specific sections
curl "http://localhost:3001/portal/export/json?sections=medications,allergies" \
  -b "portal_session=<token>" -o partial-record.json
```

JSON format: `vista-evolved-health-record` v1.0, FHIR-mappable structure.

---

## C. SMART Health Cards (SHC)

### Enable

Set `PORTAL_SHC_ENABLED=true` in `.env.local`.

### Check Capabilities

```bash
curl http://localhost:3001/portal/shc/capabilities
# → { "ok": true, "enabled": true/false, "datasets": [...] }
```

### Generate SHC

```bash
curl http://localhost:3001/portal/export/shc/immunizations \
  -b "portal_session=<token>"
```

Returns JWS + `shc:/` numeric URI (for QR code generation).

**WARNING**: Dev mode credentials use `DEV-HS256` algorithm. NOT production-grade. Production requires:

- ES256 (P-256) signing key
- Published JWKS at `/.well-known/jwks.json`
- Proper FHIR Bundle validation

---

## D. Portal UI

- **Share Records**: `/dashboard/sharing` — Create/manage share links
- **Export**: `/dashboard/exports` — PDF, JSON, and SHC downloads

Both pages accessible from the portal sidebar navigation.

---

## E. Threat Model

### Share-Code Threats

| Threat                  | Mitigation                                                |
| ----------------------- | --------------------------------------------------------- |
| Brute-force access code | 3-attempt lockout, 6-char code (32^6 = 1B combos)         |
| Link forwarding         | DOB verification required in addition to access code      |
| Stale access            | 60-min default TTL, max 24h                               |
| Session replay          | One-time redeem option auto-revokes after first use       |
| Bot attacks             | CAPTCHA stub (ready for real provider)                    |
| Over-sharing            | Curated section subset (no demographics/vitals in shares) |

### Export Threats

| Threat                    | Mitigation                                      |
| ------------------------- | ----------------------------------------------- |
| Unauthorized export       | Session required, all exports audited           |
| Data exfiltration at rest | PDF/JSON contain no SSN; minimal PII            |
| SHC credential forgery    | Dev mode clearly marked; prod needs HSM signing |

### Audit Coverage

All operations logged to portal audit trail:

- `portal.share.create` / `portal.share.access` / `portal.share.revoke` / `portal.share.view`
- `portal.export.section` / `portal.export.full` / `portal.export.json` / `portal.export.shc`

---

## F. Verification

```powershell
.\scripts\verify-phase31-sharing-exports.ps1
```
