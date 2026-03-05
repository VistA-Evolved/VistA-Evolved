# Phase 585 — W42-P14: Verification

> Wave 42: Production Remediation | Phase 585 Verification

---

## Gate 1: Store Policy — No Critical In-Memory

```powershell
cd apps/api; npx tsx -e "
const policy = require('./src/platform/store-policy.ts');
const critical = policy.getCriticalInMemoryStores?.() ?? [];
if (critical.length === 0) console.log('PASS: No critical in-memory stores');
else console.error('FAIL: Critical stores:', critical);
" 2>&1
```

Expected: `PASS` (or 0 critical stores in rc/prod).

---

## Gate 2: Redis in docker-compose.prod.yml

```powershell
Select-String -Path "docker-compose.prod.yml" -Pattern "redis|REDIS"
```

Expected: Redis service and REDIS_URL wiring.

---

## Gate 3: Gauntlet in CI Workflow

```powershell
Select-String -Path ".github/workflows/*.yml" -Pattern "gauntlet|cli.mjs" | Select-Object Path, LineNumber, Line
```

Expected: At least one workflow runs gauntlet.

---

## Gate 4: Helm API Template Has Env Vars

```powershell
Select-String -Path "infra/helm/**/api.yaml" -Pattern "REDIS_URL|VISTA_POOL"
```

Expected: REDIS_URL and VISTA_POOL vars in API deployment.

---

## Gate 5: .env.example Documents New Vars

```powershell
Select-String -Path "apps/api/.env.example" -Pattern "REDIS_URL|VISTA_POOL_SIZE|VISTA_MAX_POOL"
```

Expected: All new env vars documented.
