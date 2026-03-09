# Phase 719 — VERIFY: CPRS Inbox Notification Parse Recovery

## Verification Steps

1. Authenticate with `PRO1234 / PRO1234!!`.
2. Call `GET /vista/inbox` and inspect the first notification items.
3. Confirm notification summaries are clinician-readable message text instead
   of raw caret-delimited payloads.
4. Confirm `patientDfn` is not populated with non-DFN values such as date/time
   strings.
5. Open `/cprs/inbox` and confirm the Summary column is readable and that
   `Open Chart` only appears when a real numeric DFN is present.
6. Run diagnostics on the touched API route.

## Acceptance Criteria

- `/vista/inbox` returns readable notification summaries.
- The inbox UI no longer displays raw `^`-delimited payloads in the Summary column.
- The inbox UI no longer renders fake `Open Chart` actions based on misparsed data.
- Touched files report no relevant diagnostics.