# 507-01 IMPLEMENT -- Role-Based Acceptance Matrix

## Goal

Create an offline script that validates the RBAC architecture is consistent:
route patterns in AUTH_RULES have valid auth levels, unified RBAC permissions
are complete for all 7 roles, and critical admin routes require admin auth.

## Deliverables

1. `scripts/qa/role-acceptance.mjs` -- static analysis RBAC check
2. Evidence at `evidence/wave-35/507-W35-P8-ROLE-ACCEPTANCE/`
