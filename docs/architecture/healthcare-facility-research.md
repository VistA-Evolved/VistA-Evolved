# Healthcare Facility Structure Research

> Generated: 2026-03-09
> Purpose: Validate entity type definitions against real-world healthcare
> structures and define standard configurations.

## 1. Solo Practice / Small Clinic (1-5 Providers)

### Real-World Profile

- **Examples**: Family medicine office, pediatric clinic, single-specialty
  practice (dermatology, ophthalmology, psychiatry)
- **Staff**: 1-5 physicians, 2-8 nurses/MAs, 1-3 front desk, 1 office manager
- **Physical**: 3-10 exam rooms, 1 waiting area, 1 nurse station
- **Volume**: 15-30 patients/day per provider
- **Revenue**: $500K-$3M annually

### Department Structure

| Department | Typical | Notes |
| ---------- | ------- | ----- |
| Primary Care | Always | Core department for family/internal medicine |
| Specialty | Sometimes | Single specialty practices |
| Lab (CLIA-waived) | Common | Point-of-care testing only (rapid strep, UA, glucose) |
| Imaging | Rare | X-ray only if present; most refer out |

### Technology Needs

- Scheduling (online + walk-in)
- Clinical documentation (SOAP notes, problem list, medications, allergies)
- Patient portal (appointment requests, messaging, results)
- Basic billing (claim submission to 2-5 payers)
- E-prescribing (Surescripts integration)
- Telehealth (post-COVID standard offering)

### Validation Against `entity-types.json`

| Field | Config Value | Real-World Match | Notes |
| ----- | ------------ | ---------------- | ----- |
| maxProviders: 10 | Correct | Up to 5 physicians + 5 NP/PAs |
| defaultModules | Correct | kernel, clinical, scheduling, portal, analytics |
| divisions: 1 | Correct | Single location |
| maxWards: 0 | Correct | No inpatient |
| maxClinics: 5 | Correct | 1-5 clinic stops |
| inpatientEnabled: false | Correct | Outpatient only |

**Recommendation**: Add `rcm` to defaultModules -- even solo practices need
billing. Currently listed as optional, but 100% of US practices submit claims.

---

## 2. Large Outpatient Clinic / Multi-Location Practice (5-50 Providers)

### Real-World Profile

- **Examples**: Urgent care network, multi-specialty group practice, community
  health center (FQHC), large outpatient clinic with in-house imaging/pharmacy
- **Staff**: 5-50 physicians, 20-100 clinical staff, 10-30 admin staff
- **Physical**: Multiple buildings/locations, specialty suites, procedure rooms
- **Volume**: 100-500 patients/day across locations
- **Revenue**: $5M-$50M annually

### Department Structure

| Department | Frequency | Notes |
| ---------- | --------- | ----- |
| Primary Care | Very Common | Family medicine, internal medicine |
| Internal Medicine | Common | Often sub-specialty focused |
| Pediatrics | Common | Dedicated pediatric wing |
| OB/GYN | Common | Especially in community health centers |
| Radiology | Common | X-ray, ultrasound; CT/MRI at larger sites |
| Laboratory | Common | Moderate complexity CLIA lab |
| Pharmacy | Sometimes | Dispensing pharmacy at FQHCs |
| Surgery (Ambulatory) | Sometimes | Outpatient procedures only |
| Behavioral Health | Growing | Integrated behavioral health is increasing |
| Physical Therapy | Sometimes | Rehabilitation services |
| Optometry/Ophthalmology | Sometimes | Eye care clinics |
| Dental | Sometimes | FQHCs often include dental |

### Technology Needs

- Multi-location scheduling with resource/provider allocation
- Referral management between internal specialties
- Full RCM (multiple payers, clearinghouse integration)
- Patient portal with cross-location records
- FHIR interop for external referrals and lab orders
- Quality reporting (MIPS/HEDIS for value-based contracts)
- Telehealth for virtual visits
- In-house imaging workflow (if imaging dept exists)

### Validation Against `entity-types.json`

| Field | Config Value | Real-World Match | Notes |
| ----- | ------------ | ---------------- | ----- |
| maxProviders: 100 | Correct | 5-50 physicians + APPs + locums |
| defaultModules | Mostly correct | Should include telehealth by default (post-COVID) |
| divisions: 10 | Correct | Up to 10 physical locations |
| maxWards: 0 | Correct | No inpatient |
| maxClinics: 50 | Correct | 5-10 clinics per location |
| inpatientEnabled: false | Correct | Outpatient only |

