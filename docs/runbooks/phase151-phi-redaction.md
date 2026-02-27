# Phase 151 -- PHI Redaction Hardening

## Overview

Phase 151 hardens the PHI (Protected Health Information) redaction layer
across all audit emitters, log statements, and telemetry attributes. The
goal is to prevent patient identifiers (DFN, MRN, SSN, DOB, patient names)
from leaking into logs, audit trails, or metric labels.

## Architecture

### Centralized Redaction (`lib/phi-redaction.ts`)
- **PHI_FIELDS**: Canonical set of blocked field names (lowercase)
- **CREDENTIAL_FIELDS**: Auth-related field names (tokens, passwords)
- **ALL_BLOCKED_FIELDS**: Union of PHI + credential fields
- **INLINE_REDACT_PATTERNS**: Regex patterns for inline SSN, DOB, VistA names
- **redactPhi(obj)**: Deep-redact an object, replacing blocked fields with `[REDACTED]`
- **sanitizeAuditDetail(detail)**: Convenience wrapper for audit emitters
- **sanitizeForAudit(detail, maxLen)**: Redact + truncate long strings

### Audit Emitter Wiring
All audit stores delegate to `sanitizeAuditDetail()` before storage:
- `immutable-audit.ts`: Two-pass (centralized + legacy pattern scrub)
- `imaging-audit.ts`: Centralized first pass + local BLOCKED_KEYS
- `rcm-audit.ts`: Local sanitizeDetail blocks dfn/patientdfn/patient_dfn/mrn
- `portal-audit.ts`: Direct `sanitizeAuditDetail(opts?.detail)`

### CI Gate (G22)
`qa/gauntlet/gates/g22-phi-leak-audit.mjs` performs 6 static analysis checks:
1. PHI_FIELDS includes dfn/patientdfn/patient_dfn/mrn
2. `sanitizeAuditDetail` export exists
3. `auditIncludesDfn: false` in server-config.ts
4. `neverLogFields` includes dfn/patientDfn/mrn
5. No `log.info/warn/error` calls with `{ dfn }` in routes/services
6. portal-audit.ts uses sanitizeAuditDetail
7. immutable-audit.ts imports phi-redaction

## How to Run

```bash
# Unit tests
cd apps/api
pnpm exec vitest run tests/phi-redaction.test.ts

# CI gate only
node qa/gauntlet/cli.mjs --suite rc  # includes G22

# Verify no PHI leaks in logs
grep -rn "log\.\(info\|warn\|error\).*\bdfn\b" apps/api/src/routes/ apps/api/src/services/
```

## Adding New PHI Fields

1. Add the lowercase field name to `PHI_FIELDS` in `lib/phi-redaction.ts`
2. If needed, add a new inline pattern to `INLINE_REDACT_PATTERNS`
3. Run `pnpm exec vitest run tests/phi-redaction.test.ts` to verify
4. Run `node qa/gauntlet/cli.mjs --suite rc` to verify G22 passes

## Files Changed

| File | Change |
|------|--------|
| `lib/phi-redaction.ts` | +dfn/mrn to PHI_FIELDS, +sanitizeAuditDetail export |
| `config/server-config.ts` | auditIncludesDfn=false, neverLogFields expanded |
| `lib/audit.ts` | Removed patientDfn from log.info |
| `lib/immutable-audit.ts` | Centralized sanitize + two-pass approach |
| `services/imaging-audit.ts` | Centralized first pass + local BLOCKED_KEYS expanded |
| `rcm/audit/rcm-audit.ts` | Added dfn/patientdfn/patient_dfn/mrn checks |
| `services/portal-audit.ts` | Added sanitizeAuditDetail to detail |
| `services/imaging-service.ts` | Removed dfn from 4 log.warn calls |
| `routes/imaging-viewer.ts` | Removed dfn from log.warn |
| `routes/emar/index.ts` | Removed dfn from log.info |
| `routes/write-backs.ts` | Removed dfn from log.info |

## Gauntlet Results

- FAST: 4P / 0F / 0S / 1W
- RC: 18P / 0F / 1S / 2W (G22 added, was 17P)
- FULL: 19P / 1F(VistA Docker) / 1S / 2W (G22 added, was 18P)
