# Phase 679 - CPRS Cover Sheet Medication Truthfulness Recovery (VERIFY)

Verification target
- CPRS Cover Sheet must render truthful normalized medications on the initial live load.

Checks
1. Docker lane healthy and API healthy.
2. Fresh clinician browser session to /cprs/chart/46/cover for DFN 46.
3. First captured GET /vista/medications?dfn=46 returns normalized medication results, not raw ORWPS header text.
4. Active Medications table renders the same normalized medication name and sig returned by the route.
5. No new diagnostics errors in changed files.

Acceptance
- First-load Cover Sheet medications converge without needing a second manual fetch.