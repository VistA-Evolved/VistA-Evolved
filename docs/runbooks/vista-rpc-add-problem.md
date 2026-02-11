# VistA Problem Creation (Phase 9B) — MVP Status & Runbook

## Status: NOT YET IMPLEMENTED — Documented Blocker

**POST /vista/problems** returns an honest error explaining why problem creation is out of MVP scope for this API.

This is **intentional** and **safe**. Adding patient problems in VistA requires complex clinical validation that is best handled by dedicated provider workstations (VistA CPRS).

---

## Why Problem Creation is Complex

### Minimal Required Fields
To create a valid problem in VistA (file 9000011), the system requires:

| Field | Type | Purpose | Validation Needed |
|-------|------|---------|-------------------|
| **PATIENT** | IEN (file 2) | Patient reference | DFN must exist |
| **NARRATIVE** | Text (80 chars) | Problem description (free text) | None if text-only |
| **DIAGNOSIS** | IEN (file 80) | ICD-9 or ICD-10 code | **CODE LOOKUP REQUIRED** |
| **PROVIDER** | IEN (file 200) | Who entered the problem | DUZ validation |
| **LOCATION** | IEN (file 4) | Where  problem was documented | Location must be valid |
| **STATUS** | Code | A/I/R (active/inactive/resolved) | Must be valid code |
| **ONSET** | FM Date | When problem started | Date validation |

### Complex Required Validations

#### 1. **ICD-9/ICD-10 Diagnosis Code Lookup**
   - User provides `"Hypertension"` (free text)
   - System must validate against diagnostic databases (file 80, 757.01 Lexicon)
   - Must map to correct ICD-9 (401.x series) or ICD-10 (I10-I16)
   - SNOMED CT concepts must be resolved → ICD codes
   - **Problem**: No safe single-string-to-code mapping; requires validated lookup

#### 2. **Service Condition Flags**
   - Additional mandatory fields for VA patients:
     - SC (Service Connected)  
     - AO (Agent Orange exposure)
     - IR (Radiation exposure)
     - EC (Environmental Contamination)
     - HNC (Head/Neck Cancer)
     - MST (Military Sexual Trauma)
     - CV (Combat Veteran)
     - SHD (Shipboard Hazard & Defense)
   - Each flag is conditional on patient demographics and service history
   - MVP cannot safely infer these; require provider judgment

#### 3. **Duplicate Problem Checking**
   - Cannot add "Hypertension" if already in patient's active problem list
   - Requires fuzzy matching across problem text and diagnosis codes
   - Different times of diagnosis vs. re-entry must be detected

#### 4. **Provider Context Validation**
   - Current user must be a valid clinical provider (DUZ with appropriate role)
   - Cannot be non-provider or administrative user
   - Service/Department assignment must be valid

#### 5. **Lexicon Entry Mapping** (for SNOMED CT)
   - If diagnosis is provided with SNOMED concept notation
   - Must resolve SNOMED CT code → ICD-9 → ICD-10
   - Lexicon file (757.01) lookup required

### VistA's Native Approach: GMPLUTL.CREATE

The safe way to add problems is via the internal utility `CREATE^GMPLUTL` (in GMPLUTL.m), which:

```mumps
CREATE(PL,PLY)  ; Creates a new problem input array, passed by reference
;  Input:
;    PL("PATIENT")               Pointer to Patient #2
;    PL("NARRATIVE")             Text as entered by provider
;    PL("PROVIDER")              Pointer to provider #200
;    Optional:
;    PL("DIAGNOSIS")             Pointer to ICD-9 #80
;    PL("LEXICON")               Pointer to Lexicon #757.01
;    PL("STATUS")                A/I/R
;    PL("SC") / PL("AO") / ... (8 service condition flags)
;    PL("ONSET")                 Internal Date
;    ... and 10 more fields
```

**Why we don't call this from the API:**
1. **Not exposed as an RPC** — designed for internal utility use only
2. **Requires complex array building** — caller must validate ALL 15+ fields
3. **Delegates validation to FileMan** — FileMan errors returned if invalid
4. **No easy wrapper available** — would need custom MUMPS routine in VistA

---

## API Response: Honest Error

### POST /vista/problems — Current Response

```json
{
  "ok": false,
  "error": "Problem creation is not yet implemented in this MVP. VistA problem entry requires ICD-9/ICD-10 diagnosis codes, provider validation, and service condition flags. Please use VistA CPRS or a provider workstation for this task.",
  "hint": "To add problems, use VistA CPRS Chart at the patient encounter screen.",
  "blocker": {
    "reason": "Complex CPOE validation",
    "requiredFields": [
      "DFN (patient)",
      "Text (problem description)",
      "ICD-9/ICD-10 diagnosis code",
      "Provider DUZ",
      "Service conditions (SC, AO, IR, EC, HNC, MST, CV, SHD)",
      "Onset date",
      "Location"
    ],
    "rpcNotAvailable": "GMPLUTL.CREATE requires complex array validation",
    "recommendation": "Use VistA CPRS GUI which handles validation safely"
  }
}
```

