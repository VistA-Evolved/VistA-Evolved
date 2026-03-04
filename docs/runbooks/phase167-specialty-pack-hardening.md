# Phase 167 — Specialty Pack Hardening Runbook

## Overview

Defines minimum required artifacts per clinical setting (outpatient, inpatient, ED) and validates specialty packs against these rubrics.

## Rubrics

### Outpatient

Required: HPI (4+ fields), ROS (6+ fields), PE (4+ fields), A&P (2+ fields)
Recommended: Medication List, Follow-up Plan
Minimum: 1 template, 3 sections/template, 5 fields/template

### Inpatient

Required: HPI (4+ fields), A&P (2+ fields), Medication List (1+ fields)
Recommended: PE, ROS
Minimum: 1 template, 2 sections/template, 4 fields/template

### ED

Required: HPI/Triage (3+ fields), PE (3+ fields), A&P (2+ fields)
Recommended: Medication List
Minimum: 1 template, 2 sections/template, 4 fields/template

## Running

```bash
# CLI validator
pnpm validate:specialty-packs

# API endpoint
GET /admin/templates/validate
```

## API Endpoints

| Method | Path                              | Purpose                 |
| ------ | --------------------------------- | ----------------------- |
| GET    | /admin/templates/validate         | Validate all packs      |
| GET    | /admin/templates/validate/rubrics | List all rubrics        |
| GET    | /admin/templates/validate/user    | Validate user templates |

## Scoring

Score 0-100 composed of:

- Section coverage: 60% weight
- Template count: 20% weight
- Field density: 20% weight
