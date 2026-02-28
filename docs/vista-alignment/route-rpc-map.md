# Route-to-RPC Map

> Generated: 2026-02-28T06:49:44.970Z
> Tool: `tools/rpc-extract/build-route-rpc-map.mjs`

## Summary

| Metric | Value |
|--------|-------|
| Total routes | 907 |
| Routes with live RPCs | 115 |
| Stub routes | 686 |
| Unique RPCs in routes | 74 |
| Service files with RPCs | 5 |

## Routes with Live RPC Calls

### GET `/portal/health/dc-summaries`
- **Source**: `apps/api/src/routes/portal-auth.ts:529`
- **RPCs** (1):
  - `TIU DOCUMENTS BY CONTEXT` (notes/read)

### GET `/portal/health/labs`
- **Source**: `apps/api/src/routes/portal-auth.ts:421`
- **RPCs** (1):
  - `ORWLRR INTERIM` (labs/read)

### GET `/portal/health/reports`
- **Source**: `apps/api/src/routes/portal-auth.ts:591`
- **RPCs** (2):
  - `ORWRP REPORT LISTS` (reports/read)
  - `ORWRP REPORT TEXT` (reports/read)

### GET `/vista/adt/census`
- **Source**: `apps/api/src/routes/adt/index.ts:317`
- **RPCs** (4):
  - `ORQPT WARD PATIENTS` (adt/read)
  - `ORQPT WARDS` (adt/read)
  - `ORWPT16 ADMITLST` (adt/read)
  - `ZVEADT WARDS` (adt/read)

### GET `/vista/adt/provider-patients`
- **Source**: `apps/api/src/routes/adt/index.ts:186`
- **RPCs** (1):
  - `ORQPT PROVIDER PATIENTS` (adt/read)

### GET `/vista/adt/specialties`
- **Source**: `apps/api/src/routes/adt/index.ts:237`
- **RPCs** (1):
  - `ORQPT SPECIALTIES` (adt/read)

### GET `/vista/adt/teams`
- **Source**: `apps/api/src/routes/adt/index.ts:203`
- **RPCs** (1):
  - `ORQPT TEAMS` (adt/read)

### GET `/vista/adt/wards`
- **Source**: `apps/api/src/routes/adt/index.ts:152`
- **RPCs** (1):
  - `ORQPT WARDS` (adt/read)

### GET `/vista/inpatient/wards`
- **Source**: `apps/api/src/routes/inpatient/index.ts:180`
- **RPCs** (2):
  - `ORQPT WARD PATIENTS` (adt/read)
  - `ORQPT WARDS` (adt/read)

### GET `/ws/console`
- **Source**: `apps/api/src/routes/ws-console.ts:59`
- **RPCs** (1):
  - `XUS AV CODE` (auth/auth)

## Stub Routes (integration-pending)

