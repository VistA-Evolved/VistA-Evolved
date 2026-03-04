# FHIR Posture — VistA-First, FHIR-Second

> **Phase 20 — VistA-First Grounding**
> FHIR is an interoperability layer, NOT the clinical engine. VistA owns the
> data. FHIR translates it for external consumption.

---

## 1. Core Principle

> **VistA is the system of record. FHIR is a translation layer for
> interoperability with external systems.**

VistA-Evolved does NOT:

- Store clinical data in FHIR resources
- Use FHIR as the primary data model internally
- Bypass VistA RPCs to read/write via FHIR

VistA-Evolved DOES:

- Expose VistA data as FHIR resources for external consumers
- Accept FHIR resources from external systems and translate to VistA writes
- Use FHIR as the lingua franca for multi-system interoperability

---

## 2. FHIR Integration Options on WorldVistA

### Option A: C0FHIR Suite (WorldVistA)

The C0FHIR package provides **RPC-backed FHIR endpoints** directly from VistA:

| Component           | Purpose                                                  |
| ------------------- | -------------------------------------------------------- |
| `C0FHIR` M routines | FHIR resource generation from FileMan data               |
| `C0F*` RPCs         | RPC entry points that return FHIR JSON                   |
| FHIR R4 resources   | Patient, Condition, MedicationRequest, Observation, etc. |

**Advantage**: Data comes directly from VistA FileMan. No translation layer needed.
**Risk**: C0FHIR may not cover all resources. Maturity varies by resource type.

### Option B: VPR (Virtual Patient Record)

`VPR GET PATIENT DATA` returns a comprehensive JSON extract of patient data:

| Data type    | VPR section | FHIR mapping                   |
| ------------ | ----------- | ------------------------------ |
| Demographics | patient     | Patient                        |
| Problems     | problem     | Condition                      |
| Medications  | med         | MedicationRequest              |
| Allergies    | allergy     | AllergyIntolerance             |
| Vitals       | vital       | Observation                    |
| Labs         | lab         | DiagnosticReport + Observation |
| Notes        | document    | DocumentReference              |
| Orders       | order       | ServiceRequest                 |

**Advantage**: Single RPC returns everything. Broadly available.
**Risk**: VPR format is not FHIR — requires translation. May miss newer data types.

### Option C: Platform FHIR Facade

Build a FHIR R4 server in the API that reads from VistA via RPCs and serves
FHIR resources:

```
External System → FHIR R4 API → Platform → VistA RPCs → FileMan
```

**Advantage**: Full control over resource mappings. Can combine VistA data with
external data sources.
**Risk**: Significant development effort. Must maintain FHIR conformance.

---

## 3. Recommended Architecture

Use a **layered approach**:

1. **C0FHIR first** — where available, use VistA's native FHIR RPCs
2. **VPR as fallback** — for resource types C0FHIR doesn't cover
3. **Platform facade** — for resources that need external data (e.g., provenance
   from integration registry, imaging from Orthanc)

```
                    External Consumer (Payer, HIE, Patient Portal)
                              │
                              ▼
                    ┌─────────────────┐
                    │  FHIR R4 Facade │  (Platform API — /fhir/r4/*)
                    │                 │
                    │  - C0FHIR proxy │  (pass-through when available)
                    │  - VPR mapper   │  (translate VPR JSON → FHIR)
                    │  - Custom maps  │  (imaging, documents, etc.)
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  VistA (M/GT.M) │
                    │                 │
                    │  Source of truth │
                    │  for all clinical│
                    │  data           │
                    └─────────────────┘
```

---

## 4. FHIR Resources × VistA Data Sources

| FHIR Resource        | VistA Source                  | RPC Path                           | Priority |
| -------------------- | ----------------------------- | ---------------------------------- | -------- |
| Patient              | PATIENT #2                    | `ORWPT SELECT` → C0F PATIENT       | HIGH     |
| Condition            | PROBLEM #9000011              | `ORQQPL` series → C0F CONDITION    | HIGH     |
| MedicationRequest    | PRESCRIPTION #52              | `ORWPS ACTIVE` → C0F MEDICATIONREQ | HIGH     |
| AllergyIntolerance   | PATIENT ALLERGIES #120.8      | `ORQQAL LIST` → C0F ALLERGY        | HIGH     |
| Observation (vitals) | GMRV VITAL MEASUREMENT #120.5 | `ORQQVI VITALS` → C0F OBSERVATION  | HIGH     |
| Observation (labs)   | LAB DATA #63                  | `ORWLRR INTERIM` → C0F OBS-LAB     | MEDIUM   |
| DiagnosticReport     | LAB DATA #63, RAD REPORTS #74 | `ORWRP REPORT TEXT`                | MEDIUM   |
| DocumentReference    | TIU DOCUMENT #8925            | `TIU DOCUMENTS BY CONTEXT`         | MEDIUM   |
| ServiceRequest       | ORDER #100                    | `ORWORR AGET`                      | MEDIUM   |
| Encounter            | VISIT #9000010                | `ORWCV VST`                        | LOW      |
| Practitioner         | NEW PERSON #200               | `XUS GET USER INFO`                | LOW      |
| ImagingStudy         | IMAGE #2005                   | `MAG4 PAT GET IMAGES`              | LOW      |
| Organization         | INSTITUTION #4                | `ORWU TOOLMENU` (site info)        | LOW      |

---

## 5. Compliance Posture

| Standard               | Status | Notes                                     |
| ---------------------- | ------ | ----------------------------------------- |
| FHIR R4 (HL7)          | Target | Resource conformance via C0FHIR or facade |
| US Core 6.1            | Target | Minimum must-support elements             |
| SMART on FHIR          | Future | Authorization framework for FHIR access   |
| Bulk FHIR ($export)    | Future | Required for payer access under CMS rules |
| HL7 FHIR Subscriptions | Future | Event-driven notifications                |

---

## 6. What NOT to Do

1. **Do NOT store data in FHIR format** — VistA FileMan is the data store
2. **Do NOT bypass RPCs for FHIR** — all FHIR data must originate from VistA
3. **Do NOT build a FHIR server before wiring more RPCs** — foundational VistA
   integration (orders, labs, full notes) takes priority over FHIR exposure
4. **Do NOT implement SMART on FHIR without the AI Gateway** — OAuth scoping
   must be coordinated with the broader auth architecture

---

## 7. Implementation Roadmap

| Step | Description                                                | Priority | Phase     |
| ---- | ---------------------------------------------------------- | -------- | --------- |
| 1    | Document FHIR posture (this doc)                           | **Done** | Phase 20  |
| 2    | Probe C0FHIR RPCs on WorldVistA Docker                     | MEDIUM   | Phase 21+ |
| 3    | Build VPR → FHIR Patient resource mapper                   | MEDIUM   | Phase 21+ |
| 4    | Expose `/fhir/r4/Patient` read endpoint                    | MEDIUM   | Phase 21+ |
| 5    | Expand to Condition, MedicationRequest, AllergyIntolerance | MEDIUM   | Phase 22+ |
| 6    | US Core conformance testing                                | LOW      | Phase 23+ |
| 7    | SMART on FHIR authorization                                | LOW      | Phase 24+ |
