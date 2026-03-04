# Reference Repos Inventory — Portal & Telehealth (Phase 26)

> Architectural study of three reference implementations. Used for
> pattern learning ONLY. License restrictions apply (see bottom).

---

## 1. HealtheMe (Apache 2.0 — OK to learn from)

| Property  | Value                                                             |
| --------- | ----------------------------------------------------------------- |
| License   | Apache 2.0 (Copyright 2012 KRM Associates)                        |
| Stack     | Java 1.5 WAR, Jersey JAX-RS, JPA/TopLink, MySQL, jQuery, SiteMesh |
| Era       | ~2012, legacy                                                     |
| Repo path | `reference/HealtheMe-master/`                                     |

### Features

| Feature                                                                  | Patient-Facing? | Portal-Relevant?      |
| ------------------------------------------------------------------------ | --------------- | --------------------- |
| Health Record management                                                 | Yes             | Yes — PHR model       |
| Allergies CRUD                                                           | Yes             | Yes — read view       |
| Medications list                                                         | Yes             | Yes — read view       |
| Immunizations                                                            | Yes             | Yes — read view       |
| Medical Events (Problems)                                                | Yes             | Yes — read view       |
| Visits history                                                           | Yes             | Yes — visit summaries |
| Vitals (8 types: BP, HR, glucose, temp, weight, height, pain, peak flow) | Yes             | Yes — vitals display  |
| Emergency contacts                                                       | Yes             | Yes — profile         |
| Care Notebook (30+ special needs classes)                                | Yes             | Future                |
| Calendar                                                                 | Yes             | Future — scheduling   |
| CCR/CCD import                                                           | Backend         | Pattern reference     |
| Admin panel                                                              | Staff           | N/A                   |

### VistA Integration Pattern

HealtheMe connects to VistA via **SOAP web service** using a CCR Service
endpoint (`CCRService.asmx`). Key operations:

- `GetCCRForPatientDFN(dfn)` — pull CCR document by VistA DFN
- `GetCCDForPatientDFN(dfn)` — pull CCD document by DFN
- `LookupPatientsByID` / `LookupPatientsByName`
- `GetAllPatients`, `Ping`

Also supports **RPMS adapter** for IHS (Indian Health Service) systems,
and a multi-source `ResourceCredential` registry for connecting to
multiple VistA instances.

### Key Patterns to Adopt

1. **DFN-native patient identity** — uses VistA IEN directly
2. **Multi-source data pull** — configurable external source registry
3. **PHR data model** — local cache of clinical data from VistA
4. **CCR/CCD document parsing** — structured clinical document import

---

## 2. Ottehr (MIT + Attribution — OK with attribution)

| Property  | Value                                                     |
| --------- | --------------------------------------------------------- |
| License   | MIT + attribution clause (Copyright 2024 MassLight, Inc.) |
| Stack     | TypeScript, React + MUI + Vite, Node.js ≥22, Turborepo    |
| Backend   | Serverless "Zambdas" on Oystehr cloud, FHIR R4 data model |
| Repo path | `reference/ottehr ehr main/`                              |

### Patient Portal Features (apps/intake)

| Feature                           | Portal-Relevant?      |
| --------------------------------- | --------------------- |
| Appointment booking / reschedule  | Yes — scheduling      |
| Check-in & paperwork              | Yes — pre-visit       |
| AI interview / intake chatbot     | Future — AI intake    |
| Patient selection (multi-patient) | Yes — family accounts |
| Telehealth video visit            | Yes — telehealth      |
| Waiting room experience           | Yes — telehealth      |
| Walk-in landing page              | N/A                   |
| Past visits history               | Yes — visit history   |
| Photo upload                      | Future — attachments  |
| Payment methods                   | Future — billing      |
| Insurance / eligibility           | Future — eligibility  |

### EHR Staff Features (apps/ehr)

Not directly relevant to patient portal, but demonstrates:

- Telemed session management
- eRx workflow
- Lab/radiology order patterns
- Patient chat/messaging
- AI-assisted encounter notes

### VistA Integration

**None.** Ottehr is FHIR-native on Oystehr cloud. However, its
**FHIR access policy model** (`FHIR:Search`, `FHIR:Read`, etc.) is
a clean RBAC pattern worth studying.

### Key Patterns to Adopt

1. **Intake flow** — step-by-step patient check-in UX
2. **Waiting room UX** — status polling for telehealth
3. **Multi-patient accounts** — family member management
4. **FHIR RBAC pattern** — resource-level access control

---

## 3. AIOTP (CC BY-NC-SA 4.0 — NON-COMMERCIAL, DO NOT COPY CODE)

| Property  | Value                                                 |
| --------- | ----------------------------------------------------- |
| License   | **CC BY-NC-SA 4.0 (NON-COMMERCIAL)**                  |
| Stack     | OpenEMR fork (PHP), Jitsi (Java/WebRTC), Laravel APIs |
| Sponsor   | PAHO/WHO                                              |
| Repo path | `reference/All In One Telehealth Platform -AIOTP-/`   |

### Features (Observation Only)

| Feature                  | Status         |
| ------------------------ | -------------- |
| EMR (OpenEMR-based)      | Available      |
| Telehealth video (Jitsi) | Available      |
| Modular deployment       | Available      |
| HL7 FHIR interop         | In development |
| CDS Hooks                | In development |
| e-Prescribing            | Planned        |
| Patient Portal           | Planned        |

### VistA Integration

**None.** Built on OpenEMR. Follows OpenHIE framework for interop.

### Key Observations (Patterns Only — No Code Copying)

1. **Jitsi-based video** — WebRTC, self-hosted, E2E encryption capable
2. **Modular telehealth** — video module deploys independently of EMR
3. **OpenHIE framework** — standards-based interop pattern
4. **LMIC deployment model** — low-resource scalability

---

## License Compliance Matrix

| Repo      | License           | Can Copy Code?         | Can Copy Patterns? | Restrictions                                                |
| --------- | ----------------- | ---------------------- | ------------------ | ----------------------------------------------------------- |
| HealtheMe | Apache 2.0        | Yes (with notice)      | Yes                | Include NOTICE                                              |
| Ottehr    | MIT + attribution | Yes (with attribution) | Yes                | Retain Oystehr/Ottehr name in UI if using their code        |
| AIOTP     | CC BY-NC-SA 4.0   | **NO**                 | Observe only       | Non-commercial only; no derivative works for commercial use |
