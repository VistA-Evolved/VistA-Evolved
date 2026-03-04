# Service-Line Dashboards — Runbook

## Overview

Phase 471. Web UI for ED, OR, and ICU board dashboards.
Located at `/cprs/admin/service-lines`.

## Features

- **ED Tab**: Total visits, waiting, bedded, pending admit, avg wait, avg LOS, LWBS rate, bed occupancy, acuity breakdown
- **OR Tab**: Cases today, completed, in-progress, scheduled, cancelled, room utilization, room status badges
- **ICU Tab**: Bed count, occupancy, active admissions, ventilated count, avg LOS, unit breakdown, code status

## API Dependencies

- `GET /ed/board` -- ED board metrics
- `GET /or/board` -- OR board metrics
- `GET /icu/metrics` -- ICU metrics

## Notes

- All fetches use `credentials: 'include'` (httpOnly cookies)
- Uses `NEXT_PUBLIC_API_URL` env var (default: http://localhost:3001)
