/**
 * Audit Shipping Posture — Phase 157
 *
 * Production readiness checks for audit JSONL replication to object store.
 * Gates:
 *   1. AUDIT_SHIP_ENABLED is true
 *   2. S3 credentials configured (access key + secret key)
 *   3. Shipper job is running
 *   4. S3 bucket is reachable
 *   5. At least one manifest exists (entries have been shipped)
 *   6. Audit file exists and has entries to ship
 */

import { existsSync } from "fs";
import {
  getShipperStatus,
  checkS3Connectivity,
  getShipperManifests,
} from "../audit-shipping/index.js";

export interface AuditShippingPosture {
  domain: string;
  score: number;
  gates: { name: string; pass: boolean; detail: string }[];
}

export async function checkAuditShippingPosture(): Promise<AuditShippingPosture> {
  const status = getShipperStatus();
  const gates: { name: string; pass: boolean; detail: string }[] = [];

  // Gate 1: Shipping enabled
  gates.push({
    name: "audit_ship_enabled",
    pass: status.enabled,
    detail: status.enabled
      ? "AUDIT_SHIP_ENABLED=true"
      : "AUDIT_SHIP_ENABLED is not true (shipping disabled)",
  });

  // Gate 2: Credentials configured
  const hasCredentials = status.enabled &&
    status.endpoint !== "(disabled)" &&
    process.env.AUDIT_SHIP_ACCESS_KEY !== undefined &&
    process.env.AUDIT_SHIP_SECRET_KEY !== undefined;
  gates.push({
    name: "s3_credentials_configured",
    pass: hasCredentials,
    detail: hasCredentials
      ? `Credentials set for ${status.endpoint}`
      : "AUDIT_SHIP_ACCESS_KEY and/or AUDIT_SHIP_SECRET_KEY not set",
  });

  // Gate 3: Shipper job running
  gates.push({
    name: "shipper_job_running",
    pass: status.jobRunning,
    detail: status.jobRunning
      ? `Job running (interval: ${status.intervalMs}ms)`
      : "Shipper job is not running",
  });

  // Gate 4: S3 connectivity
  let s3Reachable = false;
  let s3Detail = "Not checked (shipping disabled)";
  if (status.enabled) {
    try {
      const connectivity = await checkS3Connectivity();
      s3Reachable = connectivity.ok;
      s3Detail = connectivity.ok
        ? `Bucket ${status.bucket} reachable at ${status.endpoint}`
        : `Bucket unreachable: ${connectivity.error || "unknown"}`;
    } catch (err: any) {
      s3Detail = `Connectivity check failed: ${err.message}`;
    }
  }
  gates.push({
    name: "s3_bucket_reachable",
    pass: s3Reachable,
    detail: s3Detail,
  });

  // Gate 5: Manifests exist
  const manifestCount = getShipperManifests(1).length;
  gates.push({
    name: "manifests_exist",
    pass: manifestCount > 0,
    detail: manifestCount > 0
      ? `${status.totalManifests} manifests created, ${status.totalEntriesShipped} entries shipped`
      : "No manifests created yet (no entries shipped)",
  });

  // Gate 6: Audit file exists
  const auditFilePath = process.env.IMMUTABLE_AUDIT_FILE_PATH || "logs/immutable-audit.jsonl";
  const fileExists = existsSync(auditFilePath);
  gates.push({
    name: "audit_file_exists",
    pass: fileExists,
    detail: fileExists
      ? `Audit file found at ${auditFilePath}`
      : `Audit file not found at ${auditFilePath}`,
  });

  const passCount = gates.filter((g) => g.pass).length;
  const score = Math.round((passCount / gates.length) * 100);

  return {
    domain: "audit-shipping",
    score,
    gates,
  };
}
