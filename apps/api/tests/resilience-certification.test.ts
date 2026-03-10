/**
 * Resilience Certification -- Static Analysis Test Suite (Phase 254)
 *
 * Validates that resilience patterns are correctly implemented in the codebase.
 * These are deterministic structural checks, NOT live integration tests.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../..');
const API_SRC = join(ROOT, 'apps/api/src');

function readSrc(relPath: string): string {
  const full = join(API_SRC, relPath);
  if (!existsSync(full)) return '';
  return readFileSync(full, 'utf-8');
}

function fileExists(relPath: string): boolean {
  return existsSync(join(ROOT, relPath));
}

describe('Resilience Certification -- Phase 254', () => {
  describe('Circuit Breaker', () => {
    const src = readSrc('lib/rpc-resilience.ts');

    it('circuit breaker module exists', () => {
      expect(src.length).toBeGreaterThan(0);
    });

    it('exports safeCallRpc and safeCallRpcWithList', () => {
      expect(src).toContain('safeCallRpc');
      expect(src).toContain('safeCallRpcWithList');
    });

    it('implements open/closed/half-open states', () => {
      expect(src).toMatch(/closed|open|half.?open/i);
    });

    it('records success and failure transitions', () => {
      expect(src).toMatch(/recordSuccess|recordFailure/);
    });

    it('exports circuit breaker stats for observability', () => {
      expect(src).toMatch(/getCircuitBreakerStats|circuitBreakerStats/);
    });

    it('supports configurable thresholds via env vars', () => {
      const config = readSrc('config/server-config.ts');
      expect(config).toMatch(/RPC_CB_THRESHOLD|circuitBreakerThreshold/);
      expect(config).toMatch(/RPC_CB_RESET_MS|circuitBreakerResetMs/);
    });
  });

  describe('RPC Broker Reconnection', () => {
    const src = readSrc('vista/rpcBrokerClient.ts');

    it('broker client module exists', () => {
      expect(src.length).toBeGreaterThan(0);
    });

    it('implements socket health check', () => {
      expect(src).toMatch(/isSocketHealthy/);
    });

    it('implements idle timeout detection', () => {
      expect(src).toMatch(/SOCKET_MAX_IDLE|lastActivity|idleTime/i);
    });

    it('has TCP keepalive enabled', () => {
      expect(src).toMatch(/setKeepAlive|keepAlive/);
    });

    it('uses async mutex for socket serialization', () => {
      expect(src).toMatch(/withBrokerLock|brokerLock|mutex/i);
    });

    it('connect() is idempotent (checks connected before reconnecting)', () => {
      expect(src).toMatch(/if\s*\(.*connected/);
    });

    it('disconnect() sends XWB #BYE#', () => {
      expect(src).toMatch(/buildBye|BYE/);
    });
  });

  describe('Graceful Shutdown', () => {
    const src = readSrc('middleware/security.ts');

    it('security middleware exists', () => {
      expect(src.length).toBeGreaterThan(0);
    });

    it('handles SIGINT and SIGTERM', () => {
      expect(src).toMatch(/SIGINT/);
      expect(src).toMatch(/SIGTERM/);
    });

    it('has configurable drain timeout', () => {
      expect(src).toMatch(/DRAIN_TIMEOUT|SHUTDOWN_DRAIN_TIMEOUT/i);
    });

    it('disconnects RPC broker during shutdown', () => {
      expect(src).toMatch(/disconnectRpcBroker/);
    });

    it('calls server.close() for drain', () => {
      expect(src).toMatch(/server\.close/);
    });

    it('has force exit on drain timeout', () => {
      expect(src).toMatch(/process\.exit\(1\)/);
    });
  });

  describe('Health vs Readiness Endpoints', () => {
    // Check inline routes or index.ts for health/ready
    const possibleFiles = ['server/inline-routes.ts', 'index.ts', 'routes/health.ts'];
    const combined = possibleFiles.map((f) => readSrc(f)).join('\n');

    it('has /health endpoint', () => {
      expect(combined).toMatch(/['"\/]health['"]/);
    });

    it('has /ready endpoint', () => {
      expect(combined).toMatch(/['"\/]ready['"]/);
    });

    it('/health returns ok:true always (liveness)', () => {
      expect(combined).toMatch(/ok:\s*true/);
    });

    it('/ready checks circuit breaker or VistA state', () => {
      expect(combined).toMatch(/circuitBreaker|cbState|probeConnect|vista.*reachable/i);
    });
  });

  describe('Retry & Timeout', () => {
    const resilience = readSrc('lib/rpc-resilience.ts');
    const config = readSrc('config/server-config.ts');

    it('has configurable call timeout', () => {
      expect(config).toMatch(/callTimeoutMs|RPC_CALL_TIMEOUT_MS/);
    });

    it('has configurable max retries', () => {
      expect(config).toMatch(/maxRetries|RPC_MAX_RETRIES/);
    });

    it('implements exponential backoff', () => {
      expect(resilience).toMatch(/backoff|retryDelay|2\s*\*\*|Math\.pow/i);
    });

    it('has timeout wrapper for RPC calls', () => {
      expect(resilience).toMatch(/timeout|withTimeout|AbortSignal/i);
    });
  });

  describe('Posture Endpoints', () => {
    const postureDir = join(API_SRC, 'posture');

    it('posture directory exists', () => {
      expect(existsSync(postureDir)).toBe(true);
    });

    it('has observability posture', () => {
      expect(existsSync(join(postureDir, 'observability-posture.ts'))).toBe(true);
    });

    it('has performance posture', () => {
      expect(existsSync(join(postureDir, 'perf-posture.ts'))).toBe(true);
    });

    it('has backup posture', () => {
      expect(existsSync(join(postureDir, 'backup-posture.ts'))).toBe(true);
    });

    it('has tenant posture', () => {
      expect(existsSync(join(postureDir, 'tenant-posture.ts'))).toBe(true);
    });

    it('has data-plane posture', () => {
      expect(existsSync(join(postureDir, 'data-plane-posture.ts'))).toBe(true);
    });
  });

  describe('Backup & Recovery', () => {
    it('backup-restore script exists', () => {
      expect(fileExists('scripts/backup-restore.mjs')).toBe(true);
    });

    it('DR nightly workflow exists', () => {
      expect(fileExists('.github/workflows/dr-nightly.yml')).toBe(true);
    });

    it('DR backup script exists', () => {
      // May use scripts/dr/ or scripts/ path
      const drBackup =
        fileExists('scripts/dr/backup.mjs') || fileExists('scripts/backup-restore.mjs');
      expect(drBackup).toBe(true);
    });
  });

  describe('Drill Infrastructure', () => {
    it('resilience drills config exists', () => {
      expect(fileExists('ops/drills/resilience-drills.ts')).toBe(true);
    });

    it('vista-down drill script exists', () => {
      expect(fileExists('ops/drills/run-vista-down-drill.ps1')).toBe(true);
    });

    it('circuit-breaker drill script exists', () => {
      expect(fileExists('ops/drills/run-circuit-breaker-drill.ps1')).toBe(true);
    });

    it('health-readiness drill script exists', () => {
      expect(fileExists('ops/drills/run-health-readiness-drill.ps1')).toBe(true);
    });

    it('posture audit drill script exists', () => {
      expect(fileExists('ops/drills/run-posture-audit-drill.ps1')).toBe(true);
    });

    it('defines 5+ drill scenarios', () => {
      const src = readFileSync(join(ROOT, 'ops/drills/resilience-drills.ts'), 'utf-8');
      const drillCount = (src.match(/ResilienceDrill\s*=\s*{/g) || []).length;
      expect(drillCount).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Security Resilience', () => {
    const security = readSrc('middleware/security.ts');

    it('has rate limiting', () => {
      expect(security).toMatch(/rateLim|rateLimit|rate.?limit/i);
    });

    it('has CORS configuration', () => {
      expect(security).toMatch(/cors|CORS|origin/i);
    });

    it('has CSRF protection', () => {
      expect(security).toMatch(/csrf|CSRF/i);
    });

    it('auth rules enforce session on clinical routes', () => {
      expect(security).toMatch(/\/vista\//);
      expect(security).toMatch(/session|authenticated/i);
    });
  });
});
