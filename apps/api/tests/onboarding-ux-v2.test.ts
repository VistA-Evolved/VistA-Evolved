/**
 * Onboarding UX v2 Tests -- Phase 262 (Wave 8 P6)
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const API_SRC = path.resolve(__dirname, '../src');

describe('Onboarding UX v2 -- Phase 262', () => {
  describe('Integration Steps Store', () => {
    const storePath = path.join(API_SRC, 'config', 'onboarding-integration-steps.ts');

    it('store file exists', () => {
      expect(fs.existsSync(storePath)).toBe(true);
    });

    it('exports IntegrationKind type', () => {
      const c = fs.readFileSync(storePath, 'utf-8');
      expect(c).toContain('IntegrationKind');
    });

    it('exports all 5 integration kinds', () => {
      const c = fs.readFileSync(storePath, 'utf-8');
      for (const kind of ['hl7v2', 'fhir', 'payer', 'imaging', 'oidc']) {
        expect(c).toContain(`'${kind}'`);
      }
    });

    it('exports createIntegrationSession', () => {
      const c = fs.readFileSync(storePath, 'utf-8');
      expect(c).toContain('export function createIntegrationSession');
    });

    it('exports upsertEndpoint', () => {
      const c = fs.readFileSync(storePath, 'utf-8');
      expect(c).toContain('export function upsertEndpoint');
    });

    it('exports probeEndpoints', () => {
      const c = fs.readFileSync(storePath, 'utf-8');
      expect(c).toContain('export function probeEndpoints');
    });

    it('exports runPreflight', () => {
      const c = fs.readFileSync(storePath, 'utf-8');
      expect(c).toContain('export function runPreflight');
    });

    it('exports INTEGRATION_STEP_META', () => {
      const c = fs.readFileSync(storePath, 'utf-8');
      expect(c).toContain('INTEGRATION_STEP_META');
    });

    it('has 3 integration steps', () => {
      const c = fs.readFileSync(storePath, 'utf-8');
      expect(c).toContain("'integrations'");
      expect(c).toContain("'connectivity'");
      expect(c).toContain("'preflight'");
    });

    it('links to base onboarding session', () => {
      const c = fs.readFileSync(storePath, 'utf-8');
      expect(c).toContain('onboardingSessionId');
    });
  });

  describe('Integration Routes', () => {
    const routePath = path.join(API_SRC, 'routes', 'onboarding-integration-routes.ts');

    it('routes file exists', () => {
      expect(fs.existsSync(routePath)).toBe(true);
    });

    it('has integration kinds endpoint', () => {
      const c = fs.readFileSync(routePath, 'utf-8');
      expect(c).toContain('/admin/onboarding/integrations/kinds');
    });

    it('has create session endpoint', () => {
      const c = fs.readFileSync(routePath, 'utf-8');
      // POST /admin/onboarding/integrations
      expect(c).toContain("app.post('/admin/onboarding/integrations'");
    });

    it('has endpoint upsert route', () => {
      const c = fs.readFileSync(routePath, 'utf-8');
      expect(c).toContain('/admin/onboarding/integrations/:id/endpoints');
    });

    it('has probe route', () => {
      const c = fs.readFileSync(routePath, 'utf-8');
      expect(c).toContain('/admin/onboarding/integrations/:id/probe');
    });

    it('has preflight route', () => {
      const c = fs.readFileSync(routePath, 'utf-8');
      expect(c).toContain('/admin/onboarding/integrations/:id/preflight');
    });

    it('has advance route', () => {
      const c = fs.readFileSync(routePath, 'utf-8');
      expect(c).toContain('/admin/onboarding/integrations/:id/advance');
    });
  });

  describe('Base Onboarding Untouched', () => {
    it('onboarding-store.ts preserved', () => {
      expect(fs.existsSync(path.join(API_SRC, 'config', 'onboarding-store.ts'))).toBe(true);
    });

    it('onboarding-routes.ts preserved', () => {
      expect(fs.existsSync(path.join(API_SRC, 'routes', 'onboarding-routes.ts'))).toBe(true);
    });
  });
});
