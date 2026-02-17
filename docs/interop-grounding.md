# Interop Grounding — HL7/HLO Architecture × VistA File Binding

> **Phase 20 — VistA-First Grounding**
> The Interop Monitor (Phase 18) tracks integration health at the platform layer.
> This document maps it to VistA's **actual HL7/HLO file structures** so the
> monitor can evolve from a generic connector registry into a VistA-grounded
> interoperability dashboard.

---

## 1. Current State (Phase 18)

The platform's **integration registry** (`apps/api/src/config/integration-registry.ts`)
manages 11 connector types:

| Type | Description | VistA File Binding |
|------|-------------|-------------------|
| `vista-rpc` | XWB RPC Broker | **wired** — `probeConnect()` TCP check |
| `fhir` | Generic FHIR R4 | No VistA binding |
| `fhir-c0fhir` | WorldVistA C0FHIR | No VistA binding yet |
| `fhir-vpr` | VPR JSON → FHIR | No VistA binding yet |
| `dicom` | Raw DICOM C-STORE/C-FIND | No VistA binding |
| `dicomweb` | DICOMweb (WADO/STOW/QIDO) | No VistA binding |
| `hl7v2` | HL7v2 MLLP feeds | **NOT bound** — should read VistA HL7 files |
| `lis` | Lab Information System | No VistA binding |
| `pacs-vna` | PACS/VNA archive | No VistA binding |
| `device` | Modality/bedside device | No VistA binding |
| `external` | Other external system | No VistA binding |

**Key gap**: The `hl7v2` connector type probes TCP connectivity but does NOT
read from VistA's HL7 engine files. The monitor has no visibility into
VistA-side HL7 message flow, queue depth, or link status.

---

## 2. VistA HL7 File Architecture

VistA has two HL7 engines: the **legacy HL7 package** and the **HLO (HL7
Optimized)** engine. Both use FileMan files.

### 2.1 Legacy HL7 Package (HL*)

| FileMan # | Name | Global | Purpose |
|-----------|------|--------|---------|
| **869** | HL COMMUNICATION SERVER | ^HLCS | Configuration: filer counts, purge days, max message size |
| **869.1** | HL7 SITE PARAMETERS | ^HLS | Site-level HL7 config (institution, domain, country code) |
| **869.3** | HL7 MESSAGE ADMINISTRATION | ^HLMA | Admin data for every HL7 message (direction, status, time) |
| **870** | HL LOGICAL LINK | ^HLCS(870) | **Critical**: Defines each HL7 connection (TCP address, port, protocol, link status — "Open", "Shutdown", "Error") |
| **771** | HL7 APPLICATION PARAMETER | ^HL(771) | Application definitions (MPI, VDEF, OR, etc.) |
| **772** | HL7 MESSAGE TEXT | ^HL(772) | Raw HL7 message text (MSH, PID, OBR, OBX segments) |
| **773** | HL7 MESSAGE ADMINISTRATION | ^HLMA | Message-level tracking: status, error text, ack info |
| **776** | HL MONITOR JOB | ^HLMN | Background filer job monitoring (PID, last activity, state) |
| **776.1** | HL MONITOR EVENTS | ^HLMN(776.1) | Events/alerts from HL7 filers |

### 2.2 HLO (HL7 Optimized) Package

