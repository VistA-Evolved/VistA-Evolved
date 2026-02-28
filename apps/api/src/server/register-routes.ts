/**
 * Server — Register Routes
 *
 * Phase 173: Extracted from index.ts — registers all Fastify route plugins
 * in the exact same order as the original monolithic file.
 * NO behavior change. NO route changes.
 */

import type { FastifyInstance } from "fastify";

// Auth routes
import authRoutes from "../auth/auth-routes.js";
import { requireSession } from "../auth/auth-routes.js";
import idpRoutes from "../auth/idp/idp-routes.js";
import { initIdentityProviders } from "../auth/idp/index.js";

// WebSocket console
import wsConsoleRoutes from "../routes/ws-console.js";

// Capabilities + write-backs
import capabilityRoutes from "../routes/capabilities.js";
import writeBackRoutes from "../routes/write-backs.js";

// Imaging domain
import imagingRoutes from "../services/imaging-service.js";
import imagingProxyRoutes from "../routes/imaging-proxy.js";
import imagingWorklistRoutes from "../services/imaging-worklist.js";
import imagingIngestRoutes from "../services/imaging-ingest.js";
import { imagingAuthzRoutes } from "../services/imaging-authz.js";
import { imagingDeviceRoutes } from "../services/imaging-devices.js";
import { imagingAuditRoutes } from "../routes/imaging-audit-routes.js";
import imagingViewerRoutes from "../routes/imaging-viewer.js";

// Admin + interop
import adminRoutes from "../routes/admin.js";
import interopRoutes from "../routes/interop.js";
import vistaInteropRoutes from "../routes/vista-interop.js";

// Reporting + Analytics
import reportingRoutes from "../routes/reporting.js";
import analyticsRoutes from "../routes/analytics-routes.js";

// Portal
import portalAuthRoutes from "../routes/portal-auth.js";
import { getPortalSession } from "../routes/portal-auth.js";
import portalCoreRoutes, { initPortalCore } from "../routes/portal-core.js";
import recordPortabilityRoutes, { initRecordPortability } from "../routes/record-portability.js";
import { startCleanupJob as startPortabilityCleanup } from "../services/record-portability-store.js";

// Intake
import intakeRoutes, { initIntakeRoutes } from "../intake/intake-routes.js";
import "../intake/packs/index.js"; // registers 23 built-in packs
import intakeBrainRoutes, { initBrainRoutes } from "../intake/brain-routes.js";
import { initBrainPlugins } from "../intake/brain/index.js";

// Portal IAM
import portalIamRoutes from "../portal-iam/portal-iam-routes.js";
import { seedDevUsers } from "../portal-iam/portal-user-store.js";

// Telehealth
import telehealthRoutes, { initTelehealthRoutes } from "../routes/telehealth.js";
import { startRoomCleanup } from "../telehealth/room-store.js";

// AI Gateway
import aiGatewayRoutes, { initAiRoutes } from "../routes/ai-gateway.js";

// IAM + Enterprise break-glass
import iamRoutes from "../routes/iam-routes.js";
import enterpriseBreakGlassRoutes from "../routes/enterprise-break-glass-routes.js";
import { startBreakGlassCleanup } from "../auth/enterprise-break-glass.js";

// Module system
import moduleCapabilityRoutes from "../routes/module-capability-routes.js";
import moduleEntitlementRoutes from "../routes/module-entitlement-routes.js";

