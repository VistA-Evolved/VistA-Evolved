# VistA Administration Domains -- Complete Reference

> **Purpose**: Documents all 12 VistA administrative domains exposed through the
> VistA-Evolved SaaS platform, including API endpoints, M routines, FileMan files,
> and UI locations.

---

## Architecture Overview

```
Browser (React/Next.js)
  |
  v
Fastify API (apps/api)    -- 15 admin route modules, 65+ endpoints
  |
  v
RPC Broker (XWB)           -- safeCallRpc with circuit breaker
  |
  v
VistA (VEHU Docker)        -- 14 custom M routines (ZVE* family)
  |
  v
FileMan (globals)          -- Files 200, 44, 42, 49, 50, 60, 71, etc.
```

---

## Domain Summary

| # | Domain | M Routine | FileMan Files | API Prefix | UI Path |
|---|--------|-----------|---------------|------------|---------|
| 1 | Users & Accounts | ZVEUSER | 200, 19.1 | /admin/vista/users | /cprs/admin/vista/users |
| 2 | Facilities | ZVEFAC | 4, 40.8, 49, 40.7, 42.4, 8989.3 | /admin/vista/institutions | /cprs/admin/vista/facilities |
| 3 | Clinics | ZVECLIN | 44, 409.1 | /admin/vista/clinics | /cprs/admin/vista/clinics |
| 4 | Wards & Beds | ZVEWARD | 42 | /admin/vista/wards | /cprs/admin/vista/wards |
| 5 | Pharmacy | ZVEPHAR | 50, 50.605 | /admin/vista/drugs | /cprs/admin/vista/pharmacy |
| 6 | Laboratory | ZVELAB | 60, 68 | /admin/vista/lab-tests | /cprs/admin/vista/lab |
| 7 | Radiology | ZVERAD | 71, 79.1 | /admin/vista/radiology | /cprs/admin/vista/radiology |
| 8 | Billing & Insurance | ZVEBILL | 36, 399.1 | /admin/vista/insurance-companies | /cprs/admin/vista/billing |
| 9 | Inventory | ZVEINV | 441, 443, 445 | /admin/vista/inventory | /cprs/admin/vista/inventory |
| 10 | Workforce | ZVEWRKF | 200, 8932.1 | /admin/vista/workforce | /cprs/admin/vista/workforce |
| 11 | Quality | ZVEQUAL | 811.9, 740 | /admin/vista/quality | /cprs/admin/vista/quality |
| 12 | Clinical Setup | ZVECAPP | 101.41, 123.5, 8925.1, 8927, 142 | /admin/vista/clinical-setup | /cprs/admin/vista/clinical-setup |

Cross-cutting:
- **System Admin**: ZVESYS (File 8989.5, 14.7, 3.077) -- /admin/vista/system
- **Dashboard**: Aggregation of all 12 domains -- /admin/vista/dashboard/operational
- **Provisioning**: Tenant lifecycle -- /admin/provisioning

---

## Domain 1: Users & Accounts

### FileMan Files
- **File 200** (NEW PERSON) -- user records, credentials, keys, titles
- **File 19.1** (SECURITY KEY) -- security key definitions

### RPCs (ZVEUSER.m)
| RPC | Tag | Type | Description |
|-----|-----|------|-------------|
| VE USER LIST | LIST | Read | List all users (search, count) |
| VE USER DETAIL | DETAIL | Read | Single user detail by IEN |
| VE USER KEYS | KEYS | Read | Security keys for a user |
| VE USER MENUS | MENUS | Read | Menu options (search) |
| VE USER EDIT | EDITUSER | Write | Edit user field via UPDATE^DIE |
| VE USER ADD KEY | ADDKEY | Write | Assign security key to user |
| VE USER REMOVE KEY | REMOVEKEY | Write | Remove key assignment (^DIK) |
| VE USER DEACTIVATE | DEACTUSER | Write | Set DISUSER flag |
| VE USER REACTIVATE | REACTUSER | Write | Clear DISUSER flag |

