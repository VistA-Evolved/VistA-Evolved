# Phase 259 -- HL7v2 Message Pipeline (Wave 8 P3)

## Goal

Build the append-only message event store, enhance the dead-letter queue with
raw message vault + replay, and add pipeline management API routes.

## Deliverables

### 1. Message Event Store (`hl7/message-event-store.ts`)

- Hash-chained, PHI-safe ring buffer (10K max)
- Strips PID/NK1/GT1/IN1/IN2 segments from summaries
- Raw messages stored only as SHA-256 hash + byte size
- Optional PG persistence via `setHl7EventDbRepo()`

### 2. Enhanced Dead-Letter Queue (`hl7/dead-letter-enhanced.ts`)

- Raw message vault (1000 max, FIFO eviction)
- `replayDeadLetter()` -- re-inject DLQ entry into pipeline
- `resolveDeadLetter()` -- mark as manually resolved
- Integrates with message event store for audit

### 3. Pipeline Routes (`routes/hl7-pipeline.ts`)

- GET /hl7/pipeline/events -- query event stream
- GET /hl7/pipeline/events/:id -- single event
- GET /hl7/pipeline/stats -- event stats by status
- GET /hl7/pipeline/verify -- hash chain verification
- GET /hl7/dlq -- list DLQ entries
- GET /hl7/dlq/stats -- DLQ summary
- GET /hl7/dlq/:id -- single DLQ entry
- POST /hl7/dlq/:id/replay -- replay dead-lettered message
- POST /hl7/dlq/:id/resolve -- mark as resolved

### 4. Store Policy Registration

- 6 HL7 stores registered in `store-policy.ts`

## Constraints

- No raw PHI in event store summaries
- No raw HL7 messages in API responses (only hash + size)
- DLQ replay returns confirmation, not raw message content
