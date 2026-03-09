# Reuse vs Build Decision Matrix

> Generated: 2026-03-09

## Decision Framework

For each area, we evaluate: Does an existing open-source solution exist that
we should integrate, or is custom development justified?

## VistA Base Image

| Option | Decision | Rationale |
| ------ | -------- | --------- |
| WorldVistA VEHU Docker | **REUSE** | Official sandbox with rich clinical data, 80+ SDES RPCs, maintained by community |
| WorldVistA Legacy (worldvista-ehr) | **AVAILABLE** | Older image, fewer patients; keep as fallback lane |
| Custom Distro (services/vista-distro) | **BUILT** | Phase 148; reproducible multi-stage build for production |
| OSEHRA VistA | **NOT USED** | Evaluated; VEHU has better sandbox data |

**Upgrade path**: Pull latest `worldvista/vehu` tag from Docker Hub. Custom
ZVE* routines are installed via `install-vista-routines.ps1` after image pull.
Routines survive `docker compose down/up` but NOT `down -v`.

## Clinical Logic

| Area | Decision | Rationale |
| ---- | -------- | --------- |
| Patient search | **REUSE VistA** | ORWPT LIST ALL, ORWPT SELECT |
| Allergies | **REUSE VistA** | ORQQAL LIST + ORWDAL32 SAVE |
| Vitals | **REUSE VistA** | ORQQVI VITALS + GMV ADD VM |
| Problems | **REUSE VistA** | ORQQPL LIST (read); write pending |
| Medications | **REUSE VistA** | ORWPS ACTIVE |
| Notes/TIU | **REUSE VistA** | TIU CREATE/SET/SIGN/DOCUMENTS |
| Labs | **REUSE VistA** | ORWLRR CHART/GRID |
| Orders | **REUSE VistA** | ORWDX SAVE, ORWOR1 SIG |
| Scheduling | **REUSE VistA** | SDES/SDOE RPCs (Phase 147) |
| Admin Domains | **BUILD (justified)** | No native admin RPCs; ZVE* routines use FileMan APIs |

## Infrastructure

| Area | Decision | Rationale |
| ---- | -------- | --------- |
| Web Framework | **BUILD** (Next.js) | No existing VistA web UI meets our needs |
| API Framework | **BUILD** (Fastify) | Custom XWB RPC protocol client required |
| Database | **REUSE** (PostgreSQL) | Standard platform DB for tenant/audit data |
| Auth | **REUSE** (Keycloak) | Industry-standard OIDC provider |
| Imaging | **REUSE** (Orthanc + OHIF) | Open-source DICOM server + viewer |
| Observability | **REUSE** (OTel + Jaeger + Prometheus) | Standard stack |
| Telehealth | **REUSE** (Jitsi Meet) | Open-source video conferencing |

## Billing/RCM

| Area | Decision | Rationale |
| ---- | -------- | --------- |
| X12 EDI Format | **BUILD** | No suitable open-source X12 5010 library for Node.js |
| PhilHealth eClaims | **BUILD** | No existing integration library |
| Claim Lifecycle | **BUILD** | VistA IB/PRCA empty in sandbox; multi-country requirement |
| Payer Registry | **BUILD** | Custom seed data per market |

**Reference**: OpenEMR billing module evaluated as clean-room reference for
workflow patterns. No code reused (different language/architecture).

## Interoperability

| Area | Decision | Rationale |
| ---- | -------- | --------- |
| FHIR R4 | **BUILD** | Custom VistA-to-FHIR mapping layer; no existing VistA FHIR server met quality bar |
| HL7v2 | **BUILD** | Custom MLLP engine with VistA HLO bridge |
| C-CDA | **PARTIAL BUILD** | Parser exists; may integrate bluebuttonjs for parsing |

## Terminal Emulator

| Option | Decision | Rationale |
| ------ | -------- | --------- |
| xterm.js + WebSocket | **BUILT** | Phase 534; production-ready terminal emulator in browser |
| gotty / wetty | **EVALUATED** | Too many dependencies; xterm.js is lighter |

## What We Deliberately Did NOT Reuse

| Item | Why Not |
| ---- | ------- |
| OpenEMR | PHP codebase; architectural mismatch with TypeScript stack |
| OpenMRS | Java codebase; different data model; not VistA-compatible |
| CPRS (Delphi) | Win32 desktop app; extracted RPCs for coverage map only |
| VistA Web (OSEHRA) | Abandoned project; outdated architecture |

## License Compliance

| Component | License | Status |
| --------- | ------- | ------ |
| VistA core (MUMPS) | Public Domain | Clear |
| WorldVistA Docker | Apache 2.0 | Compatible |
| Custom ZVE* routines | Proprietary | No license headers; original work |
| Keycloak | Apache 2.0 | Compatible |
| Orthanc | GPLv3 | Used as service container only (not linked) |
| OHIF Viewer | MIT | Compatible |
| Jitsi Meet | Apache 2.0 | Compatible |
| xterm.js | MIT | Compatible |

No GPL/LGPL code is linked into the TypeScript application. Orthanc runs
as a separate Docker container communicating via HTTP, so GPL does not
propagate to our codebase.
