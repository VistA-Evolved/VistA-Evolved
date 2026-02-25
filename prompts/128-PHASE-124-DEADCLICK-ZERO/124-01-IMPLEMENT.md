# Phase 124 — UI Dead-Click Zero + Stub Reduction (Credibility Pass)

## Mission
Reduce dead-click markers to near-zero by wiring what is already supported
by backend or explicitly disabling + explaining "integration pending" with
structured blockers. No silently-dead UI. Also reduce stub/not_implemented
hotspots in user-facing screens.

## Steps
1. Inventory dead-click markers and top stub/not_implemented hotspots
2. For each dead-click: wire backend or disable with tooltip + blocker
3. Add tripwire CI test for dead-click markers
4. CPRS fidelity guard: partial panels show "integration pending" banner
5. Re-audit and confirm material reduction

## Files Touched
- apps/web/src/components/cprs/panels/OrdersPanel.tsx (Discontinue: local-only -> API + pending fallback)
- apps/web/src/components/cprs/panels/SurgeryPanel.tsx (operative report integration-pending banner)
- apps/web/src/app/cprs/inbox/page.tsx (Acknowledge: local-only -> API + pending fallback)
- apps/web/src/app/cprs/remote-data-viewer/page.tsx (simulated query -> real API + pending fallback)
- tests/tripwire/tripwire-source-scan.test.ts (new: source-level dead-click CI scanner)
- prompts/128-PHASE-124-DEADCLICK-ZERO/ (this folder)

## Results
- 4 true dead clicks fixed (OrdersPanel DC, inbox ack, remote-data-viewer query + facilities)
- 1 missing integration-pending banner added (SurgeryPanel operative report)
- Source-level tripwire scanner: 0 errors, 14 warnings (loading-disabled buttons, not dead clicks)
- CPRS fidelity audit: 27 panels/pages checked, 0 issues
- All 18 chart tabs navigable, all menus/dialogs functional or properly bannered
