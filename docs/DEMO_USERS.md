# Demo User Accounts

> VistA-Evolved demo credentials for hospital presentations.
> VistA VEHU Docker sandbox -- all accounts are synthetic.

## VistA EHR Accounts (Clinical)

| Role           | Access Code | Verify Code  | VistA User          | DUZ | What They Can See                             |
| -------------- | ----------- | ------------ | ------------------- | --- | --------------------------------------------- |
| **Doctor**     | `PRO1234`   | `PRO1234!!`  | PROGRAMMER,ONE      | 1   | Full chart, orders, notes, CPOE, sign orders  |
| **Provider**   | `PROV123`   | `PROV123!!`  | PROVIDER,CLYDE WV   | 87  | Full chart, orders, notes (WorldVistA legacy) |
| **Pharmacist** | `PHARM123`  | `PHARM123!!` | PHARMACIST,LINDA WV | --  | Medications, pharmacy verification            |
| **Nurse**      | `NURSE123`  | `NURSE123!!` | NURSE,HELEN WV      | --  | Nursing notes, vitals, eMAR                   |

> **Recommended for demos:** Use `PRO1234 / PRO1234!!` -- this account has full
> CPRS access including order signing in the VEHU sandbox.

## Platform Roles (Non-VistA)

Platform roles are assigned automatically at login based on VistA user mapping:

| VistA Account | Platform Role | RCM Access | Admin Console | Analytics |
| ------------- | ------------- | ---------- | ------------- | --------- |
| PRO1234       | `admin`       | Full       | Yes           | Full      |
| PROV123       | `provider`    | View only  | No            | Viewer    |
| PHARM123      | `pharmacist`  | No         | No            | Viewer    |
| NURSE123      | `nurse`       | No         | No            | Viewer    |

## Demo Patients (VistA VEHU Synthetic)

These patients exist in the VEHU Docker image with pre-populated clinical data:

| Patient Name        | DFN | Demo Use Case                                             |
| ------------------- | --- | --------------------------------------------------------- |
| EIGHT,PATIENT       | 3   | Primary demo patient -- allergies, meds, problems, vitals |
| EIGHTEEN,PATIENT    | 149 | Secondary patient -- pending PhilHealth claim             |
| ELEVEN,PATIENT      | 224 | Denied PhilHealth claim example                           |
| EIGHTY,PATIENT      | 433 | AR aging demo (0-30 day bucket)                           |
| EIGHTYONE,PATIENT   | 775 | AR aging demo (31-60 day bucket)                          |
| EIGHTYTWO,PATIENT   | 776 | AR aging demo (61-90 day bucket)                          |
| EIGHTYTHREE,PATIENT | 777 | AR aging demo (90+ day bucket)                            |

> Search for `EIGHT` in patient search to find all demo patients.

## Quick Start

```powershell
# 1. Start VistA + PostgreSQL
cd services/vista && docker compose --profile vehu up -d
cd ../.. && docker compose up -d  # platform PG

# 2. Seed demo data
pnpm seed:demo

# 3. Start API
cd apps/api && npx tsx --env-file=.env.local src/index.ts

# 4. Start web
cd apps/web && pnpm dev

# 5. Open browser
# http://localhost:3000 -> Login with PRO1234 / PRO1234!!
```

## Security Notes

- All credentials above are for the **development sandbox only**
- Sandbox credentials are displayed on the login page when `NODE_ENV !== 'production'`
- Never use these credentials in production environments
- The VEHU image contains only synthetic (fake) patient data
