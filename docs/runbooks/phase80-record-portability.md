# Patient Record Portability v1 -- Runbook

> Phase 80 -- VistA Health Summary first, share + download

## Overview

Patients can generate a health record summary from VistA data, download it as
PDF or HTML, and share it via time-limited access-code-protected links.

## Architecture

```
Portal UI (records/page.tsx)
  |
  v
API Routes (record-portability.ts)  -- 10 endpoints
  |
  +-- VistA RPCs (ORWRP REPORT TEXT, section RPCs)
  |
  +-- Store (record-portability-store.ts)
        |
        +-- AES-256-GCM encryption at rest
        +-- In-memory Map<> with TTL cleanup
        +-- Portal audit integration
```

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /portal/record/export | session | Generate summary (PDF/HTML) |
| GET | /portal/record/export/:token | session | Download by token |
| GET | /portal/record/exports | session | List patient's exports |
| POST | /portal/record/share | session | Create share link |
| POST | /portal/record/share/:id/revoke | session | Revoke share link |
| GET | /portal/record/shares | session | List patient's shares |
| GET | /portal/record/share/audit | session | Access audit log |
| GET | /portal/record/share/preview/:token | public | Share preview (label, sections) |
| POST | /portal/record/share/verify/:token | public | Verify access code + DOB |
| GET | /portal/record/stats | session | Portability stats |

## VistA RPCs Used

| RPC | Section | Status |
|-----|---------|--------|
| ORWRP REPORT TEXT | Health Summary (primary) | Available |
| ORQQAL LIST | Allergies | Available |
| ORWPS ACTIVE | Medications | Available |
| ORWCH PROBLEM LIST | Problems | Available |
| ORQQVI VITALS | Vitals | Available |
| ORWPT SELECT | Demographics | Available |
| ORWLRR INTERIMG | Labs | Available |
| ORQQPX IMMUN LIST | Immunizations | Pending |
| GMTS HS ABBREVIATED PROFILE | Full Summary | Pending |

## Security

- **Encryption**: AES-256-GCM per-export (random 256-bit key + 96-bit IV)
- **Forward secrecy**: Key material zeroed on revoke/expire
- **Access code**: 6-char from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`
- **DOB verification**: Required for share access
- **Lockout**: 3 failed attempts locks the share
- **TTL**: Default 1 hour, max 24 hours
- **Audit**: All actions logged via portal audit system (DFN hashed)

## Limits

| Parameter | Value |
|-----------|-------|
| Max exports per patient | 20 |
| Max shares per patient | 10 |
| Default export TTL | 1 hour |
| Default share TTL | 1 hour |
| Max share TTL | 24 hours |
| Access code length | 6 chars |
| Max access attempts | 3 |
| Cleanup interval | 5 minutes |

## Troubleshooting

1. **Export returns empty/minimal data**: Check VistA Docker is running and
   credentials in `.env.local` are correct. The section RPCs need a valid DFN.

2. **Share verify returns 410**: The share was revoked or expired. Check
   `GET /portal/record/shares` to see status.

3. **Share verify returns 403**: Wrong access code or too many attempts.
   After 3 failures the share is locked permanently.

4. **Cleanup not running**: Check that `startPortabilityCleanup()` is called
   in `index.ts` after route registration.

## Verification

```powershell
.\scripts\verify-phase80-record-portability.ps1
# Expected: 66 PASS / 0 FAIL
```
