# Target Markets Matrix

> Regulatory, terminology, payer, and integration requirements by market.
> This is a **requirements checklist**, not pricing or commercial strategy.

## Market Overview

| Market        | ISO | Framework             | Status           | Priority |
| ------------- | --- | --------------------- | ---------------- | -------- |
| United States | US  | HIPAA / HITECH        | Active (P38-P40) | P0       |
| Philippines   | PH  | DPA 2012 / PhilHealth | Active (P38-P40) | P0       |
| Ghana         | GH  | DPA 2012 / NHIA       | Planned          | P1       |
| Kenya         | KE  | DPA 2019 / NHIF       | Future           | P2       |
| Nigeria       | NG  | NDPR 2019 / NHIS      | Future           | P2       |

---

## United States (US)

### Regulatory

| Requirement         | Detail                                              |
| ------------------- | --------------------------------------------------- |
| Primary framework   | HIPAA Privacy Rule, HIPAA Security Rule, HITECH Act |
| Consent model       | Category-level consent for data sharing             |
| Data residency      | No federal mandate; BAA required for cloud hosting  |
| Retention           | 7 years (HIPAA); varies by state (some require 10+) |
| Breach notification | 60 days to HHS; varies by state                     |
| Audit trail         | Required (HIPAA Security Rule §164.312(b))          |
| Break-glass         | Permitted with audit logging                        |
| Patient access      | Right to access records within 30 days              |

### Terminology

| Domain    | Code System           | VistA File  |
| --------- | --------------------- | ----------- |
| Diagnosis | ICD-10-CM             | File 80     |
| Procedure | CPT / HCPCS           | File 81     |
| Lab       | LOINC                 | File 60     |
| Drug      | NDC / RxNorm          | File 50     |
| Allergy   | SNOMED CT (preferred) | File 120.82 |

### Payer Ecosystem

| Category         | Detail                                        |
| ---------------- | --------------------------------------------- |
| Claim format     | X12 837P (professional), 837I (institutional) |
| Remittance       | X12 835                                       |
| Eligibility      | X12 270/271                                   |
| Clearinghouses   | Change Healthcare, Availity, Trizetto         |
| Government       | Medicare (CMS), Medicaid (state-specific)     |
| Existing support | `data/payers/us_core.json` (12 payers)        |

### Integration

| Requirement        | Detail                              |
| ------------------ | ----------------------------------- |
| Interop standard   | HL7 FHIR R4 (21st Century Cures)    |
| Patient access API | FHIR R4 required by CMS             |
| Quality reporting  | CMS Quality Payment Program         |
| Meaningful Use     | Promoting Interoperability measures |
| e-Prescribing      | NCPDP SCRIPT (Surescripts)          |

---

## Philippines (PH)

### Regulatory

| Requirement         | Detail                                            |
| ------------------- | ------------------------------------------------- |
| Primary framework   | Data Privacy Act of 2012 (RA 10173)               |
| Regulatory body     | National Privacy Commission (NPC)                 |
| Consent model       | All-or-nothing; explicit consent required         |
| Data residency      | No strict mandate; consent for cross-border       |
| Retention           | 5 years minimum (NPC guidance)                    |
| Breach notification | 72 hours to NPC + affected individuals            |
| Audit trail         | Required under DPA proportionality principle      |
| Break-glass         | Permitted (emergency medical treatment exemption) |

### Terminology

| Domain    | Code System      | Notes                                       |
| --------- | ---------------- | ------------------------------------------- |
| Diagnosis | ICD-10 (WHO)     | PhilHealth uses ICD-10 (WHO), not ICD-10-CM |
| Procedure | ICD-10-PCS / RVS | PhilHealth Relative Value Scale             |
| Lab       | LOINC (partial)  | Many facilities use local codes             |
| Drug      | PDPD / FDA-PH    | Philippine Drug Price Database              |
| Allergy   | Free-text        | No standard code system mandated            |

### Payer Ecosystem

| Category         | Detail                                              |
| ---------------- | --------------------------------------------------- |
| Claim format     | PhilHealth eClaims (CF1-CF4 JSON)                   |
| Government       | PhilHealth (universal health insurance)             |
| Private HMOs     | Maxicare, Intellicare, Medicard, MediLink, + others |
| Submission       | eClaims portal (government); portal/batch (HMOs)    |
| Existing support | `data/payers/ph_hmos.json` (15 payers)              |

