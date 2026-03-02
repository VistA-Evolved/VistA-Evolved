# Phase 471 — Service-Line Dashboards VERIFY

## Gates
1. page.tsx renders 3 tabs: ED, OR, ICU
2. Each tab shows board metrics from respective /board or /metrics endpoint
3. Uses fetch with credentials: 'include'
4. No PHI in component code
