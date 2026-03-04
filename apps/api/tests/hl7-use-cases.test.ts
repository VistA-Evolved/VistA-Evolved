/**
 * HL7v2 Use-Cases v1 Tests -- Phase 260 (Wave 8 P4)
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const API_SRC = path.resolve(__dirname, '../src');
const HL7_DIR = path.join(API_SRC, 'hl7');
const FIXTURES_DIR = path.resolve(__dirname, '../../../services/hl7/fixtures');

describe('HL7v2 Use-Cases v1 -- Phase 260', () => {
  describe('Test Fixtures', () => {
    const expectedFixtures = [
      'ADT_A01_admit.hl7',
      'ADT_A03_discharge.hl7',
      'ADT_A08_update.hl7',
      'ORU_R01_lab_result.hl7',
      'SIU_S12_new_appointment.hl7',
      'SIU_S13_reschedule.hl7',
    ];

    for (const fixture of expectedFixtures) {
      it(`fixture ${fixture} exists`, () => {
        expect(fs.existsSync(path.join(FIXTURES_DIR, fixture))).toBe(true);
      });
    }

    it('all fixtures start with MSH', () => {
      for (const fixture of expectedFixtures) {
        const content = fs.readFileSync(path.join(FIXTURES_DIR, fixture), 'utf-8');
        expect(content.startsWith('MSH')).toBe(true);
      }
    });

    it('all fixtures have valid HL7 field separator', () => {
      for (const fixture of expectedFixtures) {
        const content = fs.readFileSync(path.join(FIXTURES_DIR, fixture), 'utf-8');
        expect(content.substring(3, 4)).toBe('|');
      }
    });
  });

  describe('Domain Mapper', () => {
    it('domain-mapper.ts exists', () => {
      expect(fs.existsSync(path.join(HL7_DIR, 'domain-mapper.ts'))).toBe(true);
    });

    it('exports mapHl7ToDomainEvent', () => {
      const content = fs.readFileSync(path.join(HL7_DIR, 'domain-mapper.ts'), 'utf-8');
      expect(content).toContain('export function mapHl7ToDomainEvent');
    });

    it('exports listSupportedMappings', () => {
      const content = fs.readFileSync(path.join(HL7_DIR, 'domain-mapper.ts'), 'utf-8');
      expect(content).toContain('export function listSupportedMappings');
    });

    it('maps ADT^A01 to patient.admitted', () => {
      const content = fs.readFileSync(path.join(HL7_DIR, 'domain-mapper.ts'), 'utf-8');
      expect(content).toContain('"patient.admitted"');
      expect(content).toContain('A01: "patient.admitted"');
    });

    it('maps ADT^A03 to patient.discharged', () => {
      const content = fs.readFileSync(path.join(HL7_DIR, 'domain-mapper.ts'), 'utf-8');
      expect(content).toContain('A03: "patient.discharged"');
    });

    it('maps ADT^A08 to patient.updated', () => {
      const content = fs.readFileSync(path.join(HL7_DIR, 'domain-mapper.ts'), 'utf-8');
      expect(content).toContain('A08: "patient.updated"');
    });

    it('maps ORU^R01 to result.received', () => {
      const content = fs.readFileSync(path.join(HL7_DIR, 'domain-mapper.ts'), 'utf-8');
      expect(content).toContain('"result.received"');
    });

    it('maps SIU^S12 to appointment.booked', () => {
      const content = fs.readFileSync(path.join(HL7_DIR, 'domain-mapper.ts'), 'utf-8');
      expect(content).toContain('S12: "appointment.booked"');
    });

    it('maps SIU^S13 to appointment.rescheduled', () => {
      const content = fs.readFileSync(path.join(HL7_DIR, 'domain-mapper.ts'), 'utf-8');
      expect(content).toContain('S13: "appointment.rescheduled"');
    });

    it('does not include patient names in domain event payload', () => {
      const content = fs.readFileSync(path.join(HL7_DIR, 'domain-mapper.ts'), 'utf-8');
      // Payload should use MRN + IDs, not patient names
      expect(content).toContain('patientMrn');
      // Should not have patientName or fullName in payload
      expect(content).not.toContain('patientName:');
      expect(content).not.toContain('fullName:');
    });

    it('supports ADT, ORU, and SIU message families', () => {
      const content = fs.readFileSync(path.join(HL7_DIR, 'domain-mapper.ts'), 'utf-8');
      expect(content).toContain('case "ADT"');
      expect(content).toContain('case "ORU"');
      expect(content).toContain('case "SIU"');
    });
  });

  describe('Use-Case Routes', () => {
    it('hl7-use-cases.ts exists', () => {
      expect(fs.existsSync(path.join(API_SRC, 'routes', 'hl7-use-cases.ts'))).toBe(true);
    });

    it('has ingest endpoint', () => {
      const content = fs.readFileSync(path.join(API_SRC, 'routes', 'hl7-use-cases.ts'), 'utf-8');
      expect(content).toContain('/hl7/ingest');
    });

    it('has use-cases listing endpoint', () => {
      const content = fs.readFileSync(path.join(API_SRC, 'routes', 'hl7-use-cases.ts'), 'utf-8');
      expect(content).toContain('/hl7/use-cases');
    });

    it('has fixtures listing endpoint', () => {
      const content = fs.readFileSync(path.join(API_SRC, 'routes', 'hl7-use-cases.ts'), 'utf-8');
      expect(content).toContain('/hl7/use-cases/fixtures');
    });

    it('dead-letters unsupported message types', () => {
      const content = fs.readFileSync(path.join(API_SRC, 'routes', 'hl7-use-cases.ts'), 'utf-8');
      expect(content).toContain('addEnhancedDeadLetter');
    });
  });
});
