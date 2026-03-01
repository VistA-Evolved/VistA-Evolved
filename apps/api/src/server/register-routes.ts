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

// SaaS Billing/Metering (Phase 284)
import billingRoutes from "../billing/billing-routes.js";

// Feature Flag Evaluation (Phase 285)
import flagEvalRoutes from "../flags/flag-eval-routes.js";

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

// Onboarding Wizard (Phase 243)
import onboardingRoutes from "../routes/onboarding-routes.js";

// Support Tooling (Phase 244)
import supportRoutes from "../routes/support-routes.js";

// Data Exports v2 (Phase 245)
import exportV2Routes from "../routes/export-routes.js";

// Pilot Hospital Hardening (Phase 246)
import pilotRoutes from "../routes/pilot-routes.js";

// --- Wave 8: Enterprise Integrations + Customer Ops (Phases 258-265) ---
// HL7v2 Tenant Endpoints (Phase 258)
import hl7TenantEndpointRoutes from "../routes/hl7-tenant-endpoints.js";
// HL7v2 Message Pipeline (Phase 259)
import { hl7PipelineRoutes } from "../routes/hl7-pipeline.js";
// HL7v2 Use Cases (Phase 260)
import { hl7UseCaseRoutes } from "../routes/hl7-use-cases.js";
// Payer Adapter SDK (Phase 261)
import { adapterSdkRoutes } from "../routes/adapter-sdk-routes.js";
// Onboarding Integration Steps (Phase 262)
import { onboardingIntegrationRoutes } from "../routes/onboarding-integration-routes.js";
// Support Toolkit v2 (Phase 263)
import { supportToolkitV2Routes } from "../routes/support-toolkit-v2-routes.js";
// Data Portability Exports (Phase 264)
import { dataPortabilityRoutes } from "../routes/data-portability-routes.js";
// SAT Suite + Degraded Mode (Phase 265)
import { satRoutes } from "../routes/sat-routes.js";

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

// Writeback command bus (Phase 300)
import writebackCommandRoutes from "../writeback/writeback-routes.js";

// Wave 13: Regulatory/Compliance + Multi-Country (Phases 311-315)
import { dataResidencyRoutes } from "../routes/data-residency-routes.js";
import { consentRoutes } from "../routes/consent-routes.js";
import { terminologyRoutes } from "../routes/terminology-routes.js";
import { initTerminologyResolvers } from "../services/terminology-registry.js";
import { countryPackRoutes } from "../routes/country-pack-routes.js";
import { complianceRoutes } from "../routes/compliance-routes.js";

// Wave 14: Enterprise Interop (Phase 318)
import { integrationControlPlaneRoutes } from "../routes/integration-control-plane-routes.js";

// Wave 14: HL7v2 Message Templates (Phase 319)
import { hl7TemplateRoutes } from "../routes/hl7-templates.js";

// Wave 14: HL7v2 Ops Maturity (Phase 320)
import { hl7OpsRoutes } from "../routes/hl7-ops.js";

// Wave 14: X12 Gateway Service (Phase 321)
import { x12GatewayRoutes } from "../routes/x12-gateway.js";

// Wave 14: Clearinghouse Transport (Phase 322)
import { clearinghouseTransportRoutes } from "../routes/clearinghouse-transport.js";

// Wave 14: Certification Pipeline (Phase 323)
import certificationPipelineRoutes from "../routes/certification-pipeline.js";

// Wave 14: Marketplace/Registry (Phase 324)
import marketplaceRoutes from "../routes/marketplace.js";

// Wave 14: Onboarding UX (Phase 325)
import integrationOnboardingRoutes from "../routes/onboarding.js";

// Wave 15: Multi-Cluster Registry (Phase 328)
import multiClusterRoutes from "../routes/multi-cluster-routes.js";

// Wave 15: Global Routing (Phase 329)
import globalRoutingRoutes from "../routes/global-routing-routes.js";

// Wave 15: Data Plane Sharding (Phase 330)
import dataPlaneShardingRoutes from "../routes/data-plane-sharding-routes.js";
import queueCacheRegionalRoutes from "../routes/queue-cache-regional-routes.js";
import costAttributionRoutes from "../routes/cost-attribution-routes.js";
import drGamedayRoutes from "../routes/dr-gameday-routes.js";
import scalePerformanceRoutes from "../routes/scale-performance-routes.js";
import sreSupportPostureRoutes from "../routes/sre-support-posture-routes.js";
import scaleCertRunnerRoutes from "../routes/scale-cert-runner-routes.js";

// Wave 16: Enterprise Security + Governance (Phases 337-345)
import sessionManagementRoutes from "../routes/session-management.js";
import scimRoutes from "../routes/scim-routes.js";
import { secretsRoutes } from "../routes/secrets-routes.js";
import { tenantSecurityRoutes } from "../routes/tenant-security-routes.js";
import { privacyRoutes } from "../routes/privacy-routes.js";
import { siemRoutes } from "../routes/siem-routes.js";

// Wave 17: Multi-Facility + Dept Packs + Workflow Inbox + Patient Comms (Phases 346-353)
import { facilityRoutes } from "../routes/facility-routes.js";
import { deptRbacRoutes } from "../routes/dept-rbac-routes.js";
import { deptPackRoutes } from "../routes/dept-pack-routes.js";
import { workflowInboxRoutes } from "../routes/workflow-inbox-routes.js";
import { patientCommsRoutes } from "../routes/patient-comms-routes.js";
import { deptSchedulingRoutes } from "../routes/dept-scheduling-routes.js";

