# Phase 660 - CPRS Nursing Tasks Tab Truthfulness Recovery - Verify

1. Verify Docker, API health, and VistA connectivity are healthy before UI testing.
2. Authenticate with `PRO1234 / PRO1234!!`.
3. Call `GET /vista/nursing/tasks?dfn=46` with clinician session cookies and confirm the response is structured and truthful.
4. Open `/cprs/chart/46/nursing` in the browser and inspect the `Task List` sub-tab.
5. Confirm the panel no longer shows a generic placeholder when the backend returned a live empty response.
6. If task rows are present, confirm they render with medication/sig/status fields. If none are present, confirm the panel shows a truthful live empty message.

## Acceptance Criteria

- The Nursing Tasks tab reflects the backend response instead of discarding it.
- Live empty state and pending state are visually distinct.
- No fake BCMA/PSB completion claims are shown.
