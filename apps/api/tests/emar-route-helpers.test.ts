import { describe, expect, it } from 'vitest';

import {
  extractNumericRpcIen,
  isMissingRpcResponse,
} from '../src/routes/emar/index.js';

describe('eMAR route helpers', () => {
  it('extracts numeric IENs from TIU create responses', () => {
    expect(extractNumericRpcIen(['14382^TIU DOCUMENT'])).toBe('14382');
    expect(extractNumericRpcIen(['14382'])).toBe('14382');
  });

  it('rejects missing-RPC payloads as note IENs', () => {
    const missingRpc = ["=Remote Procedure 'ZVENAS MEDLOG' doesn't exist on the server.\u0000"];
    expect(extractNumericRpcIen(missingRpc)).toBeNull();
    expect(isMissingRpcResponse(missingRpc)).toBe(true);
    expect(isMissingRpcResponse(['14382^TIU DOCUMENT'])).toBe(false);
  });
});