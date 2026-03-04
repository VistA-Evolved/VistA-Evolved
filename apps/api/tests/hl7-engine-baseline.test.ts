/**
 * HL7v2 Engine Baseline Certification — Phase 258
 *
 * Validates the HL7v2 engine infrastructure: MLLP server/client,
 * parser, ACK generator, message packs, routing layer, tenant
 * endpoint config, and Docker support.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '../../..');

function fileExists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

function fileContains(rel: string, pattern: string | RegExp): boolean {
  if (!fileExists(rel)) return false;
  const content = fs.readFileSync(path.join(ROOT, rel), 'utf-8');
  return typeof pattern === 'string' ? content.includes(pattern) : pattern.test(content);
}

/* ── MLLP Engine Core ───────────────────────────────────────────── */

describe('MLLP Engine Core', () => {
  it('has MLLP server', () => {
    expect(fileExists('apps/api/src/hl7/mllp-server.ts')).toBe(true);
  });

  it('has MLLP client', () => {
    expect(fileExists('apps/api/src/hl7/mllp-client.ts')).toBe(true);
  });

  it('has HL7v2 parser', () => {
    expect(fileExists('apps/api/src/hl7/parser.ts')).toBe(true);
  });

  it('has ACK generator', () => {
    expect(fileExists('apps/api/src/hl7/ack-generator.ts')).toBe(true);
  });

  it('has type definitions', () => {
    expect(fileExists('apps/api/src/hl7/types.ts')).toBe(true);
  });

  it('has engine lifecycle (init/stop)', () => {
    expect(fileContains('apps/api/src/hl7/index.ts', 'initHl7Engine')).toBe(true);
    expect(fileContains('apps/api/src/hl7/index.ts', 'stopHl7Engine')).toBe(true);
  });

  it('engine is opt-in via HL7_ENGINE_ENABLED', () => {
    expect(fileContains('apps/api/src/hl7/index.ts', 'HL7_ENGINE_ENABLED')).toBe(true);
  });
});

/* ── Message Packs ──────────────────────────────────────────────── */

describe('HL7v2 Message Packs', () => {
  const packs = ['adt-pack.ts', 'orm-pack.ts', 'oru-pack.ts', 'siu-pack.ts'];

  for (const pack of packs) {
    it(`has ${pack}`, () => {
      expect(fileExists(`apps/api/src/hl7/packs/${pack}`)).toBe(true);
    });
  }

  it('has pack barrel export', () => {
    expect(fileExists('apps/api/src/hl7/packs/index.ts')).toBe(true);
  });
});

/* ── Routing Layer ──────────────────────────────────────────────── */

describe('HL7v2 Routing Layer', () => {
  const routingFiles = ['dispatcher.ts', 'matcher.ts', 'registry.ts', 'transform.ts', 'types.ts'];

  for (const f of routingFiles) {
    it(`has routing/${f}`, () => {
      expect(fileExists(`apps/api/src/hl7/routing/${f}`)).toBe(true);
    });
  }

  it('routing types define RouteFilter', () => {
    expect(fileContains('apps/api/src/hl7/routing/types.ts', 'RouteFilter')).toBe(true);
  });
});

/* ── Tenant Endpoint Configuration (Phase 258) ──────────────────── */

describe('Tenant Endpoint Configuration', () => {
  it('has tenant-endpoints module', () => {
    expect(fileExists('apps/api/src/hl7/tenant-endpoints.ts')).toBe(true);
  });

  it('exports createEndpoint', () => {
    expect(fileContains('apps/api/src/hl7/tenant-endpoints.ts', 'createEndpoint')).toBe(true);
  });

  it('exports resolveInboundEndpoint', () => {
    expect(fileContains('apps/api/src/hl7/tenant-endpoints.ts', 'resolveInboundEndpoint')).toBe(
      true
    );
  });

  it('has tenant endpoint routes', () => {
    expect(fileExists('apps/api/src/routes/hl7-tenant-endpoints.ts')).toBe(true);
  });

  it('routes match platform convention', () => {
    expect(
      fileContains(
        'apps/api/src/routes/hl7-tenant-endpoints.ts',
        '/api/platform/integrations/hl7v2/endpoints'
      )
    ).toBe(true);
  });
});

/* ── API Routes ─────────────────────────────────────────────────── */

describe('HL7 API Routes', () => {
  it('has engine health route', () => {
    expect(fileExists('apps/api/src/routes/hl7-engine.ts')).toBe(true);
  });

  it('has routing management routes', () => {
    expect(fileExists('apps/api/src/routes/hl7-routing.ts')).toBe(true);
  });

  it('has pack management routes', () => {
    expect(fileExists('apps/api/src/routes/hl7-packs.ts')).toBe(true);
  });
});

/* ── Docker Support ─────────────────────────────────────────────── */

describe('Docker Support', () => {
  it('has HL7 docker-compose', () => {
    expect(fileExists('services/hl7/docker-compose.yml')).toBe(true);
  });

  it('has test message sender script', () => {
    expect(fileExists('services/hl7/send-test-message.sh')).toBe(true);
  });
});

/* ── PHI Safety ─────────────────────────────────────────────────── */

describe('PHI Safety', () => {
  it('no raw HL7 in application log calls', () => {
    if (!fileExists('apps/api/src/hl7/mllp-server.ts')) return;
    const content = fs.readFileSync(path.join(ROOT, 'apps/api/src/hl7/mllp-server.ts'), 'utf-8');
    // Should not log raw message content directly
    const logLines = content.split('\n').filter((l) => l.includes('log.'));
    for (const line of logLines) {
      expect(line).not.toMatch(/log\.\w+\(.*rawMessage/);
    }
  });

  it('tenant endpoints default PHI logging to false', () => {
    expect(fileContains('apps/api/src/hl7/tenant-endpoints.ts', 'phiLoggingEnabled: false')).toBe(
      true
    );
  });
});

/* ── ADR Reference ──────────────────────────────────────────────── */

describe('ADR Reference', () => {
  it('HL7 engine ADR exists', () => {
    expect(fileExists('docs/decisions/ADR-hl7-engine-choice.md')).toBe(true);
  });

  it('OSS integration ADR references HL7', () => {
    expect(fileContains('docs/decisions/ADR-OSS-Integrations.md', 'HL7v2')).toBe(true);
  });
});