### API Endpoints
- `GET /admin/vista/users?search=&count=` -- list users
- `GET /admin/vista/users/:ien` -- user detail
- `GET /admin/vista/keys` -- security keys
- `GET /admin/vista/menus?search=` -- menus
- `PUT /admin/vista/users/:ien` -- edit user (body: {field, value})
- `POST /admin/vista/users/:ien/keys` -- add key (body: {keyIen})
- `DELETE /admin/vista/users/:ien/keys/:keyIen` -- remove key
- `POST /admin/vista/users/:ien/deactivate` -- deactivate
- `POST /admin/vista/users/:ien/reactivate` -- reactivate

---

## Domain 2: Facilities & Organizational Structure

### FileMan Files
- **File 4** (INSTITUTION) -- hospitals, clinics, stations
- **File 40.8** (MEDICAL CENTER DIVISION) -- divisions
- **File 49** (SERVICE/SECTION) -- departments
- **File 40.7** (STOP CODE) -- clinic stop codes
- **File 42.4** (SPECIALTY) -- bed section specialties
- **File 8989.3** (KERNEL SYSTEM PARAMETERS) -- site config

### RPCs (ZVEFAC.m)
| RPC | Tag | Type | Description |
|-----|-----|------|-------------|
| VE INST LIST | LIST | Read | Institutions (search, count) |
| VE DIV LIST | DIVLIST | Read | Divisions |
| VE SVC LIST | SVCLIST | Read | Services/sections |
| VE STOP LIST | STOPLIST | Read | Stop codes (search) |
| VE SPEC LIST | SPECLIST | Read | Specialties |
| VE SITE PARM | SITEPARM | Read | Site parameters |
| VE SVC CREATE | SVCCRT | Write | Create service/section |
| VE SVC EDIT | SVCEDT | Write | Edit service fields |

---

## Domain 3: Clinics & Scheduling

### FileMan Files
- **File 44** (HOSPITAL LOCATION) -- clinic definitions
- **File 409.1** (APPOINTMENT TYPE) -- appointment types

### RPCs (ZVECLIN.m)
| RPC | Tag | Type | Description |
|-----|-----|------|-------------|
| VE CLIN LIST | LIST | Read | Clinics (search, count) |
| VE CLIN DETAIL | DETAIL | Read | Clinic detail by IEN |
| VE APPT TYPES | ATYPES | Read | Appointment types |
| VE CLIN CREATE | CLINCRT | Write | Create clinic |
| VE CLIN EDIT | CLINEDT | Write | Edit clinic field |
| VE CLIN TOGGLE | CLINTOGL | Write | Activate/inactivate clinic |

---

## Domain 4: Wards & Beds

### FileMan Files
- **File 42** (WARD LOCATION) -- ward definitions, bed counts

### RPCs (ZVEWARD.m)
| RPC | Tag | Type | Description |
|-----|-----|------|-------------|
| VE WARD LIST | LIST | Read | Wards |
| VE WARD DETAIL | DETAIL | Read | Ward detail by IEN |
| VE WARD EDIT | WARDEDT | Write | Edit ward field |

---

## Domain 5: Pharmacy

### FileMan Files
- **File 50** (DRUG) -- drug formulary
- **File 50.605** (VA DRUG CLASS) -- drug classifications

### RPCs (ZVEPHAR.m)
| RPC | Tag | Type | Description |
|-----|-----|------|-------------|
| VE DRUG LIST | LIST | Read | Drugs (search, count) |
| VE DRUG DETAIL | DETAIL | Read | Drug detail by IEN |
| VE DRUG CLASS | CLSLIST | Read | Drug classes |
| VE DRUG EDIT | DRUGEDT | Write | Edit drug administrative fields |

---

## Domain 6: Laboratory

### FileMan Files
- **File 60** (LABORATORY TEST) -- lab test definitions
- **File 68** (ACCESSION) -- lab locations/accession areas

