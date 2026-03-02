# C-CDA Ingest Runbook

> Phase 457 (W30-P2) — Importing patient data from C-CDA XML documents.

## Overview

The C-CDA ingest pipeline extracts clinical data from Consolidated CDA documents.
Supported sections (by OID):

| Section | OID |
|---------|-----|
| Problems | 2.16.840.1.113883.10.20.22.2.5.1 |
| Medications | 2.16.840.1.113883.10.20.22.2.1.1 |
| Allergies | 2.16.840.1.113883.10.20.22.2.6.1 |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/migration/ccda/import` | Import a C-CDA XML document |
| GET | `/migration/batches` | List all batches (FHIR + C-CDA) |
| GET | `/migration/batches/:id` | Get single batch details |

## Example Import

```bash
curl -X POST http://localhost:3001/migration/ccda/import \
  -H "Content-Type: text/xml" \
  -b cookies.txt \
  -d '<ClinicalDocument xmlns="urn:hl7-org:v3">
    <component><structuredBody>
      <component><section>
        <templateId root="2.16.840.1.113883.10.20.22.2.5.1"/>
        <entry><act classCode="ACT"><code code="CONC"/></act></entry>
      </section></component>
    </structuredBody></component>
  </ClinicalDocument>'
```

## Notes

- Uses lightweight regex-based XML extraction (no heavy XML library)
- Batches tracked in unified store alongside FHIR imports
- Admin-only access via AUTH_RULES
- In-memory store resets on API restart
