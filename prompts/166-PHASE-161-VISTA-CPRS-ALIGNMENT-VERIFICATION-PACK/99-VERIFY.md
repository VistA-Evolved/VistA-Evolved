# Phase 161 — VistA + CPRS Alignment Verification Pack (VERIFY)

## Verification Gates

1. **TypeScript** — `pnpm -C apps/api exec tsc --noEmit` clean
2. **TypeScript (web)** — `pnpm -C apps/web exec tsc --noEmit` clean
3. **Alignment types** — types.ts exports AlignmentTrace, RpcTripwire, AlignmentScore
4. **Golden tracer** — golden-tracer.ts exports captureGoldenSnapshot, compareSnapshots
5. **Tripwire monitor** — tripwire-monitor.ts exports registerTripwire, checkTripwires
6. **Alignment scorer** — alignment-scorer.ts exports calculateAlignmentScore
7. **Routes wired** — grep workflowRoutes in index.ts
8. **Store policy** — 3+ entries for alignment stores
9. **UI page** — page.tsx exists at cprs/admin/alignment/
10. **Runbook** — phase161 runbook exists in docs/runbooks/
