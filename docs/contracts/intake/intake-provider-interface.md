# Intake Provider Interface — Phase 28

## Overview

The Intake OS uses a pluggable "brain" architecture. Three provider types
exist; the default (rules) is fully deterministic and functional. The other
two are stubs for future integration.

## Provider Selection

Environment variable: `INTAKE_BRAIN_PROVIDER`

- `rules` (DEFAULT) — deterministic, pack-driven
- `vendor_adapter` — stub; requires vendor API keys
- `llm_constrained` — stub/pilot; strictly constrained

## Interface: NextQuestionProvider

```typescript
interface NextQuestionContext {
  sessionId: string;
  department?: string;
  specialty?: string;
  visitType?: string;
  chiefComplaint?: string;
  age?: number;
  sex?: string;
  pregnancyPossible?: boolean;
  language: string;
}

interface NextQuestionResult {
  /** FHIR Questionnaire items to render next */
  nextItems: QuestionnaireItem[];
  /** Progress indicator */
  progress: {
    percentComplete: number;
    sectionsComplete: string[];
    requiredCoverageRemaining: string[];
  };
  /** Contained Questionnaire fragment for LHC-Forms renderer */
  containedQuestionnaire: {
    resourceType: 'Questionnaire';
    item: QuestionnaireItem[];
  };
  /** True when all required coverage is met */
  isComplete: boolean;
}

interface NextQuestionProvider {
  /**
   * Given the session state and answers so far, determine what to ask next.
   * Must be deterministic for the rules provider.
   */
  getNext(
    session: IntakeSession,
    questionnaireResponseSoFar: QuestionnaireResponse,
    context: NextQuestionContext
  ): Promise<NextQuestionResult>;
}
```

## Interface: SummaryProvider

```typescript
interface SummaryResult {
  hpiNarrative: string;
  reviewOfSystems: { system: string; findings: string; status: string }[];
  redFlags: {
    flag: string;
    severity: string;
    triggerQuestionId: string;
    triggerAnswerId: string;
  }[];
  medicationsDelta: {
    newMedications: string[];
    discontinuedMedications: string[];
    changedMedications: string[];
  };
  allergiesDelta: { newAllergies: string[]; resolvedAllergies: string[] };
  contradictions: { questionIdA: string; questionIdB: string; description: string }[];
  draftNoteText: string;
  citations: { statement: string; answerIds: string[] }[];
  generatedBy: 'template' | 'llm_constrained';
}

interface SummaryProvider {
  /**
   * Generate a clinician-facing draft summary from completed intake.
   * Template provider is default; LLM provider is optional.
   */
  generate(
    session: IntakeSession,
    questionnaireResponse: QuestionnaireResponse,
    context: NextQuestionContext
  ): Promise<SummaryResult>;
}
```

## Interface: TranslatorProvider (optional)

```typescript
interface TranslatorProvider {
  /**
   * Translate question text to target language.
   * Must NOT mix languages on the same screen.
   * Pack-provided translations are preferred over dynamic translation.
   */
  translate(text: string, fromLanguage: string, toLanguage: string): Promise<string>;
}
```

## Provider Implementations

### RulesNextQuestionProvider (DEFAULT)

- Uses Pack registry + Context Resolver
- Deterministic: same inputs always produce same output
- Resolves packs by context, iterates sections in order
- Evaluates `enableWhen` conditions
- Tracks required coverage completion
- No external API calls; no network; pure logic

### VendorAdapterProvider (STUB)

- OFF unless `INTAKE_VENDOR_API_KEY` is set
- Adapter pattern: converts our session/QR format to vendor API format
- Must never be hardwired to one specific vendor
- Returns vendor response converted back to our NextQuestionResult
- All calls audited

### LLMConstrainedProvider (STUB/PILOT)

- May ONLY rank eligible next questions from the pack library
- CANNOT invent new medical questions
- Must cite which answers caused the next-question choice in audit
- Requires `INTAKE_LLM_API_KEY` + `INTAKE_LLM_ENABLED=true`
- Falls back to rules provider if LLM fails or is disabled
- All LLM interactions logged (prompt + response, PHI-redacted)

### TemplateSummaryProvider (DEFAULT)

- Uses pack-defined `outputTemplates` (Mustache-like)
- Deterministic text generation from QR answers
- Evaluates red flag conditions
- Detects contradictions by comparing answer pairs
- Computes medication/allergy deltas against VistA baseline

### LLMSummaryProvider (OPTIONAL)

- Behind `INTAKE_LLM_SUMMARY_ENABLED=true` flag
- Grounded in QuestionnaireResponse (no hallucination)
- Must output citations mapping each statement to answer IDs
- Must never add facts not present in QR
- Falls back to template provider on failure

## Safety Constraints

1. LLM providers NEVER generate diagnosis or treatment recommendations
2. LLM providers NEVER have direct VistA write access
3. All provider outputs are "patient-reported draft" - clinician must review
4. Provider selection is logged in IntakeEvent for audit trail
5. Provider responses are hash-verified against QR input for replay