// RCM domain
import rcmRoutes from "../rcm/rcm-routes.js";
import vistaRcmRoutes from "../routes/vista-rcm.js";
import rcmOpsRoutes from "../rcm/rcm-ops-routes.js";
import payerOpsRoutes from "../rcm/payerOps/payerops-routes.js";
import registryRoutes from "../rcm/payerOps/registry-routes.js";
import philhealthRoutes from "../rcm/payerOps/philhealth-routes.js";
import claimLifecycleRoutes from "../rcm/claims/claim-routes.js";
import paymentRoutes from "../rcm/payments/payment-routes.js";
import phHmoRoutes from "../rcm/payers/ph-hmo-routes.js";
import loaRoutes from "../rcm/loa/loa-routes.js";
import claimsWorkflowRoutes from "../rcm/workflows/claims-workflow-routes.js";
import remittanceRoutes from "../rcm/workflows/remittance-routes.js";
import payerAdminRoutes from "../rcm/payers/payer-admin-routes.js";
import adminPayerDbRoutes from "../routes/admin-payer-db-routes.js";
import eclaims3Routes from "../rcm/philhealth-eclaims3/eclaims3-routes.js";
import qaRoutes from "../routes/qa-routes.js";
import hmoPortalRoutes from "../rcm/hmo-portal/hmo-portal-routes.js";
import { initHmoPortalAdapters } from "../rcm/hmo-portal/adapters/index.js";
import phase97bRoutes from "../rcm/hmo-portal/phase97b-routes.js";
import denialRoutes from "../rcm/denials/denial-routes.js";
import reconciliationRoutes from "../rcm/reconciliation/recon-routes.js";
import eligibilityClaimStatusRoutes from "../rcm/eligibility/routes.js";
import credentialVaultRoutes from "../rcm/credential-vault/credential-vault-routes.js";
import claimLifecycle111Routes from "../rcm/claim-lifecycle/claim-lifecycle-routes.js";
import evidenceRoutes from "../rcm/evidence/evidence-routes.js";

// Migration toolkit
import migrationRoutes from "../migration/migration-routes.js";

// CPRS
import cprsWave1Routes from "../routes/cprs/wave1-routes.js";
import cprsWave2Routes from "../routes/cprs/wave2-routes.js";
import ordersCpoeRoutes from "../routes/cprs/orders-cpoe.js";
import tiuNotesRoutes from "../routes/cprs/tiu-notes.js";

// Scheduling + Messaging
import schedulingRoutes from "../routes/scheduling/index.js";
import messagingRoutes from "../routes/messaging/index.js";
import vistaMailmanRoutes from "../routes/vista-mailman.js";
import portalMailmanRoutes, { initPortalMailman } from "../routes/portal-mailman.js";

// Portal documents
import portalDocumentsRoutes, { initPortalDocuments } from "../routes/portal-documents.js";

// Clinical domain routes
import immunizationsRoutes from "../routes/immunizations/index.js";
import adtRoutes from "../routes/adt/index.js";
import inpatientRoutes from "../routes/inpatient/index.js";
import nursingRoutes from "../routes/nursing/index.js";
import emarRoutes from "../routes/emar/index.js";
import handoffRoutes from "../routes/handoff/index.js";
import uiPrefsRoutes from "../routes/ui-prefs.js";

// Schema status (Phase 175)
import schemaStatusRoutes from "../routes/admin/schema-status.js";

// FHIR R4 gateway (Phase 178)
import fhirRoutes from "../fhir/fhir-routes.js";
import smartConfigRoutes from "../fhir/smart-configuration.js";

// HL7v2 Engine (Phase 239)
import hl7EngineRoutes from "../routes/hl7-engine.js";

// HL7v2 Routing (Phase 240)
import hl7RoutingRoutes from "../routes/hl7-routing.js";

// HL7v2 Message Packs (Phase 241)
import hl7PackRoutes from "../routes/hl7-packs.js";

// RCM Scale Hardening (Phase 242)
import rcmScaleRoutes from "../routes/rcm-scale.js";

// Infrastructure routes
import postureRoutes from "../posture/index.js";
import { jobAdminRoutes } from "../routes/job-admin-routes.js";
import hardeningRoutes from "../routes/hardening-routes.js";
import { auditShippingRoutes } from "../routes/audit-shipping-routes.js";
import i18nRoutes from "../routes/i18n-routes.js";
import { templateRoutes } from "../templates/index.js";
import { queueRoutes } from "../queue/index.js";
import { workflowRoutes } from "../workflows/index.js";
import alignmentRoutes from "../routes/alignment-routes.js";
import { perfRoutes } from "../performance/index.js";
import moduleValidationRoutes from "../routes/module-validation-routes.js";
import coverageRoutes from "../routes/coverage-routes.js";
import qaJourneyRoutes from "../routes/qa-journey-routes.js";
import medReconciliationRoutes from "../routes/med-reconciliation.js";
import dischargeWorkflowRoutes from "../routes/discharge-workflow.js";
import marSafetyRoutes from "../routes/mar-safety.js";
import identityLinkingRoutes from "../routes/identity-linking.js";
import opsAdminRoutes from "../routes/ops-admin.js";
import certificationEvidenceRoutes from "../routes/certification-evidence.js";
import vistaProvisionRoutes from "../routes/vista-provision.js";

