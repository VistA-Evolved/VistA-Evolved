/**
 * Phase 146 Durability Repos — All critical domain stores
 *
 * Provides initialized PG repos for every domain covered by Phase 146.
 * Uses the generic repo factory for uniform CRUD pattern.
 * Called from index.ts after PG init to wire write-through into each store.
 */

import { createPgRepo, type GenericPgRepo } from './generic-pg-repo.js';

/* ── Portal Domain ────────────────────────────────────────── */

export function createPortalUserRepo(): GenericPgRepo<any> {
  return createPgRepo('portal_user');
}

export function createPortalSessionRepo(): GenericPgRepo<any> {
  return createPgRepo('portal_session');
}

export function createPortalPatientIdentityRepo(): GenericPgRepo<any> {
  return createPgRepo('portal_patient_identity');
}

export function createPortalRefillRepo(): GenericPgRepo<any> {
  return createPgRepo('portal_refill');
}

export function createPortalTaskRepo(): GenericPgRepo<any> {
  return createPgRepo('portal_task');
}

export function createPortalSensitivityRepo(): GenericPgRepo<any> {
  return createPgRepo('portal_sensitivity_config');
}

export function createPortalShareLinkRepo(): GenericPgRepo<any> {
  return createPgRepo('portal_share_link');
}

export function createPortalExportRepo(): GenericPgRepo<any> {
  return createPgRepo('portal_export');
}

export function createPortalProxyInvitationRepo(): GenericPgRepo<any> {
  return createPgRepo('portal_proxy_invitation');
}

/* ── Imaging Domain ───────────────────────────────────────── */

export function createImagingDeviceRepo(): GenericPgRepo<any> {
  return createPgRepo('imaging_device');
}

/* ── Auth / IAM Domain ────────────────────────────────────── */

export function createVistaBindingRepo(): GenericPgRepo<any> {
  return createPgRepo('idp_vista_binding');
}

export function createBreakGlassSessionRepo(): GenericPgRepo<any> {
  return createPgRepo('iam_break_glass_session');
}

/* ── RCM Domain ───────────────────────────────────────────── */

export function createPaymentBatchRepo(): GenericPgRepo<any> {
  return createPgRepo('rcm_payment_batch');
}

export function createPaymentLineRepo(): GenericPgRepo<any> {
  return createPgRepo('rcm_payment_line');
}

export function createPaymentPostingRepo(): GenericPgRepo<any> {
  return createPgRepo('rcm_payment_posting');
}

export function createUnderpaymentCaseRepo(): GenericPgRepo<any> {
  return createPgRepo('rcm_underpayment_case');
}

export function createLoaRequestRepo(): GenericPgRepo<any> {
  return createPgRepo('rcm_loa_request');
}

export function createRemitDocumentRepo(): GenericPgRepo<any> {
  return createPgRepo('rcm_remit_document');
}

export function createTransactionEnvelopeRepo(): GenericPgRepo<any> {
  return createPgRepo('rcm_transaction_envelope');
}

export function createPhSubmissionRepo(): GenericPgRepo<any> {
  return createPgRepo('rcm_ph_submission');
}

export function createHmoSubmissionRepo(): GenericPgRepo<any> {
  return createPgRepo('rcm_hmo_submission');
}

export function createPayerEnrollmentRepo(): GenericPgRepo<any> {
  return createPgRepo('rcm_payer_enrollment');
}

export function createLoaCaseRepo(): GenericPgRepo<any> {
  return createPgRepo('rcm_loa_case');
}

export function createCredentialVaultRepo(): GenericPgRepo<any> {
  return createPgRepo('rcm_credential_vault');
}

export function createPhClaimDraftRepo(): GenericPgRepo<any> {
  return createPgRepo('rcm_ph_claim_draft');
}

export function createPhFacilitySetupRepo(): GenericPgRepo<any> {
  return createPgRepo('rcm_ph_facility_setup');
}

export function createPayerRuleRepo(): GenericPgRepo<any> {
  return createPgRepo('rcm_payer_rule');
}

export function createPayerRulepackRepo(): GenericPgRepo<any> {
  return createPgRepo('rcm_payer_rulepack');
}

export function createDenialRepo(): GenericPgRepo<any> {
  return createPgRepo('rcm_denial');
}

export function createPayerDirectoryEntryRepo(): GenericPgRepo<any> {
  return createPgRepo('rcm_payer_directory_entry');
}

export function createJobQueueEntryRepo(): GenericPgRepo<any> {
  return createPgRepo('rcm_job_queue_entry');
}

/* ── Clinical Domain ──────────────────────────────────────── */

export function createClinicalDraftRepo(): GenericPgRepo<any> {
  return createPgRepo('clinical_draft');
}

export function createUiPreferenceRepo(): GenericPgRepo<any> {
  return createPgRepo('ui_preference');
}

export function createHandoffReportRepo(): GenericPgRepo<any> {
  return createPgRepo('handoff_report');
}

/* ── Other Domains ────────────────────────────────────────── */

export function createIntakeSessionRepo(): GenericPgRepo<any> {
  return createPgRepo('intake_session');
}

export function createMigrationJobRepo(): GenericPgRepo<any> {
  return createPgRepo('migration_job');
}

export function createExportJobRepo(): GenericPgRepo<any> {
  return createPgRepo('export_job');
}
