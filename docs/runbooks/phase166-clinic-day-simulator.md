# Phase 166 — Clinic Day Simulator Runbook

## Overview

The Clinic Day Simulator defines 6 end-to-end proof journeys that exercise the full stack from queue management through clinical workflows to billing and patient portal.

## Journeys

| ID  | Name                 | Category   | Steps | Key RPCs                                                   |
| --- | -------------------- | ---------- | ----- | ---------------------------------------------------------- |
| J1  | Outpatient Visit     | outpatient | 7     | ORQQVI VITALS, ORWORB FASTUSER, ORWOR UNSIGN               |
| J2  | Emergency Department | ed         | 5     | ORQQAL LIST, ORQQPL PROBLEM LIST, TIU DOCUMENTS BY CONTEXT |
| J3  | Lab Workflow         | lab        | 3     | ORWLRR INTERIM, ORWRP REPORT TEXT, ORWORB FASTUSER         |
| J4  | Radiology Workflow   | radiology  | 3     | ORWRP REPORT TEXT                                          |
| J5  | Revenue Cycle        | rcm        | 4     | (no VistA RPCs -- in-memory RCM)                           |
| J6  | Patient Portal       | portal     | 3     | (no VistA RPCs -- portal path)                             |

## Running

```bash
# Run all journeys (API must be running)
pnpm qa:journeys:clinic-day

# Run a single journey
node scripts/qa/clinic-day-runner.mjs --journey J1

# Run via API
curl -X POST http://127.0.0.1:3001/admin/qa/journeys/run \
  -H "Content-Type: application/json" \
  -d '{"baseUrl":"http://127.0.0.1:3001"}'
```

## RPC Trace Tripwire

Each journey step declares `expectedRpcs[]` -- the exact RPC names that should be called. If code changes alter which RPCs are called, the trace assertion fails, alerting developers to unintended drift.

## API Endpoints

| Method | Path                             | Purpose                      |
| ------ | -------------------------------- | ---------------------------- |
| GET    | /admin/qa/journeys               | List all journey definitions |
| POST   | /admin/qa/journeys/run           | Run all journeys             |
| POST   | /admin/qa/journeys/:id/run       | Run single journey           |
| GET    | /admin/qa/journeys/results       | Get cached results           |
| DELETE | /admin/qa/journeys/results       | Clear cached results         |
| GET    | /admin/qa/journeys/:id/rpc-trace | Get RPC trace expectations   |

## No PHI

Journey definitions use only test patient DFN "3" and contain no SSN, DOB, names, or clinical content in outputs. Results contain only step names, RPC names, timing, and pass/fail status.
