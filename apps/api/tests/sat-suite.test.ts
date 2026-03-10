/**
 * SAT Suite + Pilot Hardening Tests -- Phase 265 (Wave 8 P9)
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const API_SRC = path.resolve(__dirname, '../src');

describe('Pilot Hospital Hardening Pack -- Phase 265', () => {
  describe('SAT Suite Engine', () => {
    const satPath = path.join(API_SRC, 'pilot', 'sat-suite.ts');

    it('sat-suite.ts exists', () => {
      expect(fs.existsSync(satPath)).toBe(true);
    });

    it('exports SatScenario type', () => {
      const c = fs.readFileSync(satPath, 'utf-8');
      expect(c).toContain('SatScenario');
    });

    it('exports SatRun type', () => {
      const c = fs.readFileSync(satPath, 'utf-8');
      expect(c).toContain('SatRun');
    });

    it('has 30 default scenarios', () => {
      const c = fs.readFileSync(satPath, 'utf-8');
      expect(c).toContain('DEFAULT_SAT_SCENARIOS');
      // Count scenario objects (id: "xxx-nn" pattern)
      const matches = c.match(/id:\s*'[a-z]+-\d+'/g);
      expect(matches).not.toBeNull();
      expect(matches!.length).toBeGreaterThanOrEqual(30);
    });

    it('covers 10 SAT categories', () => {
      const c = fs.readFileSync(satPath, 'utf-8');
      for (const cat of [
        'connectivity',
        'authentication',
        'clinical-data',
        'orders',
        'imaging',
        'integrations',
        'performance',
        'security',
        'backup',
        'degraded-mode',
      ]) {
        expect(c).toContain(`'${cat}'`);
      }
    });

    it('exports startSatRun function', () => {
      const c = fs.readFileSync(satPath, 'utf-8');
      expect(c).toContain('export function startSatRun');
    });

    it('exports exportSatEvidence function', () => {
      const c = fs.readFileSync(satPath, 'utf-8');
      expect(c).toContain('export function exportSatEvidence');
    });

    it('exports DegradedModeStatus type', () => {
      const c = fs.readFileSync(satPath, 'utf-8');
      expect(c).toContain('DegradedModeStatus');
    });

    it('exports reportDegradation function', () => {
      const c = fs.readFileSync(satPath, 'utf-8');
      expect(c).toContain('export function reportDegradation');
    });

    it('has SHA-256 evidence hashing', () => {
      const c = fs.readFileSync(satPath, 'utf-8');
      expect(c).toContain('sha256');
      expect(c).toContain('evidenceHash');
    });

    it('has 8 degradation sources', () => {
      const c = fs.readFileSync(satPath, 'utf-8');
      for (const src of [
        'vista-rpc',
        'database',
        'oidc',
        'imaging',
        'hl7-engine',
        'payer-connector',
        'audit-shipping',
        'analytics',
      ]) {
        expect(c).toContain(`'${src}'`);
      }
    });

    it('has 8 default mitigations', () => {
      const c = fs.readFileSync(satPath, 'utf-8');
      const mitigations = c.match(/registerMitigation\(/g);
      expect(mitigations).not.toBeNull();
      expect(mitigations!.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('SAT Routes', () => {
    const routePath = path.join(API_SRC, 'routes', 'sat-routes.ts');

    it('sat-routes.ts exists', () => {
      expect(fs.existsSync(routePath)).toBe(true);
    });

    it('has SAT scenarios endpoint', () => {
      const c = fs.readFileSync(routePath, 'utf-8');
      expect(c).toContain('/admin/pilot/sat/scenarios');
    });

    it('has SAT runs CRUD', () => {
      const c = fs.readFileSync(routePath, 'utf-8');
      expect(c).toContain('/admin/pilot/sat/runs');
    });

    it('has evidence export endpoint', () => {
      const c = fs.readFileSync(routePath, 'utf-8');
      expect(c).toContain('/evidence');
    });

    it('has degraded-mode monitoring', () => {
      const c = fs.readFileSync(routePath, 'utf-8');
      expect(c).toContain('/admin/pilot/degraded-mode');
    });

    it('has hardening summary', () => {
      const c = fs.readFileSync(routePath, 'utf-8');
      expect(c).toContain('/admin/pilot/hardening-summary');
    });
  });

  describe('Existing Pilot Infrastructure Preserved', () => {
    it('site-config.ts preserved', () => {
      expect(fs.existsSync(path.join(API_SRC, 'pilot', 'site-config.ts'))).toBe(true);
    });

    it('preflight.ts preserved', () => {
      expect(fs.existsSync(path.join(API_SRC, 'pilot', 'preflight.ts'))).toBe(true);
    });

    it('pilot-routes.ts preserved', () => {
      expect(fs.existsSync(path.join(API_SRC, 'routes', 'pilot-routes.ts'))).toBe(true);
    });
  });
});
