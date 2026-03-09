# Phase 595 — VERIFY

## Verification Steps

1. Docker and API health are green before and after the change.
2. Live `GET /vista/labs?dfn=46` is inspected so the UI contract matches the actual VEHU payload shape.
3. Lab read mapping preserves a real acknowledgement identifier only when the VistA result feed includes one.
4. The CPRS labs panel no longer offers false acknowledgement actions for synthetic or read-only rows.
5. When a result includes a real acknowledgement identifier, the web cache posts to `POST /vista/cprs/labs/ack` instead of the legacy route.
6. The labs panel compiles and still renders empty or read-only lab states cleanly.
7. `scripts/verify-latest.ps1` passes or any unrelated pre-existing failures are called out explicitly.

## Acceptance Criteria

1. The frontend never sends fabricated `lab-*` identifiers to `ORWLRR ACK`.
2. The labs panel truthfully distinguishes ackable VistA results from display-only results.
3. The backend and frontend contracts are aligned around real acknowledgement keys.
4. The remaining sandbox limitation is visible in the UX instead of hidden behind fake success.
