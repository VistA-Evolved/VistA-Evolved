# Threat Model — VistA-Evolved

> **Owner**: Engineering / Security  
> **Last updated**: Phase 34 — Regulated SDLC  
> **Review cadence**: Every 90 days or when attack surface changes  
> **Method**: STRIDE + data-flow decomposition

---

## 1. System Overview

VistA-Evolved is a modern web frontend for the VistA EHR system. It exposes
VistA clinical data through a Fastify API backend, with Next.js web and patient
portal frontends, integrated imaging (Orthanc/OHIF), analytics (ROcto SQL),
and telehealth (Jitsi).

### 1.1 Trust Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│  EXTERNAL (Untrusted)                                           │
│  Browser ──HTTPS──► Reverse Proxy                               │
└────────────────────────┬────────────────────────────────────────┘
                         │ TLS termination
┌────────────────────────┴────────────────────────────────────────┐
│  DMZ                                                            │
│  Next.js Web  │  Next.js Portal  │  OHIF Viewer                │
└────────────────────────┬────────────────────────────────────────┘
                         │ Internal HTTP
┌────────────────────────┴────────────────────────────────────────┐
│  APPLICATION TIER (Trusted)                                     │
│  Fastify API ──TCP──► RPC Broker Client ──TCP──► VistA (9430)  │
│       │                                                         │
│       ├──HTTP──► Orthanc (8042)    DICOMweb proxy               │
│       ├──PG───► ROcto (1338)       Analytics SQL                │
│       └──WS──► Jitsi (8443)        Telehealth                   │
└────────────────────────┬────────────────────────────────────────┘
                         │ Internal TCP
