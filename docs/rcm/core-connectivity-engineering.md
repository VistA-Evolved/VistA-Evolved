# CORE-Style Connectivity Engineering

> Phase 45 -- VistA-Evolved RCM

## Overview

This document describes the connectivity rules engine that governs EDI
transaction transmission, acknowledgement tracking, retry logic, and
dead-letter queue management. The rules are inspired by CAQH CORE
operating rules but do not embed copyrighted rule text -- only rule
numbers are referenced.

## Operating Rule References

| Rule Number   | Topic                                          |
| ------------- | ---------------------------------------------- |
| CAQH CORE 270 | Connectivity Rule                              |
| CAQH CORE 250 | Claim Status Rule                              |
| CAQH CORE 258 | Eligibility Response Time Rule (20s real-time) |
| CAQH CORE 260 | ERA/EFT Operating Rules                        |
| CAQH CORE 382 | Claims Rule                                    |

## Pre-Transmit Gates

Before any transaction is transmitted, 6 gates are checked:

1. **payload_present** -- X12 payload is not empty
2. **isa_envelope** -- ISA segment present at start
3. **iea_trailer** -- IEA segment present
4. **segment_count** -- Minimum 4 segments (ISA, GS, ST content, SE/GE/IEA)
5. **usage_indicator** -- Checks T(est) vs P(roduction) flag
6. **response_window** -- Response window configured for transaction type

All gates return severity levels: `info`, `warning`, `error`.
Only `error` severity blocks transmission.

## Ack Gates

After transmission, ack gates track:

1. **transaction_exists** -- Transaction is in the store
2. **ack_999_received** -- For 837/270/276, checks if 999 was received within 24h
3. **retry_within_limit** -- Retry count within configured maximum
4. **not_in_dlq** -- Transaction not in dead-letter queue

## Response Windows

| Transaction | Expected | Max Wait | Notes               |
| ----------- | -------- | -------- | ------------------- |
| 837P/837I   | 20s      | 24h      | 999 ack within 24h  |
| 270         | 20s      | 20s      | CORE 258: real-time |
| 276         | 20s      | 20s      | Real-time status    |
| 835         | 24h      | 30 days  | Payment cycle       |
| 999/997/TA1 | 24h      | 24h      | Implementation ack  |
| 278         | 2 min    | 2 days   | Prior auth          |
| 275         | 24h      | 24h      | Attachment          |

## Retry Policy

- **Max retries**: 3
- **Initial delay**: 5 seconds
- **Backoff multiplier**: 2.0x (exponential)
- **Max delay**: 5 minutes
- **Retryable errors**: TIMEOUT, CONNECTION_REFUSED, CONNECTION_RESET,
  SOCKET_HANG_UP, HTTP_502, HTTP_503, HTTP_504

Non-retryable errors (e.g., validation failures, rejected 999) go
directly to DLQ.

## Dead-Letter Queue (DLQ)

Transactions move to DLQ after:

- Max retries exhausted (3)
- Non-retryable error received

DLQ transactions can be manually retried via:

- `POST /rcm/transactions/dlq/:id/retry`

## Connectivity Health

The health endpoint (`GET /rcm/connectivity/health`) reports:

| Status      | Condition                                 |
| ----------- | ----------------------------------------- |
| `healthy`   | No DLQ items, no overdue acks, < 4 failed |
| `degraded`  | 1-5 DLQ items or > 3 failed transactions  |
| `unhealthy` | > 5 DLQ items or any overdue acks         |

## Configuration

The connectivity profile is versioned and can be updated at runtime.
Default profile version: `1.0.0`.

Environment variables:

- None required for default profile
- Override timeouts/retry via runtime API (future enhancement)
