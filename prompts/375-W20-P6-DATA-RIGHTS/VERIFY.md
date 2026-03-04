# 375-99-VERIFY — Data Rights Operations (W20-P6)

## Verification Steps

1. tsc --noEmit clean
2. POST /data-rights/retention-policies → 201 creates retention policy
3. GET /data-rights/retention-policies → list
4. POST /data-rights/deletion-requests → 201 creates deletion request
5. POST /data-rights/deletion-requests/:id/approve → updates status
6. POST /data-rights/deletion-requests/:id/execute → marks as executed
7. POST /data-rights/legal-holds → 201 creates legal hold
8. POST /data-rights/legal-holds/:id/release → releases hold
9. GET /data-rights/audit → returns audit trail
10. store-policy.ts has 4 entries (retention, deletion, holds, audit)
11. AUTH_RULES has /data-rights/ → admin
12. GA_READINESS_CHECKLIST.md gate G18 now passes
