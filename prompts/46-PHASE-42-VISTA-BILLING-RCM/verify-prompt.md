# Phase 42 VERIFY — Real VistA Drafts or Honest Pending

## Gates

### G42-1 Vivian + live RPC alignment
- Any RPC used is in vivian index OR explicitly allowlisted with explanation
- Presence checks show whether used RPCs are available in instance

### G42-2 Draft builder
- POST /rcm/vista/claim-drafts returns deterministic drafts
- Drafts include missingFields[] if incomplete (no pretending)

### G42-3 Wrapper RPCs
- If VE wrapper RPCs exist: read-only, documented install, in live catalog
- If not installed, endpoints return "integration pending" with exact RPC names

### G42-4 UI flow works
- "Draft from VistA" path clickable end-to-end
- No dead clicks
- Missing prerequisites show explicit checklist

### G42-5 Security & regression
- verify-latest.ps1 passes
- Secret scan and PHI log scan pass

## Files to verify
- apps/api/src/rcm/vistaBindings/buildClaimDraftFromVista.ts
- apps/api/src/rcm/rcm-routes.ts
- apps/api/src/vista/rpcRegistry.ts
- apps/web/src/app/cprs/admin/rcm/page.tsx
- services/vista/ZVERCMP.m
- scripts/install-rcm-wrappers.ps1
- data/vista/vivian/rpc_index.json

## Commit
"Phase42-VERIFY"
