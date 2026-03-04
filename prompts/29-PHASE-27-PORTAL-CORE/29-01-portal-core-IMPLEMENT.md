# Phase 27 — Portal Core: VistA-First Record + Exports + Proxy + Messaging + Appointments + Sharing — IMPLEMENT

## User Request

Build REAL portal functionality using VistA-first data sources. No fake clinical data.
If a VistA RPC is missing, show "Integration Pending" and name the exact target RPC/file.

## Modules

A) **Health Record** — Wire portal proxy routes to real VistA RPCs (allergies, problems, vitals, meds, labs, demographics). Add PDF export per section + full record bundle.
B) **Proxy Access + Sensitivity** — Authorized representative/proxy, protected minor rules, sensitive content policy engine.
C) **Secure Messaging** — Threaded inbox, compose, drafts, sent. Subject categories. Attachments. SLA disclaimer. In-memory store with VistA integration mapping.
D) **Appointments** — Dashboard (upcoming/past), details, cancel/reschedule request flow. Stub where VistA scheduling RPCs unavailable.
E) **Sharing** — Share Link + Access Code, time-limited, audited, revocable.
F) **Settings** — Language, notification prefs, MFA stub.

## Implementation Steps

1. Create prompt file (this file)
2. API: Wire portal health proxy routes to real VistA RPCs
3. API: Create PDF export service + endpoints
4. API: Create proxy access + sensitivity policy engine
5. API: Create secure messaging service + endpoints
6. API: Create appointments service + endpoints
7. API: Create sharing service + endpoints + external viewer
8. API: Create settings service + endpoints
9. Portal UI: Update health record pages with real data
10. Portal UI: Create messaging pages (inbox, compose, thread)
11. Portal UI: Create appointments pages (list, detail, request)
12. Portal UI: Create sharing + settings pages
13. Update portal-contract-v1.yaml + capability matrix
14. Create docs/runbooks/portal-core.md + known-gaps.md
15. Build + verify + commit

## Files Touched

- apps/api/src/routes/portal-auth.ts (wire health proxy to real RPCs)
- apps/api/src/routes/portal-core.ts (NEW: messaging, appointments, sharing, settings, PDF)
- apps/api/src/services/portal-audit.ts (extend audit actions)
- apps/api/src/services/portal-messaging.ts (NEW)
- apps/api/src/services/portal-appointments.ts (NEW)
- apps/api/src/services/portal-sharing.ts (NEW)
- apps/api/src/services/portal-sensitivity.ts (NEW)
- apps/api/src/services/portal-pdf.ts (NEW)
- apps/api/src/services/portal-settings.ts (NEW)
- apps/api/src/index.ts (register new routes)
- apps/portal/src/lib/api.ts (add new fetch functions)
- apps/portal/src/app/dashboard/\* (update all pages)
- apps/portal/src/app/dashboard/messages/\* (NEW)
- apps/portal/src/app/share/\* (NEW: external viewer)
- docs/contracts/portal/portal-contract-v1.yaml
- docs/contracts/portal/portal-capability-matrix.md
- docs/contracts/portal/known-gaps.md (NEW)
- docs/runbooks/portal-core.md (NEW)

## Verification

- Portal build clean
- API tsc --noEmit clean
- License guard passes
- All portal health endpoints return VistA data when connected
- PDF export produces valid content
- Messaging CRUD works
- Sharing flow: generate → verify → view → revoke
