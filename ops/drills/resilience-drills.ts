/**
 * Resilience Drill Configuration -- Phase 254
 *
 * Defines failure injection drills for resilience certification.
 * Each drill simulates a specific failure mode and validates recovery.
 */

export interface ResilienceDrill {
  /** Drill identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** What failure mode is tested */
  failureMode: string;
  /** Category of resilience */
  category: 'connectivity' | 'capacity' | 'dependency' | 'data' | 'security';
  /** Steps to execute the drill */
  steps: DrillStep[];
  /** Expected recovery behavior */
  expectedRecovery: string;
  /** Maximum acceptable recovery time */
  maxRecoveryMs: number;
  /** Automated or manual drill */
  automation: 'automated' | 'semi-automated' | 'manual';
}

export interface DrillStep {
  /** Step sequence number */
  seq: number;
  /** What to do */
  action: string;
  /** Command to run (if automated) */
  command?: string;
  /** What to verify after this step */
  verify: string;
}

/**
 * Drill: VistA Connection Loss
 * Simulates VistA Docker going down while API is running.
 */
export const VISTA_DOWN_DRILL: ResilienceDrill = {
  id: 'vista-down',
  name: 'VistA Connection Loss',
  failureMode: 'VistA Docker container stops while API is running',
  category: 'dependency',
  steps: [
    {
      seq: 1,
      action: 'Verify API is healthy with VistA running',
      command: 'curl -s http://localhost:3001/health',
      verify: "Returns {status: 'ok'}",
    },
    {
      seq: 2,
      action: 'Verify VistA ping succeeds',
      command: 'curl -s http://localhost:3001/vista/ping',
      verify: 'Returns {ok: true}',
    },
    {
      seq: 3,
      action: 'Stop VistA container',
      command: 'docker compose -f services/vista/docker-compose.yml stop',
      verify: 'Container stops',
    },
    {
      seq: 4,
      action: 'Check API health (should still be alive)',
      command: 'curl -s http://localhost:3001/health',
      verify: "Returns {status: 'ok'} -- liveness not gated on VistA",
    },
    {
      seq: 5,
      action: 'Check API readiness (should reflect VistA down)',
      command: 'curl -s http://localhost:3001/ready',
      verify: 'Returns ok:false or circuit breaker open',
    },
    {
      seq: 6,
      action: 'Check clinical endpoint returns graceful error',
      command: 'curl -s http://localhost:3001/vista/ping',
      verify: 'Returns {ok: false} with error, not 500 crash',
    },
    {
      seq: 7,
      action: 'Restart VistA container',
      command: 'docker compose -f services/vista/docker-compose.yml start',
      verify: 'Container starts',
    },
    {
      seq: 8,
      action: 'Wait for VistA to be ready (15-30s)',
      command: 'Start-Sleep -Seconds 30',
      verify: 'Wait completes',
    },
    {
      seq: 9,
      action: 'Verify recovery -- VistA ping succeeds again',
      command: 'curl -s http://localhost:3001/vista/ping',
      verify: 'Returns {ok: true}',
    },
  ],
  expectedRecovery:
    'API remains alive, readiness degrades, clinical calls return graceful errors, full recovery after VistA restart',
  maxRecoveryMs: 60_000,
  automation: 'semi-automated',
};

/**
 * Drill: Circuit Breaker Activation
 * Triggers the circuit breaker by overwhelming VistA with rapid calls.
 */
export const CIRCUIT_BREAKER_DRILL: ResilienceDrill = {
  id: 'circuit-breaker',
  name: 'Circuit Breaker Activation',
  failureMode: 'Rapid RPC failures trigger circuit breaker open state',
  category: 'dependency',
  steps: [
    {
      seq: 1,
      action: 'Verify circuit breaker starts closed',
      command: 'curl -s http://localhost:3001/ready',
      verify: 'ready.ok is true',
    },
    {
      seq: 2,
      action: 'Stop VistA to cause connection failures',
      command: 'docker compose -f services/vista/docker-compose.yml stop',
      verify: 'VistA container stops',
    },
    {
      seq: 3,
      action: 'Make 5+ rapid authenticated requests to trigger breaker',
      verify: 'Circuit breaker transitions to open after threshold failures',
    },
    {
      seq: 4,
      action: 'Check readiness reflects circuit breaker state',
      command: 'curl -s http://localhost:3001/ready',
      verify: 'ok: false when circuit breaker is open',
    },
    {
      seq: 5,
      action: 'Restart VistA',
      command: 'docker compose -f services/vista/docker-compose.yml start',
      verify: 'Container starts',
    },
    {
      seq: 6,
      action: 'Wait for half-open transition (30s default)',
      command: 'Start-Sleep -Seconds 35',
      verify: 'Wait completes',
    },
    {
      seq: 7,
      action: 'Verify circuit breaker recovers to closed',
      command: 'curl -s http://localhost:3001/ready',
      verify: 'ok: true after recovery',
    },
  ],
  expectedRecovery:
    'Circuit breaker opens after 5 failures, transitions to half-open after 30s, closes after successful probes',
  maxRecoveryMs: 90_000,
  automation: 'semi-automated',
};

