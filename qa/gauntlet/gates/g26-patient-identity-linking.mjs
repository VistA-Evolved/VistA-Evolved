/**
 * G26 — Patient Identity Linking gate (Phase 169)
 *
 * Validates:
 *  1. Route file exists with correct endpoints
 *  2. Types exported (LinkRequestStatus, PatientRelationship, IdentityLink)
 *  3. VistA RPC grounding (ORWPT ID INFO for demographic verification)
 *  4. No PHI stored in link records (SSN hashed, DOB cleared after verify)
 *  5. Staff-approval workflow present (pending → verified/rejected)
 *  6. Immutable audit calls for all state transitions
 *  7. Store policy entries registered
 *  8. Runbook exists
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../../..');

function fileContent(rel) {
  const p = resolve(ROOT, rel);
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf-8');
}

export const meta = {
  id: 'G26_patient_identity_linking',
  name: 'Patient Identity Linking',
  phase: 169,
  tags: ['identity', 'portal', 'security'],
};

export async function run(_ctx) {
  const issues = [];
  const details = [];

  // 1. Route file exists
  const routeSrc = fileContent('apps/api/src/routes/identity-linking.ts');
  if (!routeSrc) {
    issues.push('Route file apps/api/src/routes/identity-linking.ts missing');
    return { status: 'fail', issues, details };
  }
  details.push('Route file exists');

  // 2. Key types exported
  for (const t of ['LinkRequestStatus', 'PatientRelationship', 'IdentityLink']) {
    if (routeSrc.includes(t)) details.push(`Type: ${t}`);
    else issues.push(`Missing type: ${t}`);
  }

  // 3. VistA RPC grounding
  if (routeSrc.includes('ORWPT ID INFO')) details.push('ORWPT ID INFO used');
  else issues.push('ORWPT ID INFO not referenced');

  // 4. PHI safeguards — SSN hashed, verification data cleared
  if (routeSrc.includes('hashSensitive')) details.push('SSN hashing present');
  else issues.push('hashSensitive not found — SSN may be stored raw');

  if (routeSrc.includes('verificationData = {}'))
    details.push('Verification data cleared after review');
  else issues.push('Verification data not cleared after verify/reject');

  // 5. Staff-approval workflow
  for (const ep of ['/admin/identity/request/:id/verify', '/admin/identity/request/:id/reject']) {
    if (routeSrc.includes(ep)) details.push(`Endpoint: ${ep}`);
    else issues.push(`Missing endpoint: ${ep}`);
  }
  for (const st of ['"pending"', '"verified"', '"rejected"']) {
    if (routeSrc.includes(st)) details.push(`Status: ${st}`);
    else issues.push(`Missing status: ${st}`);
  }

  // 6. Immutable audit calls
  for (const action of [
    'identity.link_requested',
    'identity.link_verified',
    'identity.link_revoked',
  ]) {
    if (routeSrc.includes(action)) details.push(`Audit: ${action}`);
    else issues.push(`Missing audit: ${action}`);
  }

  // 7. Store policy entries
  const storePolicy = fileContent('apps/api/src/platform/store-policy.ts');
  if (storePolicy) {
    for (const sid of ['identity-link-requests', 'identity-links']) {
      if (storePolicy.includes(sid)) details.push(`Store: ${sid}`);
      else issues.push(`Store policy missing: ${sid}`);
    }
  } else {
    issues.push('store-policy.ts not found');
  }

  // 8. Runbook
  if (existsSync(resolve(ROOT, 'docs/runbooks/phase169-patient-identity-linking.md'))) {
    details.push('Runbook exists');
  } else {
    issues.push('Runbook missing');
  }

  // 9. Index.ts wiring
  const indexSrc = fileContent('apps/api/src/index.ts');
  if (indexSrc) {
    if (indexSrc.includes('identity-linking')) details.push('Imported in index.ts');
    else issues.push('Not imported in index.ts');
    if (indexSrc.includes('identityLinkingRoutes')) details.push('Registered in index.ts');
    else issues.push('Not registered in index.ts');
  } else {
    issues.push('index.ts not found');
  }

  const status = issues.length === 0 ? 'pass' : 'fail';
  return { status, issues, details };
}
