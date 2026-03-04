# PhilHealth eClaims 3.0 — Spec Acquisition Status

> **Last Updated:** 2026-02-23
> **Phase:** 96 — PhilHealth eClaims 3.0 Adapter Skeleton
> **Deadline:** eClaims 3.0 required starting April 1, 2026 (eClaims 2.x disabled March 31, 2026)

---

## Current Posture

| Item                           | Status                                                        |
| ------------------------------ | ------------------------------------------------------------- |
| **Adapter skeleton**           | ACTIVE — Phase 96                                             |
| **ClaimPacket builder**        | ACTIVE — assembles from VistA-facing data                     |
| **JSON export**                | ACTIVE — canonical ClaimPacket as JSON                        |
| **PDF text export**            | ACTIVE — print-ready summary for manual portal submission     |
| **XML generator**              | PLACEHOLDER — strict interface, "spec pending" implementation |
| **Automated submission**       | NOT AVAILABLE — requires spec + certification                 |
| **Manual submission workflow** | ACTIVE — export → manual upload → status tracking             |

---

## Spec Acquisition Gates

### Gate 1: Obtain eClaims 3.0 Schema/Spec

- **Status:** NOT STARTED
- **Owner:** (assign)
- **Description:** Download or receive the official eClaims 3.0 XML/JSON schema from PhilHealth.
- **Sources to check:**
  - PhilHealth eClaims portal: https://eclaims.philhealth.gov.ph
  - PhilHealth developer documentation (if published)
  - PhilHealth IT circulars / advisory documents
  - PhilHealth regional office IT coordinators
- **Acceptance:** Schema file (XSD/JSON Schema) available and loaded into `xml-generator.ts`

### Gate 2: Validate Required Identifiers

- **Status:** NOT STARTED
- **Owner:** (assign)
- **Description:** Confirm all required identifier formats:
  - PhilHealth Identification Number (PIN) format and validation rules
  - Tax Identification Number (TIN) format
  - Facility code format and assignment process
  - Provider accreditation number format
  - Case rate codes (ICD-10 / RVS mapping updates for 3.0)
- **Acceptance:** All identifier formats documented and validations implemented

### Gate 3: eClaims 3.0 Sandbox Registration

- **Status:** NOT STARTED
- **Owner:** (assign)
- **Description:** Register facility for eClaims 3.0 sandbox/test environment.
- **Prerequisites:** Facility accreditation current, TLS certificate enrolled
- **Acceptance:** API credentials for sandbox environment received and configured

### Gate 4: Sandbox Test Submission

- **Status:** NOT STARTED
- **Owner:** (assign)
- **Description:** Submit test claim to PhilHealth sandbox, receive valid TCN.
- **Prerequisites:** Gate 1 (schema), Gate 2 (identifiers), Gate 3 (sandbox access)
- **Acceptance:** Valid TCN received from sandbox for at least one test claim

### Gate 5: Production Certification

- **Status:** NOT STARTED
- **Owner:** (assign)
- **Description:** Complete PhilHealth certification process for production submission.
- **Prerequisites:** Gates 1-4 complete
- **Acceptance:** Production API credentials received, first real claim submitted

---

## Operational Workflow (Available Now)

```
VistA Encounter → PhilHealth Claim Draft (Phase 90)
                    ↓
          ClaimPacket Builder (Phase 96)
                    ↓
          Export Bundle:
            ├── JSON canonical (for future API submission)
            ├── PDF text summary (for manual portal entry)
            └── XML placeholder (for future schema-compliant generation)
                    ↓
          Manual Portal Upload (billing staff)
                    ↓
          Status Tracking:
            Draft → Reviewed → Exported → Submitted(manual)
                                            → Accepted (staff enters TCN)
                                            → Denied (staff enters reason)
```

---

## Payer Registry Tasks (PH-PHIC)

These tasks should be tracked in the payer registry for PH-PHIC:

1. [ ] Obtain eClaims 3.0 XML/JSON schema from PhilHealth
2. [ ] Validate PIN/TIN/facility code format requirements for 3.0
3. [ ] Register for eClaims 3.0 sandbox access
4. [ ] Complete sandbox test submission with valid TCN
5. [ ] Enroll TLS client certificate with PhilHealth PKI
6. [ ] Configure SOA signing key (HMAC-SHA256 or RSA)
7. [ ] Staff training on eClaims 3.0 manual workflow
8. [ ] Production certification application
9. [ ] Replace XML placeholder with schema-compliant generator

---

## Known Constraints

1. **No official eClaims 3.0 schema available yet.** PhilHealth has announced 3.0
   requirement but schema distribution to software vendors is still in progress.
2. **Scanned PDF SOA rejected for admissions >= April 2026.** Electronic SOA
   (structured XML/JSON) is mandatory. Phase 90 already generates electronic SOA.
3. **TLS client certificate required.** PhilHealth PKI enrollment is a separate
   process from eClaims registration.
4. **Case rate codes may change in 3.0.** Monitor PhilHealth advisories for
   updated ICD-10 / RVS code mappings.

---

## References

- PhilHealth Circular No. 2025-0041 (eClaims 3.0 Transition Timeline)
- PhilHealth eClaims Portal: https://eclaims.philhealth.gov.ph
- Phase 90: PhilHealth eClaims Posture (claim drafts, facility setup, readiness)
- Phase 40: PhilHealth CF1-CF4 Serializer
- Phase 38: PhilHealth Connector (RcmConnector implementation)
