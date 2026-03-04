# Phase 240 — HL7v2 Routing Layer (Wave 6 P3)

## User Request

Build the HL7v2 message routing layer: route definitions, message type filtering,
transformation pipeline, and destination dispatch.

## Implementation Steps

### Step 1: Create route definition types

- Route: source filter + transformation chain + destination
- Filter: message type, sending app/facility, content rules
- Transformation: field mapping, segment insertion/removal

### Step 2: Build route registry

- In-memory route store (matching project pattern)
- CRUD for routes via API
- Route matching engine (message -> matching routes)

### Step 3: Build transformation pipeline

- Chain of transform functions
- Field copy/map, segment filter, value replace
- PHI-safe: transforms logged by ID only

### Step 4: Build destination dispatch

- MLLP forward (via MllpClient)
- VistA RPC bridge (via existing interop)
- Dead-letter queue for unroutable messages

### Step 5: Wire into MLLP server as message handler

- Replace default handler from P2
- Route lookup -> transform -> dispatch -> ACK

### Step 6: API routes for route management

- CRUD /hl7/routes
- GET /hl7/routes/:id/stats
- POST /hl7/routes/:id/test (dry-run)

## Files Touched

- apps/api/src/hl7/routing/types.ts (new)
- apps/api/src/hl7/routing/registry.ts (new)
- apps/api/src/hl7/routing/matcher.ts (new)
- apps/api/src/hl7/routing/transform.ts (new)
- apps/api/src/hl7/routing/dispatcher.ts (new)
- apps/api/src/hl7/routing/index.ts (new)
- apps/api/src/routes/hl7-routing.ts (new)
- apps/api/src/hl7/index.ts (modified — routing handler)
- apps/api/src/server/register-routes.ts (modified — add routes)
