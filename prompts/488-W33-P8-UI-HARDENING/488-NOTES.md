# 488 NOTES -- W33-P8: UI Hardening

## Approach
The API now returns `"unsupported-in-sandbox"` from tier0Gate() when an RPC
is confirmed absent. Previously the UI only handled `"integration-pending"`.

A helper function `isTier0Pending(status)` is added where needed to match
both statuses. Display text varies based on which status was received.

Blue/indigo palette chosen for "unsupported" to distinguish from amber "pending".

## Budget Impact
Minimal -- some `"integration-pending"` string literals in conditional checks
will be joined by `"unsupported-in-sandbox"`, net new additions but also
comments updated. Expected net ~0 or slight increase.
