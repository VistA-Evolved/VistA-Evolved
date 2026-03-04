# Phase 239 — HL7v2 Engine Packaging (Wave 6 P2)

## User Request

Build an HL7v2 MLLP engine: MLLP framing, HL7v2 message parser, ACK generation,
connection management. Zero external HL7 dependencies (matching project pattern
of in-house protocol implementations).

## Implementation Steps

### Step 1: Create HL7v2 type definitions

- HL7v2 message, segment, field types
- MLLP frame types
- Connection state types
- ACK/NAK types

### Step 2: Build MLLP server

- TCP server with MLLP framing (0x0B + message + 0x1C + 0x0D)
- Connection management with idle timeout
- Backpressure handling
- TLS support configuration

### Step 3: Build MLLP client

- TCP client with connection pooling
- MLLP frame send/receive
- Reconnection with exponential backoff
- Health check probe

### Step 4: Build HL7v2 parser

- Segment splitting (CR-delimited)
- Field/component/subcomponent parsing
- MSH header extraction
- Common segment type awareness

### Step 5: Build ACK generator

- ACK (AA) / NAK (AE/AR) generation
- MSA segment construction
- Error detail in ERR segment

### Step 6: Create API routes

- GET /hl7/health — engine status
- GET /hl7/connections — active connections

### Step 7: Wire engine into server lifecycle

- Opt-in via HL7_ENGINE_ENABLED=true
- Graceful shutdown integration
- Prometheus metrics for connections/messages

## Files Touched

- apps/api/src/hl7/types.ts (new)
- apps/api/src/hl7/mllp-server.ts (new)
- apps/api/src/hl7/mllp-client.ts (new)
- apps/api/src/hl7/parser.ts (new)
- apps/api/src/hl7/ack-generator.ts (new)
- apps/api/src/hl7/index.ts (new)
- apps/api/src/routes/hl7-engine.ts (new)
- apps/api/src/index.ts (modified — engine init)
