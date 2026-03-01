# Phase 412 — W24-P4: Pilot Integration Certification Runs — VERIFY

## Gates
1. `scripts/certify-pilot-customer.ps1` exists
2. Runner passes for clinic archetype with `-SkipLive`: 0 failures
3. Runner passes for hospital archetype with `-SkipLive`: 0 failures
4. Evidence JSON written to `evidence/wave-24/412-certification/`
5. No PHI in evidence output

## Verification Command
```powershell
.\scripts\certify-pilot-customer.ps1 -CustomerName demo-clinic -Archetype clinic -SkipLive
.\scripts\certify-pilot-customer.ps1 -CustomerName demo-hospital -Archetype hospital -SkipLive
```
Both must exit with code 0.
