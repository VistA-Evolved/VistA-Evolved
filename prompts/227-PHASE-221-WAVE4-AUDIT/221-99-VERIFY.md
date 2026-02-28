# Phase 221 -- Verify: Wave 4 Comprehensive Audit

## Verification Steps

1. All 9 fixes in verify-rpc-communication.mjs applied and script parses cleanly
2. All 28 WAVE2/WAVE3 title misalignments corrected in enrich-wave-phases.mjs
3. All 56 wave phase prompt files rewritten with correct folder-matching titles
4. Convergence snapshot numbers updated (229 phases, correct HEAD hash)
5. Verification report labels clarified with scope breakdowns

## Acceptance Criteria

- [ ] pnpm qa:prompts: 2/2 PASS
- [ ] Phase index gate: 6/6 PASS (229 phases)
- [ ] Zero compile errors (get_errors)
- [ ] No phase title mismatches between folder names and file headings
- [ ] verify-rpc-communication.mjs has no dead code paths
- [ ] Convergence snapshot reflects actual phase count and HEAD

## Source
- Audit requested by user for all Wave 4 changes (Q211-Q220)
- Issues discovered via sub-agent deep analysis
- Fixes validated via QA gates and spot-checks
