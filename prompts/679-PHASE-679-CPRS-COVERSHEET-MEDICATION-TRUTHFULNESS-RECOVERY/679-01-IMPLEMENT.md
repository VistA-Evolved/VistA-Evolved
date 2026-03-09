# Phase 679 - CPRS Cover Sheet Medication Truthfulness Recovery (IMPLEMENT)

User request
- Continue autonomously toward a fully working, VistA-first CPRS UI with truthful live browser behavior.

Problem statement
- The Cover Sheet Active Medications panel intermittently renders a raw ORWPS header row on first load even though a later direct GET /vista/medications?dfn=46 returns normalized medication data.
- Live browser capture showed the bad response only on the initial Cover Sheet burst where multiple domains were fetched concurrently.

Implementation steps
1. Re-read the Cover Sheet domain prefetch logic and align it with the earlier sequential-prefetch recovery intent.
2. Change the initial Cover Sheet domain load to fetch core domains sequentially instead of firing them all concurrently.
3. Keep the rest of the Cover Sheet retry flow intact so later pending retries still work.
4. Verify in a fresh browser load that the first GET /vista/medications?dfn=46 payload is normalized and the Cover Sheet renders the normalized medication row without a manual refetch.

Verification steps
- Fresh browser load of /cprs/chart/46/cover after clinician login.
- Capture first-load /vista/medications?dfn=46 response.
- Confirm Active Medications shows normalized medication name and sig on initial render.

Files touched
- apps/web/src/components/cprs/panels/CoverSheetPanel.tsx
- docs/runbooks/vista-rpc-phase12-parity.md
- ops/summary.md
- ops/notion-update.json