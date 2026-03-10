/**
 * RPC Contract Modes -- Phase 250
 *
 * RECORD: calls live VistA, captures + sanitizes responses into fixtures
 * REPLAY: loads fixtures, validates schema/invariants without VistA
 */

export type ContractMode = 'record' | 'replay';

/**
 * Resolve the current contract mode from environment.
 * Default is REPLAY (safe for CI, no VistA dependency).
 */
export function getContractMode(): ContractMode {
  const mode = process.env.VISTA_CONTRACT_MODE?.toLowerCase();
  if (mode === 'record') return 'record';
  return 'replay';
}

/**
 * Fixture file path for a given RPC and case name.
 */
export function fixtureFilePath(rpcName: string, caseName: string): string {
  const safeName = rpcName.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_]/g, '');
  return `apps/api/tests/fixtures/vista/${safeName}/${caseName}.json`;
}

/**
 * Fixture data structure stored to disk.
 */
export interface RpcFixture {
  rpcName: string;
  caseName: string;
  recordedAt: string;
  sanitized: true;
  params: string[];
  response: string[];
  /** SHA-256 of the sanitized response for integrity */
  responseHash: string;
}
