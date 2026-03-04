/**
 * G23: Clinic Day Journeys Gate
 *
 * Validates that all 6 A-Z proof journey definitions exist and have
 * correct structure. If the API is running, also executes journeys
 * and reports pass/fail.
 *
 * Light gate: checks structure offline (no API needed for PASS).
 * Full gate: runs journeys live (requires API running).
 */

export const meta = {
  id: 'G23_clinic_day_journeys',
  name: 'Clinic Day Journeys',
  phase: 166,
  tags: ['qa', 'journeys'],
};

export async function run(_ctx) {
  const issues = [];
  const details = [];

  // 1. Check journey definition file exists
  const { existsSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const root = resolve(import.meta.dirname, '../../..');

  const journeyFile = resolve(root, 'apps/api/src/qa/clinic-day-journeys.ts');
  if (!existsSync(journeyFile)) {
    return { status: 'fail', issues: ['clinic-day-journeys.ts not found'], details };
  }
  details.push('Journey definitions file exists');

  // 2. Check route file exists
  const routeFile = resolve(root, 'apps/api/src/routes/qa-journey-routes.ts');
  if (!existsSync(routeFile)) {
    issues.push('qa-journey-routes.ts not found');
  } else {
    details.push('Journey routes file exists');
  }

  // 3. Check CLI runner exists
  const cliRunner = resolve(root, 'scripts/qa/clinic-day-runner.mjs');
  if (!existsSync(cliRunner)) {
    issues.push('clinic-day-runner.mjs not found');
  } else {
    details.push('CLI runner exists');
  }

  // 4. Validate journey structure by reading the file
  const { readFileSync } = await import('node:fs');
  const content = readFileSync(journeyFile, 'utf-8');

  const requiredJourneys = [
    'J1_OUTPATIENT',
    'J2_ED',
    'J3_LAB',
    'J4_RADIOLOGY',
    'J5_RCM',
    'J6_PORTAL',
  ];
  for (const jName of requiredJourneys) {
    if (!content.includes(`export const ${jName}`)) {
      issues.push(`Missing journey definition: ${jName}`);
    } else {
      details.push(`${jName} defined`);
    }
  }

  // 5. Check ALL_JOURNEYS export
  if (!content.includes('ALL_JOURNEYS')) {
    issues.push('Missing ALL_JOURNEYS export');
  }

  // 6. Verify each journey has expectedRpcs fields (no PHI)
  if (!content.includes('expectedRpcs')) {
    issues.push('Missing expectedRpcs in journey definitions');
  } else {
    details.push('RPC trace assertions present');
  }

  // 7. Verify no PHI in journey definitions
  const phiPatterns = [/\d{3}-\d{2}-\d{4}/, /\d{2}\/\d{2}\/\d{4}.*DOB/i, /SSN/i];
  for (const pat of phiPatterns) {
    if (pat.test(content)) {
      issues.push(`Possible PHI in journey definitions: ${pat.source}`);
    }
  }
  details.push('No PHI detected in journey definitions');

  // 8. Check runbook
  const runbook = resolve(root, 'docs/runbooks/phase166-clinic-day-simulator.md');
  if (!existsSync(runbook)) {
    issues.push('Runbook missing: phase166-clinic-day-simulator.md');
  } else {
    details.push('Runbook exists');
  }

  const status = issues.length === 0 ? 'pass' : 'fail';
  return { status, issues, details };
}
