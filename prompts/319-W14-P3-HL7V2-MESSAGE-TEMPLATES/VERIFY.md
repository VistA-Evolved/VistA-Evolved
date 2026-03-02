# 319 — VERIFY: HL7v2 Message Pack Standard + Template Library

## Gates

| # | Gate | Method |
|---|------|--------|
| 1 | Template types file exists with all exports | file + grep |
| 2 | Template store with CRUD | file + grep |
| 3 | Template validator uses correct parser API (Hl7Segment) | grep |
| 4 | Routes file with 12 endpoints | file + grep |
| 5 | Barrel index exports all public API | file |
| 6 | AUTH_RULES for /hl7/templates/ | grep security.ts |
| 7 | Route registered in register-routes.ts | grep |
| 8 | Store entry in store-policy.ts | grep |
| 9 | No TypeScript compile errors | tsc --noEmit |
| 10 | Prompt files exist | file check |
