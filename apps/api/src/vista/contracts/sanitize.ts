/**
 * RPC Contract Sanitizer -- Phase 250
 *
 * Removes/obfuscates PHI from RPC responses before saving as fixtures.
 * Deterministic hashing for identifiers (DFN, ICN) so replay tests are stable.
 */

import { createHash } from 'node:crypto';
import type { RpcContract, RpcContractField } from './rpc-contracts.js';

const SALT = 'vista-evolved-contract-salt-v1';

/** PHI patterns that must NEVER appear in fixtures */
const PHI_DENY_PATTERNS: RegExp[] = [
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN
  /\b\d{9}\b/, // SSN without dashes
  /\b\d{2}\/\d{2}\/\d{4}\b/, // DOB (MM/DD/YYYY)
  /\b[A-Z][a-z]+,\s*[A-Z][a-z]+\s+[A-Z]\b/, // LAST,FIRST M (patient names)
  /\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/, // Phone numbers
  /\d+\s+\w+\s+(St|Ave|Blvd|Dr|Rd|Ln|Ct)\b/i, // Street addresses
];

/**
 * Deterministic hash for identifiers -- same input always produces same hash.
 * NOT cryptographically secure; used only for fixture stability.
 */
export function hashIdentifier(value: string): string {
  return createHash('sha256')
    .update(SALT + value)
    .digest('hex')
    .substring(0, 12);
}

/**
 * Normalize a VistA timestamp to a fixed value for deterministic replay.
 * VistA internal dates are FileMan format: YYYMMDD.HHMMSS
 */
export function normalizeTimestamp(line: string): string {
  return line.replace(/\b3\d{6}\.\d{1,6}\b/g, '3000101.120000');
}

/**
 * Apply a single sanitization rule to a line of RPC output.
 */
function applyField(line: string, field: RpcContractField): string {
  switch (field.action) {
    case 'hash': {
      const re = new RegExp(field.pattern);
      const match = line.match(re);
      if (match) {
        const hashed = hashIdentifier(match[0]);
        return line.replace(match[0], `HASHED:${hashed}`);
      }
      return line;
    }
    case 'replace':
      return line.replace(new RegExp(field.pattern, 'g'), field.replaceWith ?? 'REDACTED');
    case 'remove':
      return new RegExp(field.pattern).test(line) ? '' : line;
    case 'normalize-timestamp':
      return normalizeTimestamp(line);
    default:
      return line;
  }
}

/**
 * Sanitize an entire RPC response using the contract's rules.
 * Returns sanitized lines ready for fixture storage.
 */
export function sanitizeRpcOutput(lines: string[], contract: RpcContract): string[] {
  let result = lines.map((line) => {
    let sanitized = line;
    for (const field of contract.sanitizeFields) {
      sanitized = applyField(sanitized, field);
    }
    return sanitized;
  });

  // Always scrub PHI deny patterns as a safety net
  result = result.map((line) => {
    let scrubbed = line;
    for (const pattern of PHI_DENY_PATTERNS) {
      scrubbed = scrubbed.replace(pattern, 'REDACTED-PHI');
    }
    return scrubbed;
  });

  // Remove empty lines from "remove" actions
  return result.filter((line) => line !== '');
}

/**
 * Verify that sanitized output contains NO PHI patterns.
 * Returns an array of violations (empty = clean).
 */
export function verifyNoPhiInFixture(lines: string[]): string[] {
  const violations: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    for (const pattern of PHI_DENY_PATTERNS) {
      if (pattern.test(lines[i])) {
        violations.push(
          `Line ${i + 1}: matches PHI pattern ${pattern.source}: "${lines[i].substring(0, 60)}..."`
        );
      }
    }
  }
  return violations;
}