| FileMan # | Name | Global | Purpose |
|-----------|------|--------|---------|
| **777** | HLO SYSTEM DEFAULTS | ^HLO | HLO global config (max workers, queue limits) |
| **778** | HLO SUBSCRIPTION REGISTRY (alt) | ^HLO(778) | Subscription management for pub/sub |
| **779.1** | HLO APPLICATION REGISTRY | ^HLO(779.1) | Application definitions (like #771 but for HLO) |
| **779.2** | HLO RPC LIST | ^HLO(779.2) | RPCs that HLO exposes |
| **779.4** | HLO SUBSCRIPTION REGISTRY | ^HLO(779.4) | Event subscriptions (which app subscribes to what) |
| **779.9** | HLO PRIORITY QUEUE | ^HLO(779.9) | Priority-based message queues (high/normal/low) |

---

## 3. Grounding Plan: Interop Monitor → VistA HL7 Files

### Phase A: Read-only monitoring (no KIDS build required)

| Monitor Feature | VistA Data Source | Access Method | Priority |
|----------------|-------------------|---------------|----------|
| **Link status dashboard** | File #870 (HL LOGICAL LINK), field .01 NAME, field 4.5 LINK STATUS | Custom RPC that reads `^HLCS(870,` | **HIGH** |
| **Message volume metrics** | File #773 (HLMA), count by date range | Custom RPC that `$O` through date index | MEDIUM |
| **Error/failed message count** | File #773, STATUS field = error codes | Custom RPC filtering on status | **HIGH** |
| **Active filer jobs** | File #776 (HL MONITOR JOB) | Custom RPC reading `^HLMN` | MEDIUM |
| **Queue depth** | File #779.9 (HLO PRIORITY QUEUE) | Custom RPC reading `^HLO(779.9,` | MEDIUM |
| **Application registry** | File #771 + #779.1 | Custom RPC listing apps | LOW |

### Phase B: RPC development (requires VistA-side M routine)

Since VistA does not ship RPCs for HL7 monitoring, a **custom KIDS build**
is required. The recommended approach:

```
Routine: ZVEMIOP (VistA-Evolved Interop Operations)
  
  LINKS(RET) — Return all HL LOGICAL LINK entries with status
    Read ^HLCS(870, for each: name, status, address, port, last-msg time
    Return as delimited array
  
  MSGS(RET,FROM,TO) — Return HL7 message counts by date range
    Walk ^HLMA date index from FROM to TO
    Aggregate: total, success, error, pending
    Return as delimited array
  
  FILERS(RET) — Return active HL filer job status
    Read ^HLMN for each monitor entry
    Return: job name, PID, status, last heartbeat
  
  QUEUES(RET) — Return HLO queue depths
    Read ^HLO(779.9, for each priority level
    Return: queue name, pending count, processed count
```

Register these under an RPC context like `VE INTEROP MONITOR` via KIDS.

### Phase C: Platform integration

Once the RPCs exist, the interop routes (`apps/api/src/routes/interop.ts`)
should:

1. **Add a new route**: `GET /admin/registry/:tenantId/hl7-status`
   - Calls `ZVEMIOP LINKS` RPC to get link status
   - Returns structured JSON with link name, status, address, last activity

2. **Add a new route**: `GET /admin/registry/:tenantId/hl7-metrics`
   - Calls `ZVEMIOP MSGS` RPC for message volume/error counts
   - Returns aggregate metrics for dashboard display

3. **Enhance probe logic**: For `hl7v2` type integrations, the `probeIntegration()`
   function should **also** check VistA-side link status (not just TCP reachability)

---

## 4. What the Integration Registry Tracks vs. What VistA Tracks

| Concern | Integration Registry (Platform) | VistA HL7/HLO Files |
|---------|--------------------------------|---------------------|
| Connector definition | ✅ type, host, port, auth | ❌ Not aware of #870 links |
| TCP connectivity | ✅ probe via socket | ❌ VistA assumes links are pre-configured |
| HL7 link status | ❌ Unknown | ✅ File #870 field 4.5 |
| Message flow volume | ❌ Unknown | ✅ File #773 (HLMA) |
| Message errors | ❌ Platform error log only | ✅ File #773 status + error text |
| Queue depth | ❌ Platform-level counters | ✅ File #779.9 |
| Filer job health | ❌ Unknown | ✅ File #776 |
| Application registry | ❌ Not aligned | ✅ File #771 + #779.1 |

**Conclusion**: The platform should **not replace** VistA's HL7 engine. It should
**read from it** to display status. The integration registry is the platform's
view of all connectors (VistA + external). VistA's HL7 files are the source
of truth for HL7-specific messaging state.

---

## 5. Current Code Locations

| File | Role | VistA Binding |
|------|------|---------------|
| `apps/api/src/config/integration-registry.ts` | Registry CRUD, 11 types | `vista-rpc` type probes VistA TCP |
| `apps/api/src/routes/interop.ts` | Admin API for registry | No HL7 file reads |
| `apps/web/src/app/admin/integrations/page.tsx` | Integration dashboard UI | Displays registry data only |
| `apps/api/src/vista/rpcBrokerClient.ts` | RPC transport | Would carry future HL7 monitor RPCs |

---

## 6. Risks & Constraints

1. **No existing RPCs for HL7 monitoring** — VistA does not expose HL7 file
   reads via standard RPCs. A custom KIDS build (`ZVEMIOP`) is required.
   Until then, the Interop Monitor is platform-only.

2. **HL7 files are high-volume** — `^HLMA` (file #773) and `^HL(772)` can
   contain millions of entries on a production system. Any RPC must use
   date-range indexing, not sequential scans.

3. **HLO vs Legacy** — Some VistA sites use only legacy HL7, some use HLO,
   some use both. The monitor should handle either configuration.

4. **Security** — HL7 message text (file #772) may contain PHI. The monitor
   should show **counts and statuses**, not raw message content, unless
   explicitly requested with audit logging.

5. **WorldVistA Docker** — The development sandbox has HL7 files but minimal
   sample data. Testing will require synthetically generating HL7 messages
   or using a production-like dataset.

---

## 7. Implementation Priority

| Step | Description | Dependency | Phase |
|------|-------------|------------|-------|
| 1 | Document file structures (this doc) | None | **Phase 20** (now) |
| 2 | Build `ZVEMIOP` M routine + KIDS install | VistA M expertise | Phase 21+ |
| 3 | Register RPCs under `VE INTEROP MONITOR` context | Step 2 | Phase 21+ |
| 4 | Add `/admin/registry/:tenantId/hl7-status` route | Step 3 | Phase 21+ |
| 5 | Add HL7 metrics to Interop Monitor UI | Step 4 | Phase 21+ |
| 6 | Enhance `probeIntegration()` for VistA-aware HL7 probes | Step 3 | Phase 21+ |