// Inline routes + domain auto-stubs
import { registerInlineRoutes } from "./inline-routes.js";
import { registerDomainRoutes } from "../routes/index.js";

/**
 * Register all route plugins in the exact order from the original index.ts.
 * Also starts cleanup jobs that were previously co-located with route registration.
 */
export async function registerRoutes(server: FastifyInstance): Promise<void> {
  // Auth routes (Phase 13)
  server.register(authRoutes);

  // Phase 66: Identity provider routes (OIDC/SAML/VistA binding)
  initIdentityProviders();
  server.register(idpRoutes);

  // WebSocket console (Phase 13F)
  server.register(wsConsoleRoutes);

  // RPC capability discovery (Phase 14A)
  server.register(capabilityRoutes);

  // Write-back routes (Phase 14C)
  server.register(writeBackRoutes);

  // Imaging domain (Phase 14D, 22, 23, 24, 81)
  server.register(imagingRoutes);
  server.register(imagingProxyRoutes);
  server.register(imagingWorklistRoutes);
  server.register(imagingIngestRoutes);
  server.register(imagingAuthzRoutes);
  server.register(imagingDeviceRoutes);
  server.register(imagingAuditRoutes);
  server.register(imagingViewerRoutes);

  // Admin/tenant routes (Phase 17B)
  server.register(adminRoutes);

  // Schema status (Phase 175)
  server.register(schemaStatusRoutes);

  // Interop routes (Phase 18B/D, 21)
  server.register(interopRoutes);
  server.register(vistaInteropRoutes);

  // Reporting & export (Phase 19A)
  server.register(reportingRoutes);

  // Analytics (Phase 25)
  server.register(analyticsRoutes);

  // Portal auth (Phase 26)
  server.register(portalAuthRoutes);

  // Portal core — messaging, appointments, sharing, settings, export (Phase 27)
  initPortalCore(getPortalSession);
  initPortalMailman(getPortalSession);
  initPortalDocuments(getPortalSession);
  server.register(portalCoreRoutes);

  // Record portability (Phase 80)
  initRecordPortability(getPortalSession);
  server.register(recordPortabilityRoutes);
  startPortabilityCleanup();

  // Intake OS (Phase 28)
  initIntakeRoutes(
    (req: any) => {
      const ps = getPortalSession(req);
      return ps ? { patientDfn: ps.patientDfn, patientName: ps.patientName } : null;
    },
    async (req: any) => {
      try {
        const session = await requireSession(req, { code: () => ({ send: () => {} }) });
        return session ? { duz: session.duz, name: session.userName } : null;
      } catch { return null; }
    },
  );
  server.register(intakeRoutes);

  // Intake brain (Phase 143)
  initBrainPlugins();
  initBrainRoutes(
    (req: any) => {
      const ps = getPortalSession(req);
      return ps ? { patientDfn: ps.patientDfn, patientName: ps.patientName } : null;
    },
    async (req: any) => {
      try {
        const session = await requireSession(req, { code: () => ({ send: () => {} }) });
        return session ? { duz: session.duz, name: session.userName } : null;
      } catch { return null; }
    },
  );
  server.register(intakeBrainRoutes);

  // Portal IAM (Phase 29)
  await seedDevUsers();
  server.register(portalIamRoutes);

  // Telehealth (Phase 30)
  initTelehealthRoutes(
    getPortalSession,
    async (req: any, reply: any) => await requireSession(req, reply),
  );
  server.register(telehealthRoutes);
  startRoomCleanup();

  // AI Gateway (Phase 33)
  initAiRoutes(
    async (req: any, reply: any) => await requireSession(req, reply),
    getPortalSession,
  );
  server.register(aiGatewayRoutes);

  // IAM (Phase 35)
  server.register(iamRoutes);

  // Enterprise break-glass + IAM posture (Phase 141)
  server.register(enterpriseBreakGlassRoutes);
  startBreakGlassCleanup();

  // Module & capability routes (Phase 37C, 109)
  server.register(moduleCapabilityRoutes);
  server.register(moduleEntitlementRoutes);

  // RCM domain (Phase 38, 39, 82, 87-100, 110-112)
  server.register(rcmRoutes);
  server.register(vistaRcmRoutes);
  server.register(rcmOpsRoutes);
  server.register(payerOpsRoutes);
  server.register(registryRoutes);
  server.register(philhealthRoutes);
  server.register(claimLifecycleRoutes);
  server.register(paymentRoutes);
  server.register(phHmoRoutes);
  server.register(loaRoutes);
  server.register(claimsWorkflowRoutes);
  server.register(remittanceRoutes);
  server.register(payerAdminRoutes);
  server.register(adminPayerDbRoutes);
  server.register(eclaims3Routes);
  server.register(qaRoutes);
  initHmoPortalAdapters();
  server.register(hmoPortalRoutes);
  server.register(phase97bRoutes);
  server.register(denialRoutes);
  server.register(reconciliationRoutes);
  server.register(eligibilityClaimStatusRoutes);
  server.register(credentialVaultRoutes);
  server.register(claimLifecycle111Routes);
  server.register(evidenceRoutes);

  // Migration toolkit (Phase 50)
  server.register(migrationRoutes);

  // CPRS (Phase 56-60)
  server.register(cprsWave1Routes);
  server.register(cprsWave2Routes);
  server.register(ordersCpoeRoutes);
  server.register(tiuNotesRoutes);

  // Scheduling + messaging (Phase 63-64, 130)
  server.register(schedulingRoutes);
  server.register(messagingRoutes);
  server.register(vistaMailmanRoutes);
  server.register(portalMailmanRoutes);

  // Portal documents (Phase 140)
  server.register(portalDocumentsRoutes);

  // Immunizations (Phase 65)
  server.register(immunizationsRoutes);

  // ADT + Inpatient (Phase 67, 83)
  server.register(adtRoutes);
  server.register(inpatientRoutes);

  // Nursing + eMAR + Handoff (Phase 68, 85, 86)
  server.register(nursingRoutes);
  server.register(emarRoutes);
  server.register(handoffRoutes);

  // UI prefs (Phase 79)
  server.register(uiPrefsRoutes);

  // Production posture (Phase 107)
  server.register(postureRoutes);

  // Job admin (Phase 116)
  server.register(jobAdminRoutes);

  // Go-live hardening (Phase 118)
  server.register(hardeningRoutes);

  // Audit shipping (Phase 157)
  server.register(auditShippingRoutes);

  // I18N (Phase 132)
  server.register(i18nRoutes);

  // Templates + Queue + Workflows (Phase 158-160)
  server.register(templateRoutes);
  server.register(queueRoutes);
  server.register(workflowRoutes);

  // Alignment + Performance + Module validation (Phase 161-163)
  server.register(alignmentRoutes);
  server.register(perfRoutes);
  server.register(moduleValidationRoutes);

  // Coverage + QA journeys (Phase 165-166)
  server.register(coverageRoutes);
  server.register(qaJourneyRoutes);

  // Inpatient depth (Phase 168)
  server.register(medReconciliationRoutes);
  server.register(dischargeWorkflowRoutes);
  server.register(marSafetyRoutes);

  // Identity linking (Phase 169)
  server.register(identityLinkingRoutes);

  // Ops admin (Phase 171)
  server.register(opsAdminRoutes);

  // Certification evidence (Phase 172)
  server.register(certificationEvidenceRoutes);

  // VistA provisioning (Phase 155)
  server.register(vistaProvisionRoutes);

  // HL7v2 Engine (Phase 239)
  server.register(hl7EngineRoutes);

  // HL7v2 Routing (Phase 240)
  server.register(hl7RoutingRoutes);

  // HL7v2 Message Packs (Phase 241)
  server.register(hl7PackRoutes);

  // RCM Scale Hardening (Phase 242)
  server.register(rcmScaleRoutes);

  // FHIR R4 gateway (Phase 178)
  server.register(fhirRoutes);

  // SMART on FHIR configuration (Phase 179)
  server.register(smartConfigRoutes);

  // Inline routes (health, ready, version, metrics, audit, admin, vista/*)
  registerInlineRoutes(server);

  // Auto-generated domain RPC stub routes
  registerDomainRoutes(server);
}
