# VistA Evolved SaaS Platform Blueprint
## Complete Architecture, Onboarding, Module Map & Build Plan

---

## PART 1: THE FUNDAMENTAL ARCHITECTURE DECISION

### The Core Problem

VistA is a MUMPS/M application. Every piece of clinical and administrative data lives inside the M database (globals). Every action is executed by M routines. The only way a GUI talks to VistA is through the **RPC Broker** — a TCP socket protocol where the client sends an RPC name + parameters and VistA returns the result.

This means your web UI cannot bypass VistA. It must talk TO VistA. The architecture is:

```
User Browser → Web App (React) → API Gateway → VistA Gateway Service → RPC Broker → VistA M Instance
```

### Multi-Tenancy Model: One VistA Instance Per Tenant

For healthcare SaaS, the answer is **dedicated VistA instances per tenant** (not shared). Here's why:

1. **VistA was designed as single-tenant** — the M globals, DUZ (user ID), DUZ(2) (facility), station numbers are all hardcoded assumptions of a single facility or network.

2. **Healthcare compliance (HIPAA, PhilHealth, etc.)** — data isolation is non-negotiable. A shared M database with logical tenancy would be a compliance nightmare.

3. **Docker makes this feasible** — your VEHU image is ~2-4GB. Running 100 isolated VistA containers is trivial on modern cloud infrastructure. Each tenant gets their own container.

4. **Customization per tenant** — each facility can have different drugs, labs, clinics, order sets without any cross-tenant contamination.

### The Architecture Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    TENANT BROWSER                           │
│              React SPA (VistA Evolved UI)                   │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────────┐
│                  PLATFORM LAYER                             │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │ API Gateway │  │ Auth Service │  │ Tenant Management   │ │
│  │ (Express/   │  │ (JWT + RBAC) │  │ Service             │ │
│  │  Fastify)   │  │              │  │ (Provisioning,      │ │
│  │             │  │              │  │  Billing, Config)    │ │
│  └──────┬─────┘  └──────────────┘  └─────────────────────┘ │
│         │                                                   │
│  ┌──────▼──────────────────────────────────────────────┐   │
│  │           VISTA GATEWAY SERVICE                      │   │
│  │  • Translates REST API calls to VistA RPCs           │   │
│  │  • Maintains RPC Broker connections per tenant        │   │
│  │  • Connection pooling to each tenant's VistA          │   │
│  │  • Request routing by tenant ID                       │   │
│  └──────┬──────────┬──────────────┬────────────────────┘   │
│         │          │              │                          │
│  ┌──────▼───┐ ┌───▼─────┐ ┌─────▼──────┐                  │
│  │ VistA    │ │ VistA   │ │ VistA      │  ...N tenants    │
│  │ Instance │ │ Instance│ │ Instance   │                   │
│  │ (Docker) │ │ (Docker)│ │ (Docker)   │                   │
│  │ Tenant A │ │ Tenant B│ │ Tenant C   │                   │
│  │ Port 9431│ │ Port 9432│ │ Port 9433 │                   │
│  └──────────┘ └─────────┘ └────────────┘                   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              PLATFORM DATABASE (PostgreSQL)           │  │
│  │  • Tenant registry (who, what plan, what config)      │  │
│  │  • User accounts (platform-level, maps to VistA DUZ)  │  │
│  │  • Billing/subscription records                       │  │
│  │  • Audit logs                                         │  │
│  │  • Analytics/BI aggregated data                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **VistA is the source of truth** for all clinical and administrative data. The PostgreSQL platform DB only holds SaaS-layer data (tenants, billing, platform users).

2. **Every admin action in the web UI translates to a VistA RPC call** (or a series of RPC calls). We never write directly to M globals from outside.

3. **The VistA Gateway Service is the brain** — it knows which tenant maps to which VistA instance, manages connection pools, handles RPC serialization/deserialization.

4. **New tenants = new VistA Docker containers** provisioned automatically from a pre-configured base image.

---

## PART 2: THE SIGNUP & ONBOARDING FLOW

### Step 1: Organization Registration (Web — No VistA Yet)

The customer visits vistaevolved.com and signs up. At this stage, they're just creating a platform account. No VistA instance exists yet.

**What they provide:**
- Organization name
- Admin contact (name, email, phone)
- Country / region
- Organization type (this drives everything downstream)

**Organization Types:**
| Type | Description | VistA Config Implications |
|------|-------------|--------------------------|
| Solo Clinic | Single physician or small group practice, 1 location | 1 division, 1-5 clinics, outpatient only, basic pharmacy, basic billing |
| Multi-Clinic Network | Multiple clinic locations under one entity | 1 institution + multiple divisions, shared formulary, centralized billing |
| Small Hospital | Inpatient + outpatient, single facility | Full ADT, wards/beds, surgery, lab, pharmacy, radiology, full billing |
| Hospital + Clinic Network | Hospital with satellite clinics | Multi-division, shared patient index, centralized pharmacy possible |
| Health System / HMO | Multiple hospitals and clinics | Multi-institution, complex referral networks, enterprise reporting |

