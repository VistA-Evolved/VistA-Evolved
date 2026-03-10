/**
 * Go-Live Certification Tests -- Phase 256
 *
 * Validates all go-live prerequisites exist: runbooks, verifiers,
 * drill scripts, pilot infrastructure, CI workflows, and documentation.
 * This is a structural certification -- not a runtime test.
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

/* -- Go-Live Kit Artifacts ---------------------------------------- */

describe('Go-Live Kit Artifacts', () => {
  it('has go-live runbook', () => {
    expect(fileExists('docs/pilot-go-live-kit.md')).toBe(true);
  });

  it('has go-live gate script', () => {
    expect(fileExists('ops/drills/run-go-live-gate.ps1')).toBe(true);
  });

  it('has go-live certification test', () => {
    expect(fileExists('apps/api/tests/go-live-certification.test.ts')).toBe(true);
  });
});

/* -- Runbook Content ---------------------------------------------- */

describe('Go-Live Runbook Content', () => {
  const runbookPath = 'docs/pilot-go-live-kit.md';

  it('contains Day-1 Checklist', () => {
    expect(fileContains(runbookPath, 'Day-1 Checklist')).toBe(true);
  });

  it('contains Rollback Plan', () => {
    expect(fileContains(runbookPath, 'Rollback Plan')).toBe(true);
  });

  it('contains Sign-Off section', () => {
    expect(fileContains(runbookPath, 'Sign-Off')).toBe(true);
  });

  it('contains Verification Gates Summary', () => {
    expect(fileContains(runbookPath, 'Verification Gates Summary')).toBe(true);
  });

  it('references runtime mode', () => {
    expect(fileContains(runbookPath, 'PLATFORM_RUNTIME_MODE')).toBe(true);
  });

  it('references Wave 7 entry gate', () => {
    expect(fileContains(runbookPath, 'wave7-entry-gate')).toBe(true);
  });

  it('covers all 9 Wave 7 phases', () => {
    for (const phase of [248, 249, 250, 251, 252, 253, 254, 255, 256]) {
      expect(fileContains(runbookPath, String(phase))).toBe(true);
    }
  });
});

/* -- Pilot Infrastructure ----------------------------------------- */

describe('Pilot Infrastructure (Phase 246)', () => {
  it('has site-config module', () => {
    expect(fileExists('apps/api/src/pilot/site-config.ts')).toBe(true);
  });

  it('has preflight engine', () => {
    expect(fileExists('apps/api/src/pilot/preflight.ts')).toBe(true);
  });

  it('has pilot admin page', () => {
    expect(fileExists('apps/web/src/app/cprs/admin/pilot/page.tsx')).toBe(true);
  });

  it('site-config exports SiteStatus with 7 states', () => {
    expect(
      fileContains(
        'apps/api/src/pilot/site-config.ts',
        /draft.*configuring.*preflight.*ready.*go-live.*active.*suspended/s
      )
    ).toBe(true);
  });

  it('preflight exports readiness scoring', () => {
    expect(fileContains('apps/api/src/pilot/preflight.ts', 'readiness')).toBe(true);
  });
});

/* -- Wave 7 Verifiers -------------------------------------------- */

describe('Wave 7 Verifiers', () => {
  const verifiers = [
    { phase: 248, file: 'scripts/wave7-entry-gate.ps1' },
    { phase: 249, file: 'scripts/verify-phase249-supply-chain.ps1' },
    { phase: 250, file: 'scripts/verify-phase250-rpc-contracts.ps1' },
    { phase: 251, file: 'scripts/verify-phase251-api-fhir-contracts.ps1' },
    { phase: 252, file: 'scripts/verify-phase252-e2e-journeys.ps1' },
    { phase: 253, file: 'scripts/verify-phase253-perf-gates.ps1' },
    { phase: 254, file: 'scripts/verify-phase254-resilience.ps1' },
    { phase: 255, file: 'scripts/verify-phase255-dr-certification.ps1' },
    { phase: 256, file: 'scripts/verify-phase256-go-live-kit.ps1' },
  ];

  for (const v of verifiers) {
    it(`has verifier for Phase ${v.phase}`, () => {
      expect(fileExists(v.file)).toBe(true);
    });
  }
});

/* -- Resilience Drills -------------------------------------------- */

describe('Resilience Drills', () => {
  const drills = [
    'ops/drills/resilience-drills.ts',
    'ops/drills/run-vista-down-drill.ps1',
    'ops/drills/run-circuit-breaker-drill.ps1',
    'ops/drills/run-health-readiness-drill.ps1',
    'ops/drills/run-posture-audit-drill.ps1',
  ];

  for (const d of drills) {
    it(`has ${path.basename(d)}`, () => {
      expect(fileExists(d)).toBe(true);
    });
  }
});

/* -- DR Certification --------------------------------------------- */

describe('DR Certification', () => {
  it('has DR drill script', () => {
    expect(fileExists('ops/drills/run-dr-certification-drill.ps1')).toBe(true);
  });

  it('has DR checklist', () => {
    expect(fileExists('ops/drills/dr-certification-checklist.md')).toBe(true);
  });

  it('has DR certification test', () => {
    expect(fileExists('apps/api/tests/dr-certification.test.ts')).toBe(true);
  });

  it('has resilience certification test', () => {
    expect(fileExists('apps/api/tests/resilience-certification.test.ts')).toBe(true);
  });
});

/* -- CI Workflows ------------------------------------------------- */

describe('CI Workflows', () => {
  const workflows = [
    '.github/workflows/supply-chain-security.yml',
    '.github/workflows/resilience-certification.yml',
  ];

  for (const w of workflows) {
    it(`has ${path.basename(w)}`, () => {
      expect(fileExists(w)).toBe(true);
    });
  }
});

/* -- Go-Live Gate Script Content ---------------------------------- */

describe('Go-Live Gate Script', () => {
  const gatePath = 'ops/drills/run-go-live-gate.ps1';

  it('checks all 8 Wave 7 verifiers', () => {
    const content = fs.readFileSync(path.join(ROOT, gatePath), 'utf-8');
    expect(content).toContain('wave7-entry-gate');
    expect(content).toContain('verify-phase249');
    expect(content).toContain('verify-phase250');
    expect(content).toContain('verify-phase251');
    expect(content).toContain('verify-phase252');
    expect(content).toContain('verify-phase253');
    expect(content).toContain('verify-phase254');
    expect(content).toContain('verify-phase255');
  });

  it('produces a GO/NO-GO verdict', () => {
    expect(fileContains(gatePath, 'VERDICT')).toBe(true);
    expect(fileContains(gatePath, 'GO')).toBe(true);
    expect(fileContains(gatePath, 'NO-GO')).toBe(true);
  });

  it('writes results to artifacts directory', () => {
    expect(fileContains(gatePath, 'artifacts')).toBe(true);
  });
});

/* -- Documentation Completeness ----------------------------------- */

describe('Documentation Completeness', () => {
  it('has Wave 7 manifest', () => {
    expect(fileExists('docs/waves/WAVE7-MANIFEST.md')).toBe(true);
  });

  it('has build-vs-buy ledger', () => {
    expect(fileExists('docs/build-vs-buy.md')).toBe(true);
  });

  it('has prompt folder for Phase 256', () => {
    expect(fileExists('prompts/253-PHASE-256-PILOT-GO-LIVE-KIT/256-01-IMPLEMENT.md')).toBe(true);
  });
});
