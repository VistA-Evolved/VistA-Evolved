# 489 NOTES -- W33-P9: Day-in-the-Life Runner

## Design
The runner is a standalone Node.js script (ESM) that:
1. Logs in via /auth/login to get a session cookie
2. Calls each Tier-0 endpoint sequentially
3. Captures HTTP status, response body, timing
4. Validates response shape (must have capabilityProbe or vistaGrounding)
5. Emits a golden-trace JSON file to artifacts/

No external dependencies. Uses built-in `fetch` (Node 18+).
Tolerates API being down (marks as SKIP, not FAIL).

CPRS fallback paths (P6-P7) are not included because those require
a specific VistA state (patient context, existing orders) that doesn't
reliably exist. Only self-contained POST/GET endpoints are tested.
