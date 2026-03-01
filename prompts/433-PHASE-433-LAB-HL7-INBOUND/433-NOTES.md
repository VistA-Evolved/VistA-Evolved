# Phase 433 — Notes

## Architecture Decision
The lab inbound store follows the established in-memory store pattern
(imaging-worklist Phase 23, claim-store Phase 38). Results are staged
in memory and survive only until API restart. This is deliberate:
VistA Filing (File 63) is the source of truth for lab data.

## Why Not File Directly to VistA?
- LRFZX is a MUMPS routine, NOT an RPC — cannot be called via the RPC broker
- No LR package RPCs are registered in OR CPRS GUI CHART context
- A custom ZVELABF.m wrapper would need to be written and installed
- The WorldVistA sandbox has the LR package but the filing path requires
  lab test definitions (File 60) to be properly configured

## Existing HL7 Engine Integration
The HL7 engine (Phase 239-260) provides:
- MLLP server on port 2575 (opt-in via HL7_ENGINE_ENABLED=true)
- ORU^R01 message builder + validator (oru-pack.ts)
- Domain mapper with `result.received` + `result.corrected` events
- Route registry for message dispatch

This phase adds the lab-specific staging layer that the routing
engine can dispatch ORU^R01 messages to.

## Migration Path to VistA Filing
1. Create ZVELABF.m in services/vista/
2. Register ZVE LAB FILE RPC (File 8994)
3. Add to OR CPRS GUI CHART context (VEMCTX3.m)
4. Wire handler.ts filing path: validated → filed
5. Map LOINC → VistA local test codes (File 60)
