# 498-01-IMPLEMENT — UTF-8 Lane

## Objective

Create UTF-8 round-trip testing infrastructure for VistA M globals.
Validate that non-ASCII characters (Filipino, Spanish, CJK, emoji)
survive the API → VistA RPC → M global → read-back cycle.

## Files Changed

| File                                     | Change                                                  |
| ---------------------------------------- | ------------------------------------------------------- |
| `apps/api/src/vista/utf8-roundtrip.ts`   | NEW — UTF-8 test harness with sample strings per locale |
| `apps/api/src/routes/utf8-routes.ts`     | NEW — /vista/utf8/test and /vista/utf8/status endpoints |
| `apps/api/src/server/register-routes.ts` | Register utf8Routes                                     |
| `scripts/verify-utf8-roundtrip.ps1`      | NEW — PowerShell verifier for UTF-8 lane                |

## Policy Decisions

1. UTF-8 test uses known non-ASCII strings per locale (Filipino diacritics, Spanish accents, CJK).
2. Test is read-only probe: attempts to check if VistA accepts/returns non-ASCII via existing RPCs.
3. If VistA isn't running, returns graceful integration-pending status.
4. No PHI in any test strings.