---

## How to Add Problems Safely: VistA CPRS

### Step 1: Open Patient in CPRS
```
CPRS Chart → Patient workup screen
Select or search patient by name/DFN
```

### Step 2: Problem List Tab
```
Chart Tree (left side) → "Problems"
  or
Chart Tabs (top) → "Problems" tab
```

### Step 3: New Problem Button
```
Button: "+ Add Problem" or "New"
```

### Step 4: Problem Entry Form
```
Encounter Date: (auto-populated or select)
Problem Description: (free text or code lookup)
ICD Code: (lookup from codeset or auto-suggest)
Onset Date: (when problem started, or "Unknown")
Service Conditions: (SC, AO, IR, EC, etc. — checkboxes)
Status: Active / Inactive / Resolved
Provider: (auto-populated to logged-in user)
```

### Step 5: Verify
CPRS validates all fields before saving:
- Diagnosis code exists  
- Service conditions match patient demographics
- No duplicate active problems
- Provider is authorized

---

## Future Enhancement Path (Phase 10+)

To implement POST /vista/problems safely in a future phase:

### Option A: Full Validation Engine
1. Add ICD-9/ICD-10 code lookup endpoints (GET /vista/diagnosis?q=hypertension)
2. Add patient demographics reader (service history, VA status, age, etc.)
3. Implement duplicate problem detection logic
4. Build diagnosis code scoring/matching algorithm
5. Then expose POST /vista/problems with full validation

### Option B: Simple Free-Text Warning
1. Expose POST with text only (no ICD codes)
2. Return warning: "Problem created without diagnosis code; requires CPRS review"
3. Write problem as "Pending" status until provider adds code
4. Not recommended: risky for medical records

### Option C: Provider-Only API
1. Require provider role check (DUZ must be file 200 entry with provider role)
2. Accept minimal fields (DFN, text, onset)
3. Use hardcoded location (e.g., location 2 = DR OFFICE)
4. Call GMPLUTL.CREATE with defaults for optional fields
5. Still risky: delegates validation to GMPLUTL, which may fail unexpectedly

**Recommended**: Go with **Option A** (full validation engine) in a later phase.

---

## Known Limitations (Current)

| Limitation | Impact | Workaround |
|-----------|--------|-----------|
| No diagnosis code lookup | Cannot safely map text → ICD codes | Use VistA diagnosis picker |
| No service condition inference | Cannot infer SC/AO/IR flags from demographics | Ask provider during CPRS entry |
| No duplicate detection | Could double-enter same problem | CPRS prevents this automatically |
| No provider validation | Cannot check if user is clinical provider | CPRS enforces role-based access |
| No RPC wrapper available | Cannot call GMPLUTL.CREATE directly | Use CPRS GUI |

---

## Testing Locally

To verify the endpoint is correctly returning the "not yet implemented" error:

```bash
# Test 1: Valid DFN and text
curl -X POST http://127.0.0.1:3001/vista/problems \
  -H "Content-Type: application/json" \
  -d '{"dfn":"1","text":"Hypertension"}'

# Expected: returns ok:false with blocker details

# Test 2: Missing DFN
curl -X POST http://127.0.0.1:3001/vista/problems \
  -H "Content-Type: application/json" \
  -d '{"text":"Hypertension"}'

# Expected: returns ok:false, "Missing or non-numeric dfn"

# Test 3: Text too short
curl -X POST http://127.0.0.1:3001/vista/problems \
  -H "Content-Type: application/json" \
  -d '{"dfn":"1","text":"A"}'

# Expected: returns ok:false, "text must be at least 2 characters"
```

---

## References

- **File 9000011**: Problem List (VistA FileMan dictionary)
- **File 80**: ICD-9 Diagnosis Code (obsolete, replaced by ICD-10)
- **File 757.01**: Lexicon (SNOMED CT / ICD mapping)
- **GMPLUTL.m**: Problem Utility Library (VistA source)
- **CPRS**: Computerized Patient Record System (provider GUI)
- **AGENTS.md**: Project onboarding (mentions "MVP-safe" approach)

---

## Project Decision

**Decision**: Return honest "not yet implemented" error rather than implement unsafe/incomplete version.

**Rationale**: VistA problem entry is a clinical decision that must be made by authorized providers with full context. An API endpoint that accepts free-text problem descriptions without diagnosis code validation risks medical record integrity.

**User Impact**: 
- Problem LIST works (read-only via GET /vista/problems)
- Problem CREATION requires CPRS GUI (as designed in VistA)
- API users understand the limitation upfront (honest error)
- No false sense of functionality

---

## Version History

- **Phase 9A** (v1.0): GET /vista/problems implemented (read-only)
- **Phase 9B** (v1.0): POST /vista/problems returns documented "not yet implemented" error
- **Phase 10+** (planned): Full diagnosis code validation + POST implementation
