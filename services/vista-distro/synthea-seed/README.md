# Synthea Patient Seeding for VistA Distro

## Overview

This directory contains tooling to generate synthetic patient data using
[Synthea](https://github.com/synthetichealth/synthea) and (eventually)
ingest it into the VistA distro lane.

## Quick Start

```powershell
# Generate 20 synthetic patients (default)
.\services\vista-distro\synthea-seed\seed-synthea.ps1

# Generate 100 patients in a specific location
.\services\vista-distro\synthea-seed\seed-synthea.ps1 -Population 100 -State California -City "Los Angeles"
```

## Output

| Directory | Contents |
|-----------|----------|
| `output/fhir/` | FHIR R4 Bundle JSON files (one per patient) |
| `output/csv/`  | Flat CSV exports (patients, conditions, medications, etc.) |

## Ingestion Pipeline (Roadmap)

The ingestion from FHIR bundles into VistA is a multi-step process:

### Phase 1: Generate (current)
- Download Synthea JAR
- Generate FHIR R4 bundles with configurable population size
- Reproducible via seed parameter (`-s 42`)

### Phase 2: Transform (planned)
- Parse FHIR Bundle JSON
- Map FHIR resources to VistA FileMan entries:
  - Patient -> File 2 (PATIENT)
  - Condition -> File 9000011 (PROBLEM)
  - MedicationRequest -> File 100 (ORDER)
  - AllergyIntolerance -> File 120.8 (GMR ALLERGIES)
  - Encounter -> File 9000010 (VISIT)

### Phase 3: Load (planned)
- Create MUMPS routines (ZVESYN*.m namespace) that:
  - Read transformed data from a staging global
  - Use FileMan API (^DIC, ^DIE) for safe data entry
  - Validate each record before commit
  - Log results to a staging audit global

### Phase 4: Verify (planned)
- Count records in VistA vs Synthea output
- Spot-check demographics, problems, allergies
- Run RPC queries to confirm data is accessible via CPRS

## Prerequisites

- **Java 11+**: Required by Synthea
  ```powershell
  choco install temurin17       # or scoop install temurin17-jdk
  ```
- **Internet access**: For initial Synthea JAR download (~90 MB)

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `-Population` | 20 | Number of patients to generate |
| `-State` | Massachusetts | US state for patient demographics |
| `-City` | Bedford | City for patient demographics |
| `-SyntheaVersion` | 3.3.0 | Synthea release version |
| `-SkipDownload` | false | Skip JAR download if already present |

## Notes

- The Synthea JAR and output directory are **gitignored** (large files)
- Seed value `42` ensures reproducible patient sets across runs
- Bedford, MA is the location of the Bedford VA Medical Center,
  making it a natural choice for VistA test data
