# AI Gateway Plan — Governed Clinical AI Integration

> **Phase 20 — VistA-First Grounding**
> The AI Gateway is a **governed subsystem** that routes clinical AI requests
> through safety checks, audit logging, and human-in-the-loop controls.
> VistA remains the clinical engine. AI augments — it does NOT replace —
> clinical decision-making.

---

## 1. Core Principles

1. **VistA is the source of truth** — AI reads from VistA, never writes directly
2. **Human-in-the-loop** — AI suggestions require clinician review before action
3. **Audit everything** — every AI query, prompt, response, and clinician decision
4. **Open-weight models first** — prefer open models (MedGemma, Llama) over closed APIs
5. **No PHI in external calls** — de-identify before sending to cloud AI; on-premises for full PHI
6. **FDA awareness** — any AI that influences diagnosis or treatment may be a regulated device

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Clinician UI (CPRS Replica)                                     │
│                                                                  │
│  [Medication Reconciliation Assist]  [Note Summarization]        │
│  [Differential Diagnosis Suggest]    [Order Set Recommend]       │
│  [Ambient Scribe Preview]            [Coding Assist]             │
│                                                                  │
│  All suggestions shown with confidence + provenance              │
│  Clinician must ACCEPT / REJECT / MODIFY before action           │
└──────────────────────┬───────────────────────────────────────────┘
                       │ API Request (with session + audit context)
┌──────────────────────▼───────────────────────────────────────────┐
│  AI Gateway (apps/api/src/ai-gateway/)                           │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Request     │  │ Safety      │  │ Model       │             │
│  │ Router      │  │ Layer       │  │ Registry    │             │
│  │             │  │             │  │             │             │
│  │ - Classify  │  │ - PHI scan  │  │ - MedGemma  │             │
│  │   request   │  │ - Prompt    │  │ - Llama3    │             │
│  │ - Route to  │  │   sanitize  │  │ - GPT-4o    │             │
│  │   model     │  │ - Response  │  │ - Claude    │             │
│  │ - Audit log │  │   validate  │  │ - Custom    │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         └────────────────┼────────────────┘                     │
│                          │                                       │
│  ┌───────────────────────▼──────────────────────────────────┐   │
│  │ RAG Pipeline                                              │   │
│  │                                                           │   │
│  │ - Patient context from VistA (via RPCs, never direct FM)  │   │
│  │ - Terminology service (ICD-10, SNOMED, RxNorm, LOINC)    │   │
│  │ - Clinical guidelines (VA/DoD CPGs, UpToDate links)       │   │
│  │ - Formulary data (from VistA pharmacy files)              │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  VistA (Source of Truth)                                         │
│                                                                  │
│  - Patient data via RPCs (demographics, meds, problems, labs)    │
│  - Terminology lookups (LEX, ICD, CPT files)                     │
│  - Formulary/drug data (NDF, pharmacy files)                     │
│  - Order checks (existing CPRS safety mechanism)                 │
│  - AI does NOT write to VistA — clinician approves, platform     │
│    writes via existing RPC write-back paths                      │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. AI Model Registry

| Model                  | Type                 | Deployment      | Use Cases                                                | PHI Handling                   |
| ---------------------- | -------------------- | --------------- | -------------------------------------------------------- | ------------------------------ |
| **MedGemma** (Google)  | Open-weight, medical | On-premises GPU | Differential diagnosis, med reconciliation, clinical Q&A | Safe — runs locally            |
| **Llama 3** (Meta)     | Open-weight, general | On-premises GPU | Note summarization, coding assist, general NLP           | Safe — runs locally            |
| **GPT-4o** (OpenAI)    | Commercial, cloud    | API call        | Complex reasoning, multi-step clinical logic             | **Requires de-identification** |
| **Claude** (Anthropic) | Commercial, cloud    | API call        | Documentation assist, guideline synthesis                | **Requires de-identification** |
| **Whisper** (OpenAI)   | Open-weight, speech  | On-premises GPU | Ambient scribe (speech-to-text)                          | Safe — runs locally            |
| **Custom fine-tuned**  | Site-specific        | On-premises     | Site-specific protocols, local formulary                 | Safe — runs locally            |

### Model Selection Policy

1. **PHI-bearing queries** → open-weight models on-premises ONLY
2. **De-identified queries** → may use cloud models with audit
3. **Ambient scribe (audio)** → must run on-premises (audio is PHI)
4. **Billing/coding** → may use cloud after de-identification

---

## 4. AI Use Cases × VistA Data Sources

### 4.1 Clinical Decision Support (CDS)

| Use Case                            | VistA Data Needed              | RPCs                                                        | AI Model       |
| ----------------------------------- | ------------------------------ | ----------------------------------------------------------- | -------------- |
| Differential diagnosis assist       | Problems, vitals, labs, meds   | `ORQQPL`, `ORQQVI VITALS`, `ORWLRR INTERIM`, `ORWPS ACTIVE` | MedGemma       |
| Drug interaction warning (enhanced) | Active meds, allergies         | `ORWPS ACTIVE`, `ORQQAL LIST`                               | MedGemma       |
| Order set recommendation            | Active problems, recent orders | `ORQQPL`, `ORWORR AGET`                                     | MedGemma/Llama |
| Lab result interpretation           | Lab data, reference ranges     | `ORWLRR INTERIM`                                            | MedGemma       |

