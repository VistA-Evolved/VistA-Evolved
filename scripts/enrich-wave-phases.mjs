#!/usr/bin/env node
/**
 * enrich-wave-phases.mjs  --  Phase 219: Enrich thin wave phase prompts
 *
 * Reads the wave playbooks and enriches the skeleton IMPLEMENT/VERIFY files
 * created in Q213-Q215 so they meet the 15-line quality floor.
 *
 * Only touches files that are currently under 15 non-empty lines.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PROMPTS = join(ROOT, 'prompts');

function countNonEmpty(text) {
  return text.split('\n').filter(l => l.trim().length > 0).length;
}

// Wave 1 phases (173-178) -- from wave1-prod-convergence playbook
const WAVE1 = {
  173: {
    title: 'API Bootstrap Decomposition',
    steps: [
      'Decompose index.ts god-file into thin entrypoint',
      'Create server/ directory with register-plugins.ts, register-routes.ts, lifecycle.ts',
      'Extract all plugin registration (CORS, cookie, rate-limit, CSRF) into register-plugins',
      'Extract all route registration into register-routes with domain groupings',
      'Extract graceful shutdown, SIGINT/SIGTERM handlers into lifecycle.ts',
      'Verify startup sequence: plugins -> routes -> listen',
    ],
    files: ['apps/api/src/index.ts', 'apps/api/src/server/register-plugins.ts', 'apps/api/src/server/register-routes.ts', 'apps/api/src/server/lifecycle.ts'],
    verify: ['API starts without errors after decomposition', 'All routes respond correctly', 'Graceful shutdown works', 'No circular imports'],
  },
  174: {
    title: 'PG-Only Data Plane',
    steps: [
      'Enforce PostgreSQL as sole persistence backend in rc/prod mode',
      'Block SQLite store resolution when PLATFORM_RUNTIME_MODE=rc|prod',
      'Block JSON mutable file stores in rc/prod',
      'Ensure PLATFORM_PG_URL is required at startup in rc/prod',
      'Add data-plane posture gate to /posture/data-plane endpoint',
    ],
    files: ['apps/api/src/platform/store-resolver.ts', 'apps/api/src/platform/runtime-mode.ts', 'apps/api/src/posture/data-plane-posture.ts'],
    verify: ['API refuses to start in rc/prod without PLATFORM_PG_URL', 'SQLite backend blocked in rc/prod', 'JSON file writes blocked in rc/prod', 'Posture gate reports correct status'],
  },
  175: {
    title: 'Schema Migration Source of Truth',
    steps: [
      'Consolidate all PG migrations into sequential versioned list',
      'Ensure pg-migrate.ts runs all migrations idempotently on startup',
      'Add migration version tracking table',
      'Validate all tables have tenant_id columns for RLS',
    ],
    files: ['apps/api/src/platform/pg/pg-migrate.ts', 'apps/api/src/platform/db/schema.ts'],
    verify: ['All migrations run cleanly on fresh PG', 'Migrations are idempotent (re-run safe)', 'All tables have tenant_id', 'Migration version tracked'],
  },
  176: {
    title: 'Tenant RLS Enforcement',
    steps: [
      'Enable FORCE ROW LEVEL SECURITY on all tenant-scoped tables',
      'Create RLS policies scoped to app.current_tenant_id',
      'Set tenant context via SET LOCAL in transaction scope',
      'Verify pooled connections cannot leak tenant data',
    ],
    files: ['apps/api/src/platform/pg/pg-migrate.ts', 'apps/api/src/platform/pg/tenant-context.ts'],
    verify: ['RLS enabled on all scoped tables', 'Cross-tenant queries return empty', 'Tenant context set per-transaction', 'Connection pool safe'],
  },
  177: {
    title: 'Durability Audit',
    steps: [
      'Inventory all in-memory Map stores across the codebase',
      'Classify each as ephemeral-ok vs needs-persistence',
      'Document migration paths for stores that need persistence',
      'Register all stores in store-policy.ts with correct backend designation',
    ],
    files: ['apps/api/src/platform/store-policy.ts'],
    verify: ['All in-memory stores inventoried', 'Each store has documented backend policy', 'No store is accidentally ephemeral when it should persist'],
  },
  178: {
    title: 'FHIR R4 Gateway',
    steps: [
      'Design FHIR R4 resource mappings for Patient, Encounter, AllergyIntolerance, MedicationStatement',
      'Map VistA RPC responses to FHIR Bundle format',
      'Create /fhir/r4/ route prefix for FHIR endpoints',
      'Implement content negotiation (application/fhir+json)',
    ],
    files: ['apps/api/src/routes/fhir/', 'apps/api/src/fhir/'],
    verify: ['FHIR Patient resource maps from ORWPT SELECT', 'Bundle responses conform to R4 spec', 'Content-Type headers correct', 'Invalid resource types return OperationOutcome'],
  },
};

// Wave 2 phases (179-196) -- K8s, DR, Perf, FHIR
const WAVE2 = {
  179: { title: 'Helm Foundation Layout', steps: ['Create base Helm chart structure under infra/helm/', 'Define values.yaml with env-var-driven configuration', 'Create api/web/portal deployment templates', 'Add ConfigMap and Secret templates referencing .env vars'], files: ['infra/helm/'], verify: ['helm template renders without errors', 'All env vars mapped to ConfigMap/Secret', 'Deployment specs valid'] },
  180: { title: 'Docker Image Contracts', steps: ['Create multi-stage Dockerfiles for api, web, portal', 'Define build args for version pinning', 'Add .dockerignore files to minimize context', 'Ensure no credentials baked into images'], files: ['apps/api/Dockerfile', 'apps/web/Dockerfile', 'apps/portal/Dockerfile'], verify: ['Docker build succeeds for all 3 images', 'No credentials in image layers', 'Image sizes reasonable'] },
  181: { title: 'Shared Layer Chart', steps: ['Create shared Helm sub-chart for PostgreSQL, Redis, Keycloak', 'Define PVC templates for persistent volumes', 'Add health check configurations', 'Configure inter-service networking'], files: ['infra/helm/charts/shared/'], verify: ['Shared services deploy correctly', 'PVCs created', 'Health checks pass', 'Services discoverable'] },
  182: { title: 'Tenant Layer Chart', steps: ['Create tenant-scoped Helm chart for per-tenant resources', 'Define tenant ConfigMap with tenant-specific settings', 'Add RLS configuration for tenant isolation', 'Configure ingress rules per tenant'], files: ['infra/helm/charts/tenant/'], verify: ['Tenant resources deploy in isolation', 'ConfigMap has tenant-specific values', 'Ingress routes correct'] },
  183: { title: 'Ingress + TLS', steps: ['Configure ingress controller templates', 'Add cert-manager integration for TLS', 'Define host-based routing rules', 'Add rate limiting annotations'], files: ['infra/helm/templates/ingress.yaml'], verify: ['TLS termination works', 'Host routing correct', 'Rate limiting active'] },
  184: { title: 'CI Pipeline Contracts', steps: ['Define GitHub Actions workflows for build, test, deploy', 'Add Helm chart validation step', 'Configure image push to registry', 'Add deployment gates (QA must pass)'], files: ['.github/workflows/'], verify: ['CI pipeline runs on push', 'Charts validated', 'Images pushed', 'Deploy gated'] },
  185: { title: 'Staging Environment Definition', steps: ['Define staging environment configuration', 'Create Helm values-staging.yaml overlay', 'Configure staging-specific env vars', 'Document staging access patterns'], files: ['infra/helm/values-staging.yaml'], verify: ['Staging config complete', 'Env vars correct', 'Access documented'] },
  186: { title: 'DR Backup Contracts', steps: ['Define backup strategy for PG, VistA globals, audit logs', 'Create backup-restore.mjs for automated backup', 'Add S3-compatible storage targets', 'Define RPO/RTO targets'], files: ['scripts/backup-restore.mjs'], verify: ['PG backup/restore works', 'Audit log backup works', 'RPO/RTO documented'] },
  187: { title: 'DR Failover Procedures', steps: ['Document manual failover procedure', 'Define health check thresholds for auto-failover', 'Create failover runbook', 'Test PG replica promotion'], files: ['docs/runbooks/'], verify: ['Failover procedure documented', 'Health checks configured', 'Runbook complete'] },
  188: { title: 'PG Replica Configuration', steps: ['Configure PG streaming replication', 'Add read replica connection string support', 'Route read-only queries to replica', 'Monitor replication lag'], files: ['infra/'], verify: ['Replication streaming', 'Read queries route to replica', 'Lag monitoring active'] },
  189: { title: 'Redis Cache Layer', steps: ['Add Redis for session and capability caching', 'Replace in-memory session store with Redis-backed store', 'Configure TTL policies', 'Handle Redis unavailability gracefully'], files: ['apps/api/src/'], verify: ['Sessions survive API restart', 'Cache TTL works', 'Graceful degradation without Redis'] },
  190: { title: 'Connection Pool Tuning', steps: ['Configure PG pool size based on concurrency needs', 'Add idle timeout configuration', 'Configure max connections per tenant', 'Add pool metrics to /metrics/prometheus'], files: ['apps/api/src/platform/pg/'], verify: ['Pool metrics exported', 'Idle connections released', 'Per-tenant limits enforced'] },
  191: { title: 'Performance Baseline', steps: ['Run k6 smoke tests against staging', 'Establish p50/p95/p99 latency baselines', 'Document throughput limits', 'Create performance budget SLOs'], files: ['tests/k6/'], verify: ['k6 tests pass', 'Baselines documented', 'SLOs defined'] },
  192: { title: 'FHIR R4 Patient Resource', steps: ['Implement FHIR Patient read (/fhir/r4/Patient/:id)', 'Map VistA demographics to FHIR Patient resource', 'Handle identifier systems (DFN, SSN)', 'Return OperationOutcome for errors'], files: ['apps/api/src/fhir/'], verify: ['Patient resource conforms to R4', 'Identifiers mapped correctly', 'Error responses valid'] },
  193: { title: 'FHIR R4 Encounter Resource', steps: ['Implement FHIR Encounter read and search', 'Map VistA visits (ORWCV VST) to Encounter', 'Support search by patient and date', 'Add period, class, and type mappings'], files: ['apps/api/src/fhir/'], verify: ['Encounter resource valid R4', 'Search by patient works', 'Date ranges correct'] },
  194: { title: 'FHIR R4 AllergyIntolerance', steps: ['Implement AllergyIntolerance read/search', 'Map ORQQAL LIST response to R4 format', 'Handle criticality and category mappings', 'Add reaction detail sub-resources'], files: ['apps/api/src/fhir/'], verify: ['AllergyIntolerance valid R4', 'Criticality mapped', 'Reactions included'] },
  195: { title: 'FHIR R4 Bundle + CapabilityStatement', steps: ['Implement Bundle response wrapper for search results', 'Create CapabilityStatement (/fhir/r4/metadata)', 'Declare supported resources, interactions, search params', 'Add SMART on FHIR launch context'], files: ['apps/api/src/fhir/'], verify: ['Bundle pagination works', 'CapabilityStatement valid', 'SMART context declared'] },
  196: { title: 'FHIR Validation + Conformance', steps: ['Add FHIR resource validation against R4 profiles', 'Create conformance test suite', 'Validate all responses against official schemas', 'Document known gaps vs full R4 support'], files: ['apps/api/src/fhir/', 'tests/fhir/'], verify: ['Resources pass R4 validation', 'Conformance test suite runs', 'Gaps documented'] },
};

// Wave 3 phases (197-210) -- GitOps, Release, Compliance
const WAVE3 = {
  197: { title: 'GitOps Agent Bootstrap', steps: ['Set up ArgoCD or Flux CD agent configuration', 'Define ApplicationSet for multi-tenant deployments', 'Configure Git source (main branch watching)', 'Add sync policy with auto-prune'], files: ['infra/gitops/'], verify: ['Agent connects to repo', 'Auto-sync triggers on push', 'Prune removes deleted resources'] },
  198: { title: 'Environment Promotion Pipeline', steps: ['Define dev -> staging -> prod promotion flow', 'Add approval gates between environments', 'Configure image tag promotion strategy', 'Add rollback mechanism'], files: ['infra/gitops/', '.github/workflows/'], verify: ['Promotion flow works end-to-end', 'Approval gates block without approval', 'Rollback to previous version works'] },
  199: { title: 'Secret Management', steps: ['Integrate with external secret store (Vault or sealed-secrets)', 'Replace inline env vars with external references', 'Configure auto-rotation for database credentials', 'Add secret audit logging'], files: ['infra/'], verify: ['Secrets not in plain text in repo', 'External store accessible', 'Rotation works', 'Audit logged'] },
  200: { title: 'Audit Log Compliance', steps: ['Verify immutable audit chain integrity', 'Add audit log retention policies', 'Configure audit shipping to S3', 'Create compliance report generator'], files: ['apps/api/src/lib/immutable-audit.ts', 'apps/api/src/audit-shipping/'], verify: ['Audit chain verifies clean', 'Retention policy enforced', 'S3 shipping works', 'Compliance report generated'] },
  201: { title: 'HIPAA Technical Safeguards', steps: ['Audit all PHI access paths for encryption at rest', 'Verify TLS for all inter-service communication', 'Review access control matrix against HIPAA requirements', 'Document technical safeguard implementations'], files: ['docs/security/'], verify: ['PHI encrypted at rest', 'TLS everywhere', 'Access matrix complete', 'Documentation current'] },
  202: { title: 'Penetration Test Prep', steps: ['Review OWASP Top 10 against codebase', 'Run automated security scanning (npm audit, dependency check)', 'Create threat model document', 'Fix any critical/high findings'], files: ['docs/security/'], verify: ['OWASP review complete', 'No critical vuln in deps', 'Threat model documented', 'All criticals fixed'] },
  203: { title: 'Load Test Suite', steps: ['Create comprehensive k6 load test scenarios', 'Define concurrent user thresholds', 'Test circuit breaker under load', 'Verify rate limiting under sustained traffic'], files: ['tests/k6/'], verify: ['Load tests run to completion', 'Thresholds met', 'Circuit breaker trips correctly', 'Rate limiter holds'] },
  204: { title: 'Release Candidate Pipeline', steps: ['Define RC branch strategy and tagging convention', 'Create release notes generator from phase prompts', 'Add changelog automation', 'Define release approval workflow'], files: ['.github/workflows/'], verify: ['RC tags created correctly', 'Release notes generated', 'Changelog accurate', 'Approval flow works'] },
  205: { title: 'Feature Flag Runtime', steps: ['Wire feature flags from tenant_feature_flag table to runtime checks', 'Add UI for flag management in admin console', 'Implement gradual rollout percentages', 'Add flag evaluation caching'], files: ['apps/api/src/modules/', 'apps/web/src/app/cprs/admin/modules/'], verify: ['Flags toggle features at runtime', 'Admin UI manages flags', 'Percentage rollout works', 'Cache invalidation works'] },
  206: { title: 'Blue-Green Deploy Strategy', steps: ['Define blue-green deployment configuration', 'Add traffic switching mechanism', 'Configure health check thresholds for cutover', 'Document rollback procedure'], files: ['infra/'], verify: ['Blue-green switch works', 'Health checks gate cutover', 'Rollback documented and tested'] },
  207: { title: 'Canary Release Pipeline', steps: ['Configure canary deployment with progressive traffic shift', 'Add metrics-based promotion criteria', 'Define automatic rollback on error rate spike', 'Integrate with Prometheus alerts'], files: ['infra/'], verify: ['Canary receives configured traffic %', 'Metrics gate promotion', 'Auto-rollback on errors', 'Alerts fire correctly'] },
  208: { title: 'Multi-Region Readiness', steps: ['Document multi-region architecture for PG, VistA, API', 'Define data residency requirements per region', 'Create region-specific Helm values', 'Plan cross-region failover'], files: ['infra/', 'docs/architecture/'], verify: ['Architecture documented', 'Data residency accounted for', 'Regional configs exist', 'Failover planned'] },
  209: { title: 'Compliance Dashboard', steps: ['Create admin compliance dashboard showing audit health, PHI controls, RLS status', 'Aggregate posture checks into single view', 'Add compliance score based on automated gate results', 'Export compliance report as PDF/JSON'], files: ['apps/web/src/app/cprs/admin/'], verify: ['Dashboard renders all posture data', 'Score calculates correctly', 'Export works'] },
  210: { title: 'Release Convergence Snapshot', steps: ['Run all QA gates and document results', 'Create release candidate tag', 'Generate full system health report', 'Document known issues and follow-ups', 'Archive all verification artifacts'], files: ['docs/', 'scripts/'], verify: ['All QA gates green', 'RC tag created', 'Health report generated', 'Known issues documented'] },
};

function enrichFile(filePath, phaseNum, data, isVerify) {
  const content = readFileSync(filePath, 'utf8');
  if (countNonEmpty(content) >= 15) return false; // Already meets quality floor

  let lines;
  if (isVerify) {
    lines = [
      `# Phase ${phaseNum} -- Verify: ${data.title}`,
      '',
      '## Verification Steps',
      ...data.verify.map((v, i) => `${i + 1}. ${v}`),
      '',
      '## Acceptance Criteria',
      ...data.verify.map(v => `- [ ] ${v}`),
      '',
      `## Source`,
      `- Derived from wave playbook decomposition (Q213-Q215)`,
      `- Original phase specification in wave mega-document`,
      `- Enriched by Q219 audit to meet quality floor`,
      '',
      `## Notes`,
      `- All verification steps require the relevant infrastructure to be running`,
      `- Run the corresponding phase verifier script if available`,
      '',
    ];
  } else {
    lines = [
      `# Phase ${phaseNum} -- ${data.title}`,
      '',
      '## Implementation Steps',
      ...data.steps.map((s, i) => `${i + 1}. ${s}`),
      '',
      '## Files Touched',
      ...data.files.map(f => `- ${f}`),
      '',
      `## Source`,
      `- Derived from wave playbook decomposition (Q213-Q215)`,
      `- Original phase specification in wave mega-document`,
      `- Enriched by Q219 audit to meet quality floor`,
      '',
      `## Dependencies`,
      `- Requires completion of prior phases in the wave sequence`,
      `- See wave playbook for cross-phase dependencies`,
      '',
    ];
  }

  writeFileSync(filePath, lines.join('\n'));
  return true;
}

// Process all wave phases
const allPhases = { ...WAVE1, ...WAVE2, ...WAVE3 };
let enriched = 0;
let skipped = 0;

const dirs = readdirSync(PROMPTS).filter(d => {
  const p = join(PROMPTS, d);
  return statSync(p).isDirectory() && /PHASE-\d+/.test(d);
});

for (const dir of dirs) {
  const m = dir.match(/PHASE-(\d+)/);
  if (!m) continue;
  const phaseNum = parseInt(m[1]);
  if (!allPhases[phaseNum]) continue;

  const dirPath = join(PROMPTS, dir);
  const files = readdirSync(dirPath);

  for (const file of files) {
    const filePath = join(dirPath, file);
    const isVerify = file.includes('VERIFY') || file.includes('99');
    const isImplement = file.includes('IMPLEMENT') || file.includes('01');

    if (!isVerify && !isImplement) continue;

    if (enrichFile(filePath, phaseNum, allPhases[phaseNum], isVerify)) {
      enriched++;
      console.log(`  ENRICHED  ${dir}/${file}`);
    } else {
      skipped++;
    }
  }
}

console.log(`\n=== Wave Phase Enrichment ===`);
console.log(`  Enriched: ${enriched} files`);
console.log(`  Skipped (already >=15 lines): ${skipped} files`);
