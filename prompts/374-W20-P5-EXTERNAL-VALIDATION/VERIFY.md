# 374-99-VERIFY — External Validation Harness (W20-P5)

## Verification Steps

1. tsc --noEmit clean
2. POST /external-validation/vulnerabilities → 201
3. GET /external-validation/vulnerabilities → list with triage status
4. POST /external-validation/vulnerabilities/:id/assess → updates status
5. GET /external-validation/endpoint-inventory → returns auto-scanned route list
6. GET /external-validation/scope-document → returns generated scope doc
7. store-policy.ts has entries for vulnerability + scope stores
8. AUTH_RULES has /external-validation/ → admin
9. register-routes.ts has import + registration
