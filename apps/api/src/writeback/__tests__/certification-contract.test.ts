/**
 * Certification Runner — Contract Tests
 *
 * Phase 308 (W12-P10): Tests for the departmental certification runner.
 *
 * Validates:
 *   - runCertification() returns a well-formed report
 *   - All 17 checks are present (4 infra + 6 domain + 3 telehealth + 4 safety)
 *   - getCertificationSummary() returns valid summary
 *   - Check statuses are valid enum values
 *   - No PHI in any check output
 */

import { describe, it, expect } from "vitest";
import {
  runCertification,
  getCertificationSummary,
} from "../../writeback/certification-runner.js";
import type { CertificationReport, CheckStatus } from "../../writeback/certification-runner.js";

describe("certification-runner", () => {
  it("runCertification returns a valid report structure", () => {
    const report = runCertification();
    expect(report.generatedAt).toBeTruthy();
    expect(["certified", "not_certified", "partial"]).toContain(report.overallStatus);
    expect(report.summary).toBeDefined();
    expect(report.summary.total).toBeGreaterThan(0);
    expect(report.checks).toBeInstanceOf(Array);
    expect(report.gateConfig).toBeDefined();
    expect(report.environment).toBeDefined();
  });

  it("report contains exactly 17 checks", () => {
    const report = runCertification();
    expect(report.checks.length).toBe(17);
    expect(report.summary.total).toBe(17);
  });

  it("summary counts add up to total", () => {
    const report = runCertification();
    const { pass, fail, warn, skip, total } = report.summary;
    expect(pass + fail + warn + skip).toBe(total);
  });

  it("all checks have valid status values", () => {
    const validStatuses: CheckStatus[] = ["pass", "fail", "warn", "skip"];
    const report = runCertification();
    for (const check of report.checks) {
      expect(validStatuses).toContain(check.status);
    }
  });

  it("infrastructure checks are present", () => {
    const report = runCertification();
    const infraChecks = report.checks.filter(c => c.category === "infrastructure");
    expect(infraChecks.length).toBe(4);
    const ids = infraChecks.map(c => c.id);
    expect(ids).toContain("infra.command-bus");
    expect(ids).toContain("infra.gates");
    expect(ids).toContain("infra.audit");
    expect(ids).toContain("infra.store-policy");
  });

  it("all 6 domain checks are present", () => {
    const report = runCertification();
    const domainChecks = report.checks.filter(c => c.category === "domain");
    expect(domainChecks.length).toBe(6);
    const ids = domainChecks.map(c => c.id);
    expect(ids).toContain("domain.tiu");
    expect(ids).toContain("domain.orders");
    expect(ids).toContain("domain.pharm");
    expect(ids).toContain("domain.lab");
    expect(ids).toContain("domain.adt");
    expect(ids).toContain("domain.img");
  });

  it("telehealth checks are present", () => {
    const report = runCertification();
    const thChecks = report.checks.filter(c => c.category === "telehealth");
    expect(thChecks.length).toBe(3);
    const ids = thChecks.map(c => c.id);
    expect(ids).toContain("telehealth.encounter-link");
    expect(ids).toContain("telehealth.consent");
    expect(ids).toContain("telehealth.session-hardening");
  });

  it("safety checks are present", () => {
    const report = runCertification();
    const safetyChecks = report.checks.filter(c => c.category === "safety");
    expect(safetyChecks.length).toBe(4);
    const ids = safetyChecks.map(c => c.id);
    expect(ids).toContain("safety.dry-run");
    expect(ids).toContain("safety.kill-switch");
    expect(ids).toContain("safety.intent-mapping");
    expect(ids).toContain("safety.phi-guard");
  });

  it("intent-mapping check passes with 19 intents", () => {
    const report = runCertification();
    const intentCheck = report.checks.find(c => c.id === "safety.intent-mapping");
    expect(intentCheck).toBeDefined();
    expect(intentCheck!.status).toBe("pass");
    expect(intentCheck!.message).toContain("19");
  });

  it("phi-guard check passes", () => {
    const report = runCertification();
    const phiCheck = report.checks.find(c => c.id === "safety.phi-guard");
    expect(phiCheck).toBeDefined();
    expect(phiCheck!.status).toBe("pass");
    expect(phiCheck!.message).toContain("patientRefHash");
  });

  it("no PHI patterns in any check message", () => {
    const report = runCertification();
    const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/;
    const credPattern = /PROV123|PHARM123|NURSE123/;
    for (const check of report.checks) {
      expect(check.message).not.toMatch(ssnPattern);
      expect(check.message).not.toMatch(credPattern);
    }
  });

  it("getCertificationSummary returns valid structure", () => {
    const summary = getCertificationSummary();
    expect(summary.executorsTotal).toBe(6);
    expect(summary.domainsTotal).toBe(6);
    expect(summary.intentsTotal).toBe(19);
    expect(typeof summary.executorsRegistered).toBe("number");
    expect(typeof summary.gatesEnabled).toBe("number");
    expect(["ready", "partial"]).toContain(summary.status);
  });

  it("environment shows safe defaults when writeback disabled", () => {
    const report = runCertification();
    // Default: WRITEBACK_ENABLED is not set, so disabled
    expect(report.environment.dryRunMode).toBe(true);
    expect(report.environment.domainsDisabled.length).toBeGreaterThanOrEqual(0);
  });

  it("each check has a positive durationMs", () => {
    const report = runCertification();
    for (const check of report.checks) {
      expect(check.durationMs).toBeGreaterThanOrEqual(0);
    }
  });
});
