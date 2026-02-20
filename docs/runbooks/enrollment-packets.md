# Runbook: Enrollment Packets

> How to manage payer enrollment packets for go-live tracking

## Overview

Enrollment packets track the process of enrolling an organization with a
payer for electronic claim submission. Each packet includes identifiers,
certifications, contacts, and a go-live checklist.

## Create Enrollment Packet

```bash
curl -s http://localhost:3001/rcm/enrollment/PH-PHILHEALTH \
  -X POST -H "Content-Type: application/json" \
  -d '{
    "orgIdentifiers": {
      "npi": "1234567890",
      "taxId": "12-3456789",
      "philhealthFacilityCode": "H12345"
    },
    "certRequirements": [
      "PhilHealth eClaims Portal registration",
      "Digital certificate from PhilHealth"
    ],
    "goLiveChecklist": [
      { "step": "Register on eClaims portal", "done": true },
      { "step": "Submit test CF2 claim", "done": false },
      { "step": "Receive testing approval", "done": false },
      { "step": "Switch to production endpoint", "done": false }
    ],
    "contacts": [
      { "name": "Maria Santos", "role": "PhilHealth Liaison", "email": "maria@example.com", "phone": "+63-XXX" }
    ],
    "testingSteps": [
      "Submit CF2 outpatient test claim",
      "Verify acknowledgment receipt",
      "Submit CF3 inpatient test claim"
    ],
    "enrollmentStatus": "IN_PROGRESS",
    "notes": "Waiting for digital certificate approval"
  }' | jq .
```

## Retrieve Enrollment Packet

```bash
curl -s http://localhost:3001/rcm/enrollment/PH-PHILHEALTH | jq .
```

## Update Status to TESTING

```bash
curl -s http://localhost:3001/rcm/enrollment/PH-PHILHEALTH \
  -X POST -H "Content-Type: application/json" \
  -d '{
    "orgIdentifiers": { "npi": "1234567890", "philhealthFacilityCode": "H12345" },
    "certRequirements": ["PhilHealth eClaims Portal registration"],
    "goLiveChecklist": [
      { "step": "Register on eClaims portal", "done": true },
      { "step": "Submit test CF2 claim", "done": true },
      { "step": "Receive testing approval", "done": false }
    ],
    "contacts": [],
    "testingSteps": [],
    "enrollmentStatus": "TESTING"
  }' | jq .
```

## List All Enrollment Packets

```bash
# All packets
curl -s http://localhost:3001/rcm/enrollment | jq .

# Filter by status
curl -s "http://localhost:3001/rcm/enrollment?status=LIVE" | jq .

# Filter by country (requires payer lookup)
curl -s "http://localhost:3001/rcm/enrollment?country=PH" | jq .
```

## Enrollment Status Flow

```
NOT_STARTED -> IN_PROGRESS -> TESTING -> LIVE
                                           |
                                           v
                                       SUSPENDED
```

## Status Descriptions

| Status | Meaning |
|--------|---------|
| NOT_STARTED | Enrollment not begun |
| IN_PROGRESS | Paperwork/registration submitted |
| TESTING | Test claims being exchanged |
| LIVE | Production submission active |
| SUSPENDED | Temporarily suspended (re-certification needed) |

## Audit Trail

All enrollment creates and updates are logged to the RCM audit trail:
- `enrollment.created` -- new packet
- `enrollment.updated` -- status or content change

```bash
curl -s "http://localhost:3001/rcm/audit?action=enrollment.created" | jq .
```
