/**
 * G25: Inpatient Depth Gate
 *
 * Validates Phase 168 inpatient depth infrastructure:
 * - Med reconciliation routes + types
 * - Discharge workflow routes + checklist
 * - MAR safety net + 5-rights
 * - Store policy entries
 * - No PHI in any file
 */

export const meta = {
  id: 'G25_inpatient_depth',
  name: 'Inpatient Depth',
  phase: 168,
  tags: ['clinical', 'inpatient', 'safety'],
};

export async function run(_ctx) {
  const issues = [];
  const details = [];

  const { existsSync, readFileSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const root = resolve(import.meta.dirname, '../../..');

  // 1. Med reconciliation file
  const medRecFile = resolve(root, 'apps/api/src/routes/med-reconciliation.ts');
  if (!existsSync(medRecFile)) {
    return { status: 'fail', issues: ['med-reconciliation.ts not found'], details };
  }
  const medRecContent = readFileSync(medRecFile, 'utf-8');
  details.push('Med reconciliation routes exist');

  // Check key types
  for (const t of ['MedRecSession', 'MedRecDiscrepancy', 'ReconciliationDecision']) {
    if (!medRecContent.includes(t)) issues.push(`Missing type: ${t}`);
    else details.push(`${t} defined`);
  }

  // Check VistA grounding
  if (!medRecContent.includes('ORWPS ACTIVE')) issues.push('Med-rec missing ORWPS ACTIVE RPC');
  else details.push('Med-rec uses ORWPS ACTIVE');

  if (!medRecContent.includes('integration-pending'))
    issues.push('Med-rec missing integration-pending markers');
  else details.push('Med-rec has integration-pending markers');

  // 2. Discharge workflow file
  const dischargeFile = resolve(root, 'apps/api/src/routes/discharge-workflow.ts');
  if (!existsSync(dischargeFile)) {
    issues.push('discharge-workflow.ts not found');
  } else {
    const dischargeContent = readFileSync(dischargeFile, 'utf-8');
    details.push('Discharge workflow routes exist');

    for (const t of ['DischargePlan', 'DischargeChecklistItem']) {
      if (!dischargeContent.includes(t)) issues.push(`Missing type: ${t}`);
      else details.push(`${t} defined`);
    }

    if (!dischargeContent.includes('DG ADT DISCHARGE'))
      issues.push('Discharge missing DG ADT DISCHARGE target');
    else details.push('Discharge targets DG ADT DISCHARGE');
  }

  // 3. MAR safety file
  const marFile = resolve(root, 'apps/api/src/routes/mar-safety.ts');
  if (!existsSync(marFile)) {
    issues.push('mar-safety.ts not found');
  } else {
    const marContent = readFileSync(marFile, 'utf-8');
    details.push('MAR safety routes exist');

    for (const t of ['FiveRightsCheck', 'HighAlertWarning']) {
      if (!marContent.includes(t)) issues.push(`Missing type: ${t}`);
      else details.push(`${t} defined`);
    }

    if (!marContent.includes('PSB VALIDATE ORDER'))
      issues.push('MAR safety missing PSB VALIDATE ORDER target');
    else details.push('MAR safety targets PSB VALIDATE ORDER');
  }

  // 4. Check store policy has entries
  const storePolicyFile = resolve(root, 'apps/api/src/platform/store-policy.ts');
  const storePolicyContent = readFileSync(storePolicyFile, 'utf-8');
  for (const storeId of ['med-rec-sessions', 'discharge-plans', 'mar-safety-events']) {
    if (!storePolicyContent.includes(storeId)) issues.push(`Store policy missing: ${storeId}`);
    else details.push(`Store: ${storeId} registered`);
  }

  // 5. No PHI in any file
  const allContent =
    medRecContent + readFileSync(dischargeFile, 'utf-8') + readFileSync(marFile, 'utf-8');
  const phiPatterns = [/\d{3}-\d{2}-\d{4}/, /\d{2}\/\d{2}\/\d{4}.*DOB/i, /SSN/i];
  for (const pat of phiPatterns) {
    if (pat.test(allContent)) issues.push(`PHI pattern detected: ${pat.source}`);
  }
  details.push('No PHI detected');

  // 6. Runbook
  const runbook = resolve(root, 'docs/runbooks/phase168-inpatient-depth.md');
  if (!existsSync(runbook)) issues.push('Runbook missing');
  else details.push('Runbook exists');

  const status = issues.length === 0 ? 'pass' : 'fail';
  return { status, issues, details };
}