| Method | Path | Source |
|--------|------|--------|
| GET | `/__test__/rpc-traces` | `apps/api/src/routes/qa-routes.ts` |
| GET | `/admin/alignment/snapshots/:id` | `apps/api/src/routes/alignment-routes.ts` |
| POST | `/admin/alignment/snapshots/compare` | `apps/api/src/routes/alignment-routes.ts` |
| POST | `/admin/alignment/tripwires` | `apps/api/src/routes/alignment-routes.ts` |
| POST | `/admin/break-glass/approve` | `apps/api/src/routes/enterprise-break-glass-routes.ts` |
| POST | `/admin/break-glass/deny` | `apps/api/src/routes/enterprise-break-glass-routes.ts` |
| POST | `/admin/break-glass/request` | `apps/api/src/routes/enterprise-break-glass-routes.ts` |
| POST | `/admin/break-glass/revoke` | `apps/api/src/routes/enterprise-break-glass-routes.ts` |
| GET | `/admin/break-glass/session/:id` | `apps/api/src/routes/enterprise-break-glass-routes.ts` |
| GET | `/admin/certification/bundle/:buildId` | `apps/api/src/routes/certification-evidence.ts` |
| POST | `/admin/certification/generate` | `apps/api/src/routes/certification-evidence.ts` |
| GET | `/admin/feature-flags/:tenantId` | `apps/api/src/routes/admin.ts` |
| PUT | `/admin/feature-flags/:tenantId` | `apps/api/src/routes/admin.ts` |
| GET | `/admin/identity/request/:id` | `apps/api/src/routes/identity-linking.ts` |
| POST | `/admin/identity/request/:id/reject` | `apps/api/src/routes/identity-linking.ts` |
| POST | `/admin/identity/request/:id/verify` | `apps/api/src/routes/identity-linking.ts` |
| GET | `/admin/intake/question-schema` | `apps/api/src/routes/i18n-routes.ts` |
| POST | `/admin/intake/question-schema` | `apps/api/src/routes/i18n-routes.ts` |
| GET | `/admin/integrations/:tenantId` | `apps/api/src/routes/admin.ts` |
| POST | `/admin/integrations/:tenantId/probe` | `apps/api/src/routes/admin.ts` |
| POST | `/admin/jobs/trigger` | `apps/api/src/routes/job-admin-routes.ts` |
| GET | `/admin/modules/:tenantId` | `apps/api/src/routes/admin.ts` |
| PUT | `/admin/modules/:tenantId` | `apps/api/src/routes/admin.ts` |
| POST | `/admin/modules/entitlements` | `apps/api/src/routes/module-entitlement-routes.ts` |
| DELETE | `/admin/modules/feature-flags` | `apps/api/src/routes/module-entitlement-routes.ts` |
| POST | `/admin/modules/feature-flags` | `apps/api/src/routes/module-entitlement-routes.ts` |
| GET | `/admin/my-tenant` | `apps/api/src/routes/admin.ts` |
| GET | `/admin/note-templates/:tenantId` | `apps/api/src/routes/admin.ts` |
| DELETE | `/admin/note-templates/:tenantId/:templateId` | `apps/api/src/routes/admin.ts` |
| PUT | `/admin/note-templates/:tenantId/:templateId` | `apps/api/src/routes/admin.ts` |
| GET | `/admin/payer-db/evidence/:id` | `apps/api/src/routes/admin-payer-db-routes.ts` |
| GET | `/admin/payer-db/evidence/:id/diff` | `apps/api/src/routes/admin-payer-db-routes.ts` |
| POST | `/admin/payer-db/evidence/ingest-json` | `apps/api/src/routes/admin-payer-db-routes.ts` |
| POST | `/admin/payer-db/evidence/upload-pdf` | `apps/api/src/routes/admin-payer-db-routes.ts` |
| GET | `/admin/payer-db/payers/:id` | `apps/api/src/routes/admin-payer-db-routes.ts` |
| PATCH | `/admin/payer-db/payers/:id` | `apps/api/src/routes/admin-payer-db-routes.ts` |
| PUT | `/admin/payer-db/payers/:id/capabilities` | `apps/api/src/routes/admin-payer-db-routes.ts` |
| POST | `/admin/payer-db/payers/:id/tasks` | `apps/api/src/routes/admin-payer-db-routes.ts` |
| PATCH | `/admin/payer-db/tasks/:taskId` | `apps/api/src/routes/admin-payer-db-routes.ts` |
| PUT | `/admin/payer-db/tenant/:tenantId/payers/:payerId` | `apps/api/src/routes/admin-payer-db-routes.ts` |
| GET | `/admin/qa/journeys/:journeyId/rpc-trace` | `apps/api/src/routes/qa-journey-routes.ts` |
| POST | `/admin/qa/journeys/:journeyId/run` | `apps/api/src/routes/qa-journey-routes.ts` |
| DELETE | `/admin/registry/:tenantId/:integrationId` | `apps/api/src/routes/interop.ts` |
| GET | `/admin/registry/:tenantId/:integrationId` | `apps/api/src/routes/interop.ts` |
| POST | `/admin/registry/:tenantId/:integrationId/probe` | `apps/api/src/routes/interop.ts` |
| POST | `/admin/registry/:tenantId/:integrationId/toggle` | `apps/api/src/routes/interop.ts` |
| GET | `/admin/registry/:tenantId/error-log/:integrationId` | `apps/api/src/routes/interop.ts` |
| POST | `/admin/registry/:tenantId/onboard-device` | `apps/api/src/routes/interop.ts` |
| DELETE | `/admin/tenants/:tenantId` | `apps/api/src/routes/admin.ts` |
| GET | `/admin/tenants/:tenantId` | `apps/api/src/routes/admin.ts` |
| GET | `/admin/ui-defaults/:tenantId` | `apps/api/src/routes/admin.ts` |
| PUT | `/admin/ui-defaults/:tenantId` | `apps/api/src/routes/admin.ts` |
| GET | `/analytics/clinical-reports/text` | `apps/api/src/routes/analytics-routes.ts` |
| POST | `/analytics/export` | `apps/api/src/routes/analytics-routes.ts` |
| GET | `/api/adapters/health` | `apps/api/src/routes/module-capability-routes.ts` |
| GET | `/api/adapters/list` | `apps/api/src/routes/module-capability-routes.ts` |
| GET | `/api/marketplace/config` | `apps/api/src/routes/module-capability-routes.ts` |
| PUT | `/api/marketplace/config` | `apps/api/src/routes/module-capability-routes.ts` |
| PATCH | `/api/marketplace/connectors` | `apps/api/src/routes/module-capability-routes.ts` |
| PATCH | `/api/marketplace/jurisdiction` | `apps/api/src/routes/module-capability-routes.ts` |
| GET | `/api/marketplace/jurisdictions` | `apps/api/src/routes/module-capability-routes.ts` |
| GET | `/api/marketplace/summary` | `apps/api/src/routes/module-capability-routes.ts` |
| GET | `/api/modules/manifests` | `apps/api/src/routes/module-capability-routes.ts` |
| POST | `/api/modules/override` | `apps/api/src/routes/module-capability-routes.ts` |
| GET | `/api/modules/skus` | `apps/api/src/routes/module-capability-routes.ts` |
| GET | `/api/modules/status` | `apps/api/src/routes/module-capability-routes.ts` |
| POST | `/audit/shipping/trigger` | `apps/api/src/routes/audit-shipping-routes.ts` |
| POST | `/emar/administer` | `apps/api/src/routes/emar/index.ts` |
| GET | `/emar/allergies` | `apps/api/src/routes/emar/index.ts` |
| POST | `/emar/barcode-scan` | `apps/api/src/routes/emar/index.ts` |
| GET | `/emar/duplicate-check` | `apps/api/src/routes/emar/index.ts` |
| GET | `/emar/history` | `apps/api/src/routes/emar/index.ts` |
| GET | `/emar/safety/admin-window` | `apps/api/src/routes/mar-safety.ts` |
| POST | `/emar/safety/five-rights` | `apps/api/src/routes/mar-safety.ts` |
| GET | `/emar/safety/high-alert-check` | `apps/api/src/routes/mar-safety.ts` |
| GET | `/emar/schedule` | `apps/api/src/routes/emar/index.ts` |
| POST | `/handoff/reports` | `apps/api/src/routes/handoff/index.ts` |
| GET | `/handoff/reports/:id` | `apps/api/src/routes/handoff/index.ts` |
| PUT | `/handoff/reports/:id` | `apps/api/src/routes/handoff/index.ts` |
| POST | `/handoff/reports/:id/accept` | `apps/api/src/routes/handoff/index.ts` |
| POST | `/handoff/reports/:id/archive` | `apps/api/src/routes/handoff/index.ts` |
| POST | `/handoff/reports/:id/submit` | `apps/api/src/routes/handoff/index.ts` |
| GET | `/handoff/ward-patients` | `apps/api/src/routes/handoff/index.ts` |
| PUT | `/i18n/locale` | `apps/api/src/routes/i18n-routes.ts` |
| POST | `/iam/policy/evaluate` | `apps/api/src/routes/iam-routes.ts` |
| GET | `/imaging/audit/events` | `apps/api/src/routes/imaging-audit-routes.ts` |
| GET | `/imaging/audit/export` | `apps/api/src/routes/imaging-audit-routes.ts` |
| GET | `/imaging/audit/stats` | `apps/api/src/routes/imaging-audit-routes.ts` |
| GET | `/imaging/audit/verify` | `apps/api/src/routes/imaging-audit-routes.ts` |
| POST | `/imaging/demo/upload` | `apps/api/src/routes/imaging-proxy.ts` |
| GET | `/imaging/dicom-web/studies` | `apps/api/src/routes/imaging-proxy.ts` |
| GET | `/imaging/health` | `apps/api/src/routes/imaging-proxy.ts` |
| GET | `/imaging/report/:studyId` | `apps/api/src/routes/imaging-viewer.ts` |
| GET | `/imaging/studies/:dfn` | `apps/api/src/routes/imaging-viewer.ts` |
| GET | `/imaging/viewer` | `apps/api/src/routes/imaging-proxy.ts` |
| GET | `/imaging/viewer-link/:studyId` | `apps/api/src/routes/imaging-viewer.ts` |
| GET | `/intake/question-schema` | `apps/api/src/routes/i18n-routes.ts` |
| POST | `/messaging/compose` | `apps/api/src/routes/messaging/index.ts` |
| GET | `/messaging/folders` | `apps/api/src/routes/messaging/index.ts` |
| GET | `/messaging/mail-get` | `apps/api/src/routes/messaging/index.ts` |
| GET | `/messaging/mail-list` | `apps/api/src/routes/messaging/index.ts` |
| POST | `/messaging/mail-manage` | `apps/api/src/routes/messaging/index.ts` |
| GET | `/messaging/message/:id` | `apps/api/src/routes/messaging/index.ts` |
| POST | `/messaging/message/:id/read` | `apps/api/src/routes/messaging/index.ts` |
| GET | `/messaging/portal/inbox` | `apps/api/src/routes/messaging/index.ts` |
| POST | `/messaging/portal/send` | `apps/api/src/routes/messaging/index.ts` |
| GET | `/portal/appointments/:id` | `apps/api/src/routes/portal-core.ts` |
| POST | `/portal/appointments/:id/cancel` | `apps/api/src/routes/portal-core.ts` |
| POST | `/portal/appointments/:id/reschedule` | `apps/api/src/routes/portal-core.ts` |
| POST | `/portal/appointments/request` | `apps/api/src/routes/portal-core.ts` |
| POST | `/portal/auth/login` | `apps/api/src/routes/portal-auth.ts` |
| GET | `/portal/auth/session` | `apps/api/src/routes/portal-auth.ts` |
| POST | `/portal/consents` | `apps/api/src/routes/portal-documents.ts` |
| GET | `/portal/documents/download/:token` | `apps/api/src/routes/portal-documents.ts` |
| POST | `/portal/documents/generate` | `apps/api/src/routes/portal-documents.ts` |
| GET | `/portal/export/section/:section` | `apps/api/src/routes/portal-core.ts` |
| GET | `/portal/export/shc/:dataset` | `apps/api/src/routes/portal-core.ts` |
| DELETE | `/portal/identity/link/:id` | `apps/api/src/routes/identity-linking.ts` |
| POST | `/portal/identity/request-link` | `apps/api/src/routes/identity-linking.ts` |
| GET | `/portal/mailman/message/:id` | `apps/api/src/routes/portal-mailman.ts` |
| POST | `/portal/mailman/send` | `apps/api/src/routes/portal-mailman.ts` |
| DELETE | `/portal/messages/:id` | `apps/api/src/routes/portal-core.ts` |
| GET | `/portal/messages/:id` | `apps/api/src/routes/portal-core.ts` |
| PUT | `/portal/messages/:id` | `apps/api/src/routes/portal-core.ts` |
| POST | `/portal/messages/:id/attachments` | `apps/api/src/routes/portal-core.ts` |
| POST | `/portal/messages/:id/send` | `apps/api/src/routes/portal-core.ts` |
| GET | `/portal/messages/:id/thread` | `apps/api/src/routes/portal-core.ts` |
| POST | `/portal/proxy/grant` | `apps/api/src/routes/portal-core.ts` |
| POST | `/portal/proxy/revoke` | `apps/api/src/routes/portal-core.ts` |
| POST | `/portal/record/export` | `apps/api/src/routes/record-portability.ts` |
| GET | `/portal/record/export/:token` | `apps/api/src/routes/record-portability.ts` |
| POST | `/portal/record/export/:token/revoke` | `apps/api/src/routes/record-portability.ts` |
| POST | `/portal/record/share` | `apps/api/src/routes/record-portability.ts` |
| POST | `/portal/record/share/:id/revoke` | `apps/api/src/routes/record-portability.ts` |
| GET | `/portal/record/share/preview/:token` | `apps/api/src/routes/record-portability.ts` |
| POST | `/portal/record/share/verify/:token` | `apps/api/src/routes/record-portability.ts` |
| POST | `/portal/refills` | `apps/api/src/routes/portal-core.ts` |
| POST | `/portal/refills/:id/cancel` | `apps/api/src/routes/portal-core.ts` |
| PUT | `/portal/settings` | `apps/api/src/routes/portal-core.ts` |
| GET | `/portal/share/preview/:token` | `apps/api/src/routes/portal-core.ts` |
| POST | `/portal/share/verify/:token` | `apps/api/src/routes/portal-core.ts` |
| POST | `/portal/shares` | `apps/api/src/routes/portal-core.ts` |
| POST | `/portal/shares/:id/revoke` | `apps/api/src/routes/portal-core.ts` |
| POST | `/portal/staff/messages/:id/reply` | `apps/api/src/routes/portal-core.ts` |
| POST | `/portal/staff/refills/:id/review` | `apps/api/src/routes/portal-core.ts` |
| POST | `/portal/tasks/:id/complete` | `apps/api/src/routes/portal-core.ts` |
| POST | `/portal/tasks/:id/dismiss` | `apps/api/src/routes/portal-core.ts` |
| GET | `/portal/telehealth/appointment/:appointmentId/room` | `apps/api/src/routes/telehealth.ts` |
| POST | `/portal/telehealth/device-check/report` | `apps/api/src/routes/telehealth.ts` |
| POST | `/portal/telehealth/rooms/:roomId/join` | `apps/api/src/routes/telehealth.ts` |
| GET | `/portal/telehealth/rooms/:roomId/waiting` | `apps/api/src/routes/telehealth.ts` |
| GET | `/qa/flows/:flowId` | `apps/api/src/routes/qa-routes.ts` |
| POST | `/qa/flows/:flowId/run` | `apps/api/src/routes/qa-routes.ts` |
| POST | `/reports/export` | `apps/api/src/routes/reporting.ts` |
| GET | `/reports/export/:jobId` | `apps/api/src/routes/reporting.ts` |
| GET | `/scheduling/appointment-types` | `apps/api/src/routes/scheduling/index.ts` |
| GET | `/scheduling/appointments` | `apps/api/src/routes/scheduling/index.ts` |
| POST | `/scheduling/appointments/:id/checkin` | `apps/api/src/routes/scheduling/index.ts` |
| POST | `/scheduling/appointments/:id/checkout` | `apps/api/src/routes/scheduling/index.ts` |
| POST | `/scheduling/appointments/:id/reschedule` | `apps/api/src/routes/scheduling/index.ts` |
| GET | `/scheduling/appointments/cprs` | `apps/api/src/routes/scheduling/index.ts` |
| GET | `/scheduling/appointments/range` | `apps/api/src/routes/scheduling/index.ts` |
| POST | `/scheduling/appointments/request` | `apps/api/src/routes/scheduling/index.ts` |
| GET | `/scheduling/cancel-reasons` | `apps/api/src/routes/scheduling/index.ts` |
| GET | `/scheduling/clinic/:ien/preferences` | `apps/api/src/routes/scheduling/index.ts` |
| PUT | `/scheduling/clinic/:ien/preferences` | `apps/api/src/routes/scheduling/index.ts` |
| GET | `/scheduling/clinic/:ien/resource` | `apps/api/src/routes/scheduling/index.ts` |
| GET | `/scheduling/encounters/:ien/detail` | `apps/api/src/routes/scheduling/index.ts` |
| GET | `/scheduling/encounters/:ien/diagnoses` | `apps/api/src/routes/scheduling/index.ts` |
| GET | `/scheduling/encounters/:ien/providers` | `apps/api/src/routes/scheduling/index.ts` |
| GET | `/scheduling/lifecycle` | `apps/api/src/routes/scheduling/index.ts` |
| POST | `/scheduling/lifecycle/transition` | `apps/api/src/routes/scheduling/index.ts` |
| GET | `/scheduling/mode` | `apps/api/src/routes/scheduling/index.ts` |
| GET | `/scheduling/requests` | `apps/api/src/routes/scheduling/index.ts` |
| POST | `/scheduling/requests/:id/approve` | `apps/api/src/routes/scheduling/index.ts` |
| POST | `/scheduling/requests/:id/reject` | `apps/api/src/routes/scheduling/index.ts` |
| GET | `/scheduling/sdes-availability` | `apps/api/src/routes/scheduling/index.ts` |
| GET | `/scheduling/slots` | `apps/api/src/routes/scheduling/index.ts` |
| GET | `/scheduling/verify/:ref` | `apps/api/src/routes/scheduling/index.ts` |
| POST | `/scheduling/writeback/verify/:ref` | `apps/api/src/routes/scheduling/writeback-routes.ts` |
| GET | `/telehealth/rooms` | `apps/api/src/routes/telehealth.ts` |
| POST | `/telehealth/rooms` | `apps/api/src/routes/telehealth.ts` |
| GET | `/telehealth/rooms/:roomId` | `apps/api/src/routes/telehealth.ts` |
| POST | `/telehealth/rooms/:roomId/end` | `apps/api/src/routes/telehealth.ts` |
| POST | `/telehealth/rooms/:roomId/join` | `apps/api/src/routes/telehealth.ts` |
| GET | `/telehealth/rooms/:roomId/waiting` | `apps/api/src/routes/telehealth.ts` |
| PUT | `/ui-prefs/coversheet` | `apps/api/src/routes/ui-prefs.ts` |
| GET | `/vista/adt/admission-list` | `apps/api/src/routes/adt/index.ts` |
| POST | `/vista/adt/admit` | `apps/api/src/routes/adt/index.ts` |
| POST | `/vista/adt/discharge` | `apps/api/src/routes/adt/index.ts` |
| GET | `/vista/adt/locations` | `apps/api/src/routes/adt/index.ts` |
| GET | `/vista/adt/movements` | `apps/api/src/routes/adt/index.ts` |
| GET | `/vista/adt/specialty-patients` | `apps/api/src/routes/adt/index.ts` |
| GET | `/vista/adt/team-patients` | `apps/api/src/routes/adt/index.ts` |
| POST | `/vista/adt/transfer` | `apps/api/src/routes/adt/index.ts` |
| GET | `/vista/adt/ward-patients` | `apps/api/src/routes/adt/index.ts` |
| POST | `/vista/consults/create` | `apps/api/src/routes/write-backs.ts` |
| POST | `/vista/cprs/allergies/add` | `apps/api/src/routes/cprs/wave2-routes.ts` |
| GET | `/vista/cprs/appointments` | `apps/api/src/routes/cprs/wave1-routes.ts` |
| POST | `/vista/cprs/consults/complete` | `apps/api/src/routes/cprs/wave2-routes.ts` |
| POST | `/vista/cprs/labs/ack` | `apps/api/src/routes/cprs/wave2-routes.ts` |
| GET | `/vista/cprs/labs/chart` | `apps/api/src/routes/cprs/wave1-routes.ts` |
| GET | `/vista/cprs/meds/detail` | `apps/api/src/routes/cprs/wave1-routes.ts` |
| POST | `/vista/cprs/meds/quick-order` | `apps/api/src/routes/cprs/wave2-routes.ts` |
| GET | `/vista/cprs/notes` | `apps/api/src/routes/cprs/tiu-notes.ts` |
| POST | `/vista/cprs/notes/addendum` | `apps/api/src/routes/cprs/tiu-notes.ts` |
| POST | `/vista/cprs/notes/create` | `apps/api/src/routes/cprs/wave2-routes.ts` |
| POST | `/vista/cprs/notes/sign` | `apps/api/src/routes/cprs/tiu-notes.ts` |
| GET | `/vista/cprs/notes/text` | `apps/api/src/routes/cprs/tiu-notes.ts` |
| GET | `/vista/cprs/notes/titles` | `apps/api/src/routes/cprs/tiu-notes.ts` |
| POST | `/vista/cprs/order-checks` | `apps/api/src/routes/cprs/orders-cpoe.ts` |
| GET | `/vista/cprs/orders` | `apps/api/src/routes/cprs/orders-cpoe.ts` |
| GET | `/vista/cprs/orders-summary` | `apps/api/src/routes/cprs/wave1-routes.ts` |
| POST | `/vista/cprs/orders/consult` | `apps/api/src/routes/cprs/orders-cpoe.ts` |
| POST | `/vista/cprs/orders/dc` | `apps/api/src/routes/cprs/wave2-routes.ts` |
| POST | `/vista/cprs/orders/draft` | `apps/api/src/routes/cprs/wave2-routes.ts` |
| POST | `/vista/cprs/orders/flag` | `apps/api/src/routes/cprs/wave2-routes.ts` |
| POST | `/vista/cprs/orders/imaging` | `apps/api/src/routes/cprs/orders-cpoe.ts` |
| POST | `/vista/cprs/orders/lab` | `apps/api/src/routes/cprs/orders-cpoe.ts` |
| POST | `/vista/cprs/orders/sign` | `apps/api/src/routes/cprs/orders-cpoe.ts` |
| POST | `/vista/cprs/orders/verify` | `apps/api/src/routes/cprs/wave2-routes.ts` |
| POST | `/vista/cprs/problems/add` | `apps/api/src/routes/cprs/wave2-routes.ts` |
| POST | `/vista/cprs/problems/edit` | `apps/api/src/routes/cprs/wave2-routes.ts` |
| GET | `/vista/cprs/problems/icd-search` | `apps/api/src/routes/cprs/wave1-routes.ts` |
| GET | `/vista/cprs/reminders` | `apps/api/src/routes/cprs/wave1-routes.ts` |
| POST | `/vista/cprs/vitals/add` | `apps/api/src/routes/cprs/wave2-routes.ts` |
| POST | `/vista/discharge/plan` | `apps/api/src/routes/discharge-workflow.ts` |
| GET | `/vista/discharge/plan/:id` | `apps/api/src/routes/discharge-workflow.ts` |
| PUT | `/vista/discharge/plan/:id/checklist/:itemId` | `apps/api/src/routes/discharge-workflow.ts` |
| POST | `/vista/discharge/plan/:id/complete` | `apps/api/src/routes/discharge-workflow.ts` |
| POST | `/vista/discharge/plan/:id/ready` | `apps/api/src/routes/discharge-workflow.ts` |
| GET | `/vista/imaging/report` | `apps/api/src/routes/imaging.ts` |
| GET | `/vista/immunizations` | `apps/api/src/routes/immunizations/index.ts` |
| POST | `/vista/immunizations` | `apps/api/src/routes/immunizations/index.ts` |
| GET | `/vista/immunizations/catalog` | `apps/api/src/routes/immunizations/index.ts` |
| GET | `/vista/inbox` | `apps/api/src/routes/inbox.ts` |
| POST | `/vista/inpatient/admit` | `apps/api/src/routes/inpatient/index.ts` |
| GET | `/vista/inpatient/bedboard` | `apps/api/src/routes/inpatient/index.ts` |
| POST | `/vista/inpatient/discharge` | `apps/api/src/routes/inpatient/index.ts` |
| GET | `/vista/inpatient/patient-movements` | `apps/api/src/routes/inpatient/index.ts` |
| POST | `/vista/inpatient/transfer` | `apps/api/src/routes/inpatient/index.ts` |
| GET | `/vista/inpatient/ward-census` | `apps/api/src/routes/inpatient/index.ts` |
| GET | `/vista/interop/summary` | `apps/api/src/routes/vista-interop.ts` |
| GET | `/vista/interop/v2/hl7/messages/:id` | `apps/api/src/routes/vista-interop.ts` |
| POST | `/vista/interop/v2/hl7/messages/:id/unmask` | `apps/api/src/routes/vista-interop.ts` |
| GET | `/vista/interop/v2/hl7/summary` | `apps/api/src/routes/vista-interop.ts` |
| GET | `/vista/interop/v2/hlo/summary` | `apps/api/src/routes/vista-interop.ts` |
| POST | `/vista/labs/ack` | `apps/api/src/routes/write-backs.ts` |
| GET | `/vista/labs/rpc/orwdlr32-abbspec` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwdlr32-allsamp` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwdlr32-allspec` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwdlr32-def` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwdlr32-get-lab-times` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwdlr32-ic-default` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwdlr32-ic-valid` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwdlr32-immed-collect` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwdlr32-lab-coll-time` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwdlr32-load` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwdlr32-maxdays` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwdlr32-one-sample` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwdlr32-one-specimen` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwdlr32-stop` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwdlr33-future-lab-collects` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwdlr33-lasttime` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwdlr33-lc-to-wc` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwlrr-alltests` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwlrr-atests` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwlrr-atg` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwlrr-atomics` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwlrr-chart` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwlrr-chemtest` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwlrr-grid` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwlrr-info` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwlrr-interim` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwlrr-interimg` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwlrr-interims` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwlrr-newold` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwlrr-param` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwlrr-spec` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwlrr-tg` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwlrr-users` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwlrr-utga` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwlrr-utgd` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/labs/rpc/orwlrr-utgr` | `apps/api/src/routes/labs.ts` |
| GET | `/vista/mailman/folders` | `apps/api/src/routes/vista-mailman.ts` |
| GET | `/vista/mailman/inbox` | `apps/api/src/routes/vista-mailman.ts` |
| POST | `/vista/mailman/manage` | `apps/api/src/routes/vista-mailman.ts` |
| GET | `/vista/mailman/message/:ien` | `apps/api/src/routes/vista-mailman.ts` |
| POST | `/vista/mailman/send` | `apps/api/src/routes/vista-mailman.ts` |
| GET | `/vista/med-rec/active-meds` | `apps/api/src/routes/med-reconciliation.ts` |
| GET | `/vista/med-rec/session/:id` | `apps/api/src/routes/med-reconciliation.ts` |
| POST | `/vista/med-rec/session/:id/complete` | `apps/api/src/routes/med-reconciliation.ts` |
| POST | `/vista/med-rec/session/:id/decide` | `apps/api/src/routes/med-reconciliation.ts` |
| POST | `/vista/med-rec/start` | `apps/api/src/routes/med-reconciliation.ts` |
| GET | `/vista/meds/rpc/orwdps-allschd` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps1-chk94` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps1-dfltsply` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps1-dosealt` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps1-dowsch` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps1-faildea` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps1-formalt` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps1-hasoipi` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps1-hasroute` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps1-ivdea` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps1-locpick` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps1-maxds` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps1-odslct` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps1-qomedalt` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps1-schall` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps2-admin` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps2-chkgrp` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps2-chkpi` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps2-day2qty` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps2-maxref` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps2-oislct` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps2-qogrp` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps2-qty2day` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps2-reqst` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps2-schreq` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps32-allivrte` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps32-allroute` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps32-auth` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps32-authnva` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps32-dlgslct` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps32-drugmsg` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps32-formalt` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps32-issply` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps32-ivamt` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps32-medisiv` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps32-oislct` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps32-scsts` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps32-valqty` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps32-valrate` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps32-valroute` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps32-valsch` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps33-comploc` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps33-getaddfr` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps33-ivdosfrm` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps4-cpinfo` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps4-cplst` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps4-ipod4op` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps4-isudiv` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps4-updtdg` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps5-isvtp` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps5-lesapi` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwdps5-lesgrp` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwps-active` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwps-detail` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwps-medhist` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwps-reason` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwps1-newdlg` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwps1-pickup` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/meds/rpc/orwps1-refill` | `apps/api/src/routes/meds.ts` |
| GET | `/vista/notes/rpc/orwtiu-canlink` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/orwtiu-chktxt` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/orwtiu-get-dcsumm-context` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/orwtiu-get-listbox-item` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/orwtiu-get-saved-cp-fields` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/orwtiu-get-tiu-context` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/orwtiu-getpaste` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/orwtiu-ldcpidnt` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/orwtiu-poll` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/orwtiu-save-dcsumm-context` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/orwtiu-save-tiu-context` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/orwtiu-start` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/orwtiu-stop` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/orwtiu-svcopy` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/orwtiu-svcpidnt` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/orwtiu-svpaste` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/orwtiu-viewcopy` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/orwtiu-winprint-note` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-ancillary-package-message` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-authorization` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-create-addendum-record` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-create-record` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-delete-record` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-detailed-display` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-div-and-class-info` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-doc` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-documents-by-context` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-field-can-edit` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-field-check` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-field-delete` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-field-dolmtext` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-field-export` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-field-import` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-field-list` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-field-list-add` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-field-list-import` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-field-load` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-field-load-by-ien` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-field-lock` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-field-name-is-unique` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-field-save` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-field-unlock` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-get-additional-signers` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-get-alert-info` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-get-boilerplate` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-get-default-provider` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-get-document-parameters` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-get-document-title` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-get-ds-urgencies` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-get-linked-prf-notes` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-get-list-of-objects` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-get-personal-preferences` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-get-prf-actions` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-get-prf-title` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-get-print-name` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-get-record-text` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-get-request` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-get-site-parameters` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-id-attach-entry` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-id-can-attach` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-id-can-receive` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-id-detach-entry` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-identify-clinproc-class` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-identify-consults-class` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-identify-surgery-class` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-is-user-a-usr-provider` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-isprf` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-link-to-flag` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-load-boilerplate-text` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-load-record-for-edit` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-load-record-text` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-lock-record` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-long-list-boilerplated` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-long-list-clinproc-titles` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-long-list-consult-titles` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-long-list-of-titles` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-long-list-surgery-titles` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-personal-title-list` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-print-record` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-rem-dlg-ok-as-template` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-reminder-dialogs` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-requires-cosignature` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-set-document-text` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-sign-record` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-summaries` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-template-access-level` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-template-all-titles` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-template-check-boilerplate` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-template-delete` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-template-get-defaults` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-template-get-description` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-template-getboil` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-template-getitems` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-template-getlink` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-template-getroots` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-template-gettext` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-template-iseditor` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-template-lock` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-template-personal-objects` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-template-set-defaults` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-template-set-items` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-template-unlock` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-unlock-record` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-update-additional-signers` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-update-record` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-user-class-long-list` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-user-is-member-of-class` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiu-which-signature-action` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiuadd` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiuerr` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/notes/rpc/tiuid` | `apps/api/src/routes/notes.ts` |
| GET | `/vista/nursing/assessments` | `apps/api/src/routes/nursing/index.ts` |
| GET | `/vista/nursing/flowsheet` | `apps/api/src/routes/nursing/index.ts` |
| GET | `/vista/nursing/io` | `apps/api/src/routes/nursing/index.ts` |
| GET | `/vista/nursing/mar` | `apps/api/src/routes/nursing/index.ts` |
| POST | `/vista/nursing/mar/administer` | `apps/api/src/routes/nursing/index.ts` |
| GET | `/vista/nursing/note-text` | `apps/api/src/routes/nursing/index.ts` |
| GET | `/vista/nursing/notes` | `apps/api/src/routes/nursing/index.ts` |
| POST | `/vista/nursing/notes/create` | `apps/api/src/routes/nursing/index.ts` |
| GET | `/vista/nursing/patient-context` | `apps/api/src/routes/nursing/index.ts` |
| GET | `/vista/nursing/tasks` | `apps/api/src/routes/nursing/index.ts` |
| GET | `/vista/nursing/vitals` | `apps/api/src/routes/nursing/index.ts` |
| GET | `/vista/nursing/vitals-range` | `apps/api/src/routes/nursing/index.ts` |
| GET | `/vista/nursing/ward-patients` | `apps/api/src/routes/nursing/index.ts` |
| POST | `/vista/orders/release` | `apps/api/src/routes/write-backs.ts` |
| GET | `/vista/orders/rpc/orwdx-again` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdx-change` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdx-dgnm` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdx-dgrp` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdx-dismsg` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdx-dlgdef` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdx-dlgid` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdx-formid` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdx-loadrsp` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdx-lock` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdx-lock-order` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdx-msg` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdx-orditm` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdx-save` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdx-send` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdx-sended` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdx-sendp` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdx-unlock` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdx-unlock-order` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdx-wrlst` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdx1-dcorig` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdx1-dcren` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdx1-ordmatch` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdx1-patward` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdx1-stchange` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdx1-undcorig` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdx2-dcreason` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxa-alert` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxa-complete` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxa-dc` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxa-dcreqien` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxa-flag` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxa-flagtxt` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxa-hold` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxa-isactoi` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxa-ofcplx` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxa-unflag` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxa-unhold` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxa-valid` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxa-verify` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxa-wcget` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxa-wcput` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxc-accept` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxc-delay` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxc-delord` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxc-display` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxc-fillid` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxc-on` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxc-savechk` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxc-session` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxm-autoack` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxm-dlgname` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxm-formid` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxm-loadset` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxm-menu` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxm-mstyle` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxm-prompts` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxm-rscrn` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxm1-bldqrsp` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxm1-svrpc` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxm2-clrrcl` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxm3-isudqo` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxq-dlgname` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxq-dlgsave` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxq-getqlst` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxq-getqnam` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxq-putqlst` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxq-putqnam` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxr-canrn` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxr-getpkg` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxr-gtoritm` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxr-iscplx` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxr-isnow` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxr-isrel` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxr-orcplx` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxr-renew` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxr-rnwflds` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxr01-canchg` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxr01-issply` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxr01-oxdata` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxr01-savchg` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxvb-compord` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxvb-getall` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxvb-nursadmn` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxvb-raw` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxvb-results` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxvb-statalow` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxvb-subchk` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxvb-vbtns` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxvb3-colltim` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxvb3-diagord` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwdxvb3-swpanel` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwor-action-text` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwor-expired` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwor-pkisite` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwor-pkiuse` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwor-require-current-client` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwor-result` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwor-result-history` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwor-sheets` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwor-tsall` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwor-unsign` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwor-verify-note-title` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwor-vwget` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwor-vwset` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwor1-chkdig` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwor1-getdsch` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwor1-getdtext` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwor1-setdtext` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwor1-sig` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orworb-autounflag-orders` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orworb-fastuser` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orworb-getdata` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orworb-getltxt` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orworb-getsort` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orworb-kill-expir-med-alert` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orworb-kill-expir-oi-alert` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orworb-kill-unsig-orders-alert` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orworb-kill-unver-meds-alert` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orworb-kill-unver-orders-alert` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orworb-setsort` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orworb-text-followup` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orworb-unsig-orders-followup` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwordg-alltree` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwordg-ien` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwordg-mapseq` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orwordg-revsts` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orworr-aget` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orworr-get` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orworr-get4lst` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orworr-getbyifn` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orworr-getdea` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orworr-getdsig` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orworr-gettxt` | `apps/api/src/routes/orders.ts` |
| GET | `/vista/orders/rpc/orworr-rget` | `apps/api/src/routes/orders.ts` |
| POST | `/vista/orders/sign` | `apps/api/src/routes/write-backs.ts` |
| GET | `/vista/problems/rpc/orqqpl-add-save` | `apps/api/src/routes/problems.ts` |
| GET | `/vista/problems/rpc/orqqpl-audit-hist` | `apps/api/src/routes/problems.ts` |
| GET | `/vista/problems/rpc/orqqpl-check-dup` | `apps/api/src/routes/problems.ts` |
| GET | `/vista/problems/rpc/orqqpl-clin-filter-list` | `apps/api/src/routes/problems.ts` |
| GET | `/vista/problems/rpc/orqqpl-clin-srch` | `apps/api/src/routes/problems.ts` |
| GET | `/vista/problems/rpc/orqqpl-delete` | `apps/api/src/routes/problems.ts` |
| GET | `/vista/problems/rpc/orqqpl-detail` | `apps/api/src/routes/problems.ts` |
| GET | `/vista/problems/rpc/orqqpl-edit-load` | `apps/api/src/routes/problems.ts` |
| GET | `/vista/problems/rpc/orqqpl-edit-save` | `apps/api/src/routes/problems.ts` |
| GET | `/vista/problems/rpc/orqqpl-init-pt` | `apps/api/src/routes/problems.ts` |
| GET | `/vista/problems/rpc/orqqpl-init-user` | `apps/api/src/routes/problems.ts` |
| GET | `/vista/problems/rpc/orqqpl-prob-comments` | `apps/api/src/routes/problems.ts` |
| GET | `/vista/problems/rpc/orqqpl-problem-list` | `apps/api/src/routes/problems.ts` |
| GET | `/vista/problems/rpc/orqqpl-problem-ntrt-bulletin` | `apps/api/src/routes/problems.ts` |
| GET | `/vista/problems/rpc/orqqpl-prov-filter-list` | `apps/api/src/routes/problems.ts` |
| GET | `/vista/problems/rpc/orqqpl-provider-list` | `apps/api/src/routes/problems.ts` |
| GET | `/vista/problems/rpc/orqqpl-replace` | `apps/api/src/routes/problems.ts` |
| GET | `/vista/problems/rpc/orqqpl-saveview` | `apps/api/src/routes/problems.ts` |
| GET | `/vista/problems/rpc/orqqpl-serv-filter-list` | `apps/api/src/routes/problems.ts` |
| GET | `/vista/problems/rpc/orqqpl-srvc-srch` | `apps/api/src/routes/problems.ts` |
| GET | `/vista/problems/rpc/orqqpl-update` | `apps/api/src/routes/problems.ts` |
| GET | `/vista/problems/rpc/orqqpl-user-prob-cats` | `apps/api/src/routes/problems.ts` |
| GET | `/vista/problems/rpc/orqqpl-user-prob-list` | `apps/api/src/routes/problems.ts` |
| GET | `/vista/problems/rpc/orqqpl-verify` | `apps/api/src/routes/problems.ts` |
| GET | `/vista/problems/rpc/orqqpl4-lex` | `apps/api/src/routes/problems.ts` |
| POST | `/vista/problems/save` | `apps/api/src/routes/write-backs.ts` |
| GET | `/vista/rcm/ar-status` | `apps/api/src/routes/vista-rcm.ts` |
| GET | `/vista/rcm/charges` | `apps/api/src/routes/vista-rcm.ts` |
| GET | `/vista/rcm/claims-status` | `apps/api/src/routes/vista-rcm.ts` |
| GET | `/vista/rcm/encounters` | `apps/api/src/routes/vista-rcm.ts` |
| GET | `/vista/rcm/icd-search` | `apps/api/src/routes/vista-rcm.ts` |
| GET | `/vista/rcm/insurance` | `apps/api/src/routes/vista-rcm.ts` |
| GET | `/vista/reports/rpc/orwrp-column-headers` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwrp-get-default-printer` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwrp-lab-report-lists` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwrp-print-lab-remote` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwrp-print-lab-reports` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwrp-print-remote-report` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwrp-print-report` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwrp-print-v-report` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwrp-print-windows-lab-remote` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwrp-print-windows-remote` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwrp-print-windows-report` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwrp-report-lists` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwrp-report-text` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwrp-save-default-printer` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwrp-winprint-default` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwrp-winprint-lab-reports` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwrp1-listnutr` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwrp2-compabv` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwrp2-compdisp` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwrp2-getlkup` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwrp2-hs-comp-files` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwrp2-hs-component-subs` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwrp2-hs-components` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwrp2-hs-file-lookup` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwrp2-hs-report-text` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwrp2-hs-subitems` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwrp2-savlkup` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwrp3-expand-columns` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwrp4-hdr-modify` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwsr-caselist` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwsr-get-surg-context` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwsr-list` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwsr-onecase` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwsr-optop` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwsr-rptlist` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwsr-save-surg-context` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwsr-show-optop-when-signing` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/reports/rpc/orwsr-show-surg-tab` | `apps/api/src/routes/reports.ts` |
| GET | `/vista/rpc-capabilities` | `apps/api/src/routes/capabilities.ts` |
| POST | `/vista/surgery/create` | `apps/api/src/routes/write-backs.ts` |

## Service-Layer RPC Calls (indirect)

### `apps/api/src/services/clinical-reports.ts`
- `ORWRP REPORT LISTS` (reports/read)
- `ORWRP REPORT TEXT` (reports/read)

### `apps/api/src/services/imaging-service.ts`
- `MAG4 PAT GET IMAGES` (imaging/read)
- `MAG4 REMOTE PROCEDURE` (imaging/read)
- `MAGG PAT PHOTOS` (imaging/read)
- `RA DETAILED REPORT` (imaging/read)

### `apps/api/src/services/secure-messaging.ts`
- `ORQQXMB MAIL GROUPS` (messaging/read)
- `ZVE MAIL FOLDERS` (messaging/read)
- `ZVE MAIL GET` (messaging/read)
- `ZVE MAIL LIST` (messaging/read)
- `ZVE MAIL MANAGE` (messaging/write)
- `ZVE MAIL SEND` (messaging/write)

### `apps/api/src/adapters/clinical-engine/vista-adapter.ts`
- `ORQQAL LIST` (allergies/read)
- `ORQQPL PROBLEM LIST` (problems/read)
- `ORQQVI VITALS` (vitals/read)
- `ORWCV VST` (unknown/unknown)
- `ORWLRR INTERIM` (labs/read)
- `ORWPS ACTIVE` (medications/read)
- `ORWPT LIST ALL` (patients/read)
- `ORWPT SELECT` (patients/read)
- `ORWRP REPORT LISTS` (reports/read)
- `ORWRP REPORT TEXT` (reports/read)
- `TIU DOCUMENTS BY CONTEXT` (notes/read)

### `apps/api/src/adapters/scheduling/vista-adapter.ts`
- `ORWPT APPTLST` (scheduling/read)
- `SD W/L CREATE FILE` (scheduling/write)
- `SD W/L CURRENT STATUS` (scheduling/read)
- `SD W/L PRIORITY` (scheduling/read)
- `SD W/L RETRIVE FULL DATA` (scheduling/read)
- `SD W/L RETRIVE HOSP LOC(#44)` (scheduling/read)
- `SD W/L RETRIVE PERSON(200)` (scheduling/read)
- `SD W/L TYPE` (scheduling/read)
- `SDES CANCEL APPOINTMENT 2` (scheduling/write)
- `SDES CHECKIN` (scheduling/write)
- `SDES CHECKOUT` (scheduling/write)
- `SDES CREATE APPOINTMENTS` (scheduling/write)
- `SDES GET APPT BY APPT IEN` (scheduling/read)
- `SDES GET APPT TYPES` (scheduling/read)
- `SDES GET APPTS BY PATIENT DFN3` (scheduling/read)
- `SDES GET CANCEL REASONS` (scheduling/read)
- `SDES GET CLIN AVAILABILITY` (scheduling/read)
- `SDES GET CLINIC INFO2` (scheduling/read)
- `SDES GET RESOURCE BY CLINIC` (scheduling/read)
- `SDOE GET DIAGNOSES` (scheduling/read)
- `SDOE GET GENERAL DATA` (scheduling/read)
- `SDOE GET PROVIDERS` (scheduling/read)
- `SDOE LIST ENCOUNTERS FOR DATES` (scheduling/read)
- `SDOE LIST ENCOUNTERS FOR PAT` (scheduling/read)
- `SDVW MAKE APPT API APP` (scheduling/write)
- `SDVW SDAPI APP` (scheduling/read)

