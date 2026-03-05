# Phase 568 Notes

## Summary
Closes KI-001: ZVEADT WARDS socket crash cascade.
**Verified live against VEHU container 2026-03-05.**

## Root Cause
1. `ZVEADT.m` WARDS entry had no `$ETRAP` -- M runtime error killed the TCP session
2. Global reads (`^DIC(42)`, `^DIC(42.4)`) lacked `$D()` existence checks
3. `rpcCapabilities.ts` probe loop had no reconnect-on-socket-loss -- single crash cascaded to 16+ false negatives
4. `rpcBrokerClient.ts` didn't reset `readBuf`/`sessionDuz` on socket close

## Fix (3 layers)
- **Layer 1 -- M routine:** Added `$ETRAP` + `$D()` guards to all 3 entry points (WARDS, BEDS, MVHIST)
- **Layer 2 -- Probe loop:** Added `isSocketLostError()` detection -> `disconnect()` + `connect()` -> retry once
- **Layer 3 -- Broker client:** Reset `readBuf`, `sessionDuz`, `connected` on socket close/error events

## Live Verification Evidence (2026-03-05)

### verify:vista (6/6 PASS)
```
VistA RPC Bridge Verification
  Host: 127.0.0.1:9431
  User: (credentials set)

  PASS  Connect  (3079ms) -- DUZ=1
  PASS  ORWU USERINFO  (10ms)
  PASS  ORWPT LIST ALL  (53ms)
  PASS  ORWORDG IEN  (3ms)
  PASS  ORWU DT  (2ms)
  PASS  Disconnect  (1ms)

VistA connectivity: 6/6 tests passed
```

### verify-zveadt-fix.ts (exit code 0)
```
=== Phase 568: ZVEADT Crash + Cascade Fix Verification ===

--- PART 1: Full Capability Probe ---
  Total probed:    87
  Available:       79
  Missing:         8
  Expected missing: 1

--- PART 2: Cascade Check ---
  PASS  ZVEADT WARDS: available
  PASS  ZVEADT BEDS: available
  PASS  ZVEADT MVHIST: available
  PASS  DGPM NEW ADMISSION: available
  (+ 9 more PASS)
  PASS  No "Not connected" cascade in the cascade group

--- PART 3: ZVEADT WARDS Specific ---
  PASS  ZVEADT WARDS is available (no socket crash)

--- PART 4: ADT Sequence Test ---
  PASS  ZVEADT WARDS returned 0 line(s)
  PASS  ORWPT LIST ALL returned 44 line(s) AFTER ZVEADT WARDS -- socket survived
  PASS  ORWU DT returned server time -- socket fully alive

=== SUMMARY ===
  Available RPCs: 79/87
  Cascade "Not connected": 0
  Exit code: 0
```
