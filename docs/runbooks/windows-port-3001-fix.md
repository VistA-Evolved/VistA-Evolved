# Windows Port 3001 Conflict Fix

## Problem

When starting `apps/api` with `pnpm -C apps/api dev`, you get:
```
Error: listen EADDRINUSE: address already in use :::3001
```

This means another process is already using port 3001. This runbook shows you how to identify and safely resolve it.

---

## Solution 1: Find and Stop the Conflicting Process

### A. Find the Process ID (PID) holding port 3001

```powershell
Get-NetTCPConnection -LocalPort 3001 | Select-Object -ExpandProperty OwningProcess -Unique
```

Example output:
```
5432
```

This means process ID 5432 is using port 3001.

### B. Identify What's Using That PID (Optional)

```powershell
Get-Process -Id 5432
```

Example output (common conflicts):
- `node` → Another Node.js dev server
- `java` → Some Java application
- `dotnet` → .NET application

### C. Safely Stop the Process

**If it's a development server you started:** Kill it.

```powershell
Stop-Process -Id 5432 -Force
```

**If it's a system service or background app:** Use the GUI or services instead to avoid data loss.

---

## Solution 2: Run apps/api on a Different Port (Safe Alternative)

No need to kill processes. Just tell apps/api to use a different port:

```powershell
$env:PORT=3002; pnpm -C apps/api dev
```

This:
- Sets environment variable `PORT=3002` for the current PowerShell session
- Launches apps/api on `http://localhost:3002` instead of 3001
- Leaves the conflicting process untouched

**In another terminal, verify:**
```powershell
curl http://localhost:3002/health
```

---

## Solution 3: Find ALL Processes on Port 3001 (Windows Services)

If `Get-NetTCPConnection` shows the port but you can't kill it normally:

```powershell
Get-NetTCPConnection -LocalPort 3001 | ForEach-Object {
  Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue | 
    Select-Object Id, Name, @{Name="Port"; Expression={3001}}
}
```

---

## Quick Checklist

- [ ] Run `Get-NetTCPConnection -LocalPort 3001` to confirm conflict exists
- [ ] Identify process with `Get-Process -Id <PID>`
- [ ] Choose: Stop it, or use `$env:PORT=3002` instead
- [ ] Launch `pnpm -C apps/api dev` (or with PORT=3002)
- [ ] Verify with `curl http://localhost:3001/health` (or 3002)

---

## Advanced: Prevent Future Conflicts

### Option A: Use a Unique Random Port
```powershell
# Pick a port between 5000-9999, unlikely to conflict
$env:PORT=7890
pnpm -C apps/api dev
```

### Option B: Windows Firewall Check
If you've modified Windows Firewall, port 3001 might be blocked:

```powershell
Get-NetFirewallRule -DisplayName "*3001*"
```

If nothing shows, the port isn't firewalled. (This is normal for localhost.)

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `Get-NetTCPConnection: No matches found` | Port 3001 is free | Run `pnpm -C apps/api dev` without environment variable |
| `Cannot find process with ID X` | Process already stopped | Run again; the port should be free |
| `Access Denied` on Stop-Process | It's a system process | Use `$env:PORT=XXXX` instead of killing |
| Port 3001 in use after `Stop-Process` | Another process took it | Try port 3002, 3003, etc. with `$env:PORT` |

---

## See Also

- [Phase 2 Docker Fix](phase2-docker-fix.md) — Port 9430 (container)
- [Vista Connectivity](vista-connectivity.md) — RPC broker setup
