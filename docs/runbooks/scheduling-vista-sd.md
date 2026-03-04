# Scheduling v1 -- VistA SD\* First (Phase 63)

## Overview

Phase 63 implements scheduling using VistA SD\* RPCs as the primary data
source. The system does real reads against SDOE (encounter-level) and
SD W/L (wait list/clinic/provider lookup) RPCs present in the WorldVistA
sandbox. Booking/cancel/reschedule operations use a request-flow pattern
with explicit VistA RPC targets documented for when SDEC RPCs become
available.

## Architecture

```
Browser (Clinician)                  Browser (Patient Portal)
       |                                      |
  /scheduling/*                       /portal/appointments
       |                                      |
  +---------+                          +------+------+
  |  Scheduling Routes (index.ts)  |   | portal-core.ts  |
  |  /appointments, /clinics,      |   | merges VistA +  |
  |  /providers, /requests,        |   | local requests   |
  |  /slots                        |   +------+------+
  +---------+                              |
       |                                   |
  +----+----+                         +----+----+
  | VistaSchedulingAdapter          | VistaSchedulingAdapter
  | (vista-adapter.ts)              | (via adapter-loader)
  +----+----+                       +----+----+
       |                                 |
  +----+----+                       +----+----+
  |  safeCallRpc (circuit breaker)        |
  +----+----+                             |
       |                                  |
       +------------- VistA (XWB) --------+
```

## RPCs Used (Present in Sandbox)

| RPC                            | Purpose                       | File             |
| ------------------------------ | ----------------------------- | ---------------- |
| SDOE LIST ENCOUNTERS FOR PAT   | Patient encounter list        | vista-adapter.ts |
| SDOE LIST ENCOUNTERS FOR DATES | Date-range encounter list     | vista-adapter.ts |
| SDOE GET GENERAL DATA          | Encounter detail              | vista-adapter.ts |
| SDOE GET PROVIDERS             | Encounter providers           | vista-adapter.ts |
| SD W/L RETRIVE HOSP LOC(#44)   | Clinic/hospital location list | vista-adapter.ts |
| SD W/L RETRIVE PERSON(200)     | Provider list                 | vista-adapter.ts |

## RPCs Targeted (Absent in Sandbox)

| RPC           | Purpose               | Vivian Status     |
| ------------- | --------------------- | ----------------- |
| SDEC APPADD   | Book appointment      | Present in Vivian |
| SDEC APPDEL   | Cancel appointment    | Present in Vivian |
| SDEC APPSLOTS | Query available slots | Present in Vivian |
| SDEC EDITAPPT | Modify appointment    | Present in Vivian |
| SDEC CHECKIN  | Patient check-in      | Present in Vivian |
| SDEC CHECKOUT | Patient check-out     | Present in Vivian |

## API Endpoints

| Method | Path                                               | Description                 |
| ------ | -------------------------------------------------- | --------------------------- |
| GET    | /scheduling/appointments?dfn=                      | Patient appointments        |
| GET    | /scheduling/appointments/range?startDate=&endDate= | Date range encounters       |
| GET    | /scheduling/clinics                                | All hospital locations      |
| GET    | /scheduling/providers                              | All providers               |
| GET    | /scheduling/slots?clinicIen=&date=                 | Slot availability (pending) |
| POST   | /scheduling/appointments/request                   | Request new appointment     |
| POST   | /scheduling/appointments/:id/cancel                | Cancel appointment          |
| POST   | /scheduling/appointments/:id/reschedule            | Reschedule appointment      |
| GET    | /scheduling/requests                               | Queue of pending requests   |
| GET    | /scheduling/health                                 | Adapter health check        |

## Double-Booking Prevention

The VistA adapter uses an in-memory booking lock per patient+clinic+date
combination. Lock TTL is 30 seconds. If a concurrent request arrives for
the same slot, it receives HTTP 409 Conflict.

```
acquireBookingLock(patientDfn, clinicIen, date)
  -- returns true if lock acquired, false if already held
releaseBookingLock(patientDfn, clinicIen, date)
  -- always releases after request completes
```

## Request Flow (Booking)

Since SDEC APPADD is absent from the sandbox:

1. Patient or clinician submits request via POST /scheduling/appointments/request
2. Request stored in-memory with status `pending`
3. Response includes `pending: true` + `target: "SDEC APPADD"`
4. Request appears in GET /scheduling/requests queue
5. When SDEC RPCs available, request handler calls SDEC APPADD directly

## Portal Integration

- GET /portal/appointments merges VistA encounters (via adapter) with
  local Phase 27 request store
- Deduplication by appointment ID
- VistA encounter fields normalized to portal shape (scheduledAt, clinicName)
- Cancel/reschedule use same request-flow pattern

## Audit Trail

All write operations are logged to the immutable audit trail:

- `scheduling.request` -- new appointment request
- `scheduling.cancel` -- cancellation request
- `scheduling.reschedule` -- reschedule request
- `scheduling.list` -- appointment list access

## Manual Testing

```bash
# List clinics
curl http://localhost:3001/scheduling/clinics -b cookies.txt

# List providers
curl http://localhost:3001/scheduling/providers -b cookies.txt

# Patient appointments
curl "http://localhost:3001/scheduling/appointments?dfn=3" -b cookies.txt

# Date range
curl "http://localhost:3001/scheduling/appointments/range?startDate=2024-01-01&endDate=2025-12-31" -b cookies.txt

# Request appointment
curl -X POST http://localhost:3001/scheduling/appointments/request \
  -H "Content-Type: application/json" \
  -d '{"patientDfn":"3","clinicIen":"1","preferredDate":"2025-03-15","reason":"Follow-up"}' \
  -b cookies.txt

# View requests queue
curl http://localhost:3001/scheduling/requests -b cookies.txt

# Adapter health
curl http://localhost:3001/scheduling/health -b cookies.txt
```

## Known Limitations

1. **No real booking** -- SDEC APPADD absent from WorldVistA sandbox
2. **In-memory request store** -- resets on API restart
3. **Slot availability** -- returns integration-pending (SDEC APPSLOTS absent)
4. **Encounter data** -- depends on sandbox SDOE data population
5. **Portal appointments** -- merge logic assumes VistA IDs don't conflict
   with local UUIDs

## Migration Path

When SDEC RPCs become available:

1. Replace request-flow with direct SDEC APPADD call
2. Wire /scheduling/slots to SDEC APPSLOTS
3. Wire cancel to SDEC APPDEL
4. Wire reschedule to SDEC EDITAPPT + SDEC APPADD
5. Remove in-memory request store
6. Add SDEC CHECKIN / CHECKOUT for visit workflow
