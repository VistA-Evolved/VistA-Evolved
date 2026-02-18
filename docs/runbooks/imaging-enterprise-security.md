# Imaging Enterprise Security — Phase 24

> RBAC, break-glass, DICOMweb rate limiting, and authorization hardening.

## Overview

Phase 24 adds imaging-specific RBAC that sits **above** Fastify session auth
but **below** VistA's native MAG security keys. This layered model ensures
that when VistA Imaging keys (MAG SYSTEM, MAG ANNOTATE, MAG EDIT, MAG DELETE)
become available, the platform RBAC can delegate to VistA's authorization.

## Imaging Permissions

| Permission | Who Gets It | What It Allows |
|---|---|---|
| `imaging_view` | provider, nurse, pharmacist, admin | View studies, launch viewer, DICOMweb read |
| `imaging_diagnostic` | admin (future: radiologists via VistA) | Advanced viewer tools, annotations |
| `imaging_admin` | admin only | Device onboarding, STOW-RS, ingest admin, audit |
| `break_glass` | Any clinician (time-limited) | Emergency imaging_view override |

### Role → Permission Mapping

```
provider   → [imaging_view]
nurse      → [imaging_view]
pharmacist → [imaging_view]
clerk      → []  (no imaging access by default)
admin      → [imaging_view, imaging_diagnostic, imaging_admin]
```

## Break-Glass Access

### When to Use

Break-glass is for **emergency clinical situations** where a user who doesn't
have imaging_view permission (e.g., a clerk) needs to view a study for
patient safety.

### How It Works

1. User attempts to view imaging → 403 "Imaging view permission required"
2. UI shows break-glass request panel with reason field
3. User enters clinical reason (minimum 10 characters) + submits
4. API creates time-limited break-glass session (default: 30 min, max: 4 hours)
5. User can now view imaging until session expires
6. All access during break-glass is audit-logged

### API Endpoints

```bash
# Start break-glass access
curl -X POST http://localhost:3001/security/break-glass/start \
  -H 'Content-Type: application/json' \
  -b 'ehr_session=...' \
  -d '{"reason": "Emergency: patient in trauma bay needs imaging review", "patientDfn": "100022", "ttlMinutes": 30}'

# Check active break-glass sessions
curl http://localhost:3001/security/break-glass/active \
  -b 'ehr_session=...'

# Stop break-glass access
curl -X POST http://localhost:3001/security/break-glass/stop \
  -H 'Content-Type: application/json' \
  -b 'ehr_session=...' \
  -d '{"breakGlassId": "<uuid>"}'

# View break-glass history (admin only)
curl http://localhost:3001/security/break-glass/history \
  -b 'ehr_session=...'
```

### Constraints

- Maximum TTL: 4 hours (configurable)
- Default TTL: 30 minutes
- Minimum reason length: 10 characters
- Patient-scoped: break-glass grants access to one patient's imaging
- Auto-expires: timer-based expiry, no manual cleanup needed
- Fully audited: both imaging audit (hash-chained) and general audit

## DICOMweb Rate Limiting

All DICOMweb proxy routes have a **per-user rate limit** separate from the
general API rate limiter:

| Parameter | Default | Env Variable |
|---|---|---|
| Max requests/window | 120 | `DICOMWEB_RATE_LIMIT` |
| Window duration | 60s | `DICOMWEB_RATE_WINDOW_MS` |

When exceeded, the API returns `429 Too Many Requests` with `Retry-After` header.

### Why Separate?

- Imaging viewers (OHIF) issue many parallel requests for series/instances
- A burst of imaging requests shouldn't block clinical API operations
- Rate limit tuning is different for imaging vs. standard API calls

## DICOMweb Route Authorization

All DICOMweb routes now enforce `imaging_view` before proxying:

| Route | Auth Level | Phase 24 Change |
|---|---|---|
| `GET /imaging/dicom-web/studies` | session + imaging_view | ✅ Added |
| `GET .../studies/:uid/series` | session + imaging_view | ✅ Added |
| `GET .../studies/:uid/metadata` | session + imaging_view | ✅ Added |
| `GET .../instances` | session + imaging_view | ✅ Added |
| `GET .../instances/:uid` | session + imaging_view | ✅ Added |
| `GET .../frames/:list` | session + imaging_view | ✅ Added |
| `POST /imaging/dicom-web/studies` | session + imaging_admin | ✅ Changed from admin role |
| `GET /imaging/orthanc/studies` | session + imaging_view | ✅ Added |
| `POST /imaging/demo/upload` | session + imaging_admin | ✅ Changed from admin role |
| `GET /imaging/viewer` | session + imaging_view | ✅ Added |

## Future VistA Integration

When VistA MAG security keys become available:

1. Read user's MAG keys via RPC (`MAG4 SECURITY KEYS`)
2. Map MAG SYSTEM → imaging_admin
3. Map MAG ANNOTATE / MAG EDIT → imaging_diagnostic
4. Map MAG REASON → imaging_view
5. Fall back to role-based permissions if MAG RPCs unavailable

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| 403 on all imaging routes | User lacks imaging_view | Check role mapping or use break-glass |
| 429 on rapid viewer loads | DICOMweb rate limit hit | Increase DICOMWEB_RATE_LIMIT |
| Break-glass expired early | TTL too short | Increase ttlMinutes (max 240) |
| No break-glass option in UI | Error message doesn't contain "permission" | Check API error response |
