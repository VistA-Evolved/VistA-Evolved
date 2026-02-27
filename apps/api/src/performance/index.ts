/**
 * performance/index.ts -- Barrel export (Phase 162)
 */
export { recordRouteProfile, getRouteProfiles, getSlowRoutes, getSlowQueryLog, getSystemP95, getSystemAvg, resetProfiles } from "./profiler.js";
export { checkBudget, listBudgets, getBudget, setBudget, deleteBudget, seedDefaultBudgets, getBudgetCount } from "./budget-engine.js";
export { default as perfRoutes } from "./perf-routes.js";
