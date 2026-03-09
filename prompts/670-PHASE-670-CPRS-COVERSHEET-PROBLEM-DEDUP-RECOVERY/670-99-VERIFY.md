# Phase 670 - CPRS Cover Sheet Problem Dedup Recovery

## Verification Steps
1. Log into the web chart with the verified VEHU clinician account.
2. Confirm the live API `/vista/problems?dfn=46` returns unique problem IDs for DFN 46.
3. Open `/cprs/chart/46/cover` and inspect the Active Problems section.
4. Confirm the Cover Sheet no longer renders repeated rows for the same problem IEN.
5. Confirm the browser console no longer reports duplicate React keys for problem ID `1787`.
6. Verify the clinician still sees the correct live problem list entries for DFN 46.

## Acceptance Criteria
- The client-side problem data path normalizes duplicate problem IDs safely.
- The Cover Sheet shows each live problem only once.
- The duplicate React key warning for the problems section is eliminated.
- The live VistA problems route remains unchanged and truthful.
