# Phase 715 - CPRS Legacy Tab Alias Recovery - Verify

## Browser proof
1. Open `http://127.0.0.1:3000/cprs/login?redirect=%2Fcprs%2Fchart%2F46%2Fdc-summaries` and sign in.
2. Confirm the app lands on `/cprs/chart/46/dcsumm` and renders the D/C Summary tab instead of the chart error page.
3. Open `http://127.0.0.1:3000/cprs/login?redirect=%2Fcprs%2Fchart%2F46%2Fai-assist` and sign in.
4. Confirm the app lands on `/cprs/chart/46/aiassist` and renders the AI Assist tab instead of the chart error page.
5. Open `http://127.0.0.1:3000/cprs/login?redirect=%2Fcprs%2Fchart%2F46%2Ftele-health` and sign in.
6. Confirm the app lands on `/cprs/chart/46/telehealth` and renders the Telehealth tab instead of the chart error page.

## Contract proof
1. Confirm the chart route now normalizes the proven legacy slugs before validation.
2. Confirm module gating, tab highlighting, panel rendering, and ActionInspector all use canonical slugs.
3. Confirm unrelated invalid slugs still 404.