┌────────────────────────┴────────────────────────────────────────┐
│  DATA TIER (Highest trust)                                      │
│  VistA / YottaDB globals  │  Orthanc PostgreSQL  │  DICOM store│
└─────────────────────────────────────────────────────────────────┘
```

## 2. STRIDE Threat Analysis

### 2.1 Spoofing (Identity)

| # | Threat | Target | Likelihood | Impact | Mitigation | Status |
|---|--------|--------|------------|--------|------------|--------|
| S1 | Stolen VistA credentials | RPC broker auth | Medium | High | Cipher pad encryption (XUSRB1), never store creds, session-only | Implemented |
| S2 | Session hijacking | httpOnly cookie | Low | High | httpOnly + Secure + SameSite=Lax, session timeout | Implemented |
| S3 | Service key theft | Imaging ingest webhook | Low | Medium | Env var config, constant-time comparison | Implemented |
| S4 | Portal credential stuffing | Portal login | Medium | Medium | PBKDF2 hashing, rate limiting | Implemented |

### 2.2 Tampering

| # | Threat | Target | Likelihood | Impact | Mitigation | Status |
|---|--------|--------|------------|--------|------------|--------|
| T1 | Audit trail modification | Imaging audit | Low | Critical | SHA-256 hash chain, verify endpoint | Implemented |
| T2 | VistA global manipulation | M globals | Very Low | Critical | API never directly writes globals (RPC-mediated) | By design |
| T3 | Order tampering | ORWDX RPCs | Low | High | LOCK/UNLOCK protocol, provider verification | Implemented |
| T4 | Analytics data injection | Event stream | Low | Low | Server-side only events, no client-submitted analytics | By design |

### 2.3 Repudiation

| # | Threat | Target | Likelihood | Impact | Mitigation | Status |
|---|--------|--------|------------|--------|------------|--------|
| R1 | Deny clinical data access | Audit trail | Medium | High | Comprehensive audit logging, hash chain for imaging | Implemented |
| R2 | Deny break-glass usage | Break-glass audit | Low | High | Dual audit (general + imaging), mandatory reason | Implemented |
| R3 | Deny order creation | Order audit | Low | High | VistA-side audit (ORACTION) + API audit | Implemented |

### 2.4 Information Disclosure

| # | Threat | Target | Likelihood | Impact | Mitigation | Status |
|---|--------|--------|------------|--------|------------|--------|
| I1 | PHI in logs | Structured logs | Medium | High | 5-layer redaction stack, PHI leak scanner | Implemented |
| I2 | PHI in error messages | HTTP responses | Medium | High | Generic error messages, no err.message forwarding | Implemented (Phase 34) |
| I3 | DICOM data unauthorized access | DICOMweb proxy | Low | High | imaging_view RBAC, rate limiting, audit | Implemented |
| I4 | Analytics leaking PHI | Analytics store | Low | High | Structural PHI prevention, sanitizer, hashed IDs | Implemented |
| I5 | Credential exposure in code | Source files | Low | Critical | Secret scanner (CI gate), .env.local pattern | Implemented |
| I6 | Patient data in telehealth URLs | Room IDs | Low | Medium | Opaque hex tokens, no PHI in Jitsi room names | Implemented |

### 2.5 Denial of Service

| # | Threat | Target | Likelihood | Impact | Mitigation | Status |
|---|--------|--------|------------|--------|------------|--------|
| D1 | API request flooding | Fastify server | Medium | Medium | Rate limiting (100 req/60s general, 120 DICOMweb) | Implemented |
| D2 | RPC broker exhaustion | VistA connection | Low | High | Circuit breaker (5 fail → open, 30s half-open) | Implemented |
| D3 | Patient lock abuse | ORWDX LOCK | Low | Medium | Automatic UNLOCK in finally blocks | Implemented |
| D4 | WebSocket abuse | /ws/console | Low | Low | Admin-only, RPC blocklist | Implemented |

### 2.6 Elevation of Privilege

| # | Threat | Target | Likelihood | Impact | Mitigation | Status |
|---|--------|--------|------------|--------|------------|--------|
| E1 | Role escalation via session | RBAC system | Low | Critical | Role mapped from VistA at login, immutable in session | By design |
| E2 | WebSocket credential theft | /ws/console | Low | High | RPC blocklist (XUS AV CODE, XUS SET VISITOR) | Implemented |
| E3 | MUMPS injection via RPC | VistA server | Low | Critical | Parameterized RPC calls, no inline MUMPS from user input | By design |
| E4 | Service-key to admin | Imaging ingest | Very Low | Medium | Service auth limited to ingest callback only | By design |

## 3. Attack Surface Summary

| Surface | Exposure | Auth Required | PHI Accessible |
|---------|----------|---------------|----------------|
| Web UI (Next.js) | External | Session cookie | Yes (clinical data) |
| Patient Portal | External | Portal credentials | Limited (own data) |
| API REST endpoints | External | Session/Admin/Service | Yes |
| WebSocket console | External | Admin session | Yes (RPC results) |
| DICOMweb proxy | External | Session + imaging_view | Yes (imaging) |
| OHIF Viewer | External | Proxied through API | Yes (imaging display) |
| VistA RPC Broker | Internal only | XWB cipher auth | Yes (all clinical) |
| Orthanc DICOM | Internal only | None (Docker network) | Yes (DICOM) |
| ROcto SQL | Internal only | PG MD5 auth | No (aggregated only) |
| Jitsi/Telehealth | External | Session | No (video stream only) |

## 4. Risk Register

| Risk | Severity | Likelihood | Controls | Residual Risk |
|------|----------|------------|----------|---------------|
| PHI breach via log exposure | High | Low | 5-layer redaction, CI scanner | Low |
| Credential compromise | Critical | Low | Cipher auth, no storage, session timeout | Low |
| Audit trail tampering | Critical | Very Low | Hash chain, verify endpoint | Very Low |
| MUMPS injection | Critical | Very Low | Parameterized RPCs, no user→MUMPS path | Very Low |
| Session hijacking | High | Low | httpOnly/Secure/SameSite, timeout | Low |
| Insider threat (admin abuse) | High | Low | Break-glass audit, RPC blocklist | Medium |

## 5. Recommended Future Mitigations

| Priority | Mitigation | Target Phase |
|----------|-----------|-------------|
| High | TLS between API and VistA (RPC broker encryption) | Future |
| High | Multi-factor authentication for admin users | Future |
| Medium | IP allowlisting for admin endpoints | Future |
| Medium | Content Security Policy headers | Future |
| Low | WebSocket connection rate limiting | Future |
| Low | DICOM TLS (DIMSE over TLS) for external PACS | Future |

## 6. References

- [Data Classification Policy](data-classification.md)
- [Access Control Policy](access-control-policy.md)
- [Incident Response Plan](incident-response.md)
- [OWASP Threat Modeling](https://owasp.org/www-community/Threat_Modeling)
- [STRIDE](https://docs.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats)