// Wave 18: Extensibility + Event Bus + Webhooks + FHIR Subscriptions + Plugins (Phases 354-361)
import { eventBusRoutes } from "../routes/event-bus-routes.js";
import { webhookRoutes } from "../routes/webhook-routes.js";

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

  // SaaS Billing/Metering (Phase 284)
  server.register(billingRoutes);

  // Feature Flag Evaluation (Phase 285)
  server.register(flagEvalRoutes);

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

  // Phase 243: Onboarding wizard
  server.register(onboardingRoutes);

  // Phase 244: Support tooling
  server.register(supportRoutes);

  // Phase 245: Data Exports v2
  server.register(exportV2Routes);

  // Phase 246: Pilot Hospital Hardening
  server.register(pilotRoutes);

  // --- Wave 8: Enterprise Integrations + Customer Ops (Phases 258-265) ---
  // Phase 258: HL7v2 Tenant Endpoints
  server.register(hl7TenantEndpointRoutes);
  // Phase 259: HL7v2 Message Pipeline
  server.register(hl7PipelineRoutes);
  // Phase 260: HL7v2 Use Cases
  server.register(hl7UseCaseRoutes);
  // Phase 261: Payer Adapter SDK
  server.register(adapterSdkRoutes);
  // Phase 262: Onboarding Integration Steps
  server.register(onboardingIntegrationRoutes);
  // Phase 263: Support Toolkit v2
  server.register(supportToolkitV2Routes);
  // Phase 264: Data Portability Exports
  server.register(dataPortabilityRoutes);
  // Phase 265: SAT Suite + Degraded Mode
  server.register(satRoutes);

  // Phase 300: Writeback command bus
  server.register(writebackCommandRoutes);

  // Wave 13: Regulatory/Compliance + Multi-Country (Phases 311-315)
  server.register(dataResidencyRoutes);
  server.register(consentRoutes);
  initTerminologyResolvers();
  server.register(terminologyRoutes);
  server.register(countryPackRoutes);
  server.register(complianceRoutes);

  // Wave 14: Enterprise Interop (Phase 318)
  server.register(integrationControlPlaneRoutes);

  // Wave 14: HL7v2 Message Templates (Phase 319)
  server.register(hl7TemplateRoutes);

  // Wave 14: HL7v2 Ops Maturity (Phase 320)
  server.register(hl7OpsRoutes);

  // Wave 14: X12 Gateway Service (Phase 321)
  server.register(x12GatewayRoutes);

  // Wave 14: Clearinghouse Transport (Phase 322)
  server.register(clearinghouseTransportRoutes);

  // Wave 14: Certification Pipeline (Phase 323)
  server.register(certificationPipelineRoutes);

  // Wave 14: Marketplace/Registry (Phase 324)
  server.register(marketplaceRoutes);

  // Wave 14: Onboarding UX (Phase 325)
  server.register(integrationOnboardingRoutes);

  // Wave 15: Multi-Cluster Registry (Phase 328)
  server.register(multiClusterRoutes);

  // Wave 15: Global Routing (Phase 329)
  server.register(globalRoutingRoutes);

  // Wave 15: Data Plane Sharding (Phase 330)
  server.register(dataPlaneShardingRoutes);

  // Wave 15: Queue & Cache Regionalization (Phase 331)
  server.register(queueCacheRegionalRoutes);

  // Wave 15: Cost Attribution & Budgets (Phase 332)
  server.register(costAttributionRoutes);

  // Wave 15: Multi-Region DR & GameDay (Phase 333)
  server.register(drGamedayRoutes);

  // Wave 15: Scale Performance Campaign (Phase 334)
  server.register(scalePerformanceRoutes);

  // Wave 15: Enterprise SRE / Support Posture (Phase 335)
  server.register(sreSupportPostureRoutes);

  // Wave 15: Scale Certification Runner (Phase 336)
  server.register(scaleCertRunnerRoutes);

  // Wave 16: Enterprise Security + Governance (Phases 337-345)
  server.register(sessionManagementRoutes);   // Phase 338: session, step-up, MFA status
  server.register(scimRoutes);                // Phase 339: SCIM 2.0 provisioning
  server.register(secretsRoutes);             // Phase 341: key/secret management
  server.register(tenantSecurityRoutes);      // Phase 342: tenant security policies
  server.register(privacyRoutes);             // Phase 343: privacy segmentation
  server.register(siemRoutes);                // Phase 344: SIEM sink & alerts

  // Wave 17: Multi-Facility + Dept Packs + Workflow Inbox + Patient Comms (Phases 346-353)
  server.register(facilityRoutes);             // Phase 347: facility/department/location CRUD
  server.register(deptRbacRoutes);              // Phase 348: dept RBAC templates + memberships
  server.register(deptPackRoutes);               // Phase 349: department packs catalog + install
  server.register(workflowInboxRoutes);           // Phase 350: unified workflow inbox
  server.register(patientCommsRoutes);              // Phase 351: patient communications
  server.register(deptSchedulingRoutes);             // Phase 352: dept scheduling & resource layer

  // Wave 18: Extensibility + Event Bus + Webhooks + FHIR Subscriptions + Plugins (Phases 354-361)
  server.register(eventBusRoutes);                    // Phase 355: canonical domain event bus
  server.register(webhookRoutes);                      // Phase 356: webhook framework

  // FHIR R4 gateway (Phase 178)
  server.register(fhirRoutes);

  // SMART on FHIR configuration (Phase 179)
  server.register(smartConfigRoutes);

  // Inline routes (health, ready, version, metrics, audit, admin, vista/*)
  registerInlineRoutes(server);

  // Auto-generated domain RPC stub routes
  registerDomainRoutes(server);
}
