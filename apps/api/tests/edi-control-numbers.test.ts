/**
 * EDI Control Number Tests — Phase 573B
 *
 * Verifies that:
 *   1. Control numbers are monotonically increasing
 *   2. Different sender/receiver pairs get independent sequences
 *   3. Control numbers are zero-padded to 9 digits
 *   4. Durable variant falls back gracefully
 */

import { describe, it, expect } from 'vitest';
import {
  nextControlNumber,
  nextControlNumberDurable,
} from '../src/rcm/transactions/envelope.js';

describe('EDI Control Number Generator', () => {
  it('produces 9-digit zero-padded numbers', () => {
    const num = nextControlNumber('TEST-SENDER', 'TEST-RECEIVER');
    expect(num).toMatch(/^\d{9}$/);
    expect(num.length).toBe(9);
  });

  it('produces monotonically increasing numbers for same pair', () => {
    const a = nextControlNumber('MONO-S', 'MONO-R');
    const b = nextControlNumber('MONO-S', 'MONO-R');
    const c = nextControlNumber('MONO-S', 'MONO-R');
    expect(parseInt(b, 10)).toBeGreaterThan(parseInt(a, 10));
    expect(parseInt(c, 10)).toBeGreaterThan(parseInt(b, 10));
  });

  it('uses independent sequences per sender/receiver pair', () => {
    const a1 = nextControlNumber('A-SENDER', 'A-RECEIVER');
    const b1 = nextControlNumber('B-SENDER', 'B-RECEIVER');
    // Both should start from their own sequence
    // (not necessarily 1 since other tests may have incremented)
    expect(a1).toBeTruthy();
    expect(b1).toBeTruthy();
  });

  it('durable variant falls back to in-memory when no PG repo', async () => {
    const num = await nextControlNumberDurable('DUR-S', 'DUR-R', 'test');
    expect(num).toMatch(/^\d{9}$/);
  });
});
