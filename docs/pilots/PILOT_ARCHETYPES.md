# Pilot Archetypes -- VistA-Evolved

> Defines two canonical pilot deployment archetypes. Each archetype specifies
> required modules, integrations, and success criteria so that pilot readiness
> can be measured deterministically.

---

## Archetype A -- Outpatient Clinic

### Profile

| Field | Value |
|-------|-------|
| Setting | Freestanding outpatient clinic (5-20 providers) |
| Bed count | 0 (ambulatory only) |
| EHR scope | CPRS clinical, scheduling, pharmacy, lab orders |
| Billing model | Fee-for-service + PhilHealth (PH) or US commercial |

### Required Modules

| Module ID | Module Name | Adapter |
|-----------|-------------|---------|
| kernel | Platform kernel | vista |
| clinical | Clinical engine (CPRS) | vista |
| scheduling | Scheduling + appointments | vista or stub |
| rcm | Revenue cycle management | vista or stub |
| portal | Patient portal | stub |
| interop | Interoperability gateway | stub |
| iam | Identity + access management | vista |

### Required Integrations (Minimum)

| Integration | Transport | Standard | Notes |
|-------------|-----------|----------|-------|
| Lab orders inbound | HL7 v2.x ORM/ORU | HL7 2.5.1 | ADT optional |
| Pharmacy dispense | HL7 v2.x RDS | HL7 2.5.1 | If external pharmacy |
| Claims submission | X12 837P or PhilHealth eClaims | 5010 / CF1-CF4 | At least 1 payer |
| Eligibility check | X12 270/271 or PhilHealth API | 5010 / REST | Optional |

### Success Criteria

1. **Patient lookup**: Search by name or MRN returns correct demographics.
2. **Chart review**: Cover sheet, problems, meds, labs, notes all render.
3. **Place order**: Lab order round-trips through HL7 interface.
4. **Sign note**: TIU note created, signed, visible in chart.
5. **Schedule appointment**: Create, check-in, and complete an encounter.
6. **Submit claim**: At least one claim exports to X12 or PhilHealth format.
7. **Wrong-patient safety**: Break-glass and restricted note access enforced.

### Must-Not-Fail Workflows

- Patient identification (wrong-patient block)
- Medication allergy checking
- Order signature with e-signature code
- Break-glass audit trail generation

---

## Archetype B -- Hospital Service Line (Med/Surg + Lab + Pharm + Imaging)

### Profile

| Field | Value |
|-------|-------|
| Setting | Hospital department or service line (50-200 beds) |
| Bed count | 50-200 |
| EHR scope | Inpatient ADT, CPOE, pharmacy, lab, imaging, nursing |
| Billing model | DRG/case-rate + FFS + multi-payer |

### Required Modules

| Module ID | Module Name | Adapter |
|-----------|-------------|---------|
| kernel | Platform kernel | vista |
| clinical | Clinical engine (CPRS) | vista |
| scheduling | Scheduling + appointments | vista |
| rcm | Revenue cycle management | vista or stub |
| imaging | Imaging (DICOM/PACS) | vista or stub |
| portal | Patient portal | stub |
| interop | Interoperability gateway | vista or stub |
| analytics | Analytics + reporting | stub |
| iam | Identity + access management | vista |
| telehealth | Telehealth | stub |

### Required Integrations (Minimum)

| Integration | Transport | Standard | Notes |
|-------------|-----------|----------|-------|
| ADT feeds | HL7 v2.x ADT A01-A08 | HL7 2.5.1 | Admit/discharge/transfer |
| Lab orders + results | HL7 v2.x ORM/ORU | HL7 2.5.1 | Bidirectional |
| Pharmacy orders | HL7 v2.x OMP | HL7 2.5.1 | Inpatient formulary |
| Radiology orders | HL7 v2.x ORM + DICOM worklist | HL7 2.5.1 + DICOM | MWL feed |
| Claims submission | X12 837I + 837P | 5010 | Institutional + professional |
| Eligibility/auth | X12 270/271 + 278 | 5010 | Prior auth for procedures |
| HIE document sharing | IHE XDS.b or MHD | FHIR R4 / XDS.b | CCD/CDA exchange |
| Device data (vitals) | HL7 v2.x ORU or ASTM | HL7 2.5.1 | Bedside monitors |

### Success Criteria

1. **ADT lifecycle**: Admit, transfer, discharge cycle completes with HL7.
2. **CPOE round-trip**: Order placed, transmitted, result received, charted.
3. **Medication administration**: eMAR/BCMA workflow end-to-end.
4. **Imaging workflow**: Order -> DICOM worklist -> study acquired -> viewable.
5. **Discharge summary**: Note created, signed, shared via HIE.
6. **Billing cycle**: Encounter -> charges -> claim -> submission -> acknowledgement.
7. **DR restore**: Full restore from backup within RTO target.

### Must-Not-Fail Workflows

- All Archetype A must-not-fail workflows, plus:
- Inpatient medication verification (5 rights)
- Critical lab result alerting
- Blood product administration verification
- Discharge medication reconciliation
- Patient transfer with active orders