**Platform DB records created:**
- `tenants` table: org name, type, country, status=PROVISIONING
- `platform_users` table: admin user, email, hashed password
- `tenant_config` table: selected entity type, modules enabled

### Step 2: Configuration Wizard (Web — Still Pre-VistA)

After signup, the admin enters a step-by-step setup wizard. This collects all the information needed to configure their VistA instance.

**Wizard Steps:**

#### Step 2a: Facility Identity
- Facility name(s)
- Station number(s) (auto-assigned or chosen)
- Address, phone, timezone
- If multi-facility: define each division
- Parent organization (for networks)

*Maps to VistA: INSTITUTION file (#4), MEDICAL CENTER DIVISION (#40.8), STATION NUMBER (#389.9), KERNEL SYSTEM PARAMETERS (#8989.3)*

#### Step 2b: Departments & Services
Choose which departments/services are active:
- [ ] Medicine (Internal Medicine, Cardiology, Pulmonology, etc.)
- [ ] Surgery (General, Orthopedic, etc.)
- [ ] Pediatrics
- [ ] OB/GYN
- [ ] Emergency Medicine
- [ ] Psychiatry / Mental Health
- [ ] Dental
- [ ] Ophthalmology
- [ ] Radiology
- [ ] Laboratory
- [ ] Pharmacy
- [ ] Physical Therapy / Rehab
- [ ] Social Work
- [ ] Nutrition / Dietetics

*Maps to VistA: SERVICE/SECTION file (#49), TREATING SPECIALTY (#42.4)*

#### Step 2c: Module Selection
Based on org type, pre-select and allow customization:

| Module | Solo Clinic | Multi-Clinic | Hospital | Health System |
|--------|:-----------:|:------------:|:--------:|:-------------:|
| Scheduling | ✓ | ✓ | ✓ | ✓ |
| Registration/Demographics | ✓ | ✓ | ✓ | ✓ |
| Outpatient Pharmacy | ✓ | ✓ | ✓ | ✓ |
| Inpatient Pharmacy | | | ✓ | ✓ |
| ADT (Admit/Discharge/Transfer) | | | ✓ | ✓ |
| Ward/Bed Management | | | ✓ | ✓ |
| Laboratory | optional | optional | ✓ | ✓ |
| Radiology | optional | optional | ✓ | ✓ |
| Surgery | | | ✓ | ✓ |
| Billing (Outpatient) | ✓ | ✓ | ✓ | ✓ |
| Billing (Inpatient) | | | ✓ | ✓ |
| Insurance Management | ✓ | ✓ | ✓ | ✓ |
| Accounts Receivable | optional | ✓ | ✓ | ✓ |
| Inventory / Procurement | | optional | ✓ | ✓ |
| Clinical Notes (TIU) | ✓ | ✓ | ✓ | ✓ |
| Order Entry | ✓ | ✓ | ✓ | ✓ |
| Vitals | ✓ | ✓ | ✓ | ✓ |
| Problem List | ✓ | ✓ | ✓ | ✓ |
| Consults/Referrals | optional | ✓ | ✓ | ✓ |
| Clinical Reminders | optional | optional | ✓ | ✓ |
| Reports / Analytics | ✓ | ✓ | ✓ | ✓ |
| Employee Management | optional | optional | ✓ | ✓ |
| Quality Management | | | optional | ✓ |
| Engineering/Facilities | | | optional | ✓ |
| Dietetics/Nutrition | | | optional | ✓ |

#### Step 2d: Initial Clinic/Ward Setup
- For clinics: Name each clinic, assign specialty, set hours, appointment length defaults
- For hospitals: Name each ward, assign beds, assign treating specialty
- This is a simplified version — detailed config happens after launch in the admin panel

*Maps to VistA: HOSPITAL LOCATION (#44), WARD LOCATION (#42)*

#### Step 2e: User Roles & First Users
Define the initial users beyond the admin:
- Physicians / Providers
- Nurses
- Front desk / Registration clerks
- Pharmacists
- Lab technicians
- Billing staff
- IT / System admin

*Maps to VistA: NEW PERSON (#200), security key allocation, menu assignment*

#### Step 2f: Billing Configuration
- Country-specific billing system selection
- Philippines: PhilHealth, HMO panel selection
- US: CMS-1500/UB-04, payer setup
- Fee schedule / rate table selection
- Currency

*Maps to VistA: IB SITE PARAMETERS (#350.9), INSURANCE COMPANY (#355.3)*

#### Step 2g: Regulatory & Compliance
- Country-specific compliance settings
- Data retention policies
- Consent management preferences
- Prescription regulation (DEA for US, PDEA for PH)

### Step 3: VistA Instance Provisioning (Automated — Backend)

Once the wizard is complete, the platform automatically:

1. **Spins up a new VistA Docker container** from the base image
2. **Runs the initialization script** that:
   - Sets station number and domain name
   - Configures KERNEL SYSTEM PARAMETERS
   - Creates INSTITUTION and DIVISION records
   - Sets up SERVICE/SECTION entries
   - Creates HOSPITAL LOCATION entries (clinics)
   - Creates WARD LOCATION entries (if hospital)
   - Creates initial users in NEW PERSON file with appropriate:
     - Access/verify codes
     - Security keys
     - Menu assignments
     - Provider flags (for physicians)
     - Electronic signature setup
   - Configures billing site parameters
   - Loads country-specific drug formulary (if applicable)
   - Loads country-specific lab test panels (if applicable)
   - Sets up TaskMan scheduled jobs
   - Configures RPC Broker listener port
3. **Updates the platform DB** — tenant status=ACTIVE, VistA host/port recorded
4. **Sends welcome email** with login credentials and quickstart guide

**Target: Signup to running instance in under 5 minutes.**

### Step 4: First Login & Guided Tour

The admin logs in and sees:
- A guided tour overlay highlighting each section of the admin panel
- A setup checklist showing what's been auto-configured and what needs manual attention
- Quick links to the most important next steps:
  - Add more users
  - Refine clinic schedules/availability patterns
  - Set up drug formulary preferences
  - Configure billing/insurance details
  - Register first test patient

---

## PART 3: THE WEB UI MODULE MAP

### Navigation Structure

The web UI has two major sections:

**A. ADMIN PANEL** (for facility administrators, IT staff, department managers)
**B. CLINICAL WORKSTATION** (for providers, nurses, clerks — replaces CPRS)

This blueprint focuses on the Admin Panel since that's your question. The Clinical Workstation (the CPRS replacement) is a separate but equally large effort.

### Admin Panel: Top-Level Navigation

```
VISTA EVOLVED ADMIN PANEL
│
├── 🏠 Dashboard (home)
│
├── 🏥 Facility Management
│   ├── Institution & Divisions
│   ├── Departments & Services
│   ├── Locations (Clinics, Wards, ORs)
│   ├── Stop Codes
│   └── Treating Specialties
│
├── 📅 Scheduling Administration
│   ├── Clinic Setup & Patterns
│   ├── Appointment Types
│   ├── Clinic Groups
│   ├── Holiday Schedule
│   ├── Wait List Management
│   ├── Recall Reminders
│   └── Scheduling Parameters
│
├── 🛏️ Inpatient Administration (Hospital only)
│   ├── Ward Configuration
│   ├── Bed Management
│   ├── ADT Parameters
│   ├── Treating Specialty Assignment
│   ├── Census Dashboard
│   └── Bed Board (real-time)
│
├── 👥 User & Security Management
│   ├── User Accounts (Create/Edit/Deactivate)
│   ├── User Roles & Templates
│   ├── Security Keys
│   ├── Menu Assignment
│   ├── Electronic Signature Setup
│   ├── Provider Setup (NPI, DEA, Taxonomy)
│   ├── Access/Verify Code Management
│   └── User Activity Audit Log
│
├── 💊 Pharmacy Administration
│   ├── Drug Formulary Management
│   ├── Drug Interaction Settings
│   ├── Outpatient Pharmacy Setup
│   ├── Inpatient Pharmacy Setup (Hospital)
│   ├── Dispensing Windows/Locations
│   ├── Controlled Substances Setup
│   ├── Medication Routes & Schedules
│   └── Pharmacy Site Parameters
│
├── 🔬 Laboratory Administration
│   ├── Test Catalog Setup
│   ├── Collection Samples & Sites
│   ├── Accession Areas
│   ├── Result Reference Ranges
│   ├── Instrument Interface Setup
│   ├── Lab Site Parameters
│   └── Specimen Types
│
├── 📷 Radiology Administration
│   ├── Procedure Catalog
│   ├── Imaging Locations
│   ├── Equipment Registry
│   ├── Rad Division Parameters
│   └── Report Templates
│
├── 💰 Billing & Revenue Cycle
│   ├── Billing Site Parameters
│   ├── Fee Schedules / Rate Tables
│   ├── Insurance Company Management
│   ├── Insurance Plan Management
│   ├── Claims Configuration
│   ├── Co-Pay / Self-Pay Rules
│   ├── Accounts Receivable Setup
│   ├── Revenue Reports Dashboard
│   └── Country-Specific Billing
│       ├── 🇵🇭 PhilHealth Configuration
│       ├── 🇵🇭 HMO Panel Management
│       └── 🇺🇸 US Payer Configuration
│
├── 📋 Clinical Application Setup
│   ├── Order Sets & Quick Orders
│   ├── Order Dialog Configuration
│   ├── Consult Services Setup
│   ├── Document Type Definitions (TIU)
│   ├── Document Templates
│   ├── Problem Selection Lists
│   ├── Health Summary Types
│   ├── Clinical Reminder Setup
│   ├── Vitals Configuration
│   └── Encounter Form Setup
│
├── 📦 Inventory & Supply Chain (Hospital)
│   ├── Item Master Catalog
│   ├── Vendor Management
│   ├── Inventory Locations
│   ├── Stock Level Alerts
│   ├── Purchase Order Workflow
│   ├── Receiving
│   └── Equipment Tracking
│
├── 👔 Workforce Management
│   ├── Employee Registry
│   ├── Credential Tracking
│   ├── Timekeeping
│   ├── Scheduling / Shift Management
│   ├── Provider Privileges
│   └── Training Records
│
├── 📊 Reports & Analytics
│   ├── Operational Dashboard
│   │   ├── Patient Volume (today/week/month/year)
│   │   ├── Appointment Utilization
│   │   ├── No-Show Rates
│   │   ├── Average Wait Times
│   │   ├── Bed Occupancy (Hospital)
│   │   ├── Average Length of Stay
│   │   └── ED Throughput (if ED)
│   ├── Financial Dashboard
│   │   ├── Revenue by Service/Clinic/Provider
│   │   ├── Claims Submitted vs Paid
│   │   ├── Accounts Receivable Aging
│   │   ├── Collection Rate
│   │   ├── Denial Rate & Top Denial Reasons
│   │   └── Payer Mix
│   ├── Clinical Dashboard
│   │   ├── Clinical Reminder Compliance
│   │   ├── Order Turnaround Times
│   │   ├── Lab Result Turnaround
│   │   ├── Medication Error Tracking
│   │   └── Consult Completion Rates
│   ├── Workforce Dashboard
│   │   ├── Provider Productivity (encounters/day)
│   │   ├── Workload by Service
│   │   ├── Overtime Tracking
│   │   └── Credential Expiration Alerts
│   ├── Standard Reports Library
│   │   ├── Daily Census Report
│   │   ├── Clinic Utilization Report
│   │   ├── Revenue Cycle Report
│   │   ├── Quality Metrics Report
│   │   ├── Pharmacy Utilization Report
│   │   ├── Lab Workload Report
│   │   └── Custom Report Builder
│   └── Export & Scheduling
│       ├── Export to CSV/PDF/Excel
│       ├── Scheduled Report Delivery
│       └── Email Distribution Lists
│
├── ⚙️ System Administration
│   ├── Site Parameters
│   ├── Device Management (Printers, etc.)
│   ├── TaskMan Monitor
│   ├── HL7 Interface Monitor
│   ├── Error Trap Viewer
│   ├── System Health Dashboard
│   ├── Background Job Manager
│   ├── Parameter Editor
│   └── VistA Direct Console (advanced — roll-and-scroll emulator)
│
├── 🔌 Integrations
│   ├── HL7/FHIR Interface Configuration
│   ├── External Lab Interfaces
│   ├── Pharmacy Interfaces (CMOP)
│   ├── Insurance/Payer EDI
│   ├── PhilHealth API Integration
│   ├── AI Engine Configuration (MedGemma)
│   └── Webhook/API Key Management
│
└── 🏢 Platform Administration (SaaS-level)
    ├── Subscription & Billing
    ├── Plan Management (upgrade/downgrade)
    ├── Multi-Facility Management
    ├── Data Backup & Recovery
    ├── Platform Update Notifications
    └── Support Ticket System
```

---

## PART 4: THE VISTA GATEWAY SERVICE (The Critical Middle Layer)

### What It Is

The VistA Gateway Service is a Node.js/TypeScript service that sits between your React frontend and VistA. It's the translator that converts modern REST/GraphQL API calls into VistA RPC calls and back.

### How It Works

```
React UI                    VistA Gateway                      VistA Instance
────────                    ─────────────                      ──────────────
                            
POST /api/clinics           → Authenticate JWT
{name: "Cardiology",        → Look up tenant → VistA host:port
 service: "MEDICINE",        → Open RPC Broker connection
 stopCode: "303",            → Call RPC: "SD SET UP CLINIC"     → M routine runs
 apptLength: 30}              with parameters                   → FileMan edits
                             ← Parse RPC response               ← Returns result
                            ← Return JSON to React
← {id: 44, name: "CARD..."}
```

### API Design Pattern

Every admin module in the React UI maps to a set of REST endpoints that map to VistA RPCs:

```
MODULE: Clinic Management
──────────────────────────

GET    /api/v1/clinics                  → List all clinics
GET    /api/v1/clinics/:ien             → Get clinic details
POST   /api/v1/clinics                  → Create new clinic
PUT    /api/v1/clinics/:ien             → Update clinic
DELETE /api/v1/clinics/:ien             → Inactivate clinic
GET    /api/v1/clinics/:ien/patterns    → Get availability patterns
PUT    /api/v1/clinics/:ien/patterns    → Set availability patterns
GET    /api/v1/clinics/:ien/providers   → List clinic providers
POST   /api/v1/clinics/:ien/providers   → Add provider to clinic

Internal VistA RPC Mapping:
─────────────────────────
GET /clinics → calls "SDES GET CLINIC LIST" or FileMan lookup on File #44
POST /clinics → calls multiple RPCs or uses FileMan EDIT via custom RPC
                (many admin operations need custom RPCs written in M)
```

### The RPC Gap: What Exists vs. What Needs To Be Built

This is critical to understand. VistA's existing RPCs were built for CPRS (the clinical GUI). Many admin operations do NOT have RPCs — they're only accessible through roll-and-scroll menus.

**RPCs that already exist** (can be called from web UI immediately):
- Most scheduling operations (SDES namespace RPCs — ~50+ RPCs)
- Patient lookup and registration (DG namespace)
- Order entry operations (OR namespace — ~100+ RPCs)
- Pharmacy operations (PSO, PSJ namespace)
- Lab operations (LR namespace)
- TIU document operations
- Vitals operations (GMV namespace)
- Some billing operations

**RPCs that DO NOT exist** (need to be written as custom M routines):
- Clinic creation/setup (done through roll-and-scroll)
- Ward/bed configuration (roll-and-scroll)
- User account creation/editing (partially available, many gaps)
- Security key management (roll-and-scroll)
- Drug formulary management (roll-and-scroll)
- Lab test setup (roll-and-scroll)
- Billing parameter configuration (roll-and-scroll)
- Most "setup" and "configuration" operations
- Business intelligence / aggregate reporting queries
- Inventory management operations

### Strategy for Missing RPCs

For every admin function where no RPC exists, you have three options:

**Option A: Write Custom RPCs (Recommended)**
Write new M routines that perform the same FileMan operations that the roll-and-scroll menus do, but expose them as RPCs. Register each new RPC in File #8994.

Example custom RPC for creating a clinic:
```mumps
CLINSET(RESULT,PARAMS) ; Create/Edit Clinic via RPC
 ; PARAMS contains: name, service, stopCode, apptLength, etc.
 ; This routine does what the Scheduling Supervisor menu does,
 ; but programmatically via FileMan DIE/DIC calls
 N CLNAME,FDA,IENS,ERR
 S CLNAME=$P(PARAMS,U,1)
 ; ... build FDA array, call UPDATE^DIE
 S RESULT=IEN_U_"OK"
 Q
```

**Option B: FileMan Direct Edit via Generic RPC**
Write a single "FileMan Edit" RPC that accepts a file number, field numbers, and values, then calls UPDATE^DIE. This is faster to build but less safe — you're essentially exposing raw database writes through an API.

**Option C: Hybrid — M-side automation scripts**
For complex multi-step setup processes (like full facility initialization), write M routines that automate what a system manager would do across multiple menu options. Call these via RPC during tenant provisioning.

### VistA Gateway Service Architecture

```typescript
// Simplified VistA Gateway structure

// 1. Tenant Router — maps tenant ID to VistA connection info
class TenantRouter {
  async getConnection(tenantId: string): Promise<VistAConnection> {
    const tenant = await db.tenants.findById(tenantId);
    return connectionPool.get(tenant.vistaHost, tenant.vistaPort);
  }
}

// 2. RPC Client — manages TCP connection to VistA RPC Broker
class RPCClient {
  async call(rpcName: string, params: string[]): Promise<string> {
    // Implements the XWB RPC Broker protocol
    // Sends: [XWB]11302<rpcName><params>
    // Receives: response string
  }
}

// 3. Domain Services — one per admin module
class ClinicService {
  async createClinic(tenantId: string, data: ClinicInput): Promise<Clinic> {
    const conn = await tenantRouter.getConnection(tenantId);
    const rpc = new RPCClient(conn);
    
    // Authenticate as system manager
    await rpc.call('XUS SIGNON SETUP', []);
    await rpc.call('XUS AV CODE', [accessVerifyCode]);
    
    // Call custom clinic creation RPC
    const result = await rpc.call('VESD CREATE CLINIC', [
      data.name, data.service, data.stopCode, data.apptLength
    ]);
    
    return parseClinicResponse(result);
  }
}

// 4. REST API Layer
app.post('/api/v1/clinics', authenticate, async (req, res) => {
  const tenantId = req.user.tenantId;
  const clinic = await clinicService.createClinic(tenantId, req.body);
  res.json(clinic);
});
```

---

## PART 5: PHASED BUILD PLAN

### Philosophy: Vertical Slices, Not Horizontal Layers

Don't build "all the database layer" then "all the API layer" then "all the UI." Instead, build complete end-to-end slices: pick a module, build the M routine → RPC → Gateway endpoint → React screen, test it against live VistA, then move to the next module.

---

### PHASE 0: Foundation (Weeks 1-4)
**Goal: Platform skeleton + VistA connection working**

- [ ] Platform PostgreSQL schema: tenants, users, subscriptions
- [ ] Auth service: JWT-based auth with tenant context
- [ ] VistA Gateway: RPC Broker client (you already have the XWB broker client with the 3 protocol fixes — this is your most valuable asset)
- [ ] Tenant provisioning service: spin up VistA Docker container from VEHU image, run init script
- [ ] React app shell: routing, auth flow, sidebar navigation
- [ ] VistA connection test: React → Gateway → RPC → VistA → response displayed in browser
- [ ] Signup page (just the form, no wizard yet)
- [ ] First successful RPC call from the web UI to live VistA

**Milestone: You can sign up, a VistA instance spins up, and you can call an RPC from the browser and see the result.**

---

### PHASE 1: User & Security Management (Weeks 5-8)
**Goal: Full user lifecycle in the web UI**

Why first? Because every other module depends on users being set up properly.

- [ ] User list view (reads File #200 via RPC)
- [ ] User detail view (all fields from NEW PERSON)
- [ ] Create user form (writes to File #200)
- [ ] Edit user (update access/verify codes, personal info)
- [ ] Deactivate/reactivate user
- [ ] Security key management (view all keys, allocate/deallocate to users)
- [ ] Menu assignment (assign primary menu, secondary menus)
- [ ] Provider setup (NPI, DEA, taxonomy, authorized to write meds)
- [ ] Electronic signature setup
- [ ] User role templates ("clone a user" functionality)
- [ ] User activity audit log

**Custom M routines needed:**
- RPC to list all users from File #200 with key fields
- RPC to create/edit user in File #200 (wrapping FileMan calls)
- RPC to allocate/deallocate security keys
- RPC to assign menus
- RPC to set up electronic signature

**Milestone: Complete user management without ever touching roll-and-scroll.**

---

### PHASE 2: Facility & Clinic Setup (Weeks 9-12)
**Goal: Set up a complete facility structure from the web UI**

- [ ] Institution/Division configuration screen
- [ ] Department/Service management
- [ ] Treating specialty management
- [ ] Stop code management
- [ ] Clinic creation wizard (the big one):
  - Clinic name, abbreviation, service, stop code
  - Appointment type, default provider(s)
  - Appointment length, display increments
  - Overbook limits, no-show limits
  - Future booking limits
  - Holiday scheduling rules
  - Associated letters (no-show, cancellation, pre-appointment)
- [ ] Clinic availability pattern editor (visual calendar UI)
- [ ] Clinic list view with search/filter
- [ ] Clinic activation/deactivation
- [ ] Clinic groups management

**Custom M routines needed:**
- RPC to create/edit HOSPITAL LOCATION (#44) with all sub-fields
- RPC to set availability patterns
- RPC to manage clinic groups
- RPC for stop code lookup/management

**Milestone: You can create and fully configure a clinic through the web UI that works with scheduling.**

---

### PHASE 3: Inpatient — Wards & Beds (Weeks 13-15)
**Goal: Hospital ward/bed management (skip if clinic-only)**

- [ ] Ward definition screen (name, treating specialty, service, teams)
- [ ] Bed configuration (room numbers, bed numbers, types, status)
- [ ] Bed board — real-time visual bed map
- [ ] ADT parameters configuration
- [ ] Census dashboard (current inpatient count by ward/specialty)

**Custom M routines needed:**
- RPC for WARD LOCATION (#42) management
- RPC for bed status queries
- RPC for census counts

**Milestone: Visual bed board showing real-time ward status.**

---

### PHASE 4: Billing & Revenue Setup (Weeks 16-20)
**Goal: Complete billing configuration**

This is your most important revenue-generating module for international markets.

- [ ] Billing site parameters configuration
- [ ] Insurance company management (add/edit/deactivate)
- [ ] Insurance plan management
- [ ] Fee schedule / rate table editor
- [ ] Claims configuration (form types, submission rules)
- [ ] Co-pay / self-pay rules
- [ ] AR setup
- [ ] Revenue dashboard:
  - Revenue by period (day/week/month/year)
  - Revenue by clinic/service/provider
  - Claims status tracking
  - AR aging report
  - Collection rate
  - Denial analysis
- [ ] PhilHealth integration (Philippines):
  - PhilHealth member verification
  - Claim form generation
  - Submission tracking
  - Payment reconciliation
- [ ] HMO management (Philippines):
  - HMO company registry
  - Accreditation tracking
  - LOA (Letter of Authorization) workflow
  - HMO billing & reconciliation

**Custom M routines needed:**
- RPCs for IB SITE PARAMETERS (#350.9) management
- RPCs for INSURANCE COMPANY (#355.3) management
- RPCs for fee schedule management
- RPCs for AR queries and aging reports
- Custom RPCs for PhilHealth/HMO integration

**Milestone: A clinic can configure billing, manage insurance, and see a revenue dashboard — all from the web UI.**

---

### PHASE 5: Pharmacy Setup (Weeks 21-24)

- [ ] Drug formulary browser (search, filter, view details)
- [ ] Formulary management (add/remove drugs from local formulary)
- [ ] Drug interaction severity settings
- [ ] Outpatient pharmacy site parameters
- [ ] Inpatient pharmacy site parameters (hospital)
- [ ] Dispensing location setup
- [ ] Medication routes & schedules management
- [ ] Controlled substances configuration

**Custom M routines needed:**
- RPCs for DRUG file (#50) management
- RPCs for pharmacy site parameter editing
- RPCs for formulary management operations

---

### PHASE 6: Lab & Radiology Setup (Weeks 25-28)

- [ ] Lab test catalog browser and editor
- [ ] Collection sample types management
- [ ] Accession area configuration
- [ ] Reference range management
- [ ] Lab site parameters
- [ ] Radiology procedure catalog
- [ ] Imaging location setup
- [ ] Radiology division parameters

**Custom M routines needed:**
- RPCs for LABORATORY TEST file (#60) management
- RPCs for lab site configuration
- RPCs for RAD/NUC MED PROCEDURES (#71) management

---

### PHASE 7: Clinical Application Setup (Weeks 29-32)

- [ ] Order set builder (visual drag-and-drop)
- [ ] Quick order configuration
- [ ] Consult service setup
- [ ] TIU document type management
- [ ] Template editor
- [ ] Problem selection list builder
- [ ] Clinical reminder configuration
- [ ] Encounter form builder

---

### PHASE 8: Reports, Analytics & BI (Weeks 33-36)

- [ ] Operational dashboard (real-time widgets)
- [ ] Financial dashboard
- [ ] Clinical quality dashboard
- [ ] Workforce productivity dashboard
- [ ] Standard report library (~20 pre-built reports)
- [ ] Custom report builder
- [ ] Scheduled report delivery
- [ ] Export engine (CSV, PDF, Excel)

**Note: Most BI data will need to be extracted from VistA via RPCs/FileMan queries and aggregated in PostgreSQL for fast dashboard rendering. VistA is not built for OLAP-style analytics.**

---

### PHASE 9: Remaining Modules (Weeks 37-44)

- [ ] Inventory & supply chain management
- [ ] Employee/workforce management
- [ ] Credential tracking
- [ ] Quality management
- [ ] Engineering/facilities
- [ ] System administration tools (TaskMan monitor, error traps, etc.)
- [ ] VistA console emulator (for advanced users who want roll-and-scroll)

---

### PHASE 10: Self-Service Signup & SaaS Polish (Weeks 45-48)

- [ ] Public marketing website
- [ ] Self-service signup flow with configuration wizard
- [ ] Automated VistA provisioning pipeline
- [ ] Stripe/payment integration for subscriptions
- [ ] Plan management (upgrade/downgrade/cancel)
- [ ] Multi-facility management for health systems
- [ ] Data backup/restore self-service
- [ ] Platform onboarding tour
- [ ] Help center / documentation

---

## PART 6: ENTITY-SPECIFIC CONFIGURATIONS

### Solo Clinic Package
**Enabled by default:**
- 1 Division, 1-10 clinics
- Outpatient scheduling
- Outpatient pharmacy
- Basic billing (insurance + self-pay)
- Clinical notes, orders, vitals, problem list
- 1-20 users
- Basic reporting

**Disabled/hidden:**
- Wards, beds, ADT
- Inpatient pharmacy
- Surgery
- Inventory/procurement
- Engineering
- Dietetics
- Complex organizational hierarchy

**VistA initialization script:**
- Single institution, single division
- 1 service/section per active specialty
- Basic stop codes for selected specialties
- Minimal security key set
- Simple menu tree (no inpatient menus)

### Multi-Clinic Network Package
Everything in Solo Clinic, plus:
- Multiple divisions (one per location)
- Centralized patient index across locations
- Inter-clinic referrals/consults
- Consolidated reporting across locations
- Shared formulary management
- 20-100 users
- Advanced scheduling (resource sharing across locations)

### Hospital Package
Everything in Multi-Clinic, plus:
- Full ADT (admit/discharge/transfer)
- Ward and bed management
- Inpatient pharmacy
- Surgery scheduling and documentation
- Full lab with accession tracking
- Full radiology
- Inventory and procurement
- Dietetics/nutrition
- Engineering/facilities
- Employee management
- Quality management
- 100-500 users
- Complex reporting and analytics

### Health System Package
Everything in Hospital, plus:
- Multiple institutions
- Enterprise-wide patient matching (MPI)
- Complex referral networks
- Consolidated enterprise reporting
- Data warehouse integration
- 500+ users
- Custom integrations
- Dedicated support
- SLA guarantees

---

## PART 7: PRICING MODEL FRAMEWORK

| Plan | Target | Monthly Price Range | VistA Resources |
|------|--------|-------------------|-----------------|
| Starter | Solo Clinic | $99-299/mo | Shared VM, 1 VistA instance, 10 users |
| Professional | Multi-Clinic | $499-999/mo | Dedicated VM, 1 VistA instance, 50 users |
| Enterprise | Hospital | $2,000-5,000/mo | Dedicated server, 1 VistA instance, 200 users |
| Health System | Network | Custom | Multi-instance, dedicated infra, custom SLA |

**Add-ons:**
- Additional users: $5-15/user/mo
- Additional clinics: $25-50/clinic/mo
- PhilHealth/HMO billing module: $99-199/mo
- AI clinical decision support (MedGemma): $199-499/mo
- FHIR interoperability module: $99-199/mo
- Custom report builder: $49-99/mo
- Dedicated support: $199-499/mo

---

## PART 8: THE TECHNICAL STACK

### Frontend
- **React** (TypeScript) — SPA with client-side routing
- **TailwindCSS** — Styling
- **shadcn/ui** — Component library
- **Recharts** or **Chart.js** — Dashboard charts
- **React Query (TanStack)** — API state management
- **React Hook Form + Zod** — Form handling with validation
- **React Router** — Navigation

### Backend (Platform + Gateway)
- **Node.js** (TypeScript) — Runtime
- **Express** or **Fastify** — HTTP framework
- **PostgreSQL** — Platform database (tenants, billing, analytics)
- **Redis** — Session cache, RPC response cache, real-time pub/sub
- **Custom XWB RPC Client** — Your existing broker client with the 3 protocol fixes
- **Docker** — VistA instance containerization
- **Docker Compose** or **Kubernetes** — Container orchestration

### VistA Layer
- **WorldVistA VEHU** — Base Docker image
- **YottaDB** — M database engine (chosen for Octo SQL layer)
- **Custom M Routines** — Admin RPCs in VE (VistA Evolved) namespace
- **KIDS** — Package distribution for M routine updates across tenants

### Infrastructure
- **AWS** or **DigitalOcean** — Cloud hosting
- **CloudFlare** — CDN, DDoS protection, SSL
- **S3** (or compatible) — Document/image storage
- **GitHub Actions** — CI/CD
- **Terraform** — Infrastructure as code

### Monitoring
- **VistA System Monitor (VSM)** — VistA-level monitoring (exists in VistA)
- **Prometheus + Grafana** — Infrastructure monitoring
- **Sentry** — Error tracking
- **Custom dashboard** — Per-tenant VistA health

---

## PART 9: CRITICAL SUCCESS FACTORS

### 1. The M Routine Library Is Your Moat
The collection of custom M routines (RPCs) that bridge the admin UI to VistA is the most defensible asset you'll build. Nobody else has these. Every RPC you write that replaces a roll-and-scroll workflow is irreplaceable intellectual property.

### 2. Start With Philippines Market
- Smaller, greenfield market
- Less regulatory complexity than US
- PhilHealth integration is a differentiator
- HMO revenue cycle pain point is the entry wedge
- Build and battle-test there before entering US

### 3. The Provisioning Pipeline Is Key to SaaS
The ability to go from signup to running VistA instance in <5 minutes is what makes this a real SaaS vs. a consulting engagement. Invest heavily in the automated provisioning.

### 4. Don't Try to Replace Roll-and-Scroll for Everything on Day 1
Many admin functions are used once during setup, then rarely again. Focus your UI efforts on the operations people do daily/weekly:
- User management (constant)
- Scheduling administration (weekly)
- Billing oversight (daily)
- Reports/dashboards (daily)
- Bed management (constant for hospitals)

Leave the rare one-time configuration items for a later phase, or offer a "VistA Console" screen that gives advanced users a web-based roll-and-scroll terminal.

### 5. Build the Analytics Layer That VistA Lacks
This is arguably a bigger selling point than the admin UI itself. VistA has zero built-in business intelligence. A beautiful real-time dashboard showing revenue, patient volume, utilization, quality metrics — that alone justifies the subscription for many facilities.

### 6. Country-Specific Billing Is the Entry Point
For Philippines: PhilHealth + HMO integration
For US: The admin UI itself is the draw (no one has modernized VistA admin)
For Africa/Australia: Basic insurance + self-pay billing

---

## PART 10: WHAT TO BUILD FIRST (The MVP)

If you had to launch in 90 days with something people would pay for, here's the absolute minimum:

### 90-Day MVP Scope
1. **Signup flow** (simple form, manual provisioning at first is OK)
2. **User management** (create/edit/deactivate users)
3. **Clinic setup** (create clinics, set schedules)
4. **Basic billing configuration** (insurance companies, fee schedules)
5. **Dashboard** (patient volume, revenue, appointment utilization — even if some widgets are simulated initially)
6. **System health** (VistA connection status, basic monitoring)

This gives a clinic administrator a reason to use the web UI instead of roll-and-scroll. From there, you expand module by module based on customer demand.

---

*VistA Evolved SaaS Platform Blueprint v1.0*
*For internal strategy and development planning*
