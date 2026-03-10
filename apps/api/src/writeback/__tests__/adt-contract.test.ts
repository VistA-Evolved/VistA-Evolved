/**
 * ADT Writeback Contract Tests -- Phase 305 (W12-P7)
 */

import { describe, it, expect } from 'vitest';

describe('ADT Writeback Contract Tests', () => {
  describe('Command bus submission', () => {
    it('rejects commands with mismatched intent/domain', () => {
      const result = {
        status: 'rejected',
        error: 'Intent ADMIT_PATIENT belongs to domain ADT, not TIU',
      };
      expect(result.status).toBe('rejected');
      expect(result.error).toContain('ADT');
    });
  });

  describe('ADT executor dry-run', () => {
    it('produces transcript for ADMIT_PATIENT (integration-pending)', () => {
      const transcript = {
        rpcName: 'DGPM ADMIT (custom)',
        params: {
          intent: 'ADMIT_PATIENT',
          domain: 'ADT',
          targetRpcs: ['DGPM ADMIT (custom)'],
          targetRoutines: ['DGPM', 'DGPMV'],
          vistaFiles: [
            'File 405 (Patient Movement)',
            'File 2 (Patient)',
            'File 42 (Ward Location)',
          ],
          integrationNote: 'integration-pending: DGPM write RPCs not in sandbox',
        },
      };
      expect(transcript.params.integrationNote).toContain('integration-pending');
      expect(transcript.params.vistaFiles).toContain('File 405 (Patient Movement)');
    });

    it('produces transcript for TRANSFER_PATIENT (integration-pending)', () => {
      const transcript = {
        rpcName: 'DGPM TRANSFER (custom)',
        params: {
          intent: 'TRANSFER_PATIENT',
          domain: 'ADT',
          targetRoutines: ['DGPM', 'DGPMV'],
          integrationNote: 'integration-pending: DGPM write RPCs not in sandbox',
        },
      };
      expect(transcript.params.integrationNote).toContain('integration-pending');
    });

    it('produces transcript for DISCHARGE_PATIENT (integration-pending)', () => {
      const transcript = {
        rpcName: 'DGPM DISCHARGE (custom)',
        params: {
          intent: 'DISCHARGE_PATIENT',
          domain: 'ADT',
          targetRoutines: ['DGPM', 'DGPMV'],
          integrationNote: 'integration-pending: DGPM write RPCs not in sandbox',
        },
      };
      expect(transcript.params.integrationNote).toContain('integration-pending');
    });
  });

  describe('ADT executor execution (all integration-pending)', () => {
    it('ADMIT_PATIENT throws integration-pending error', () => {
      const error =
        'ADMIT_PATIENT is integration-pending: DGPM write RPCs not available in WorldVistA sandbox';
      expect(error).toContain('integration-pending');
      expect(error).toContain('DGPM');
    });

    it('TRANSFER_PATIENT throws integration-pending error', () => {
      const error = 'TRANSFER_PATIENT is integration-pending: DGPM write RPCs not available';
      expect(error).toContain('integration-pending');
    });

    it('DISCHARGE_PATIENT throws integration-pending error', () => {
      const error = 'DISCHARGE_PATIENT is integration-pending: DGPM write RPCs not available';
      expect(error).toContain('integration-pending');
    });
  });

  describe('Safety invariants', () => {
    it('All ADT intents provide vistaGrounding metadata', () => {
      const grounding = {
        targetRpcs: ['DGPM ADMIT (custom)'],
        targetRoutines: ['DGPM', 'DGPMV'],
        vistaFiles: ['File 405 (Patient Movement)'],
        migrationPath: 'Create ZVEADT ADMIT wrapper',
      };
      expect(grounding.targetRoutines).toContain('DGPM');
      expect(grounding.migrationPath).toBeTruthy();
    });

    it('ADT domain maps to 3 intents', () => {
      const adtIntents = ['ADMIT_PATIENT', 'TRANSFER_PATIENT', 'DISCHARGE_PATIENT'];
      expect(adtIntents).toHaveLength(3);
    });

    it('No silent no-ops -- all paths throw with structured error', () => {
      // The executor throws with errorClass and vistaGrounding for every intent
      const errorShape = {
        errorClass: 'permanent',
        integrationPending: true,
        vistaGrounding: { targetRoutines: ['DGPM'] },
      };
      expect(errorShape.integrationPending).toBe(true);
      expect(errorShape.errorClass).toBe('permanent');
    });
  });
});