/**
 * Drill: Graceful Shutdown
 * Sends SIGTERM and validates clean drain.
 */
export const GRACEFUL_SHUTDOWN_DRILL: ResilienceDrill = {
  id: 'graceful-shutdown',
  name: 'Graceful Shutdown Drain',
  failureMode: 'SIGTERM during active requests',
  category: 'capacity',
  steps: [
    {
      seq: 1,
      action: 'Verify API is healthy',
      command: 'curl -s http://localhost:3001/health',
      verify: 'Returns ok',
    },
    {
      seq: 2,
      action: 'Send SIGTERM to API process',
      verify: 'Process begins drain (30s timeout per Phase 36)',
    },
    {
      seq: 3,
      action: 'Verify process exits cleanly',
      verify: 'Exit code 0, RPC broker disconnected, no crash',
    },
  ],
  expectedRecovery: 'API drains in-flight requests within 30s, disconnects RPC broker, exits 0',
  maxRecoveryMs: 35_000,
  automation: 'manual',
};

/**
 * Drill: Session Store Exhaustion
 * Tests behavior when session store reaches capacity.
 */
export const SESSION_EXHAUSTION_DRILL: ResilienceDrill = {
  id: 'session-exhaustion',
  name: 'Session Store Pressure',
  failureMode: 'Many concurrent sessions',
  category: 'capacity',
  steps: [
    {
      seq: 1,
      action: 'Login multiple sessions rapidly',
      verify: 'Sessions created successfully',
    },
    {
      seq: 2,
      action: 'Verify session management under pressure',
      verify: 'No crash, oldest sessions may expire per TTL',
    },
    {
      seq: 3,
      action: 'Verify health endpoint still responds',
      command: 'curl -s http://localhost:3001/health',
      verify: 'Returns ok',
    },
  ],
  expectedRecovery: 'Server remains responsive, session TTL eviction handles pressure',
  maxRecoveryMs: 10_000,
  automation: 'manual',
};

/**
 * Drill: Rate Limiter Enforcement
 * Validates rate limiter blocks excessive requests.
 */
export const RATE_LIMIT_DRILL: ResilienceDrill = {
  id: 'rate-limit',
  name: 'Rate Limiter Enforcement',
  failureMode: 'Burst traffic exceeds rate limit',
  category: 'security',
  steps: [
    {
      seq: 1,
      action: 'Send requests at normal rate',
      verify: 'All return 200',
    },
    {
      seq: 2,
      action: 'Send burst of 100+ requests in 1 second',
      verify: 'Rate limiter returns 429 after threshold',
    },
    {
      seq: 3,
      action: 'Wait for rate limit window to reset',
      verify: 'Subsequent normal requests return 200',
    },
  ],
  expectedRecovery: 'Rate limiter enforces window, recovers after cooldown',
  maxRecoveryMs: 60_000,
  automation: 'semi-automated',
};

/**
 * All drills for Phase 254 resilience certification
 */
export const ALL_DRILLS: ResilienceDrill[] = [
  VISTA_DOWN_DRILL,
  CIRCUIT_BREAKER_DRILL,
  GRACEFUL_SHUTDOWN_DRILL,
  SESSION_EXHAUSTION_DRILL,
  RATE_LIMIT_DRILL,
];

/**
 * Get drills by category
 */
export function getDrillsByCategory(category: ResilienceDrill['category']): ResilienceDrill[] {
  return ALL_DRILLS.filter((d) => d.category === category);
}
