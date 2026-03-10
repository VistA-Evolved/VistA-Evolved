/**
 * Intake OS -- Core Types (Phase 28)
 *
 * FHIR Questionnaire/QuestionnaireResponse-aligned types for the
 * enterprise intake system. All clinical data is "patient-reported draft"
 * until clinician review.
 */

/* ------------------------------------------------------------------ */
/* Session                                                              */
/* ------------------------------------------------------------------ */

export type IntakeSessionStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'clinician_reviewed'
  | 'filed'
  | 'filed_pending_integration'
  | 'expired'
  | 'abandoned';

export type SubjectType = 'patient' | 'proxy';
export type BrainProvider = 'rules' | 'vendor_adapter' | 'llm_constrained';

export interface IntakeContext {
  department?: string;
  specialty?: string;
  visitType?: string;
  chiefComplaint?: string;
  age?: number;
  sex?: string;
  pregnancyPossible?: boolean;
}

export interface IntakeSession {
  id: string;
  patientDfn: string | null;
  appointmentId: string | null;
  subjectType: SubjectType;
  proxyDfn: string | null;
  language: string;
  context: IntakeContext;
  status: IntakeSessionStatus;
  brainProvider: BrainProvider;
  questionnaireResponseVersion: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

/* ------------------------------------------------------------------ */
/* Events (immutable append-only)                                       */
/* ------------------------------------------------------------------ */

export type IntakeEventType =
  | 'session.created'
  | 'session.resumed'
  | 'session.expired'
  | 'question.asked'
  | 'question.answered'
  | 'question.skipped'
  | 'answer.edited'
  | 'navigation.forward'
  | 'navigation.back'
  | 'navigation.jump'
  | 'section.completed'
  | 'intake.submitted'
  | 'intake.save_draft'
  | 'clinician.opened'
  | 'clinician.edited'
  | 'clinician.reviewed'
  | 'clinician.filed'
  | 'clinician.exported'
  | 'summary.generated'
  | 'redflag.triggered'
  | 'sensitivity.withheld';

export type ActorType = 'patient' | 'proxy' | 'clinician' | 'system';

export interface IntakeEvent {
  id: string;
  sessionId: string;
  timestamp: string;
  type: IntakeEventType;
  actor: string;
  actorType: ActorType;
  payload: Record<string, unknown>;
  questionId?: string;
  answerId?: string;
}

/* ------------------------------------------------------------------ */
/* QuestionnaireResponse Snapshot                                        */
/* ------------------------------------------------------------------ */

export interface QRSnapshot {
  id: string;
  sessionId: string;
  version: number;
  contentHash: string;
  questionnaireResponse: QuestionnaireResponse;
  createdAt: string;
  createdBy: string;
}

/* ------------------------------------------------------------------ */
/* FHIR-like Questionnaire types                                        */
/* ------------------------------------------------------------------ */

export interface AnswerOption {
  valueCoding?: {
    code: string;
    display: string;
    display_tl?: string;
  };
  /** Shorthand: value string (resolves to code+display) */
  value?: string;
  /** Shorthand: display label */
  display?: string;
}

export interface EnableWhen {
  question: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'exists';
  answer: unknown;
}

export type QuestionSection =
  | 'demographics'
  | 'chief_complaint'
  | 'hpi'
  | 'ros'
  | 'pmh'
  | 'fh'
  | 'sh'
  | 'medications'
  | 'allergies'
  | 'vitals'
  | 'screening'
  | 'custom'
  /* Extended sections for specialty/department packs */
  | 'consent'
  | 'family_hx'
  | 'triage'
  | 'safety'
  | 'visit_prep'
  | 'social_hx'
  | 'preventive'
  | 'growth'
  | 'development'
  | 'immunizations'
  | 'menstrual_hx'
  | 'ob_hx'
  | 'cardiac_hx'
  | 'functional_status'
  | 'psych_hx'
  | 'substance_use';

export type QuestionType =
  | 'string'
  | 'text'
  | 'integer'
  | 'decimal'
  | 'boolean'
  | 'choice'
  | 'open-choice'
  | 'date'
  | 'dateTime'
  | 'group'
  | 'display';

export interface RedFlagDef {
  condition: string;
  severity: 'info' | 'warning' | 'critical' | 'high' | 'medium';
  message: string;
  message_tl?: string;
}

export interface VistaTarget {
  file?: string;
  field?: string;
  rpc?: string;
  routine?: string;
  noteSection?: string;
  integrationStatus: 'available' | 'pending' | 'not_applicable';
}

export interface ScoringDef {
  answerScores?: Record<string, number>;
  /** Instrument name (e.g. GAD-2, PHQ-2) */
  instrument?: string;
  /** Weight per item for summation scoring */
  itemWeight?: number;
}

export interface QuestionnaireItem {
  linkId: string;
  text: string;
  text_tl?: string;
  type: QuestionType;
  required?: boolean;
  repeats?: boolean;
  section?: QuestionSection;
  answerOption?: AnswerOption[];
  answerValueSet?: string;
  enableWhen?: EnableWhen[];
  enableBehavior?: 'all' | 'any';
  item?: QuestionnaireItem[];
  redFlag?: RedFlagDef;
  scoring?: ScoringDef;
  vistaTarget?: VistaTarget;
  /** Display order within section (pack-level) */
  order?: number;
}

/* ------------------------------------------------------------------ */
/* QuestionnaireResponse                                                */
/* ------------------------------------------------------------------ */

export interface QRAnswer {
  valueString?: string;
  valueInteger?: number;
  valueDecimal?: number;
  valueBoolean?: boolean;
  valueDate?: string;
  valueDateTime?: string;
  valueCoding?: { code: string; display: string };
}

export interface QRItem {
  linkId: string;
  text?: string;
  answer?: QRAnswer[];
  item?: QRItem[];
}

export interface QuestionnaireResponse {
  resourceType: 'QuestionnaireResponse';
  status: 'in-progress' | 'completed' | 'amended';
  authored?: string;
  item: QRItem[];
}

/* ------------------------------------------------------------------ */
/* Draft Clinician Summary                                              */
/* ------------------------------------------------------------------ */

export interface ROSFinding {
  system: string;
  findings: string;
  status: 'positive' | 'negative' | 'not_asked';
}

export interface RedFlagResult {
  flag: string;
  severity: 'info' | 'warning' | 'critical' | 'high' | 'medium';
  triggerQuestionId: string;
  triggerAnswerId: string;
}

export interface Citation {
  statement: string;
  answerIds: string[];
}

export interface DraftClinicianSummary {
  sessionId: string;
  version: number;
  generatedAt: string;
  generatedBy: 'template' | 'llm_constrained';
  sections: {
    hpiNarrative: string;
    reviewOfSystems: ROSFinding[];
    redFlags: RedFlagResult[];
    medicationsDelta: {
      newMedications: string[];
      discontinuedMedications: string[];
      changedMedications: string[];
    };
    allergiesDelta: {
      newAllergies: string[];
      resolvedAllergies: string[];
    };
    contradictions: {
      questionIdA: string;
      questionIdB: string;
      description: string;
    }[];
  };
  draftNoteText: string;
  citations: Citation[];
}

/* ------------------------------------------------------------------ */
/* Pack Types                                                           */
/* ------------------------------------------------------------------ */

export interface ScoringThreshold {
  instrument: string;
  threshold?: number;
  cutoff?: number;
  action: 'flag' | 'escalate' | 'require_followup' | 'flag_for_review';
  message: string;
}

export interface OutputTemplates {
  hpiTemplate?: string;
  rosTemplate?: string;
  noteTemplate?: string;
}

export interface IntakePack {
  packId: string;
  version: string;
  title: string;
  description?: string;
  languages: string[];
  applicableContexts: {
    department?: string[];
    departments?: string[];
    specialty?: string[];
    specialties?: string[];
    visitType?: string[];
    visitTypes?: string[];
    chiefComplaints?: string[];
    ageRange?: { minYears?: number; maxYears?: number };
    sexAtBirth?: string;
  };
  requiredCoverage: string[];
  complaintClusters?: string[];
  specialtyTags?: string[];
  departmentTags?: string[];
  priority: number;
  items: QuestionnaireItem[];
  outputTemplates?: OutputTemplates;
  scoringThresholds?: ScoringThreshold[];
}

/* ------------------------------------------------------------------ */
/* Provider Interfaces                                                  */
/* ------------------------------------------------------------------ */

export interface NextQuestionResult {
  nextItems: QuestionnaireItem[];
  progress: {
    percentComplete: number;
    sectionsComplete: string[];
    requiredCoverageRemaining: string[];
  };
  containedQuestionnaire: {
    resourceType: 'Questionnaire';
    item: QuestionnaireItem[];
  };
  isComplete: boolean;
}

export interface NextQuestionProvider {
  getNext(
    session: IntakeSession,
    qrSoFar: QuestionnaireResponse,
    context: IntakeContext
  ): Promise<NextQuestionResult>;
}

export interface SummaryResult extends DraftClinicianSummary {}

export interface SummaryProvider {
  generate(
    session: IntakeSession,
    qr: QuestionnaireResponse,
    context: IntakeContext
  ): Promise<SummaryResult>;
}

/* ------------------------------------------------------------------ */
/* Filing                                                               */
/* ------------------------------------------------------------------ */

export interface FilingTarget {
  questionLinkId: string;
  vistaTarget: VistaTarget;
  value: unknown;
}

export type FilingResultStatus = 'filed' | 'pending' | 'error' | 'not_applicable';

export interface FilingResult {
  questionLinkId: string;
  status: FilingResultStatus;
  message?: string;
  rpcCalled?: string;
}

/* ------------------------------------------------------------------ */
/* Kiosk                                                                */
/* ------------------------------------------------------------------ */

export interface KioskResumeToken {
  token: string;
  sessionId: string;
  expiresAt: string;
  used: boolean;
}
