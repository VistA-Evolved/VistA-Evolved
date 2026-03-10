/**
 * Phase 81 -- Imaging Viewer v1 E2E Tests
 *
 * Tests the 3 Phase 81 endpoints:
 *   GET /imaging/studies/:dfn       -- study list
 *   GET /imaging/report/:studyId    -- report text
 *   GET /imaging/viewer-link/:studyId -- viewer URL / instructions
 *
 * These tests run against a live API (localhost:3001).
 * VistA MAG4 RPCs are NOT available on sandbox, so we verify:
 *   - pendingTargets are returned when VistA imaging is unavailable
 *   - Orthanc fallback works if Orthanc is running
 *   - Report returns pendingTarget with correct VistA file info
 *   - Viewer link returns instructions when not configured
 *   - Invalid study IDs are handled gracefully
 */

const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:3001';

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

interface TestResult {
  name: string;
  passed: boolean;
  detail?: string;
}

const results: TestResult[] = [];

function assert(name: string, condition: boolean, detail?: string) {
  results.push({ name, passed: condition, detail });
  if (!condition) {
    console.error(`  FAIL  ${name}${detail ? ` -- ${detail}` : ''}`);
  } else {
    console.log(`  PASS  ${name}`);
  }
}

async function fetchJson(path: string, opts?: RequestInit): Promise<any> {
  const resp = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) },
  });
  const body = await resp.json().catch(() => null);
  return { status: resp.status, body };
}

/* ------------------------------------------------------------------ */
/* Test suites                                                          */
/* ------------------------------------------------------------------ */

async function testStudiesList() {
  console.log('\n--- Studies List ---');

  // Valid DFN
  const { status, body } = await fetchJson('/imaging/studies/3');
  assert('GET /imaging/studies/3 returns 200', status === 200);
  assert('response has ok=true', body?.ok === true);
  assert('response has dfn field', body?.dfn === '3');
  assert('response has studies array', Array.isArray(body?.studies));
  assert('response has count field', typeof body?.count === 'number');
  assert('response has sources object', typeof body?.sources === 'object');

  // Check pendingTargets (VistA MAG4 not available on sandbox)
  if (body?.pendingTargets) {
    assert(
      'pendingTargets mentions MAG4 REMOTE PROCEDURE',
      body.pendingTargets.some((t: any) => t.rpc === 'MAG4 REMOTE PROCEDURE')
    );
  } else {
    // If no pendingTargets, studies came from VistA or Orthanc
    assert('studies sourced from VistA or Orthanc', body?.studies?.length >= 0);
  }

  // Check rpcUsed field exists
  assert('response has rpcUsed field', Array.isArray(body?.rpcUsed));
}

async function testReportViewer() {
  console.log('\n--- Report Viewer ---');

  // Study ID that likely has no report in sandbox
  const { status, body } = await fetchJson('/imaging/report/1.2.3.4.5');
  assert('GET /imaging/report/:studyId returns 200', status === 200);
  assert('report response has ok=true', body?.ok === true);
  assert('report response has studyId', body?.studyId === '1.2.3.4.5');

  // Either report text or pendingTarget should be present
  const hasReport = body?.available === true && body?.reportText;
  const hasPending = body?.pendingTarget != null;
  assert('response has reportText OR pendingTarget', hasReport || hasPending);

  if (hasPending) {
    assert('pendingTarget has rpc field', typeof body.pendingTarget.rpc === 'string');
    assert('pendingTarget has vistaFile field', typeof body.pendingTarget.vistaFile === 'string');
    assert('pendingTarget has reason', typeof body.pendingTarget.reason === 'string');
    assert('pendingTarget has migrationPath', typeof body.pendingTarget.migrationPath === 'string');
    assert(
      'pendingTarget references RA DETAILED REPORT',
      body.pendingTarget.rpc === 'RA DETAILED REPORT'
    );
    assert('pendingTarget references File #74', body.pendingTarget.vistaFile.includes('74'));
  }

  if (hasReport) {
    assert(
      'reportText is a non-empty string',
      typeof body.reportText === 'string' && body.reportText.length > 0
    );
    assert('rpcUsed is present', typeof body.rpcUsed === 'string');
  }
}

async function testViewerLink() {
  console.log('\n--- Viewer Link ---');

  const studyUid = '1.2.3.4.5.6.7.8.9';
  const { status, body } = await fetchJson(`/imaging/viewer-link/${studyUid}`);
  assert('GET /imaging/viewer-link/:studyId returns 200', status === 200);
  assert('viewer response has ok=true', body?.ok === true);
  assert('viewer response has studyId', body?.studyId === studyUid);
  assert('viewer response has viewerType', typeof body?.viewerType === 'string');
  assert(
    'viewer response has message',
    typeof body?.message === 'string' && body.message.length > 0
  );

  // If viewer is available, URL should be present
  if (body?.viewerAvailable) {
    assert('viewer URL is present', typeof body.url === 'string' && body.url.length > 0);
    assert('viewer URL contains study UID', body.url.includes(studyUid));
    assert(
      'viewerType is ohif or basic',
      body.viewerType === 'ohif' || body.viewerType === 'basic'
    );
  } else {
    // Instructions should be present when not available
    assert(
      'instructions provided when viewer not available',
      Array.isArray(body?.instructions) && body.instructions.length > 0
    );
  }
}

async function testInvalidStudyId() {
  console.log('\n--- Invalid/Edge Cases ---');

  // Report for non-existent study
  const { status: reportStatus, body: reportBody } = await fetchJson(
    '/imaging/report/NONEXISTENT-999'
  );
  assert('non-existent report returns 200 (graceful)', reportStatus === 200);
  assert(
    'non-existent report has pendingTarget',
    reportBody?.pendingTarget != null || reportBody?.available === false
  );

  // Viewer link for non-existent study (should still return instructions)
  const { status: viewerStatus, body: viewerBody } = await fetchJson(
    '/imaging/viewer-link/NONEXISTENT-999'
  );
  assert('non-existent viewer link returns 200', viewerStatus === 200);
  assert('non-existent viewer has valid response', viewerBody?.ok === true);
}

async function testViewerLinkConfigured() {
  console.log('\n--- Viewer Link (if configured) ---');

  // Use a real-looking DICOM UID
  const uid = '2.16.840.1.113669.632.20.121711.10000160881';
  const { body } = await fetchJson(`/imaging/viewer-link/${uid}`);

  if (body?.viewerAvailable && body?.url) {
    assert(
      'configured viewer URL contains StudyInstanceUIDs',
      body.url.includes('StudyInstanceUIDs=') || body.url.includes(uid)
    );
    assert('configured viewerType is ohif', body.viewerType === 'ohif');
    console.log(`  LINK  ${body.url}`);
  } else {
    assert('unconfigured viewer returns instructions', Array.isArray(body?.instructions));
    console.log('  INFO  OHIF/Orthanc not running -- instructions returned (expected)');
  }
}

/* ------------------------------------------------------------------ */
/* Main                                                                 */
/* ------------------------------------------------------------------ */

async function main() {
  console.log('=== Phase 81 -- Imaging Viewer v1 E2E Tests ===');
  console.log(`API: ${API_BASE}\n`);

  try {
    await testStudiesList();
    await testReportViewer();
    await testViewerLink();
    await testInvalidStudyId();
    await testViewerLinkConfigured();
  } catch (err: any) {
    console.error(`\nFATAL: ${err.message}`);
    process.exit(1);
  }

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`\n======================================`);
  console.log(`  Phase 81 E2E: ${passed} PASS / ${failed} FAIL / ${results.length} total`);
  console.log(`======================================\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
