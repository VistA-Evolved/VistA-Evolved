# Auth Troubleshooting Runbook

> VistA-Evolved authentication, RBAC, and session troubleshooting guide.

---

## Quick Diagnosis Flowchart

```
User reports: "I can't log in"
  |
  +--> Check 1: Is VistA Docker running?
  |      docker ps --filter name=wv
  |      If not: cd services/vista && docker compose up -d
  |
  +--> Check 2: Is port 9430 reachable?
  |      Test-NetConnection -ComputerName 127.0.0.1 -Port 9430
  |      If not: wait 15s after container start (AGENTS.md #4)
  |
  +--> Check 3: Is the API running?
  |      curl.exe http://127.0.0.1:3001/health
  |      If not: cd apps/api && npx tsx --env-file=.env.local src/index.ts
  |
  +--> Check 4: Are credentials correct?
  |      Use PROV123 / PROV123!! (see AGENTS.md #2)
  |
  +--> Check 5: Is the account locked out?
  |      Check server logs for "account locked" messages
  |      Wait 15 minutes, or restart the API to clear lockout state
  |
  +--> Check 6: Is rate limiting blocking?
         Check for 429 responses in browser network tab
         Per-IP: 10 login attempts per 60s
         Per-account: 5 failures in 15 min = 15 min lockout
```

---

## Common Issues

### 1. "Authentication failed" (401)

**Symptoms:** Login POST returns `{"ok":false,"error":"Authentication failed"}`

**Causes:**
- Wrong access code or verify code
- VistA Docker container not running or not ready
- Port 9430 not accessible

**Fix:**
```powershell
# Check VistA is running and ready
docker ps --filter name=wv
curl.exe http://127.0.0.1:3001/vista/ping

# Verify credentials (Docker sandbox)
# Access: PROV123  Verify: PROV123!!
# Access: PHARM123 Verify: PHARM123!!
# Access: NURSE123 Verify: NURSE123!!
```

### 2. "Account temporarily locked" (429)

**Symptoms:** Login returns `{"ok":false,"error":"Account temporarily locked..."}`

**Causes:** 5+ failed login attempts within 15 minutes for the same access code.

**Fix:**
- Wait for lockout to expire (15 minutes by default)
- Restart the API server (clears in-memory lockout state)
- Adjust via `LOGIN_LOCKOUT_MAX` and `LOGIN_LOCKOUT_DURATION_MS` env vars

### 3. "Session expired or invalid" (401)

**Symptoms:** API calls return 401 after previously working.

**Causes:**
- Session idle timeout (30 min of inactivity)
- Session absolute timeout (8 hours)
- API server restarted (in-memory sessions cleared)

**Fix:** Log in again. Sessions are in-memory and don't survive restarts.

### 4. "Insufficient privileges" (403)

**Symptoms:** API call returns `{"ok":false,"error":"Insufficient privileges"}`

**Causes:** User's role doesn't have the required permission.

**Fix:**
```powershell
# Check your current role and permissions
curl.exe -b cookies.txt http://127.0.0.1:3001/auth/permissions

# Common scenarios:
# - Nurse trying to create RCM claims -> needs billing or admin role
# - Clerk trying to access imaging -> not in imaging permission map
# - Non-admin trying /admin/* routes -> admin role required
```

**Role permission reference:** See `docs/security/auth-and-rbac.md`

### 5. "CSRF token mismatch" (403)

**Symptoms:** POST/PUT/PATCH/DELETE returns `{"ok":false,"error":"CSRF token mismatch"}`

**Causes:**
- Frontend not sending `X-CSRF-Token` header on mutation requests
- CSRF cookie expired or not set

**Fix for curl testing (Phase 132: synchronizer token):**
```powershell
# Login -- CSRF token is in the JSON response body
$login = curl.exe -s -c cookies.txt -d "@login-body.json" -H "Content-Type: application/json" http://127.0.0.1:3001/auth/login
$csrf = ($login | ConvertFrom-Json).csrfToken

# Use CSRF token on subsequent requests
curl.exe -b cookies.txt -H "X-CSRF-Token: $csrf" -H "Content-Type: application/json" -d '{}' http://127.0.0.1:3001/rcm/claims/draft
```

**Fix for frontend (Phase 132: shared CSRF module):**
```typescript
// Import shared CSRF manager
import { getCsrfToken } from '@/lib/csrf';

// Include in fetch calls
const csrfToken = await getCsrfToken();
fetch('/api/endpoint', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  },
  body: JSON.stringify(data),
});
```

### 6. "Too many requests" (429)

**Symptoms:** Any API call returns 429.

**Causes:** Rate limit exceeded for your IP address.

**Fix:**
- Wait 60 seconds (rate limit window)
- Check `X-RateLimit-Remaining` header to monitor usage
- Adjust via `RATE_LIMIT_GENERAL` (default 200) and `RATE_LIMIT_LOGIN` (default 10) env vars

### 7. "Origin not allowed" (403)

**Symptoms:** POST requests from browser return "Origin not allowed"

**Causes:** Browser's `Origin` header doesn't match the allowlist.

**Fix:**
```powershell
# Set ALLOWED_ORIGINS to include your frontend URL
$env:ALLOWED_ORIGINS = "http://localhost:3000,http://localhost:3001,http://your-domain.com"
```

---

## Debugging Tools

### Check active sessions (admin only)
```powershell
curl.exe -b cookies.txt http://127.0.0.1:3001/admin/sessions
```

### Check your permissions
```powershell
curl.exe -b cookies.txt http://127.0.0.1:3001/auth/permissions
```

### View RBAC matrix (admin only)
```powershell
curl.exe -b cookies.txt http://127.0.0.1:3001/auth/rbac-matrix
```

### Check immutable audit trail (admin only)
```powershell
curl.exe -b cookies.txt http://127.0.0.1:3001/audit/unified?limit=10
```

### Enable debug logging
```powershell
$env:VISTA_DEBUG = "true"
$env:LOG_LEVEL = "debug"
```

---

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `SESSION_ABSOLUTE_TTL_MS` | 28800000 | Session max lifetime (ms) |
| `SESSION_IDLE_TTL_MS` | 1800000 | Session idle timeout (ms) |
| `RATE_LIMIT_GENERAL` | 200 | General API req/min per IP |
| `RATE_LIMIT_LOGIN` | 10 | Login req/min per IP |
| `LOGIN_LOCKOUT_MAX` | 5 | Failed attempts before lockout |
| `LOGIN_LOCKOUT_DURATION_MS` | 900000 | Lockout duration (ms) |
| `LOGIN_LOCKOUT_WINDOW_MS` | 900000 | Failure counting window (ms) |
| `ALLOWED_ORIGINS` | localhost:3000,3001 | CORS origin allowlist |
