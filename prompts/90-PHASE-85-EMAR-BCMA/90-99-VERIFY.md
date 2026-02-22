# Phase 85 -- eMAR + BCMA Posture (VERIFY)

## Verification Checklist

1. **File existence**: All 5 new files exist
2. **API routes**: 6 endpoints with correct method/path/response shape
3. **Real VistA data**: Schedule (ORWPS ACTIVE) and allergies (ORQQAL LIST)
4. **Integration-pending**: History, administer, barcode-scan have vistaGrounding
5. **Heuristics labeled**: Duplicate check and schedule derivation marked as heuristic
6. **Web page**: 4 tabs, Suspense boundary, credentials: include, no dead clicks
7. **Navigation**: eMAR entry in CPRSMenuBar Tools menu
8. **Auth**: /emar/ in AUTH_RULES, requireSession in all handlers
9. **No anti-patterns**: No console.log, no hardcoded creds, no fake success
10. **Docs**: Runbook + grounding doc complete

## Verification Script

```powershell
.\scripts\verify-phase85-emar-bcma.ps1
```

## Expected Result

All gates PASS (60+ gates).
