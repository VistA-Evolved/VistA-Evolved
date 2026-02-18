# Phase 28 -- Sharing Posture & Consent Model

> Who can see what data, and under which consent gates.

---

## 1. Data Classification

| Data Category | Owner | Visibility | Consent Gate |
|---|---|---|---|
| **Intake answers (QR)** | Patient | Patient, assigned clinician, admin | Implicit (by submission) |
| **Draft summary** | System-generated | Clinician who opens review, admin | N/A (derived) |
| **Red flags** | System-generated | Clinician who opens review, admin | N/A (derived) |
| **Event log** | System | Clinician (audit), admin | N/A (operational) |
| **Filed note** | Clinician (author) | Standard VistA TIU access controls | VistA ACL |
| **Kiosk resume token** | System | Bearer of token (single-use, 30min TTL) | N/A (ephemeral) |

## 2. Access Control by Role

| Actor | Create Session | Answer Questions | View Own Answers | Review Others | File to VistA | View Audit |
|---|---|---|---|---|---|---|
| **Patient (portal)** | Yes | Yes | Yes | No | No | No |
| **Proxy (portal)** | Yes (subjectType=proxy) | Yes | Yes (own session) | No | No | No |
| **Clinician** | No | No | No | Yes (submitted+) | Yes (reviewed only) | Yes |
| **Admin** | No | No | No | Yes | Yes | Yes |

## 3. Proxy / Minor Intake

### Current scaffolding (Phase 28)

- `IntakeSession.subjectType`: `"patient"` or `"proxy"`
- `IntakeSession.proxyDfn`: DFN of the proxy (guardian/caregiver)
- Portal session carries the logged-in patient's DFN
- When `subjectType === "proxy"`, the session's `patientDfn` is the **subject** (the minor/dependent), and `proxyDfn` is the **actor** (the guardian filling out the form)

### Consent model for proxy

1. Proxy must be registered in VistA as an authorized representative
2. Portal login establishes proxy identity
3. Intake session creation with `subjectType: "proxy"` requires:
   - `proxyDfn` (the logged-in user)
   - `patientDfn` (the subject -- minor or dependent)
4. All events log `actorType: "proxy"` and the proxy's DFN
5. Clinician review shows proxy indicator and proxy identity

### Future work

- VistA RPC to verify proxy authorization: `DG SENSITIVE RECORD ACCESS`
- Age-based auto-gating (minors < 18 require proxy)
- Emancipated minor exception handling
- Behavioral health confidentiality for adolescents (varies by state)

## 4. Sensitivity & Withholding

- Intake sessions inherit the patient's sensitivity level from VistA
- `sensitivity.withheld` events are logged when answers to sensitive questions are suppressed
- Behavioral health screening answers (PHQ-2, GAD-2, SI) are marked with higher sensitivity
- Clinician must acknowledge sensitivity before viewing withheld answers

## 5. Session Expiry & Abandonment

| Scenario | TTL | Action |
|---|---|---|
| Session idle (no activity) | 24 hours | Status -> expired |
| Kiosk idle (no touch) | 5 minutes warning, 60s auto-save | Status preserved, kiosk resets |
| Resume token | 30 minutes | Token invalidated |
| Submitted, not reviewed | No expiry | Stays in clinician queue |

## 6. Filing Authorization

- **Only clinicians** can file to VistA (never automatic)
- Filing requires `clinician_reviewed` status (explicit confirmation step)
- Filed data follows standard VistA ACLs (TIU notes, allergy file, etc.)
- Filing results are logged with full audit trail

## 7. Cross-Device Continuity (Kiosk -> Portal)

- Kiosk generates a resume token (6-char alphanumeric, single-use)
- Patient can scan QR code on phone to continue on portal
- Token redemption transfers session ownership to the portal session
- Original kiosk session is invalidated after token use
- No PHI in the token itself (token maps to sessionId server-side)
