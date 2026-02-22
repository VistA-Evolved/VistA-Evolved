# Phase 89 — LOA Engine v1: Runbook

## Overview

Phase 89 extends the Phase 87 LOA scaffolding into a production-grade LOA
work queue with SLA tracking, enhanced pack generation, audit wiring, and
patient chart integration.

## Architecture

```
LOA Case lifecycle:
  draft → pending_submission → submitted → under_review → approved/denied/expired
                                                        → partially_approved
                                                        → cancelled (from any pre-terminal)

Each case tracks:
  - Priority (routine/urgent/stat) with configurable SLA deadlines
  - SLA risk level (on_track/at_risk/critical/overdue) recomputed on read
  - Assigned staff member
  - Pack generation history (manifest format with sections + checklist + email template)
  - Enrollment tie-in (optional link to facility-payer enrollment)
  - Full audit trail via appendRcmAudit()
```

## SLA Defaults

| Priority | Default Deadline |
|----------|-----------------|
| routine  | 72 hours        |
| urgent   | 24 hours        |
| stat     | 4 hours         |

SLA risk thresholds:
- **on_track**: > 12 hours remaining
- **at_risk**: 2-12 hours remaining
- **critical**: < 2 hours remaining
- **overdue**: past deadline

## New API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/rcm/payerops/loa-queue` | Filterable LOA work queue |
| PATCH | `/rcm/payerops/loa/:id` | Edit draft LOA fields |
| PUT | `/rcm/payerops/loa/:id/assign` | Assign LOA to staff |

### LOA Queue Filters

Query params:
- `status` — comma-separated LOA statuses
- `payerId` — filter by payer
- `assignedTo` — filter by staff
- `slaRiskLevel` — on_track / at_risk / critical / overdue
- `priority` — routine / urgent / stat
- `olderThanHours` — cases older than N hours
- `sortBy` — slaDeadline (default) / createdAt / updatedAt / priority
- `sortDir` — asc (default) / desc
- `limit` / `offset` — pagination

Response includes `slaBreakdown` object with counts per risk level.

## UI Pages

### LOA Work Queue (`/cprs/admin/loa-queue`)
- SLA summary bar with clickable risk filters
- Filterable table with status, priority, SLA, payer, assignee
- Detail modal with timeline, pack history, transition actions
- Pack generation modal with checklist + email template

### Patient Chart LOA Panel (`PatientLOAPanel`)
- Reusable component for any patient DFN context
- Shows active cases with SLA dots + expandable details
- Resolved cases section (last 5 shown)
- Compact mode for sidebar embedding

## Audit Integration

All LOA mutations now emit audit events via `appendRcmAudit()`:

| Route | Audit Action |
|-------|-------------|
| POST /loa | `loa.created` |
| PATCH /loa/:id | `loa.updated` |
| PUT /loa/:id/status | `loa.transition` / `loa.approved` / `loa.denied` / `loa.cancelled` / `loa.expired` |
| PUT /loa/:id/assign | `loa.assigned` |
| POST /loa/:id/attachments | `loa.attachment_added` |
| POST /loa/:id/submit | `loa.submitted` |
| POST /loa/:id/pack | `loa.pack_generated` |
| POST /enrollments | `enrollment.created` |
| PUT /enrollments/:id/status | `enrollment.updated` |

## Manual Testing

```bash
# 1. Create LOA case with priority
curl -s http://localhost:3001/rcm/payerops/loa \
  -X POST -H "Content-Type: application/json" \
  -d '{"facilityId":"f1","patientDfn":"3","payerId":"p1","payerName":"Test HMO","requestType":"initial_loa","priority":"urgent"}' \
  --cookie "session=..."

# 2. Query LOA queue
curl -s "http://localhost:3001/rcm/payerops/loa-queue?sortBy=slaDeadline" \
  --cookie "session=..."

# 3. Generate pack
curl -s http://localhost:3001/rcm/payerops/loa/LOA_ID/pack \
  -X POST --cookie "session=..."

# 4. Transition status
curl -s http://localhost:3001/rcm/payerops/loa/LOA_ID/status \
  -X PUT -H "Content-Type: application/json" \
  -d '{"status":"pending_submission","reason":"Pack generated, ready to submit"}' \
  --cookie "session=..."

# 5. Check audit trail
curl -s "http://localhost:3001/rcm/audit?action=loa.created" \
  --cookie "session=..."
```

## Known Limitations

- **In-memory store**: LOA cases, SLA data, and pack history reset on API restart
- **No real payer API**: All submissions are manual/portal mode
- **SLA computed on read**: No background timer for proactive alerts
- **Pack format**: JSON manifest only; PDF generation is a future enhancement
- **Reminder system**: `lastReminderAt` and `reminderCount` fields exist but
  no automatic reminder scheduler is implemented yet

## Migration Path

1. Background SLA timer for proactive alerts (notify assigned staff)
2. PDF pack generation (wkhtmltopdf or Puppeteer)
3. Payer API adapters for top 5 HMOs
4. Persistent storage (SQLite → PostgreSQL → VistA-native)
5. Email/SMS notification integration