### 4.2 Documentation Assist

| Use Case                       | VistA Data Needed | RPCs                  | AI Model        |
| ------------------------------ | ----------------- | --------------------- | --------------- |
| Ambient scribe (speech → note) | — (audio input)   | —                     | Whisper + Llama |
| Note summarization             | Note text         | `TIU GET RECORD TEXT` | Llama 3         |
| Discharge summary draft        | All clinical data | Multiple RPCs         | MedGemma        |

### 4.3 Revenue Cycle / Coding

| Use Case                   | VistA Data Needed       | RPCs                                 | AI Model               |
| -------------------------- | ----------------------- | ------------------------------------ | ---------------------- |
| ICD-10 code suggestion     | Problems, notes         | `ORQQPL`, `TIU GET RECORD TEXT`      | GPT-4o (de-identified) |
| CPT code recommendation    | Orders, procedures      | `ORWORR AGET`                        | GPT-4o (de-identified) |
| Documentation completeness | Notes vs. problems list | `TIU DOCUMENTS BY CONTEXT`, `ORQQPL` | Llama 3                |

---

## 5. Safety Layer

Every AI request passes through the safety layer:

### Pre-processing (before model call)

1. **PHI scan** — detect and flag PHI in prompts headed for cloud models
2. **De-identification** — strip names, dates, MRNs for cloud-bound queries
3. **Prompt sanitization** — remove injection attempts, enforce prompt templates
4. **Rate limiting** — prevent AI request floods (per-user, per-session)

### Post-processing (after model response)

1. **Hallucination guard** — cross-reference AI suggestions against VistA data
2. **Terminology validation** — verify ICD/SNOMED/RxNorm codes exist in VistA
3. **Confidence scoring** — tag each suggestion with confidence level
4. **Citation requirement** — AI must cite evidence sources (guidelines, patient data)

### Human-in-the-loop enforcement

- AI suggestions are **always presented for review**, never auto-executed
- Clinician must explicitly ACCEPT, REJECT, or MODIFY
- Every decision is audit-logged with: suggestion, action taken, clinician DUZ, timestamp
- Rejected/modified suggestions feed back into model improvement

---

## 6. Terminology Service

The AI Gateway includes a terminology service for standardized coding:

| Terminology | VistA Source  | FileMan File                  | Use                     |
| ----------- | ------------- | ----------------------------- | ----------------------- |
| ICD-10-CM   | Lexicon (LEX) | #80 ICD DIAGNOSIS             | Diagnosis coding        |
| ICD-10-PCS  | Lexicon (LEX) | #80.1 ICD OPERATION/PROCEDURE | Procedure coding        |
| SNOMED CT   | Lexicon (LEX) | #757.01 EXPRESSIONS           | Clinical concepts       |
| RxNorm      | NDF (PSN)     | #50.6 VA GENERIC              | Drug identification     |
| LOINC       | Lab (LR)      | #95.3 LOINC                   | Lab test identification |
| CPT         | CPT (ICPT)    | #81 CPT                       | Procedure billing       |

---

## 7. Audit Requirements

Every AI interaction produces an audit record:

```json
{
  "action": "ai.query",
  "status": "success",
  "actor": { "duz": "87", "name": "PROVIDER,CLYDE WV" },
  "detail": {
    "useCase": "differential-diagnosis",
    "model": "medgemma-4b",
    "deployment": "on-premises",
    "phiPresent": true,
    "deIdentified": false,
    "promptTokens": 1250,
    "responseTokens": 340,
    "latencyMs": 2300,
    "confidenceScore": 0.82,
    "clinicianAction": "accepted-with-modification",
    "patientDfn": "1"
  }
}
```

---

## 8. What NOT to Build Yet

1. **AI-driven ordering** — too high-risk; order safety requires full order checks first
2. **Autonomous clinical actions** — violates human-in-the-loop principle
3. **Image interpretation** — FDA Class II medical device territory; defer to radiologists
4. **Predictive alerts without validation** — must prove accuracy before deployment
5. **Cloud PHI without BAA** — no Business Associate Agreement = no PHI in cloud

---

## 9. Implementation Roadmap

| Step | Description                                               | Priority | Phase     |
| ---- | --------------------------------------------------------- | -------- | --------- |
| 1    | Document AI Gateway architecture (this doc)               | **Done** | Phase 20  |
| 2    | Build model registry data structure                       | LOW      | Phase 22+ |
| 3    | Build request router + audit middleware                   | LOW      | Phase 22+ |
| 4    | Integrate MedGemma for clinical Q&A                       | LOW      | Phase 23+ |
| 5    | Build RAG pipeline (patient context from VistA RPCs)      | LOW      | Phase 23+ |
| 6    | Add terminology service (VistA file-backed)               | LOW      | Phase 23+ |
| 7    | Build safety layer (PHI scan, de-id, hallucination guard) | LOW      | Phase 24+ |
| 8    | Ambient scribe (Whisper integration)                      | LOW      | Phase 25+ |
| 9    | CDS use cases (differential dx, med reconciliation)       | LOW      | Phase 25+ |
| 10   | Coding assist (ICD/CPT suggestion)                        | LOW      | Phase 26+ |