**Recommendation**: Add `telehealth` to defaultModules for MULTI_CLINIC.
Post-COVID, >75% of multi-location practices offer virtual visits.

---

## 3. Community Hospital (50-200 Beds)

### Real-World Profile

- **Examples**: County hospital, critical access hospital, community medical
  center, rural hospital, faith-based hospital
- **Staff**: 100-400 physicians (many part-time/courtesy), 500-2000 total staff
- **Physical**: Main building + possibly satellite clinics
- **Volume**: 5,000-15,000 admissions/year, 30,000-100,000 outpatient visits
- **Revenue**: $50M-$500M annually

### Department Structure

| Department | Frequency | Notes |
| ---------- | --------- | ----- |
| Emergency | Always | 24/7 ED with triage |
| Surgery | Always | General + 2-4 surgical specialties |
| Medicine | Always | Internal medicine, hospitalist service |
| Pediatrics | Usually | May be combined with medicine at small hospitals |
| ICU/CCU | Always | 4-20 critical care beds |
| Radiology | Always | X-ray, CT, MRI, ultrasound, nuclear medicine |
| Laboratory | Always | Full-service clinical lab |
| Pharmacy | Always | Inpatient + outpatient dispensing |
| Obstetrics/L&D | Usually | Labor & Delivery, nursery |
| Cardiology | Usually | Echo, stress testing, cath lab at larger |
| Orthopedics | Usually | Joint replacement, fracture care |
| Respiratory Therapy | Always | Ventilator management, pulmonary function |
| Physical Therapy | Usually | Inpatient + outpatient rehab |
| Social Work/Case Mgmt | Always | Discharge planning, utilization review |
| Dietary/Nutrition | Always | Inpatient meal service + clinical nutrition |
| Health Information Mgmt | Always | Medical records, coding, compliance |

### Ward Structure (Typical 100-bed Hospital)

| Ward | Beds | Notes |
| ---- | ---- | ----- |
| Medical/Surgical | 30-50 | General inpatient |
| ICU | 6-12 | Critical care |
| Telemetry/Step-down | 8-16 | Cardiac monitoring |
| Obstetrics/L&D | 6-12 | Labor, delivery, postpartum |
| Pediatrics | 4-10 | May be combined unit |
| Surgery (Pre/Post) | 6-10 | Same-day surgery recovery |
| Behavioral Health | 8-20 | If psychiatric unit exists |

### Technology Needs

- Full CPRS-equivalent (orders, notes, meds, labs, consults)
- Inpatient medication administration (eMAR/BCMA)
- Nursing documentation (assessments, flowsheets, care plans)
- Surgical scheduling and preference cards
- Blood bank integration
- Radiology/PACS with DICOM integration
- Laboratory information system (LIS) integration
- Pharmacy system with drug interaction checking
- ADT (admission/discharge/transfer) management
- Quality measures and reporting (CMS, Joint Commission)
- Revenue cycle with DRG coding and claim lifecycle
- Patient portal
- Health information exchange (HIE)

### Validation Against `entity-types.json`

| Field | Config Value | Real-World Match | Notes |
| ----- | ------------ | ---------------- | ----- |
| maxProviders: 1000 | Generous | Covers active + courtesy staff |
| defaultModules | Correct | All essential modules enabled |
| divisions: 5 | Correct | Main campus + satellite clinics |
| maxWards: 50 | Generous | Community hospitals: 5-15 wards |
| maxClinics: 200 | Correct | Multiple outpatient clinics |
| inpatientEnabled: true | Correct | Full inpatient capability |

**Recommendation**: Consider adding `telehealth` to defaultModules for
HOSPITAL. Inpatient telehealth (tele-ICU, tele-stroke) is standard at
community hospitals that lack 24/7 specialist coverage.

---

## 4. Academic Medical Center (500+ Beds)

### Real-World Profile

- **Examples**: University hospital, VA Medical Center, large urban medical
  center with teaching programs
- **Staff**: 1,000-5,000 physicians (attendings + residents), 5,000-20,000
  total staff
- **Physical**: Hospital campus + research buildings + multiple clinics
- **Volume**: 25,000-75,000 admissions/year, 500K-1.5M outpatient visits
- **Revenue**: $1B-$10B annually

### Department Structure

All departments from Community Hospital, PLUS:

| Department | Notes |
| ---------- | ----- |
| Transplant services | Organ transplant programs |
| Oncology/Cancer Center | Medical + radiation + surgical oncology |
| Neurosurgery | Specialized neurosurgical services |
| Cardiovascular Surgery | Open heart surgery, TAVR |
| Neonatal ICU (NICU) | Level III/IV NICU |
| Burn Center | Regional burn center (some AMCs) |
| Trauma Center | Level I trauma designation |
| Research/Clinical Trials | IRB, research protocols, data warehousing |
| Graduate Medical Education | Residency programs, ACGME compliance |
| Pathology | Anatomic + clinical pathology |

### Mapped to HEALTH_SYSTEM Entity Type

Academic medical centers typically operate as health systems with multiple
facilities. The HEALTH_SYSTEM entity type (divisions: 50, maxWards: 500,
maxClinics: 2000) correctly accommodates this scale.

---

## 5. Multi-Facility Health System (500+ Providers)

### Real-World Profile

- **Examples**: HCA Healthcare, Ascension, CommonSpirit, Providence, regional
  hospital networks, VA Healthcare System (VISN structure)
- **Staff**: 1,000-50,000+ physicians, 10,000-200,000+ total staff
- **Physical**: 3-50+ hospitals, 50-500+ clinics, urgent care centers, ASCs
- **Volume**: 100K-1M+ admissions/year
- **Revenue**: $5B-$60B+ annually

### Organizational Structure

```
Health System Corporate
  |-- Region A
  |     |-- Hospital A1 (Tertiary, 500 beds)
  |     |-- Hospital A2 (Community, 150 beds)
  |     |-- Clinic Network A (15 primary care sites)
  |     |-- Urgent Care A (5 locations)
  |
  |-- Region B
  |     |-- Hospital B1 (Community, 200 beds)
  |     |-- Hospital B2 (Critical Access, 25 beds)
  |     |-- Clinic Network B (8 specialty sites)
  |     |-- ASC B (3 ambulatory surgery centers)
  |
  |-- Shared Services
        |-- Revenue Cycle Management (centralized billing)
        |-- Health Information Exchange (cross-facility data)
        |-- Supply Chain (procurement, distribution)
        |-- IT / EHR Management
```

### Technology Needs

Everything from Hospital/AMC, PLUS:

- Master Patient Index (enterprise MPI)
- Cross-facility scheduling and referral
- Centralized credentialing and privileging
- Enterprise data warehouse / analytics
- Supply chain management
- Unified patient portal across all facilities
- Enterprise consent management
- Cross-facility medication reconciliation
- Centralized quality reporting
- Health information exchange (intra-system + external)
- Telemedicine hub (tele-ICU, tele-stroke, tele-psychiatry)

### Validation Against `entity-types.json`

| Field | Config Value | Real-World Match | Notes |
| ----- | ------------ | ---------------- | ----- |
| maxProviders: 10000 | Correct for large systems | Covers up to regional systems |
| defaultModules: all | Correct | Health systems use everything |
| divisions: 50 | Correct | Maps to facility count |
| maxWards: 500 | Correct | ~10 wards per facility x 50 facilities |
| maxClinics: 2000 | Correct | ~40 clinics per facility x 50 facilities |
| inpatientEnabled: true | Correct | Always |

---

## 6. Standard Configurations by Entity Type

### What "Standard" Means

A standard configuration is the most common baseline for a given entity type.
It represents what 80%+ of organizations of that type would need on day one.

### Solo Clinic Standard Configuration

```json
{
  "departments": ["PRIMARY_CARE"],
  "clinics": 1,
  "providers": 1,
  "users": 5,
  "modules": {
    "kernel": true, "clinical": true, "scheduling": true,
    "portal": true, "analytics": true, "rcm": true
  },
  "vistaSetup": {
    "divisions": 1, "clinics": ["GENERAL MEDICINE"],
    "orderSets": ["OUTPATIENT GENERAL"],
    "printers": 1
  }
}
```

### Multi-Location Practice Standard Configuration

```json
{
  "departments": ["PRIMARY_CARE", "INTERNAL_MEDICINE"],
  "clinics": 5,
  "providers": 10,
  "users": 30,
  "modules": {
    "kernel": true, "clinical": true, "scheduling": true,
    "portal": true, "analytics": true, "rcm": true,
    "interop": true, "telehealth": true
  },
  "vistaSetup": {
    "divisions": 2, "clinics": ["GENERAL MEDICINE", "INTERNAL MEDICINE", "PEDIATRICS"],
    "orderSets": ["OUTPATIENT GENERAL", "PEDIATRIC WELLNESS"],
    "printers": 3
  }
}
```