### RPCs (ZVELAB.m)
| RPC | Tag | Type | Description |
|-----|-----|------|-------------|
| VE LAB LIST | LIST | Read | Lab tests (search, count) |
| VE LAB DETAIL | DETAIL | Read | Lab test detail |
| VE LAB LOCATIONS | LOCLIST | Read | Lab locations |
| VE LAB EDIT | TESTEDT | Write | Edit lab test field |

---

## Domain 7: Radiology

### FileMan Files
- **File 71** (RAD/NUC MED PROCEDURES) -- radiology procedures
- **File 79.1** (RAD/NUC MED DIVISION) -- division parameters

### RPCs (ZVERAD.m)
| RPC | Tag | Type | Description |
|-----|-----|------|-------------|
| VE RAD PROCEDURES | PROCLIST | Read | Procedure list |
| VE RAD PROC DETAIL | PROCDET | Read | Procedure detail |
| VE RAD IMG LOCATIONS | IMGLOCL | Read | Imaging locations |
| VE RAD DIV PARAMS | DIVPARM | Read | Division parameters |

---

## Domain 8: Billing & Insurance

### FileMan Files
- **File 36** (INSURANCE COMPANY) -- insurance companies
- **File 399.1** (IB ACTION TYPE) -- rate/action types

### RPCs (ZVEBILL.m)
| RPC | Tag | Type | Description |
|-----|-----|------|-------------|
| VE INS LIST | LIST | Read | Insurance companies |
| VE INS DETAIL | DETAIL | Read | Insurance detail |
| VE RATE TYPES | RATELIST | Read | Rate/action types |
| VE INS CREATE | INSCRT | Write | Create insurance company |
| VE INS EDIT | INSEDT | Write | Edit insurance company |

---

## Domain 9: Inventory & Supply Chain (IFCAP)

### FileMan Files
- **File 441** (ITEM MASTER) -- inventory items
- **File 443** (PROCUREMENT & ACCOUNTING TRANSACTIONS) -- purchase orders
- **File 445** (VENDOR) -- vendors

### RPCs (ZVEINV.m)
| RPC | Tag | Type | Description |
|-----|-----|------|-------------|
| VE INV ITEMS | ITEMLIST | Read | Item master list |
| VE INV ITEM DETAIL | ITEMDET | Read | Item detail |
| VE INV VENDORS | VENDLIST | Read | Vendor list |
| VE INV PO LIST | POLIST | Read | Purchase orders |

---

## Domain 10: Workforce Management

### FileMan Files
- **File 200** (NEW PERSON) -- providers with credentials
- **File 8932.1** (PERSON CLASS) -- provider classifications

### RPCs (ZVEWRKF.m)
| RPC | Tag | Type | Description |
|-----|-----|------|-------------|
| VE PROV LIST | PROVLIST | Read | Provider list with credentials |
| VE PROV DETAIL | PROVDET | Read | Provider detail |
| VE PERSON CLASSES | PCLSLIST | Read | Person class list |

---

## Domain 11: Quality & Compliance

### FileMan Files
- **File 811.9** (CLINICAL REMINDER DEFINITION) -- reminder rules
- **File 740** (QA SITE PARAMETERS) -- QA configuration

### RPCs (ZVEQUAL.m)
| RPC | Tag | Type | Description |
|-----|-----|------|-------------|
| VE REMINDERS | REMLIST | Read | Clinical reminder list |
| VE REMINDER DETAIL | REMDET | Read | Reminder detail |
| VE QA SITE PARAMS | QASITE | Read | QA site parameters |

---

## Domain 12: Clinical Application Setup

### FileMan Files
- **File 101.41** (ORDER DIALOG) -- order sets
- **File 123.5** (REQUEST/CONSULTATION) -- consult services
- **File 8925.1** (TIU DOCUMENT DEFINITION) -- TIU defs
- **File 8927** (TIU TEMPLATE FIELD) -- TIU templates
- **File 142** (HEALTH SUMMARY TYPE) -- health summaries

