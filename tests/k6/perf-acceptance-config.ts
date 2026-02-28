/**
 * Performance Acceptance Gate Configuration — Phase 253
 *
 * Defines pass/fail thresholds for k6 performance tests.
 * Used by the CI pipeline and the acceptance gate runner.
 */

export interface PerfThreshold {
  /** Metric name (k6 metric) */
  metric: string;
  /** Threshold expression (k6 format) */
  threshold: string;
  /** Description of what this gates */
  description: string;
}

export interface PerfScenario {
  /** Scenario identifier */
  id: string;
  /** k6 test script path (relative to repo root) */
  script: string;
  /** Tier: smoke (fast CI gate), load (nightly), stress (pre-release) */
  tier: "smoke" | "load" | "stress";
  /** k6 CLI options */
  options: {
    vus?: number;
    duration?: string;
    iterations?: number;
  };
  /** Pass/fail thresholds */
  thresholds: PerfThreshold[];
}

/**
 * Smoke tier — runs in CI on every PR (< 30s total)
 */
export const SMOKE_SCENARIOS: PerfScenario[] = [
  {
    id: "auth-smoke",
    script: "tests/k6/smoke-login.js",
    tier: "smoke",
    options: { vus: 2, duration: "10s" },
    thresholds: [
      {
        metric: "http_req_duration",
        threshold: "p(95)<2000",
        description: "Auth flow p95 under 2s",
      },
      {
        metric: "http_req_failed",
        threshold: "rate<0.05",
        description: "Auth error rate under 5%",
      },
    ],
  },
  {
    id: "reads-smoke",
    script: "tests/k6/smoke-reads.js",
    tier: "smoke",
    options: { vus: 3, duration: "15s" },
    thresholds: [
      {
        metric: "http_req_duration",
        threshold: "p(95)<3000",
        description: "Clinical reads p95 under 3s",
      },
      {
        metric: "http_req_failed",
        threshold: "rate<0.05",
        description: "Read error rate under 5%",
      },
    ],
  },
  {
    id: "fhir-smoke",
    script: "tests/k6/smoke-fhir.js",
    tier: "smoke",
    options: { vus: 2, duration: "10s" },
    thresholds: [
      {
        metric: "http_req_duration",
        threshold: "p(95)<3000",
        description: "FHIR reads p95 under 3s",
      },
      {
        metric: "http_req_failed",
        threshold: "rate<0.10",
        description: "FHIR error rate under 10%",
      },
    ],
  },
];

/**
 * Load tier — runs nightly (2-5 min total)
 */
export const LOAD_SCENARIOS: PerfScenario[] = [
  {
    id: "mixed-load",
    script: "tests/k6/load-mixed.js",
    tier: "load",
    options: { vus: 10, duration: "2m" },
    thresholds: [
      {
        metric: "http_req_duration",
        threshold: "p(95)<5000",
        description: "Mixed workload p95 under 5s",
      },
      {
        metric: "http_req_failed",
        threshold: "rate<0.10",
        description: "Mixed error rate under 10%",
      },
    ],
  },
  {
    id: "db-load",
    script: "tests/k6/db-load.js",
    tier: "load",
    options: { vus: 5, duration: "1m" },
    thresholds: [
      {
        metric: "http_req_duration",
        threshold: "p(95)<3000",
        description: "DB operations p95 under 3s",
      },
    ],
  },
];

/**
 * All scenarios by tier
 */
export const ALL_SCENARIOS = [...SMOKE_SCENARIOS, ...LOAD_SCENARIOS];

/**
 * Get scenarios by tier
 */
export function getScenariosByTier(tier: string): PerfScenario[] {
  return ALL_SCENARIOS.filter((s) => s.tier === tier);
}
