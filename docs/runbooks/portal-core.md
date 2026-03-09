# Portal Core — Phase 27 Runbook

## Overview

Phase 27 implements the patient portal core: live health records from VistA, PDF export,
secure messaging, appointments dashboard, record sharing, and patient settings.

## Architecture

```
Portal UI (Next.js 16, port 3002)
  └─ /dashboard/health      → GET /portal/health/* → VistA RPCs
  └─ /dashboard/medications  → GET /portal/health/medications → ORWPS ACTIVE
  └─ /dashboard/messages     → GET/POST /portal/messages/* → In-memory store (VistA: XMXAPI)
  └─ /dashboard/appointments → GET/POST /portal/appointments/* → In-memory + demo data
  └─ /dashboard/profile      → GET/PUT /portal/settings, GET/POST /portal/shares/*
  └─ /share/[token]          → POST /portal/share/verify/:token (public, no session)

API (Fastify, port 3001)
  └─ portal-auth.ts      — Auth + health data proxy (Phase 26, enhanced Phase 27)
  └─ portal-core.ts      — All Phase 27 routes (messaging, appts, sharing, settings, export)
  └─ portal-pdf.ts       — Minimal PDF 1.4 builder (no dependencies)
  └─ portal-messaging.ts — Threaded messaging with attachments
  └─ portal-appointments.ts — Demo appointments with request flows
  └─ portal-sharing.ts   — Time-limited share links with access code + DOB verification
  └─ portal-settings.ts  — Language, notification, display preferences
  └─ portal-sensitivity.ts — Proxy access + sensitivity policy engine
  └─ portal-audit.ts     — 21 audit action types (Phase 26 base + Phase 27 extensions)
```

## VistA RPC Mapping

| Portal Feature | VistA RPC                  | Status                                        |
| -------------- | -------------------------- | --------------------------------------------- |
| Allergies      | ORQQAL LIST                | ✅ Live                                       |
| Problems       | ORWCH PROBLEM LIST         | ✅ Live                                       |
| Vitals         | ORQQVI VITALS              | ✅ Live                                       |
| Medications    | ORWPS ACTIVE               | ✅ Live                                       |
| Demographics   | ORWPT SELECT               | ✅ Live                                       |
| Immunizations  | ORQQPX IMMUN LIST          | ✅ Live                                       |
| Labs           | ORWLRR INTERIM             | ✅ Live (may be empty / free-text only)       |
| Consults       | ORQQCN LIST                | ⏳ Integration pending                        |
| Surgery        | ORWSR LIST                 | ⏳ Integration pending                        |
| DC Summaries   | TIU DOCUMENTS BY CONTEXT   | ⏳ Integration pending                        |
| Reports        | ORWRP REPORT TEXT          | ⏳ Integration pending                        |
| Messaging      | XMXAPI / XMXMSGS           | ⏳ In-memory (VistA mapping documented)       |
| Appointments   | SD APPOINTMENT LIST        | ⏳ Demo data (scheduling RPCs not in sandbox) |
| Proxy          | DGMP                       | ⏳ In-memory (VistA mapping documented)       |
| Sensitivity    | DG SENSITIVE RECORD ACCESS | ⏳ Policy engine built, VistA hook planned    |

## Key Routes

### Health Data (DFN-scoped, requires portal session)

- `GET /portal/health/allergies` — Real VistA data
- `GET /portal/health/problems` — Real VistA data
- `GET /portal/health/vitals` — Real VistA data
- `GET /portal/health/medications` — Real VistA data
- `GET /portal/health/demographics` — Real VistA data
- `GET /portal/health/immunizations` — Real VistA data
- `GET /portal/health/labs` — Real VistA data (empty/free-text results remain truthful)
- `GET /portal/health/consults` — Integration pending (ORQQCN LIST)
- `GET /portal/health/surgery` — Integration pending (ORWSR LIST)
- `GET /portal/health/dc-summaries` — Integration pending (TIU DOCUMENTS BY CONTEXT)
- `GET /portal/health/reports` — Integration pending (ORWRP REPORT TEXT)

### PDF Export

- `GET /portal/export/section/:section` — Single section PDF (allergies|problems|vitals|medications|demographics)
- `GET /portal/export/full` — Full record bundle PDF

Portal exports now keep empty live sections truthful:

- empty immunizations render `No immunizations on file`
- empty labs render `No lab results on file`
- only genuine fetch failures surface pending target RPC messaging

### Secure Messaging

- `GET /portal/messages` — Inbox
- `GET /portal/messages/drafts` — Draft list
- `GET /portal/messages/sent` — Sent messages
- `GET /portal/messages/:id` — Single message
- `GET /portal/messages/:id/thread` — Thread view
- `POST /portal/messages` — Create draft
- `PUT /portal/messages/:id` — Update draft
- `DELETE /portal/messages/:id` — Delete draft
- `POST /portal/messages/:id/send` — Send draft
- `POST /portal/messages/:id/attachments` — Add attachment

### Appointments

- `GET /portal/appointments` — Upcoming + past
- `GET /portal/appointments/:id` — Detail
- `POST /portal/appointments/request` — Request new appointment
- `POST /portal/appointments/:id/cancel` — Request cancellation
- `POST /portal/appointments/:id/reschedule` — Request reschedule

### Record Sharing

- `GET /portal/shares` — List patient's shares (access codes stripped)
- `POST /portal/shares` — Create share link (returns access code once)
- `POST /portal/shares/:id/revoke` — Revoke share
- `GET /portal/share/preview/:token` — Public preview (partial name, sections)
- `POST /portal/share/verify/:token` — Public verify + fetch data

### Settings

- `GET /portal/settings` — Current settings + language options
- `PUT /portal/settings` — Update (language, notifications, display)

### Proxy Access

- `GET /portal/proxy/list` — List proxies for patient
- `POST /portal/proxy/grant` — Grant proxy
- `POST /portal/proxy/revoke` — Revoke proxy
- `POST /portal/proxy/evaluate` — Evaluate sensitivity filters

## Security

- All portal routes use httpOnly `portal_session` cookie
- Share verification requires access code + patient DOB
- 5 failed share access attempts locks the link
- Max 10 active shares per patient
- Share links expire after configurable TTL (default 72 hours, max 7 days)
- Access codes exclude ambiguous characters (I/O/0/1)
- All access audited with 21 distinct action types
- SLA disclaimer on messaging (not for urgent communication)

## Testing

```powershell
# Login
curl -c cookies.txt -X POST http://localhost:3001/portal/auth/login -H "Content-Type: application/json" -d '{"username":"patient1","password":"patient1"}'

# Health records
curl -b cookies.txt http://localhost:3001/portal/health/allergies
curl -b cookies.txt http://localhost:3001/portal/health/medications

# PDF export
curl -b cookies.txt http://localhost:3001/portal/export/full -o record.pdf

# Messaging
curl -b cookies.txt -X POST http://localhost:3001/portal/messages -H "Content-Type: application/json" -d '{"subject":"Test","body":"Hello"}'

# Appointments
curl -b cookies.txt http://localhost:3001/portal/appointments

# Share
curl -b cookies.txt -X POST http://localhost:3001/portal/shares -H "Content-Type: application/json" -d '{"sections":["allergies","medications"],"label":"For Dr. Smith"}'

# Settings
curl -b cookies.txt http://localhost:3001/portal/settings
```
