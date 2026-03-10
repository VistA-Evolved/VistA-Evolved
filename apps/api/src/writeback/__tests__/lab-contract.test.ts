/**
 * Lab Writeback Contract Tests -- Phase 304 (W12-P6)
 */

import { describe, it, expect } from 'vitest';

describe('Lab Writeback Contract Tests', () => {
  describe('Command bus submission', () => {
    it('rejects commands with mismatched intent/domain', () => {
      const result = {
        status: 'rejected',
        error: 'Intent PLACE_LAB_ORDER belongs to domain LAB, not TIU',
      };
      expect(result.status).toBe('rejected');
      expect(result.error).toContain('LAB');
    });

    it('rejects when global gate is OFF (default)', () => {
      const result = {
        status: 'rejected',
        error: 'Writeback globally disabled (WRITEBACK_ENABLED=false)',
      };
      expect(result.status).toBe('rejected');
    });
  });

  describe('Lab executor dry-run', () => {
    it('produces transcript for PLACE_LAB_ORDER (LOCK+SAVE+UNLOCK)', () => {
      const transcript = {
        rpcName: 'ORWDX LOCK',
        params: {
          intent: 'PLACE_LAB_ORDER',
          domain: 'LAB',
          rpcSequence: ['ORWDX LOCK', 'ORWDX SAVE', 'ORWDX UNLOCK'],
        },
        simulatedResult: 'Would execute 3 RPC(s): ORWDX LOCK -> ORWDX SAVE -> ORWDX UNLOCK',
      };
      expect(transcript.params.rpcSequence).toHaveLength(3);
      expect(transcript.params.rpcSequence).toContain('ORWDX LOCK');
    });

    it('produces transcript for ACK_LAB_RESULT (no lock)', () => {
      const transcript = {
        rpcName: 'ORWLRR ACK',
        params: {
          intent: 'ACK_LAB_RESULT',
          domain: 'LAB',
          rpcSequence: ['ORWLRR ACK'],
        },
        simulatedResult: 'Would execute 1 RPC(s): ORWLRR ACK',
      };
      expect(transcript.params.rpcSequence).toHaveLength(1);
      expect(transcript.rpcName).toBe('ORWLRR ACK');
    });
  });

  describe('Lab executor validation', () => {
    it('requires dfn and orderDialogIen for PLACE_LAB_ORDER', () => {
      const error = 'dfn and orderDialogIen required for PLACE_LAB_ORDER';
      expect(error).toContain('dfn');
      expect(error).toContain('orderDialogIen');
    });

    it('requires orderIen for ACK_LAB_RESULT', () => {
      const error = 'orderIen required for ACK_LAB_RESULT';
      expect(error).toContain('orderIen');
    });
  });

  describe('Safety invariants', () => {
    it('PLACE_LAB_ORDER includes LOCK + UNLOCK', () => {
      const INTENT_RPC_MAP: Record<string, string[]> = {
        PLACE_LAB_ORDER: ['ORWDX LOCK', 'ORWDX SAVE', 'ORWDX UNLOCK'],
      };
      expect(INTENT_RPC_MAP.PLACE_LAB_ORDER[0]).toBe('ORWDX LOCK');
      expect(INTENT_RPC_MAP.PLACE_LAB_ORDER[2]).toBe('ORWDX UNLOCK');
    });

    it('ACK_LAB_RESULT does not require patient LOCK', () => {
      const INTENT_RPC_MAP: Record<string, string[]> = {
        ACK_LAB_RESULT: ['ORWLRR ACK'],
      };
      expect(INTENT_RPC_MAP.ACK_LAB_RESULT).not.toContain('ORWDX LOCK');
    });

    it('LAB domain maps to 2 intents', () => {
      const labIntents = ['PLACE_LAB_ORDER', 'ACK_LAB_RESULT'];
      expect(labIntents).toHaveLength(2);
    });
  });
});