### Integration

| Requirement               | Detail                                     |
| ------------------------- | ------------------------------------------ |
| Interop standard          | HL7 v2.x (common); FHIR R4 (emerging)      |
| PhilHealth integration    | eClaims API (REST) with facility code auth |
| Electronic medical record | DOH Administrative Order 2018-0002         |
| Unique patient ID         | PhilHealth PIN (member ID)                 |
| Telemedicine              | DOH-DICT Joint Administrative Order (2020) |

---

## Ghana (GH) — Planned

### Regulatory

| Requirement         | Detail                                                           |
| ------------------- | ---------------------------------------------------------------- |
| Primary framework   | Data Protection Act 2012 (Act 843)                               |
| Regulatory body     | Data Protection Commission (DPC)                                 |
| Consent model       | Explicit consent required                                        |
| Data residency      | Personal data must be stored in-country or adequate jurisdiction |
| Retention           | Not explicitly defined; institutional policy applies             |
| Breach notification | Notify DPC "as soon as reasonably practical"                     |
| Audit trail         | Best practice (no explicit mandate)                              |
| Break-glass         | Permitted (vital interest exemption)                             |

### Terminology

| Domain    | Code System     | Notes                             |
| --------- | --------------- | --------------------------------- |
| Diagnosis | ICD-10 (WHO)    | MOH standard                      |
| Procedure | ICD-10-PCS      | Government facilities             |
| Lab       | Local codes     | LOINC adoption in progress        |
| Drug      | Local formulary | National Essential Medicines List |
| Allergy   | Free-text       | No standard code system           |

### Payer Ecosystem

| Category     | Detail                                      |
| ------------ | ------------------------------------------- |
| Insurance    | NHIA (National Health Insurance Authority)  |
| Claim format | NHIA G-DRG (Ghana Diagnosis Related Groups) |
| Private      | Limited private insurance market            |
| Submission   | NHIA claims portal                          |

### Integration

| Requirement       | Detail                                     |
| ----------------- | ------------------------------------------ |
| Interop standard  | HL7 v2.x; FHIR R4 emerging via OpenHIE     |
| National HIS      | DHIS2 (District Health Information System) |
| Unique patient ID | NHIA membership number                     |
| Facility registry | Ghana Health Service facility codes        |

---

## Cross-Market Comparison

| Capability              |        US        |        PH        |       GH       |
| ----------------------- | :--------------: | :--------------: | :------------: |
| Consent granularity     |     Category     |  All-or-nothing  | All-or-nothing |
| Data residency          |       Soft       |       Soft       |      Hard      |
| Breach notification SLA |     60 days      |     72 hours     |      ASAP      |
| Standard terminology    | ICD-10-CM + CPT  |    ICD-10-WHO    |   ICD-10-WHO   |
| Claim format            |     X12 837      |  eClaims CF1-4   |   NHIA G-DRG   |
| Interop mandate         |     FHIR R4      |  HL7 v2 + REST   | HL7 v2 + DHIS2 |
| Break-glass             |       Yes        |       Yes        |      Yes       |
| Audit retention         |     7 years      |     5 years      | Policy-defined |
| RCM connectivity        | Phase 38-40 done | Phase 38-40 done |    Planned     |
| Terminology mapping     |  Phase 39 done   |     Partial      |  Not started   |

---

## Implementation Priority

### P0 — Current (US + PH)

- Country pack JSON definitions
- Regulatory profile enforcement
- Payer connectivity (done in Phase 38-40)
- Terminology defaults

### P1 — Next (GH)

- NHIA claims integration
- DHIS2 interop
- Local terminology mapping
- Data residency enforcement (in-country or adequate)

### P2 — Future (KE, NG)

- Research phase
- Regulatory assessment
- Payer ecosystem mapping

## Related

- `docs/country-packs/COUNTRY_PACK_STANDARD.md`
- `docs/adrs/ADR-country-pack-model.md`
- `docs/adrs/ADR-data-residency-model.md`
- `docs/adrs/ADR-terminology-model.md`
