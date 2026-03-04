# 498-99-VERIFY — UTF-8 Lane

## Gates

1. `vista/utf8-roundtrip.ts` exports UTF8 test corpus and validation functions.
2. `/vista/utf8/test` attempts round-trip with sample non-ASCII strings.
3. `/vista/utf8/status` returns UTF-8 support status per locale/script.
4. No PHI in test strings.
5. Graceful fallback when VistA is offline.
6. TypeScript compiles clean.
