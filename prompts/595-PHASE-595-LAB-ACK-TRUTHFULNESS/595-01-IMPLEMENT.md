# Phase 595 — Lab Acknowledgement Truthfulness

## User Request

Continue autonomously toward a production-grade, VistA-first CPRS experience and harden incomplete clinical workflows so the UI only offers functionality that is real from an end-user perspective.

## Implementation Steps

1. Inventory the current labs read route, web data cache, and labs panel acknowledgement path before editing.
2. Confirm the live VEHU payload for `GET /vista/labs?dfn=46` so the frontend contract matches what `ORWLRR INTERIM` actually returns today.
3. Extend the shared lab result shape so the cache can preserve a real VistA acknowledgement identifier when one is present instead of fabricating `lab-*` IDs.
4. Repoint the web cache to the CPRS acknowledgement route and block acknowledgement attempts for synthetic or read-only rows.
5. Update the labs panel so it only shows acknowledgement controls when a result is truly ackable and clearly communicates when the current VistA feed is display-only.
6. Validate the updated contract with targeted live probes and compile checks.

## Files Touched

- apps/web/src/stores/data-cache.tsx
- apps/web/src/components/cprs/panels/LabsPanel.tsx
- prompts/595-PHASE-595-LAB-ACK-TRUTHFULNESS/595-01-IMPLEMENT.md
- prompts/595-PHASE-595-LAB-ACK-TRUTHFULNESS/595-99-VERIFY.md
