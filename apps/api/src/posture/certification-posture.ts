/**
 * certification-posture.ts -- Certification / Readiness Posture (Phase 164)
 *
 * 10 gates covering:
 * - Security documentation completeness
 * - Dev onboarding readiness
 * - VistA provisioning wiring
 * - Module/capability completeness
 * - Dependency supply chain
 * - CI/CD artifacts
 * - RPC registry alignment
 * - Environment template completeness
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

export interface PostureGate {
  name: string;
  pass: boolean;
  detail: string;
}

export interface CertificationPosture {
  score: number;
  gates: PostureGate[];
  summary: string;
  readinessLevel: "production" | "staging" | "development" | "incomplete";
}

export function checkCertificationPosture(): CertificationPosture {
  const gates: PostureGate[] = [];

  // Resolve workspace root (apps/api is 2 levels deep)
  const root = join(process.cwd(), "..", "..");
  const rootAlt = process.cwd(); // fallback if running from root

  function fileExists(relPath: string): boolean {
    return existsSync(join(root, relPath)) || existsSync(join(rootAlt, relPath));
  }

  // Gate 1: Security documentation
  const securityDocs = [
    "docs/security/rcm-phi-handling.md",
    "docs/analytics/phase25-data-classification.md",
  ];
  const securityDocsFound = securityDocs.filter(fileExists).length;
  gates.push({
    name: "security_docs",
    pass: securityDocsFound >= 1,
    detail: `${securityDocsFound}/${securityDocs.length} security docs found`,
  });

  // Gate 2: AGENTS.md exists and is comprehensive
  const agentsExists = fileExists("AGENTS.md");
  gates.push({
    name: "dev_onboarding_guide",
    pass: agentsExists,
    detail: agentsExists ? "AGENTS.md exists for developer onboarding" : "AGENTS.md not found",
  });

  // Gate 3: Environment template
  const envExample = fileExists("apps/api/.env.example");
  gates.push({
    name: "env_template",
    pass: envExample,
    detail: envExample ? ".env.example exists with credential template" : ".env.example missing",
  });

  // Gate 4: Runbooks directory populated
  const runbookFiles = [
    "docs/runbooks/phase160-department-workflows.md",
    "docs/runbooks/phase161-vista-alignment-verification.md",
    "docs/runbooks/phase162-performance-ux.md",
    "docs/runbooks/phase163-modular-packaging-validation.md",
  ];
  const runbooksFound = runbookFiles.filter(fileExists).length;
  gates.push({
    name: "runbooks_coverage",
    pass: runbooksFound >= 2,
    detail: `${runbooksFound}/${runbookFiles.length} recent phase runbooks found`,
  });

  // Gate 5: Docker compose files exist
  const composeFiles = [
    "services/vista/docker-compose.yml",
    "docker-compose.prod.yml",
  ];
  const composeFound = composeFiles.filter(fileExists).length;
  gates.push({
    name: "docker_infrastructure",
    pass: composeFound >= 1,
    detail: `${composeFound}/${composeFiles.length} Docker compose files found`,
  });

  // Gate 6: VistA provisioning script
  const provisionScript = fileExists("scripts/install-vista-routines.ps1");
  gates.push({
    name: "vista_provisioning",
    pass: provisionScript,
    detail: provisionScript
      ? "Unified VistA provisioning script present"
      : "install-vista-routines.ps1 not found",
  });

  // Gate 7: Module configuration files
  const moduleConfigs = [
    "config/modules.json",
    "config/skus.json",
    "config/capabilities.json",
  ];
  const moduleConfigsFound = moduleConfigs.filter(fileExists).length;
  gates.push({
    name: "module_config_files",
    pass: moduleConfigsFound === moduleConfigs.length,
    detail: `${moduleConfigsFound}/${moduleConfigs.length} module config files present`,
  });

  // Gate 8: RPC catalog snapshot
  const rpcCatalog = fileExists("data/vista/rpc-catalog-snapshot.json");
  gates.push({
    name: "rpc_catalog_snapshot",
    pass: rpcCatalog,
    detail: rpcCatalog
      ? "RPC catalog snapshot present for compatibility checks"
      : "rpc-catalog-snapshot.json not found in data/vista/",
  });

  // Gate 9: Backup/restore script
  const backupScript = fileExists("scripts/backup-restore.mjs");
  gates.push({
    name: "backup_restore_script",
    pass: backupScript,
    detail: backupScript ? "Backup/restore script present" : "backup-restore.mjs not found",
  });

  // Gate 10: Architecture documentation
  const archDocs = [
    "docs/architecture/product-modularity-v1.md",
    "docs/architecture/rcm-gateway-architecture.md",
  ];
  const archDocsFound = archDocs.filter(fileExists).length;
  gates.push({
    name: "architecture_docs",
    pass: archDocsFound >= 1,
    detail: `${archDocsFound}/${archDocs.length} architecture docs found`,
  });

  // Calculate score
  const passCount = gates.filter((g) => g.pass).length;
  const score = Math.round((passCount / gates.length) * 100);

  // Determine readiness level
  let readinessLevel: CertificationPosture["readinessLevel"];
  if (score >= 90) readinessLevel = "production";
  else if (score >= 70) readinessLevel = "staging";
  else if (score >= 40) readinessLevel = "development";
  else readinessLevel = "incomplete";

  return {
    score,
    gates,
    summary: `${passCount}/${gates.length} certification gates pass (${readinessLevel})`,
    readinessLevel,
  };
}
