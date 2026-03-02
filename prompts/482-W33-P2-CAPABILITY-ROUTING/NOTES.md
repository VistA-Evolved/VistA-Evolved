# Phase 482 -- W33-P2: NOTES

## Decisions
- New status value: `"unsupported-in-sandbox"` -- replaces `"integration-pending"` when
  RPC has been probed and confirmed absent
- Capability evidence (`capabilityProbe`) is always included in responses
- `probeTier0Rpc()` uses existing `optionalRpc()` from rpcCapabilities.ts
- No route changes in this phase -- P3-P7 will adopt the helpers
- Added DGPM, PSB, PSJBCMA, LR VERIFY, NURS RPCs to KNOWN_RPCS for probing

## New Type: Tier0ProbeResult
```typescript
interface Tier0ProbeResult {
  rpcName: string;
  available: boolean;
  error?: string;
  domain: string;
  probedAt: string;
  expectedMissing: boolean;
}
```

## New Status Values
- `"unsupported-in-sandbox"` -- RPC probed and confirmed absent
- `"integration-pending"` -- retained for indeterminate state (not yet probed)
