# Phase 576 — Close KI-002: VE INTEROP RPC Availability (VEHU)

## Context

KI-002 reports that VE INTEROP HL7 MSGS, VE INTEROP HLO STATUS, and
VE INTEROP QUEUE DEPTH are missing from the VEHU container. All 6 interop
RPCs are defined in ZVEMIOP.m and registered by ZVEMINS.m, but the
installer may not have been run against VEHU, or context registration
(VEMCTX3) may have missed them.

## Implementation Steps

1. Create verifier script `scripts/qa/verify-interop-rpcs.mjs` that:
   - Reuses VistaRpcBridge from `apps/api/src/services/vistaRpcBridge.ts`
   - Connects, authenticates, creates CPRS context
   - Calls all 6 VE INTEROP RPCs individually
   - Classifies PASS (structured response or "0^NOT_AVAILABLE") vs FAIL
     ("doesn't exist" / context denial / not registered)

2. Run `install-vista-routines.ps1 -ContainerName vehu -VistaUser vehu`
   to install/register routines in the VEHU container.

3. Expand installer verification (Step 6 in install-vista-routines.ps1)
   to smoke-test all 6 interop entry points, not just LINKS.

4. Run the verifier to confirm all 6 RPCs are callable.

5. Update `docs/VISTA_CONNECTIVITY_RESULTS.md`:
   - Move the 3 RPCs from "True Missing" to "Available"
   - Update counts

6. Update `docs/KNOWN_ISSUES.md`:
   - Mark KI-002 as Closed with evidence

## Files Touched

- `scripts/qa/verify-interop-rpcs.mjs` — NEW verifier script
- `scripts/install-vista-routines.ps1` — expanded verification
- `docs/VISTA_CONNECTIVITY_RESULTS.md` — updated evidence
- `docs/KNOWN_ISSUES.md` — KI-002 closed
- `prompts/576-PHASE-576-CLOSE-KI002-INTEROP-RPCS/576-01-IMPLEMENT.md`
- `prompts/576-PHASE-576-CLOSE-KI002-INTEROP-RPCS/576-99-VERIFY.md`
- `prompts/576-PHASE-576-CLOSE-KI002-INTEROP-RPCS/NOTES.md`
