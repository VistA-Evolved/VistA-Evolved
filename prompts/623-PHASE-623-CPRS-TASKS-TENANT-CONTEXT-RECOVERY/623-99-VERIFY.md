# Phase 623 - Verify CPRS Tasks Tenant Context Recovery

## Required live checks

1. Authenticate as the clinician sandbox user against `http://127.0.0.1:3001/auth/login`.
2. Call:
   - `GET /portal/staff/messages`
   - `GET /portal/staff/refills`
   - `GET /portal/staff/tasks`
3. Confirm none of the responses return `TENANT_REQUIRED`.
4. Confirm each response is either:
   - `ok: true` with queue data, or
   - `ok: true` with an empty queue when no data exists.
5. Load the CPRS chart Tasks tab in the browser and verify the UI does not convert backend failures into misleading empty-state text.

## Regression checks

1. Confirm other `/portal/*` routes still rely on their own session model.
2. Confirm the CPRS Tasks refresh action still works after the auth-rule change.