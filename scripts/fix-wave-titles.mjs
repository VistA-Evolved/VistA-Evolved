#!/usr/bin/env node
/**
 * fix-wave-titles.mjs -- One-shot fix for contaminated wave phase prompt files.
 *
 * The enrich-wave-phases.mjs script (Q219) had wrong WAVE2/WAVE3 dictionaries
 * that mapped phase numbers to incorrect playbook sections. This script:
 * 1. Reads actual folder names to derive canonical titles
 * 2. Uses corrected step/verify data for each phase
 * 3. Rewrites ALL wave phase files (183-210) with correct content
 *
 * Run once, then delete this script.
 */

import { writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PROMPTS = join(ROOT, 'prompts');

/** Derive human-readable title from folder name like 193-PHASE-183-TENANT-PROVISIONING */
function titleFromFolder(dirName) {
  const m = dirName.match(/PHASE-\d+-(.+)/);
  if (!m) return null;
  // Convert KEBAB-CASE to Title Case, with special handling
  const raw = m[1];
  const specials = {
    'PG': 'PG', 'PITR': 'PITR', 'DR': 'DR', 'K8S': 'K8s', 'FHIR': 'FHIR',
    'ETAG': 'ETag', 'ARGOCD': 'ArgoCD', 'CI': 'CI', 'CD': 'CD', 'PR': 'PR',
    'SBOM': 'SBOM', 'SLO': 'SLO', 'E2E': 'E2E', 'CLI': 'CLI',
    'YOTTADB': 'YottaDB', 'TLS': 'TLS', 'SMART': 'SMART', 'ON': 'on',
    'AS': 'as', 'R4': 'R4',
  };
  return raw.split('-').map(w => specials[w] || (w.charAt(0) + w.slice(1).toLowerCase())).join(' ');
}

// Corrected content for phases 183-196 (WAVE2 misaligned entries)
const WAVE2_FIX = {
  183: {
    steps: [
      'Design tenant provisioning API and onboarding flow',
      'Create tenant registration endpoint with validation',
      'Implement database schema isolation per tenant',
      'Configure default tenant settings and feature flags',
      'Add provisioning audit trail for compliance',
    ],
    files: ['apps/api/src/platform/', 'infra/helm/charts/tenant/'],
    verify: ['New tenant provisioned via API', 'Database isolation verified', 'Default settings applied', 'Audit trail records provisioning events'],
  },
  184: {
    steps: [
      'Integrate with external secret store (Vault or sealed-secrets)',
      'Replace inline env vars with external secret references',
      'Configure auto-rotation for database credentials',
      'Add secret audit logging for access tracking',
      'Document secret management procedures',
    ],
    files: ['infra/secrets/', 'infra/helm/templates/'],
    verify: ['Secrets not in plain text in repo', 'External store accessible', 'Rotation works', 'Audit logged'],
  },
  185: {
    steps: [
      'Configure PostgreSQL continuous WAL archiving',
      'Set up automated pg_basebackup schedule',
      'Implement point-in-time recovery (PITR) procedures',
      'Define RPO/RTO targets for PG data',
      'Test restore to specific timestamp',
    ],
    files: ['scripts/backup-restore.mjs', 'infra/'],
    verify: ['WAL archiving active', 'Base backup runs on schedule', 'PITR restore succeeds', 'RPO/RTO targets documented'],
  },
  186: {
    steps: [
      'Configure VistA YottaDB journal backup strategy',
      'Implement MUPIP BACKUP automation for globals',
      'Set up journal file rotation and archival',
      'Define backup retention policy for VistA data',
    ],
    files: ['services/vista/', 'scripts/backup-restore.mjs'],
    verify: ['YottaDB journal backup completes', 'Global export verifiable', 'Backup files archived', 'Retention policy enforced'],
  },
  187: {
    steps: [
      'Create automated disaster recovery drill playbook',
      'Implement failover testing scripts for PG and VistA',
      'Define health check thresholds for auto-failover triggers',
      'Schedule periodic DR drills with result tracking',
      'Document manual escalation procedures',
    ],
    files: ['scripts/', 'docs/runbooks/'],
    verify: ['DR drill runs to completion', 'Failover tested successfully', 'Health checks trigger correctly', 'Results tracked and reported'],
  },
  188: {
    steps: [
      'Establish OTel, Prometheus, Jaeger baseline configuration',
      'Define key SLI metrics for API latency, error rate, throughput',
      'Create Grafana dashboards for operational visibility',
      'Configure alerting rules for SLO violations',
      'Document observability stack topology',
    ],
    files: ['services/observability/', 'apps/api/src/telemetry/'],
    verify: ['Metrics flowing to Prometheus', 'Traces visible in Jaeger', 'Dashboards render correctly', 'Alerts fire on threshold breach'],
  },
  189: {
    steps: [
      'Profile API endpoints under representative load',
      'Identify and document performance bottlenecks',
      'Create heap snapshot analysis procedures',
      'Define connection pool tuning guidelines',
      'Establish latency budget per route category',
    ],
    files: ['docs/runbooks/', 'tests/k6/'],
    verify: ['Runbook covers all critical paths', 'Profiling procedure documented', 'Pool tuning guidelines complete', 'Latency budgets defined'],
  },
  190: {
    steps: [
      'Create comprehensive k6 load test scenarios',
      'Define concurrent user thresholds per endpoint category',
      'Test circuit breaker behavior under sustained load',
      'Verify rate limiting holds under traffic spikes',
      'Add performance regression detection to CI',
    ],
    files: ['tests/k6/'],
    verify: ['Load tests run to completion', 'Thresholds met', 'Circuit breaker trips correctly', 'Rate limiter holds'],
  },
  191: {
    steps: [
      'Implement queue depth monitoring for async task workers',
      'Add backpressure mechanisms to prevent worker overload',
      'Configure worker scaling policies based on queue depth',
      'Add dead-letter handling for failed tasks',
      'Document queue capacity planning guidelines',
    ],
    files: ['apps/api/src/'],
    verify: ['Queue depth metrics exported', 'Backpressure activates under load', 'Worker scaling responds to depth', 'Dead letters captured'],
  },
  192: {
    steps: [
      'Configure Horizontal Pod Autoscaler for API pods',
      'Define custom metrics targeting (CPU, memory, request rate)',
      'Implement scale-to-zero for non-production environments',
      'Set resource requests and limits per container',
      'Test scaling behavior under load spikes',
    ],
    files: ['infra/helm/'],
    verify: ['HPA scales up under load', 'Scale-to-zero works in dev', 'Resource limits enforced', 'Scale-down is graceful'],
  },
  193: {
    steps: [
      'Implement FHIR R4 Encounter read and search endpoints',
      'Map VistA visit data (ORWCV VST) to Encounter resource',
      'Support search by patient and date range parameters',
      'Add period, class, and type mappings per R4 spec',
    ],
    files: ['apps/api/src/fhir/'],
    verify: ['Encounter resource conforms to R4 spec', 'Search by patient works', 'Date range filtering correct', 'All required fields populated'],
  },
  194: {
    steps: [
      'Add ETag header generation for FHIR resource responses',
      'Implement conditional GET (If-None-Match) support',
      'Configure cache-control headers for FHIR endpoints',
      'Add Last-Modified header for time-based caching',
    ],
    files: ['apps/api/src/fhir/'],
    verify: ['ETag present on FHIR responses', 'Conditional GET returns 304 when unchanged', 'Cache headers correct', 'Stale cache detected and refreshed'],
  },
  195: {
    steps: [
      'Implement SMART launch context for EHR launch flow',
      'Add CapabilityStatement endpoint (/fhir/r4/metadata)',
      'Declare supported authorization scopes per SMART spec',
      'Configure SMART well-known endpoint for discovery',
    ],
    files: ['apps/api/src/fhir/'],
    verify: ['CapabilityStatement valid R4', 'SMART launch context works', 'Scopes declared correctly', 'Well-known endpoint accessible'],
  },
  196: {
    steps: [
      'Create FHIR R4 conformance test suite against official profiles',
      'Validate all resource responses against R4 schemas',
      'Test search parameter combinations for each resource',
      'Document known gaps vs full R4 support',
    ],
    files: ['apps/api/src/fhir/', 'tests/fhir/'],
    verify: ['Resources pass R4 validation', 'Conformance tests pass', 'Search params tested', 'Gaps documented'],
  },
};

// Corrected content for phases 197-210 (WAVE3 misaligned entries)
const WAVE3_FIX = {
  197: {
    steps: [
      'Set up ArgoCD agent configuration and repository connection',
      'Define ApplicationSet for multi-tenant deployments',
      'Configure Git source watching on main branch',
      'Add sync policy with auto-prune for deleted resources',
    ],
    files: ['infra/gitops/'],
    verify: ['ArgoCD connects to repo', 'Auto-sync triggers on push', 'Prune removes deleted resources', 'Multi-tenant apps deployed'],
  },
  198: {
    steps: [
      'Define dev, staging, rc, prod environment configurations',
      'Create per-environment Helm values overlays',
      'Document environment promotion criteria and gates',
      'Configure environment-specific feature flags and limits',
    ],
    files: ['infra/helm/', 'docs/architecture/'],
    verify: ['All environments have distinct configs', 'Helm overlays render correctly', 'Promotion criteria documented', 'Feature flags per-environment work'],
  },
  199: {
    steps: [
      'Configure GitHub Actions CI pipeline for pull requests',
      'Add lint, type-check, unit test, and QA gate steps',
      'Require all gates green before merge to main',
      'Add Helm chart validation step to CI pipeline',
    ],
    files: ['.github/workflows/'],
    verify: ['CI runs on every PR', 'All gate steps execute', 'Failed gates block merge', 'Charts validated in CI'],
  },
  200: {
    steps: [
      'Define continuous deployment pipeline from main branch',
      'Configure image build and push to registry on merge',
      'Add deployment stages with automatic rollback support',
      'Integrate with ArgoCD for GitOps-driven deployment',
    ],
    files: ['.github/workflows/', 'infra/gitops/'],
    verify: ['CD triggers on merge to main', 'Images pushed successfully', 'Deployment proceeds automatically', 'Rollback mechanism tested'],
  },
  201: {
    steps: [
      'Configure canary deployment with progressive traffic shifting',
      'Define metrics-based promotion criteria (error rate, latency)',
      'Add automatic rollback on SLO violation during canary',
      'Integrate canary metrics with Prometheus alerts',
    ],
    files: ['infra/', 'services/observability/'],
    verify: ['Canary receives configured traffic percentage', 'Metrics gate promotion correctly', 'Auto-rollback on errors works', 'Alerts fire on canary issues'],
  },
  202: {
    steps: [
      'Implement automatic rollback triggered by health check failures',
      'Define rollback policy (revision count, timeout thresholds)',
      'Add rollback event notification and audit logging',
      'Test rollback under various failure scenarios',
    ],
    files: ['infra/', 'apps/api/'],
    verify: ['Rollback triggers on health failure', 'Correct previous revision restored', 'Rollback event logged', 'Notification sent to operations'],
  },
  203: {
    steps: [
      'Define organizational policies in OPA Rego format',
      'Configure policy enforcement in CI/CD pipeline',
      'Add admission controller policies for K8s namespaces',
      'Create policy test suite with expected outcomes',
    ],
    files: ['infra/opa/', '.github/workflows/'],
    verify: ['Policies evaluate correctly', 'CI enforces policies', 'K8s admission controller active', 'Policy tests pass'],
  },
  204: {
    steps: [
      'Generate Software Bill of Materials for all container images',
      'Sign SBOM attestations with cosign/sigstore toolchain',
      'Store attestations alongside container image manifests',
      'Add SBOM verification step to deployment pipeline',
    ],
    files: ['.github/workflows/', 'infra/'],
    verify: ['SBOM generated for each image', 'Attestations signed and verifiable', 'Verification passes before deploy', 'SBOM queryable for dependency audit'],
  },
  205: {
    steps: [
      'Define SLOs for API availability, latency, and error budget',
      'Implement burn rate alerting with fast and slow windows',
      'Configure multi-window alert thresholds per SLO',
      'Create runbook links in alert annotations for responders',
    ],
    files: ['services/observability/', 'docs/runbooks/'],
    verify: ['SLOs defined for key services', 'Burn rate alerts fire on budget consumption', 'Multi-window thresholds tuned', 'Runbook links in alerts'],
  },
  206: {
    steps: [
      'Create Playwright E2E smoke test suite for critical user paths',
      'Cover login, patient search, CPRS panel navigation flows',
      'Add portal patient-facing flow tests with accessibility checks',
      'Integrate E2E tests into CI pipeline with retry support',
    ],
    files: ['apps/web/e2e/', '.github/workflows/'],
    verify: ['E2E tests pass against staging', 'Critical paths covered', 'Portal flows tested', 'CI integration works'],
  },
  207: {
    steps: [
      'Create CLI tool for multi-tenant fleet-wide rollouts',
      'Implement progressive rollout strategy (canary, ring, full)',
      'Add dry-run mode for rollout preview before execution',
      'Configure rollout status tracking and reporting dashboard',
    ],
    files: ['scripts/', 'infra/'],
    verify: ['CLI performs fleet rollout', 'Progressive stages work', 'Dry-run shows plan without changes', 'Status tracked per tenant'],
  },
  208: {
    steps: [
      'Generate compliance evidence artifacts from automated QA gates',
      'Map QA gate results to regulatory requirements (HIPAA, SOC2)',
      'Create evidence collection pipeline with scheduled runs',
      'Archive compliance evidence with timestamps and integrity hashes',
    ],
    files: ['scripts/', 'docs/security/'],
    verify: ['Evidence artifacts generated', 'Regulatory mapping complete', 'Collection pipeline runs on schedule', 'Archive integrity verifiable'],
  },
  209: {
    steps: [
      'Document cross-region disaster recovery architecture',
      'Define data residency requirements per region',
      'Create region-specific Helm values and failover procedures',
      'Plan cross-region PG replication and VistA global sync',
    ],
    files: ['infra/', 'docs/architecture/'],
    verify: ['Architecture documented', 'Data residency accounted for', 'Regional configs exist', 'Failover planned and tested'],
  },
  210: {
    steps: [
      'Create comprehensive go-live runbook with pre-flight checklist',
      'Document rollback procedures for each service component',
      'Define go/no-go criteria based on QA gate results',
      'Create post-launch monitoring checklist and escalation contacts',
      'Archive all verification artifacts for audit trail',
    ],
    files: ['docs/runbooks/', 'scripts/'],
    verify: ['Runbook covers all services', 'Rollback procedures tested', 'Go/no-go criteria defined', 'Monitoring checklist complete'],
  },
};

const allFixes = { ...WAVE2_FIX, ...WAVE3_FIX };

// Scan prompt directories for wave phase folders
const dirs = readdirSync(PROMPTS).filter(d => {
  const p = join(PROMPTS, d);
  return statSync(p).isDirectory() && /PHASE-\d+/.test(d);
});

let fixed = 0;
let skipped = 0;

for (const dir of dirs) {
  const m = dir.match(/PHASE-(\d+)/);
  if (!m) continue;
  const phaseNum = parseInt(m[1]);
  if (!allFixes[phaseNum]) { skipped++; continue; }

  const data = allFixes[phaseNum];
  const title = titleFromFolder(dir);
  if (!title) { skipped++; continue; }

  const dirPath = join(PROMPTS, dir);
  const files = readdirSync(dirPath);

  for (const file of files) {
    const filePath = join(dirPath, file);
    const isVerify = file.includes('VERIFY') || file.includes('99');
    const isImplement = file.includes('IMPLEMENT') || file.includes('01');
    if (!isVerify && !isImplement) continue;

    let lines;
    if (isVerify) {
      lines = [
        `# Phase ${phaseNum} -- Verify: ${title}`,
        '',
        '## Verification Steps',
        ...data.verify.map((v, i) => `${i + 1}. ${v}`),
        '',
        '## Acceptance Criteria',
        ...data.verify.map(v => `- [ ] ${v}`),
        '',
        '## Source',
        '- Derived from wave playbook decomposition (Q213-Q215)',
        '- Original phase specification in wave mega-document',
        '- Corrected by audit fix (title alignment with folder name)',
        '',
        '## Notes',
        '- All verification steps require the relevant infrastructure to be running',
        '- Run the corresponding phase verifier script if available',
        '',
      ];
    } else {
      lines = [
        `# Phase ${phaseNum} -- ${title}`,
        '',
        '## Implementation Steps',
        ...data.steps.map((s, i) => `${i + 1}. ${s}`),
        '',
        '## Files Touched',
        ...data.files.map(f => `- ${f}`),
        '',
        '## Source',
        '- Derived from wave playbook decomposition (Q213-Q215)',
        '- Original phase specification in wave mega-document',
        '- Corrected by audit fix (title alignment with folder name)',
        '',
        '## Dependencies',
        '- Requires completion of prior phases in the wave sequence',
        '- See wave playbook for cross-phase dependencies',
        '',
      ];
    }

    writeFileSync(filePath, lines.join('\n'));
    fixed++;
    console.log(`  FIXED  ${dir}/${file} -> "${title}"`);
  }
}

console.log(`\n=== Wave Title Fix ===`);
console.log(`  Fixed:   ${fixed} files`);
console.log(`  Skipped: ${skipped} dirs (not in fix scope)`);
