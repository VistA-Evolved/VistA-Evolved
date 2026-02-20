# Source Connectors -- Migration Toolkit

> **Phase 50 -- Pluggable Source Format Adapters**

## Overview

The Migration Toolkit uses a pluggable mapping template system instead of
hard-coded source connectors. Each source EHR/format is supported by
creating a mapping template that defines:

- Source column names (as they appear in the CSV export)
- Target VistA-Evolved field names
- Transforms to normalize data (dates, case, splitting)
- Validation rules (required fields, regex patterns)

This means adding support for a new EHR system requires **zero code changes** --
only a new JSON mapping template.

## Built-in Connectors

### 1. Generic CSV

**Template IDs:** `generic-csv-patient`, `generic-csv-problem`, `generic-csv-medication`, `generic-csv-allergy`, `generic-csv-appointment`

Assumes standard column names:

| Entity | Expected Columns |
|--------|-----------------|
| Patient | last_name, first_name, dob, ssn, sex, street, city, state, zip, phone, email |
| Problem | patient_id, icd_code, description, onset_date, status, provider |
| Medication | patient_id, drug_name, dosage, route, frequency, start_date, end_date, prescriber, status |
| Allergy | patient_id, allergen, reaction, severity, type, onset_date, status |
| Appointment | patient_id, date, time, provider, clinic, type, duration_min, status, notes |

### 2. OpenEMR CSV

**Template IDs:** `openemr-csv-patient`, `openemr-csv-allergy`

Maps OpenEMR's export column naming conventions:

| OpenEMR Column | VistA-Evolved Field |
|---------------|-------------------|
| lname | lastName |
| fname | firstName |
| mname | middleName |
| DOB | dateOfBirth |
| ss | ssn |
| sex | sex |
| street | address.street |
| postal_code | address.zip |
| phone_home | phone |
| pid | patientId |
| title | allergen |
| severity_al | severity |
| begdate | onsetDate |

> **Note:** These templates map column structure only. No OpenEMR code is
> copied or referenced. The mapping was designed from publicly documented
> OpenEMR CSV export column headers.

### 3. FHIR R4 Bundle (Placeholder)

**Template ID:** `fhir-bundle-patient`

Placeholder for future full FHIR Bundle import. Currently maps flattened
FHIR resource paths as CSV column names:

| FHIR Path | VistA-Evolved Field |
|-----------|-------------------|
| name.family | lastName |
| name.given | firstName |
| birthDate | dateOfBirth |
| gender | sex |
| identifier.value | ssn |
| telecom.phone | phone |
| telecom.email | email |

**Roadmap:** Full FHIR R4 JSON import (not flattened CSV) is planned for
a future phase. This would parse `Bundle.entry[].resource` directly.

## Adding a New Connector

### Step 1: Identify Source Column Names

Export a sample file from the source system. Note the exact column header
names.

### Step 2: Create a Mapping Template

```json
{
  "id": "my-ehr-patients",
  "name": "MyEHR -- Patients",
  "sourceFormat": "custom",
  "entityType": "patient",
  "version": "1.0.0",
  "description": "Maps MyEHR's patient export format",
  "fields": [
    {
      "source": "PATIENT_LAST",
      "target": "lastName",
      "required": true,
      "transforms": [{"fn": "uppercase"}, {"fn": "trim"}]
    },
    {
      "source": "PATIENT_FIRST",
      "target": "firstName",
      "required": true,
      "transforms": [{"fn": "uppercase"}, {"fn": "trim"}]
    },
    {
      "source": "DOB_MMDDYYYY",
      "target": "dateOfBirth",
      "required": true,
      "transforms": [{"fn": "date-mmddyyyy"}]
    },
    {
      "source": "GENDER_CODE",
      "target": "sex",
      "required": true,
      "transforms": [
        {"fn": "map-value", "args": {"1": "M", "2": "F", "male": "M", "female": "F"}},
        {"fn": "uppercase"}
      ]
    }
  ]
}
```

### Step 3: Register the Template

**Option A:** API (runtime)

```bash
curl -X POST http://localhost:3001/migration/templates \
  -H "Content-Type: application/json" \
  -b session_cookie \
  -d @my-ehr-template.json
```

**Option B:** Code (startup)

Add to `apps/api/src/migration/templates.ts`:

```typescript
const MY_EHR_PATIENT: MappingTemplate = { ... };
```

And add to the `ALL_TEMPLATES` array.

### Step 4: Test with Dry-Run

1. Create an import job with `sourceFormat: "custom"` and `templateId: "my-ehr-patients"`
2. Upload a sample CSV
3. Run validate -- check for mapping issues
4. Run dry-run -- verify field transformations

## Transform Reference

See [migration-toolkit.md](migration-toolkit.md#available-transforms) for
the full list of transform functions.

## Future Connectors (Planned)

| Source | Status | Notes |
|--------|--------|-------|
| FHIR R4 JSON Bundle | Placeholder | Full JSON parsing, not flattened CSV |
| C-CDA XML | Planned | Parse ClinicalDocument sections |
| HL7 v2 ADT | Planned | Parse ADT^A04/A08 messages |
| Epic MyChart Export | Planned | Map Epic's patient data export format |
| Cerner PowerChart CSV | Planned | Map Cerner's bulk export columns |
| VA Blue Button | Planned | Parse VA Blue Button text/XML format |
| Direct FHIR R4 API | Planned | Pull from source system's FHIR endpoint |

Each of these only requires a mapping template -- the import pipeline
and mapping engine are format-agnostic by design.
