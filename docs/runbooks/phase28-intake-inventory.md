# Phase 28 Intake OS - Inventory

## 1. Existing Intake Code
**None.** Zero intake, questionnaire, LHC-Forms, or pre-visit code exists in the repo. This is 100% greenfield.

## 2. Reuse Candidates + License Notes

### LHC-Forms (lhc-forms / @lhncbc/lhc-forms)
- **License**: Apache 2.0 (NLM/LHNCBC)
- **Usage**: FHIR Questionnaire renderer. Will use for portal + kiosk form rendering.
- **Integration**: npm package, React wrapper, produces QuestionnaireResponse JSON.
- **Decision**: USE - best-in-class FHIR form renderer, Apache-licensed, maintained by NLM.

### Ottehr Intake Patterns (reference/ottehr ehr main/)
- **License**: MIT + attribution (MassLight, Inc.)
- **Usage**: UX patterns only (check-in flow, paperwork flow, AI interview concept).
- **Decision**: STUDY ONLY - no code copy. Patterns inform our stepper/review UX.

### HealtheMe (reference/HealtheMe-master/)
- **License**: Apache 2.0 (KRM Associates)
- **Usage**: VistA PHR architecture patterns.
- **Decision**: STUDY ONLY - Java project, no directly reusable code.

### AIOTP (reference/All In One Telehealth Platform/)
- **License**: CC BY-NC-SA 4.0 (NonCommercial)
- **Decision**: OBSERVE ONLY. No code copy allowed.

## 3. What We Build Fresh (and why)

| Component | Reason |
|-----------|--------|
| IntakeSession/Event storage | No existing session model for intake; need append-only event log |
| Pack system (question bundles) | Novel concept - FHIR Questionnaire items organized by specialty/dept |
| Context Resolver | Maps appointment/patient context to ordered pack list |
| Pluggable providers | Rules/Vendor/LLM provider architecture is custom |
| $next-question endpoint | SDC-like adaptive questioning - custom implementation |
| Kiosk mode session | New session type (not portal, not clinician) |
| Clinician review panel | New CPRS panel following existing ImagingPanel pattern |
| Filing queue | VistA-first concept: draft -> review -> file |

## 4. VistA-First Mapping

### Target RPCs (reads)
| RPC | Purpose |
|-----|---------|
| ORQQAL LIST | Pre-populate allergy section |
| ORWPS ACTIVE | Pre-populate active medications |
| ORWCH PROBLEM LIST | Pre-populate problem list |
| ORQQVI VITALS | Pre-populate recent vitals |
| ORWPT SELECT | Patient demographics for section prefill |
| ORWDAL32 DEF | Default allergy data for filing |
| OREVNTX1 GETDLG | Dialog retrieval for note filing |

### Target RPCs (writes, via clinician review)
| RPC | Purpose |
|-----|---------|
| TIU CREATE RECORD | File intake as a TIU note (progress note) |
| ORWDAL32 SAVE ALLERGY | File new allergies from intake |
| ORQQPL ADD SAVE | File new problems from intake |
| GMVHS ADD VM | File vitals from intake |

### Filing Model
1. Patient completes intake -> QuestionnaireResponse stored as draft
2. Clinician reviews -> edits/confirms -> marks "reviewed"
3. Clinician clicks "File" -> system calls appropriate VistA RPCs  
4. If no VistA RPC exists for a field -> "integration pending" status
5. All filing is audited end-to-end

## 5. Existing Patterns to Follow

### Portal UI
- `"use client"` + `useEffect` + `useState` with `portalFetch()` wrapper
- `credentials: "include"` on all fetches
- Inline styles (no CSS modules in portal)
- `DataSourceBadge` for data source indicators

### API Services
- Pure TypeScript functions in `services/`
- In-memory `Map<>` stores with documented VistA migration path
- `portalAudit()` for all user actions
- Routes import service functions and wire to Fastify

### CPRS Panels
- `'use client'` React components with `Props { dfn: string }`
- Multi-tab UI with useState for activeTab
- `fetch()` with `credentials: 'include'`
- Barrel exported from `panels/index.ts`

### Route Registration
- `server.register(plugin)` in index.ts
- Plugin pattern: `export default async function(server) { ... }`
