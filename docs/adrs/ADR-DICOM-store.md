# ADR: DICOM Store Selection

**Status:** Accepted
**Date:** 2026-03-01
**Context:** Wave 12 Phase 306 (Imaging/PACS Production Validation)

## Decision

**Keep Orthanc** as the DICOM store / mini-PACS.

## Context

VistA-Evolved needs a DICOM image store that provides:

- DICOMweb API (QIDO-RS, WADO-RS, STOW-RS)
- DICOM C-STORE SCP for receiving studies from modalities
- Lua scripting for OnStableStudy webhooks
- Lightweight deployment for dev + scalable for production

Options considered:

1. **Orthanc** -- already integrated since Phase 23
2. **dcm4chee** -- Java-based, enterprise PACS
3. **Horos/OsiriX** -- macOS-only, not suitable for server deployment
4. **Google Cloud Healthcare API** -- cloud-only, vendor lock-in

## Rationale

- Orthanc is already deployed in `services/imaging/docker-compose.yml` (ports 8042/4242)
- Phase 23 implemented: ingest reconciliation, OnStableStudy Lua callback, accession matching
- Phase 24 added: imaging RBAC, device registry, audit trail, rate limiting
- Phase 156 validated: CI smoke tests, prod compose profile, env var documentation
- Orthanc is C++ (lightweight), supports PostgreSQL backend for scalability
- Docker image is well-maintained, MIT-licensed
- dcm4chee is far heavier (requires JBoss/WildFly + PostgreSQL + LDAP)

## Consequences

- Continue using Orthanc via `services/imaging/docker-compose.yml`
- Production: enable PostgreSQL storage backend (Orthanc plugin)
- Multi-tenant: one Orthanc per tenant OR strict AE-Title routing + metadata tagging
- Orthanc version pinned in compose; upgrade tracked via Dependabot

## Alternatives Rejected

| Option               | Reason                                                            |
| -------------------- | ----------------------------------------------------------------- |
| dcm4chee             | Vastly heavier stack, Java dependency, overkill for current scale |
| Cloud Healthcare API | Vendor lock-in, not self-hostable                                 |
| Horos/OsiriX         | Desktop apps, not server-grade                                    |