### Hospital Standard Configuration

```json
{
  "departments": ["EMERGENCY", "SURGERY", "MEDICINE", "RADIOLOGY", "LABORATORY", "PHARMACY", "ICU"],
  "wards": 10,
  "clinics": 20,
  "providers": 200,
  "users": 800,
  "modules": {
    "kernel": true, "clinical": true, "scheduling": true,
    "portal": true, "analytics": true, "rcm": true,
    "imaging": true, "interop": true, "iam": true,
    "telehealth": true
  },
  "vistaSetup": {
    "divisions": 1,
    "wards": ["1-MED/SURG", "2-ICU", "3-TELE", "4-PEDS", "5-OB", "6-SURG"],
    "clinics": ["EMERGENCY", "GENERAL MEDICINE", "SURGERY", "RADIOLOGY"],
    "orderSets": ["ADMISSION GENERAL", "ED DEFAULT", "SURGICAL PRE-OP", "ICU STANDARD"],
    "printers": 20,
    "barcodeScanners": true,
    "nurseCalling": true
  }
}
```

### Health System Standard Configuration

```json
{
  "departments": "ALL",
  "facilities": 5,
  "totalWards": 50,
  "totalClinics": 100,
  "providers": 1000,
  "users": 5000,
  "modules": "ALL",
  "vistaSetup": {
    "divisions": 5,
    "masterPatientIndex": true,
    "crossFacilityScheduling": true,
    "centralizedBilling": true,
    "dataWarehouse": true
  }
}
```

---

## 7. Optional Modules by Entity Type

| Module | Solo | Multi-Clinic | Hospital | Health System |
| ------ | ---- | ------------ | -------- | ------------- |
| kernel | Default | Default | Default | Default |
| clinical | Default | Default | Default | Default |
| scheduling | Default | Default | Default | Default |
| portal | Default | Default | Default | Default |
| analytics | Default | Default | Default | Default |
| rcm | *Should be default* | Default | Default | Default |
| interop | Optional | Default | Default | Default |
| imaging | Optional | Optional | Default | Default |
| iam | Optional | Optional | Default | Default |
| telehealth | Optional | *Should be default* | *Should be default* | Default |
| intake | Optional | Optional | Optional | Default |
| ai | Optional | Optional | Optional | Default |

---

## 8. Recommendations for `entity-types.json`

1. **Move `rcm` to defaultModules for SOLO_CLINIC** -- All US practices submit
   insurance claims. RCM is essential, not optional.

2. **Move `telehealth` to defaultModules for MULTI_CLINIC and HOSPITAL** --
   Post-COVID, telehealth is standard at all facility types above solo.

3. **Add a fifth entity type: `SPECIALTY_CENTER`** for ambulatory surgery
   centers, dialysis centers, imaging centers, and other single-specialty
   facilities that don't fit cleanly into clinic or hospital categories.

4. **Consider `CRITICAL_ACCESS_HOSPITAL`** as a variant of HOSPITAL with
   reduced ward count (max 25 beds) and specific CMS compliance requirements.

5. **Department lists should be configurable per country** -- The current lists
   are US-centric. Philippine hospitals use different department names
   (e.g., "Lying-In" instead of "Labor & Delivery").

---

## 9. Country-Specific Considerations

### United States
- CMS quality reporting (MIPS, APMs)
- Joint Commission accreditation standards
- ONC Health IT certification
- Surescripts e-prescribing
- X12 EDI 5010 for billing
- State-specific regulations (certificate of need, scope of practice)

### Philippines
- PhilHealth eClaims 3.0 integration
- DOH licensing requirements
- CF1-CF4 claim forms
- Rural Health Unit (RHU) structure
- Barangay Health Station (BHS) for community-level care

### Australia
- Medicare Benefits Schedule (MBS) billing
- My Health Record integration
- NEHTA standards
- GP-specific requirements (PIP, WIP)

### New Zealand
- NHI (National Health Index) integration
- ACC (accident compensation) claims
- PHO (Primary Health Organization) structure

### Singapore
- CHAS (Community Health Assist Scheme)
- MediSave/MediShield integration
- MOH facility licensing
- NEHR (National Electronic Health Record) integration
