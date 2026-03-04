# Phase 144 -- QA Ladder V2 -- VERIFY

## Verification Gates

1. TypeScript compiles clean (tsc --noEmit) for api, portal, web
2. Phase registry resolves domains for Phases 139-144
3. Test generator produces Playwright + RPC + restart specs
4. Generated Playwright specs parse without syntax errors
5. Generated RPC replay specs reference golden-trace workflows
6. Restart resilience specs cover durable store survival
7. G18 gauntlet gate passes
8. Gauntlet FAST baseline maintained (4P/0F/1W)
9. Gauntlet RC baseline maintained (15P/0F/1W + G18)
10. CI workflow updated with Phase 144 coverage
11. No PHI in generated test code
12. No empty test bodies (describe/it blocks with real assertions)
