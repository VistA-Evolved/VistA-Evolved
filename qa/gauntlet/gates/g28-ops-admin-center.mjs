/**
 * G28: Ops Admin Center gate (Phase 171)
 *
 * Validates:
 *  1. API route file with 4 endpoints
 *  2. Admin UI page exists
 *  3. Posture aggregation (imports posture modules)
 *  4. Alert generation with severity levels
 *  5. Store inventory endpoint
 *  6. Runbook index endpoint
 *  7. No PHI in ops data
 *  8. Routes wired in index.ts
 *  9. Runbook exists
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");

function fileContent(rel) {
  const p = resolve(ROOT, rel);
  if (!existsSync(p)) return null;
  return readFileSync(p, "utf-8");
}

export const meta = {
  id: "G28_ops_admin_center",
  name: "Ops Admin Center",
  phase: 171,
  tags: ["ops", "admin", "posture"],
};

export async function run(_ctx) {
  const issues = [];
  const details = [];

  // 1. Route file exists with endpoints
  const routeSrc = fileContent("apps/api/src/routes/ops-admin.ts");
  if (!routeSrc) {
    issues.push("ops-admin.ts missing");
    return { status: "fail", issues, details };
  }
  details.push("ops-admin.ts exists");

  for (const ep of ["/admin/ops/overview", "/admin/ops/alerts", "/admin/ops/runbooks", "/admin/ops/store-inventory"]) {
    if (routeSrc.includes(ep)) details.push(`Endpoint: ${ep}`);
    else issues.push(`Missing endpoint: ${ep}`);
  }

  // 2. Admin UI page
  const uiPage = fileContent("apps/web/src/app/cprs/admin/ops/page.tsx");
  if (uiPage) {
    details.push("Admin UI page exists");
    if (uiPage.includes("Ops Admin Center")) details.push("Page has correct title");
    else issues.push("Page missing title");
  } else {
    issues.push("Admin UI page missing");
  }

  // 3. Posture aggregation
  if (routeSrc.includes("posture")) details.push("Posture modules referenced");
  else issues.push("No posture aggregation");

  // 4. Alert generation
  if (routeSrc.includes("AlertSeverity") || routeSrc.includes("severity")) details.push("Alert severity levels present");
  else issues.push("No alert severity");
  if (routeSrc.includes("generateAlerts")) details.push("Alert generation function");
  else issues.push("No generateAlerts function");

  // 5. Store inventory
  if (routeSrc.includes("store-inventory")) details.push("Store inventory endpoint");
  else issues.push("No store inventory");

  // 6. Runbook index
  if (routeSrc.includes("indexRunbooks")) details.push("Runbook indexing function");
  else issues.push("No runbook indexing");

  // 7. No PHI
  const phiPatterns = [/\d{3}-\d{2}-\d{4}/, /SSN/i, /patientName/];
  for (const pat of phiPatterns) {
    if (pat.test(routeSrc)) issues.push(`PHI pattern in ops-admin.ts: ${pat.source}`);
  }
  details.push("No PHI detected");

  // 8. Wired in index.ts
  const indexSrc = fileContent("apps/api/src/index.ts");
  if (indexSrc) {
    if (indexSrc.includes("ops-admin")) details.push("Imported in index.ts");
    else issues.push("Not imported in index.ts");
    if (indexSrc.includes("opsAdminRoutes")) details.push("Registered in index.ts");
    else issues.push("Not registered in index.ts");
  }

  // 9. Runbook
  if (existsSync(resolve(ROOT, "docs/runbooks/phase171-ops-admin-center.md"))) {
    details.push("Runbook exists");
  } else {
    issues.push("Runbook missing");
  }

  const status = issues.length === 0 ? "pass" : "fail";
  return { status, issues, details };
}
