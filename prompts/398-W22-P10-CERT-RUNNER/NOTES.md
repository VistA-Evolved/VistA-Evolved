# 398-NOTES -- Specialty Certification Runner

## Design Decisions

### Gate Coverage
The runner has 14 sections covering all 9 implementation phases (P1-P9) plus cross-cutting concerns:
- Per-phase: file existence + type exports (7-9 gates per phase)
- Cross-cutting: route registration, AUTH_RULES, store-policy entries
- Build: TypeScript compilation check
- Process: prompt folder existence for all 10 phases

### No Docker Dependency
All gates are file-based or tsc-based. No running VistA/Docker needed. The `-SkipDocker` param
is accepted for pattern compatibility but no Docker gates are present.

### verify-latest.ps1 Updated
Now delegates to `verify-wave22-specialty.ps1` (was `verify-wave18-ecosystem.ps1`).

### Evidence Folder Pattern
Wave 22 evidence follows the `evidence/wave-22/{phase}-{slug}/evidence.md` convention.
Only P1 evidence was created with P1 -- remaining phases relied on prompt folders as primary artifacts.

### Store Policy Coverage
21 store-policy gates verify all in-memory stores across 8 module directories are tracked.
This prevents store sprawl (stores that exist but aren't registered in the policy).
