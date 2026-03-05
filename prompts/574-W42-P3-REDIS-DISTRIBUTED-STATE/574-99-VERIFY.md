# Phase 574 — W42-P3: Verification

## Gate 1: ioredis in dependencies

```bash
grep "ioredis" apps/api/package.json
# Expected: "ioredis": "^5.x.x"
```

## Gate 2: Redis module exports

```bash
grep "export" apps/api/src/lib/redis.ts | grep -c "function"
# Expected: 9+
```

## Gate 3: Graceful fallback

```bash
grep -c "return null\|return false\|remaining: limit\|return { allowed: true" apps/api/src/lib/redis.ts
# Expected: 4+ fallback returns when Redis unavailable
```

## Gate 4: TypeScript compiles

```bash
cd apps/api && npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```
