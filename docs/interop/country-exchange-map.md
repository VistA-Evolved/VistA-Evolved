# Country / Exchange Map — Multi-Country Interoperability Strategy

> Phase 399 (W23-P1) — How VistA-Evolved participates in health information
> exchange across different regulatory and infrastructure contexts.

---

## 1. United States — TEFCA + SMART/FHIR + Bulk Data

### Exchange Framework

- **TEFCA (Trusted Exchange Framework and Common Agreement)**
  - Participant/sub-participant readiness posture (NOT a QHIN claim)
  - Identity resolution via TEFCA Individual Access Services (IAS)
  - Query-based and document-based exchange patterns
- **SMART on FHIR** — existing Phase 179 foundation
- **Bulk Data IG** — population-level export/import (Phase 404)

### Key Standards

| Standard         | Role                  | VistA-Evolved Posture      |
| ---------------- | --------------------- | -------------------------- |
| US Core FHIR R4  | Patient data exchange | FHIR gateway (Phase 178)   |
| CDA R2           | Document exchange     | DocumentReference bridge   |
| Direct Messaging | Secure transport      | Connector adapter          |
| TEFCA QHIN specs | Network participation | Engineering readiness only |

### Identity

- MRN + SSN (last 4) + demographics matching
- TEFCA IAS hooks for cross-network identity

### Consent

- HIPAA minimum necessary
- Individual right of access (21st Century Cures)
- Purpose-of-use: Treatment, Payment, Operations (TPO)

---

## 2. European Union — XDS.b / MHD + Strong Consent + Data Residency

### Exchange Framework

- **IHE XDS.b / MHD** — document sharing (cross-border via eHDSI patterns)
- **FHIR R4** — increasingly adopted (EU Lab, EU PS)
- **Strong consent** — GDPR Article 9 (health data = special category)

### Key Standards

| Standard              | Role                          | VistA-Evolved Posture    |
| --------------------- | ----------------------------- | ------------------------ |
| IHE XDS.b             | Document registry/repository  | Posture + bridge         |
| IHE MHD               | FHIR DocumentReference facade | DocumentReference routes |
| HL7 FHIR EU Lab       | Lab results exchange          | Mapping layer            |
| eHDSI Patient Summary | Cross-border summary          | CDA/FHIR export          |

### Identity

- National health ID per country (e.g., NHS number UK, Tessera Sanitaria IT)
- Cross-border: eIDAS electronic identification

### Consent

- Explicit opt-in required (GDPR)
- Purpose-of-use mandatory for every disclosure
- Data residency flags per tenant configuration
- Right to erasure affects exchange partners

---

## 3. LMIC / Public Health — OpenHIE (OpenHIM + OpenCR + SHR)

### Exchange Framework

- **OpenHIE architecture** — layered approach for resource-constrained settings
  - **OpenHIM** — interoperability layer (mediator/channels/audit)
  - **OpenCR** — client registry (MPI)
  - **SHR** — shared health record (FHIR-based)

### Key Standards

| Standard                      | Role                    | VistA-Evolved Posture    |
| ----------------------------- | ----------------------- | ------------------------ |
| OpenHIM                       | Transaction routing     | Optional gateway adapter |
| OpenCR                        | Client registry         | MPI adapter              |
| FHIR R4                       | Data exchange           | Native FHIR gateway      |
| ADX (Aggregate Data Exchange) | Public health reporting | Future extension         |

### Identity

- Multiple ID systems (facility MRN, national ID, biometric)
- Probabilistic matching essential (poor data quality)
- OpenCR handles deduplication

### Consent

- Varies by country — often implied for public health
- Emergency access patterns critical
- Break-glass with mandatory audit

---

## 4. Deployment Patterns

### Customer-Owned HIE

- Single organization deploying VistA-Evolved
- Internal exchange between departments/facilities
- Uses internal MPI + document exchange
- No external network participation required

### National HIE Participant

- Organization connects to a national health exchange
- Must implement national identity standards
- Document exchange per national spec
- Consent framework per national regulation

### Multi-Country Deployment

- Single platform serving multiple countries
- Tenant-scoped exchange pack configuration
- Per-tenant consent rules and identity schemes
- Data residency enforcement per tenant

---

## 5. Exchange Pack Architecture

Each deployment context is served by an "exchange pack" that configures:

| Component          | US Pack                | EU Pack             | OpenHIE Pack          |
| ------------------ | ---------------------- | ------------------- | --------------------- |
| Identity scheme    | MRN + SSN4 + TEFCA IAS | National ID + eIDAS | OpenCR + facility MRN |
| Document format    | CDA + FHIR             | CDA + XDS metadata  | FHIR Bundle           |
| Transport          | Direct + FHIR REST     | XDS.b / MHD         | OpenHIM channels      |
| Consent model      | HIPAA TPO              | GDPR explicit       | Country-specific      |
| Audit requirements | HIPAA / ONC            | GDPR Art 30         | OpenHIE audit log     |
| Bulk data          | Bulk Data IG           | Per-country         | SHR export            |
