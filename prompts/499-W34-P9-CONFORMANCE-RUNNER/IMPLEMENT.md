# 499-01-IMPLEMENT — Country Conformance Runner

## Objective

Create an automated per-pack conformance suite that validates all regulatory
enforcement gates (P2-P8) are wired correctly for each country pack. Produces
an evidence bundle summarizing pass/fail per gate per pack.

## Files Changed

| File                                              | Change                                                     |
| ------------------------------------------------- | ---------------------------------------------------------- |
| `scripts/qa-gates/country-conformance-runner.mjs` | NEW — offline conformance runner                           |
| `apps/api/src/routes/conformance-routes.ts`       | NEW — /conformance/run and /conformance/evidence endpoints |
| `apps/api/src/server/register-routes.ts`          | Register conformanceRoutes                                 |

## Policy Decisions

1. Runner validates: pack loading, tenant binding fields, consent profile resolution,
   data residency config, retention policy, DSAR right gates, i18n locale coverage.
2. Evidence bundle is a JSON object (not files) returned from the endpoint.
3. Offline runner (mjs) produces exit code 0/1 for CI.
4. Admin-only endpoints.
