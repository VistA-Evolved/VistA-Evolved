# Phase 426 -- RPC Safe-Harbor List v2 -- VERIFY

## Verification Gates

### Gate 1: JSON Validity

```powershell
node -e "const d = require('./data/vista/rpc-safe-harbor-v2.json'); console.log('Classifications:', d.classifications.length, 'Tiers:', Object.keys(d.tiers).length)"
```

**Expected**: Classifications: 18, Tiers: 5.

### Gate 2: All Write RPCs Covered

Cross-reference against rpcRegistry.ts write-tagged RPCs that appear in KNOWN_RPCS.

### Gate 3: No Duplicate RPCs

```powershell
node -e "const d=require('./data/vista/rpc-safe-harbor-v2.json'); const names=d.classifications.map(c=>c.rpc); const dupes=names.filter((n,i)=>names.indexOf(n)!==i); console.log(dupes.length===0?'PASS: no duplicates':'FAIL: '+dupes)"
```

**Expected**: PASS.

### Gate 4: Summary Counts Match

```powershell
node -e "const d=require('./data/vista/rpc-safe-harbor-v2.json'); const counts={}; d.classifications.forEach(c=>{counts[c.tier]=(counts[c.tier]||0)+1}); console.log(JSON.stringify(counts)); const match=JSON.stringify(counts)===JSON.stringify(d.summary); console.log(match?'PASS':'FAIL: counts mismatch')"
```

### Gate 5: Tree Health

```powershell
node scripts/qa-gates/prompts-tree-health.mjs
```

**Expected**: 0 FAIL, exit code 0.

## Exit Criteria

JSON valid, no duplicates, summary matches, linter clean.
