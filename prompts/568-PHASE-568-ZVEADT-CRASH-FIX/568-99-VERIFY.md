# Phase 568 — VERIFY: ZVEADT Crash Fix + Probe Cascade Prevention

## Verification Gates

### Gate 1: ZVEADT.m has $ETRAP in all entry points
```powershell
$content = Get-Content services/vista/ZVEADT.m -Raw
$etrapCount = ([regex]::Matches($content, '\$ETRAP')).Count
if ($etrapCount -ge 3) { "PASS: $etrapCount ETRAP entries" } else { "FAIL: only $etrapCount" }
```

### Gate 2: ZVEADT.m has $D() global checks
```powershell
$dChecks = ([regex]::Matches($content, "\`$D\("  )).Count
if ($dChecks -ge 3) { "PASS: $dChecks $D() checks" } else { "FAIL: only $dChecks" }
```

### Gate 3: rpcCapabilities.ts has socket-lost detection
```powershell
$cap = Get-Content apps/api/src/vista/rpcCapabilities.ts -Raw
if ($cap -match 'isSocketLostError') { "PASS" } else { "FAIL" }
if ($cap -match 'SOCKET_LOST_PATTERNS') { "PASS" } else { "FAIL" }
```

### Gate 4: rpcCapabilities.ts has reconnect logic in probe loop
```powershell
if ($cap -match 'disconnect\(\).*connect\(\)') { "PASS" } else { "FAIL" }
```

### Gate 5: rpcBrokerClient.ts close handler resets readBuf
```powershell
$broker = Get-Content apps/api/src/vista/rpcBrokerClient.ts -Raw
if ($broker -match "once\('close'.*readBuf\s*=\s*''") { "PASS" } else { "FAIL - check manually" }
```

### Gate 6: Evidence doc updated
```powershell
$doc = Get-Content docs/VISTA_CONNECTIVITY_RESULTS.md -Raw
if ($doc -match 'RESOLVED.*ZVEADT') { "PASS" } else { "FAIL" }
```

### Gate 7: TypeScript compiles
```powershell
pnpm -C apps/api exec tsc --noEmit 2>&1 | Select-Object -Last 5
```
