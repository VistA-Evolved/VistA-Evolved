/**
 * Clinical Invariant Tests — Medication Status Transitions
 * Phase 268 — W8-P3
 *
 * Validates that medication orders follow valid state transitions.
 * VistA medication statuses: ACTIVE, DISCONTINUED, EXPIRED, HOLD, SUSPENDED, PENDING
 */
import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Medication Status FSM
// ---------------------------------------------------------------------------

type MedStatus = 'pending' | 'active' | 'hold' | 'suspended' | 'discontinued' | 'expired';

const VALID_TRANSITIONS: Record<MedStatus, MedStatus[]> = {
  pending: ['active', 'discontinued'],
  active: ['hold', 'suspended', 'discontinued', 'expired'],
  hold: ['active', 'discontinued'],
  suspended: ['active', 'discontinued'],
  discontinued: [], // Terminal state
  expired: [], // Terminal state
};

function isValidTransition(from: MedStatus, to: MedStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Medication Status Transition Invariants', () => {
  // INV-010: All transitions must be legal
  describe('INV-010: Valid state transitions', () => {
    const validCases: [MedStatus, MedStatus][] = [
      ['pending', 'active'],
      ['pending', 'discontinued'],
      ['active', 'hold'],
      ['active', 'suspended'],
      ['active', 'discontinued'],
      ['active', 'expired'],
      ['hold', 'active'],
      ['hold', 'discontinued'],
      ['suspended', 'active'],
      ['suspended', 'discontinued'],
    ];

    for (const [from, to] of validCases) {
      it(`should allow ${from} → ${to}`, () => {
        expect(isValidTransition(from, to)).toBe(true);
      });
    }
  });

  // INV-011: Invalid transitions must be rejected
  describe('INV-011: Invalid state transitions', () => {
    const invalidCases: [MedStatus, MedStatus][] = [
      ['discontinued', 'active'],
      ['discontinued', 'pending'],
      ['expired', 'active'],
      ['expired', 'pending'],
      ['pending', 'hold'],
      ['pending', 'suspended'],
      ['pending', 'expired'],
      ['hold', 'expired'],
      ['hold', 'pending'],
    ];

    for (const [from, to] of invalidCases) {
      it(`should reject ${from} → ${to}`, () => {
        expect(isValidTransition(from, to)).toBe(false);
      });
    }
  });

  // INV-012: Terminal states have no outgoing transitions
  describe('INV-012: Terminal states are final', () => {
    const terminalStates: MedStatus[] = ['discontinued', 'expired'];

    for (const state of terminalStates) {
      it(`should have no outgoing transitions from ${state}`, () => {
        expect(VALID_TRANSITIONS[state].length).toBe(0);
      });
    }
  });

  // INV-013: Medication history must follow valid transition chain
  describe('INV-013: Historical transition chain validation', () => {
    it('should validate a correct transition history', () => {
      const history: MedStatus[] = ['pending', 'active', 'hold', 'active', 'discontinued'];

      for (let i = 1; i < history.length; i++) {
        expect(isValidTransition(history[i - 1], history[i])).toBe(true);
      }
    });

    it('should detect invalid transition in history', () => {
      const badHistory: MedStatus[] = ['pending', 'active', 'expired', 'active']; // expired → active invalid!

      let hasInvalid = false;
      for (let i = 1; i < badHistory.length; i++) {
        if (!isValidTransition(badHistory[i - 1], badHistory[i])) {
          hasInvalid = true;
          break;
        }
      }
      expect(hasInvalid).toBe(true);
    });
  });

  // INV-014: ORWPS ACTIVE response parsing preserves status
  describe('INV-014: ORWPS ACTIVE status parsing', () => {
    it('should parse medication status from VistA response line', () => {
      // VistA ORWPS ACTIVE returns lines like: ~IEN^NAME^STATUS
      const lines = [
        '~1^MEDICATION A^ACTIVE',
        '  Sig: TAKE ONE DAILY',
        '~2^MEDICATION B^HOLD',
        '  Sig: AS NEEDED',
      ];

      const meds = lines
        .filter((l) => l.startsWith('~'))
        .map((l) => {
          const parts = l.substring(1).split('^');
          return { ien: parts[0], name: parts[1], status: parts[2]?.toLowerCase() };
        });

      expect(meds).toHaveLength(2);
      expect(meds[0].status).toBe('active');
      expect(meds[1].status).toBe('hold');
    });
  });
});
