# HL7v2 ADT Feed Runbook

> Phase 458 (W30-P3) — Processing HL7 v2.x ADT messages for patient demographics.

## Supported ADT Trigger Events

| Trigger | Description                |
| ------- | -------------------------- |
| A01     | Admit/Visit Notification   |
| A02     | Transfer                   |
| A03     | Discharge                  |
| A08     | Update Patient Information |

## Parsed Segments

| Segment | Fields Extracted                                                         |
| ------- | ------------------------------------------------------------------------ |
| MSH     | Sending/receiving facility, message timestamp, trigger event, control ID |
| PID     | Patient ID, name, DOB, gender                                            |
| PV1     | Patient class, assigned location, admit date/time                        |

## API Endpoints

| Method | Path                              | Description                  |
| ------ | --------------------------------- | ---------------------------- |
| POST   | `/migration/hl7v2/adt`            | Process an HL7v2 ADT message |
| GET    | `/migration/hl7v2/adt/events`     | List processed ADT events    |
| GET    | `/migration/hl7v2/adt/events/:id` | Get single event details     |

## Example

```bash
curl -X POST http://localhost:3001/migration/hl7v2/adt \
  -H "Content-Type: text/plain" \
  -b cookies.txt \
  -d 'MSH|^~\&|SENDING|FACILITY|RECEIVING|FACILITY|20240101120000||ADT^A01|MSG001|P|2.5
PID|||12345^^^MRN||DOE^JOHN||19800101|M
PV1||I|ICU^101^A'
```

## Notes

- Pipe-delimited HL7v2 format parsed (no MLLP framing)
- Events tracked in-memory (resets on API restart)
- Admin-only access via AUTH_RULES
- No PHI in logs -- event IDs are opaque hex tokens