### RPCs (ZVECAPP.m)
| RPC | Tag | Type | Description |
|-----|-----|------|-------------|
| VE ORDER SETS | ORDSETS | Read | Order set list |
| VE CONSULT SERVICES | CSLTSVCS | Read | Consult service list |
| VE TIU DEFS | TIUDEF | Read | TIU definition list |
| VE TIU TEMPLATES | TIUTEMP | Read | TIU template list |
| VE HEALTH SUMMARY TYPES | HSUMTYPE | Read | Health summary types |

---

## System Administration

### FileMan Files
- **File 8989.5** (PARAMETER DEFINITION) -- system parameters
- **File 14.7** (TASKMAN) -- scheduled tasks
- **File 3.077** (ERROR TRAP) -- error entries

### RPCs (ZVESYS.m)
| RPC | Tag | Type | Description |
|-----|-----|------|-------------|
| VE TASKMAN LIST | TASKMAN | Read | TaskMan task list |
| VE ERROR TRAP | ERRTRAP | Read | Error trap entries |
| VE SYS STATUS | SYSTAT | Read | System status |
| VE PARAM LIST | PARMLIST | Read | Parameter list |
| VE PARAM EDIT | PARMEDT | Write | Edit parameter |

---

## Operational Dashboard

**Endpoint**: `GET /admin/vista/dashboard/operational`

Aggregates data from all 12 domains into a single JSON response. Makes up
to 29 parallel RPC calls and returns:

- User count, active/inactive breakdown
- Facility count, division count
- Clinic count, active clinics
- Ward count, total beds
- Drug count, drug class count
- Lab test count, lab location count
- Radiology procedure count, imaging location count
- Insurance company count, rate type count
- Inventory item count, vendor count, PO count
- Provider count, person class count
- Reminder count, QA parameters
- Order set count, consult service count, TIU def count
- System health: TaskMan status, error count, parameter count

---

## SaaS Provisioning

### Entity Types
Defined in `config/entity-types.json`:
- solo_clinic, group_practice, community_health_center
- critical_access_hospital, general_hospital, teaching_hospital
- health_network, rural_health_clinic

### SKUs
Defined in `config/skus.json`:
- CLINICIAN_ONLY, PORTAL_ONLY, TELEHEALTH_ONLY
- RCM_ONLY, IMAGING_ONLY, INTEROP_ONLY, FULL_SUITE

### Country Packs
| Country | Billing Standard | Regulatory Body |
|---------|-----------------|-----------------|
| US | X12 EDI 5010 | CMS / HIPAA |
| PH | PhilHealth eClaims | DOH / PhilHealth |
| GH | NHIS Claims | Ghana Health Service |
| UK | NHS SUS+ | NHS England / CQC |
| AU | Medicare Claims | ACSQHC |

### Provisioning Pipeline (8 steps)
1. validate-configuration
2. create-platform-tenant
3. allocate-vista-container
4. initialize-vista-instance
5. configure-modules
6. create-admin-user
7. apply-country-config
8. finalize

### Endpoints
- `GET /admin/provisioning/entity-types` -- catalog
- `GET /admin/provisioning/skus` -- SKU catalog
- `GET /admin/provisioning/country-configs` -- country packs
- `POST /admin/provisioning/tenants` -- create tenant request
- `GET /admin/provisioning/tenants` -- list all tenants
- `GET /admin/provisioning/tenants/:id` -- get single tenant
- `POST /admin/provisioning/tenants/:id/activate` -- manual activate
- `POST /admin/provisioning/tenants/:id/provision` -- full provisioning pipeline

---

## Verification

Run the admin domain verifier:

```powershell
.\scripts\verify-admin-domains.ps1
```

This tests 70+ gates across all domains, including:
- All read endpoints return `{ok: true}` with data
- File structure (14 M routines, 15 API routes, 14 UI pages)
- Provisioning catalog endpoints
- Dashboard aggregation
