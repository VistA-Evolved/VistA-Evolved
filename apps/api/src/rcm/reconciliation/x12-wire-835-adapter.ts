/**
 * X12 Wire Format 835 Parser Adapter — Phase 518 (Wave 37 B6)
 *
 * Implements the Edi835Parser interface using the raw X12 wire parser.
 * Registers itself in the parser registry so consuming code can
 * use it by name ("x12-wire").
 */

import type { Edi835Parser, NormalizedRemittance, NormalizedPaymentLine } from './types.js';
import { parseX12Wire } from '../edi/x12-wire-parser.js';
import { registerParser } from './edi835-parser.js';

class X12WireEdi835Parser implements Edi835Parser {
  readonly name = 'x12-wire';
  readonly version = '1.0.0';

  parse(content: string): NormalizedRemittance {
    const { ok, results, errors } = parseX12Wire(content);

    if (!ok || results.length === 0) {
      return {
        lines: [],
        payerId: '',
        totalPaidAmount: 0,
        totalBilledAmount: 0,
        parseErrors: errors.length > 0 ? errors : ['No 835 transaction set found in X12 input'],
      };
    }

    // Find the first 835 result
    const r835 = results.find((r) => r.transactionSet === '835');
    if (!r835 || !r835.parsed835) {
      return {
        lines: [],
        payerId: '',
        totalPaidAmount: 0,
        totalBilledAmount: 0,
        parseErrors: ['X12 parsed but no 835 transaction set found'],
      };
    }

    const { parsed835 } = r835;

    const lines: NormalizedPaymentLine[] = parsed835.lines.map((l) => ({
      claimRef: l.claimRef,
      payerId: l.payerId,
      billedAmount: l.billedAmount,
      paidAmount: l.paidAmount,
      allowedAmount: l.allowedAmount,
      adjustmentAmount: l.adjustmentAmount,
      patientResp: l.patientResp,
      serviceDate: l.serviceDate,
      postedDate: l.postedDate,
      traceNumber: l.traceNumber,
      checkNumber: l.checkNumber,
      rawCodes: l.codes.map((c) => ({
        type: c.type,
        code: c.code,
        description: c.description,
      })),
    }));

    return {
      lines,
      payerId: parsed835.payerId,
      checkNumber: parsed835.checkNumber,
      totalPaidAmount: parsed835.totalPaid,
      totalBilledAmount: parsed835.totalBilled,
      parseErrors: parsed835.parseErrors,
    };
  }
}

// Self-register on import
const x12WireParser = new X12WireEdi835Parser();
registerParser(x12WireParser);

export { x12WireParser };
