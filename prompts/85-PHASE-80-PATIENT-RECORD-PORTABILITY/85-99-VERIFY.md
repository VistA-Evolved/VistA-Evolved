# Phase 80 VERIFY — Patient Record Portability v1

**Phase**: 80
**Bundle**: Patient Record Portability
**Date**: 2026-02-XX

## Verification Gates

| #   | Gate                                                           | Method       | Pass? |
| --- | -------------------------------------------------------------- | ------------ | ----- |
| 1   | portability-plan.json generated with rpcUsed/pendingTargets    | script       |       |
| 2   | POST /portal/record/export returns token                       | curl         |       |
| 3   | GET /portal/record/export/:token returns PDF                   | curl         |       |
| 4   | POST /portal/record/share returns share URL + TTL + accessCode | curl         |       |
| 5   | POST /portal/record/share/:id/revoke works                     | curl         |       |
| 6   | GET /portal/record/share/audit returns access events           | curl         |       |
| 7   | Expired export token returns 410                               | curl         |       |
| 8   | Revoked share returns error on access                          | curl         |       |
| 9   | Portal "My Records" page renders                               | visual       |       |
| 10  | No PHI in portal audit events                                  | grep         |       |
| 11  | AES-256-GCM encryption on stored summaries                     | code audit   |       |
| 12  | TTL cleanup job registered                                     | code audit   |       |
| 13  | TypeScript: No type errors                                     | tsc --noEmit |       |
| 14  | No console.log in new files                                    | grep         |       |
| 15  | E2E spec covers export + share + revoke                        | file check   |       |
