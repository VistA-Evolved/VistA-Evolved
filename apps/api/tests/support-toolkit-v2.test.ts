/**
 * Support Tooling v2 Tests -- Phase 263 (Wave 8 P7)
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const API_SRC = path.resolve(__dirname, '../src');

describe('Support Tooling v2 -- Phase 263', () => {
  describe('Support Toolkit v2 Store', () => {
    const storePath = path.join(API_SRC, 'support', 'support-toolkit-v2.ts');

    it('store file exists', () => {
      expect(fs.existsSync(storePath)).toBe(true);
    });

    it('exports DiagnosticBundle type', () => {
      const c = fs.readFileSync(storePath, 'utf-8');
      expect(c).toContain('DiagnosticBundle');
    });

    it('exports generateDiagnosticBundle', () => {
      const c = fs.readFileSync(storePath, 'utf-8');
      expect(c).toContain('export function generateDiagnosticBundle');
    });

    it('exports addCorrelation', () => {
      const c = fs.readFileSync(storePath, 'utf-8');
      expect(c).toContain('export function addCorrelation');
    });

    it('exports buildHl7ViewerEntry', () => {
      const c = fs.readFileSync(storePath, 'utf-8');
      expect(c).toContain('export function buildHl7ViewerEntry');
    });

    it('exports buildHl7DlqViewerEntry', () => {
      const c = fs.readFileSync(storePath, 'utf-8');
      expect(c).toContain('export function buildHl7DlqViewerEntry');
    });

    it('exports buildPostureSummary', () => {
      const c = fs.readFileSync(storePath, 'utf-8');
      expect(c).toContain('export function buildPostureSummary');
    });

    it('collects 6 diagnostic sections', () => {
      const c = fs.readFileSync(storePath, 'utf-8');
      for (const s of [
        'runtime',
        'environment',
        'vista-connectivity',
        'hl7-engine',
        'stores',
        'tenant',
      ]) {
        expect(c).toContain(`"${s}"`);
      }
    });

    it('supports 4 correlation types', () => {
      const c = fs.readFileSync(storePath, 'utf-8');
      for (const t of ['hl7_event', 'hl7_dlq', 'posture_gate', 'audit_entry']) {
        expect(c).toContain(`"${t}"`);
      }
    });

    it('no PHI in bundle sections', () => {
      const c = fs.readFileSync(storePath, 'utf-8');
      expect(c).not.toContain('patientName');
      expect(c).not.toContain('.ssn');
    });
  });

  describe('Support Toolkit v2 Routes', () => {
    const routePath = path.join(API_SRC, 'routes', 'support-toolkit-v2-routes.ts');

    it('routes file exists', () => {
      expect(fs.existsSync(routePath)).toBe(true);
    });

    it('has bundle generation endpoint', () => {
      const c = fs.readFileSync(routePath, 'utf-8');
      expect(c).toContain('/admin/support/bundles');
    });

    it('has bundle download endpoint', () => {
      const c = fs.readFileSync(routePath, 'utf-8');
      expect(c).toContain('/admin/support/bundles/:id/download');
    });

    it('has correlation add endpoint', () => {
      const c = fs.readFileSync(routePath, 'utf-8');
      expect(c).toContain('/admin/support/tickets/:id/correlations');
    });

    it('has posture summary endpoint', () => {
      const c = fs.readFileSync(routePath, 'utf-8');
      expect(c).toContain('/admin/support/posture-summary');
    });

    it('has HL7 viewer endpoint', () => {
      const c = fs.readFileSync(routePath, 'utf-8');
      expect(c).toContain('/admin/support/hl7-viewer');
    });
  });

  describe('Base Support Module Untouched', () => {
    it('diagnostics.ts preserved', () => {
      expect(fs.existsSync(path.join(API_SRC, 'support', 'diagnostics.ts'))).toBe(true);
    });

    it('ticket-store.ts preserved', () => {
      expect(fs.existsSync(path.join(API_SRC, 'support', 'ticket-store.ts'))).toBe(true);
    });

    it('support-routes.ts preserved', () => {
      expect(fs.existsSync(path.join(API_SRC, 'routes', 'support-routes.ts'))).toBe(true);
    });
  });
});
