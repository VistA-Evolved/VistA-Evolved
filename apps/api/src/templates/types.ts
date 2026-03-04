/**
 * Phase 158: Specialty Template & Workflow Studio — Types
 *
 * Template DSL for structured clinical documentation with VistA TIU alignment.
 * Templates are orchestration metadata — clinical truth always lives in VistA.
 */

// ─── Template Core Types ───────────────────────────────────────────

export type TemplateSetting = 'inpatient' | 'outpatient' | 'ed' | 'any';
export type TemplateStatus = 'draft' | 'published' | 'archived';
export type SectionType =
  | 'text'
  | 'checkbox'
  | 'multi-select'
  | 'smart-field'
  | 'table'
  | 'header'
  | 'vitals-grid';
export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'multi-select'
  | 'checkbox'
  | 'radio'
  | 'coded-value';

export interface MappingTarget {
  /** TIU note section this field maps to (e.g., "HPI", "ASSESSMENT") */
  tiuSection?: string;
  /** VistA RPC to read source data (or "integration_pending" with target) */
  vistaReadRpc?: string;
  vistaReadStatus?: 'available' | 'integration_pending';
  /** Billing code suggestion (ICD/CPT) — stored as suggestion only, never auto-coded */
  billingSuggestion?: string;
  /** Freeform mapping note */
  note?: string;
}

export interface TemplateField {
  key: string;
  label: string;
  labelI18nKey?: string;
  fieldType: FieldType;
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
  defaults?: string;
  allowedValues?: string[];
  mappingTarget?: MappingTarget;
  order: number;
}

export interface TemplateSection {
  id: string;
  type: SectionType;
  title: string;
  titleI18nKey?: string;
  order: number;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  fields: TemplateField[];
}

export interface ClinicalTemplate {
  id: string;
  tenantId: string;
  name: string;
  specialty: string;
  setting: TemplateSetting;
  version: number;
  status: TemplateStatus;
  description?: string;
  tags?: string[];
  /** One-click insert sections for speed */
  quickInsertSections?: string[];
  /** Auto-expand rules: complaint tag -> section IDs to expand */
  autoExpandRules?: Record<string, string[]>;
  sections: TemplateSection[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface TemplateVersionEvent {
  id: string;
  templateId: string;
  tenantId: string;
  version: number;
  action: 'created' | 'updated' | 'published' | 'archived' | 'cloned';
  actor: string;
  changeSummary?: string;
  snapshotJson?: string;
  createdAt: string;
}

export interface QuickText {
  id: string;
  tenantId: string;
  key: string;
  text: string;
  tags: string[];
  specialty?: string;
  version: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Note Builder Types ────────────────────────────────────────────

export interface NoteBuilderInput {
  templateId: string;
  /** Field values keyed by field key */
  fieldValues: Record<string, string | string[] | boolean>;
  /** Patient DFN (for VistA data pull where available) */
  dfn?: string;
  /** Provider DUZ */
  duz?: string;
  /** VistA TIU title IEN (if known) */
  tiuTitleIen?: string;
}

export interface NoteBuilderOutput {
  draftText: string;
  mode: 'tiu_draft' | 'local_draft';
  templateId: string;
  templateVersion: number;
  draftId?: string;
  tiuIen?: string;
  migrationTarget?: string;
  sectionsRendered: number;
}

// ─── Specialty Pack Types ──────────────────────────────────────────

export interface SpecialtyPack {
  packId: string;
  name: string;
  specialty: string;
  description: string;
  setting: TemplateSetting;
  templates: Omit<ClinicalTemplate, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>[];
}

// ─── All 45 Specialty Tags ─────────────────────────────────────────

export const SPECIALTY_TAGS = [
  'primary-care',
  'family-medicine',
  'internal-medicine',
  'pediatrics',
  'ob-gyn',
  'emergency-medicine',
  'urgent-care',
  'cardiology',
  'pulmonology',
  'endocrinology',
  'nephrology',
  'neurology',
  'psychiatry',
  'psychology-behavioral',
  'orthopedics',
  'general-surgery',
  'anesthesia',
  'icu-critical-care',
  'dermatology',
  'ophthalmology',
  'ent-otolaryngology',
  'gastroenterology',
  'oncology',
  'hematology',
  'radiology',
  'laboratory',
  'nursing',
  'physical-therapy',
  'rehabilitation',
  'dental',
  'infectious-disease',
  'urology',
  'rheumatology',
  'family-planning',
  'palliative-care',
  'geriatrics',
  'allergy-immunology',
  'vascular-surgery',
  'plastic-surgery',
  'podiatry',
  'nutrition-dietetics',
  'social-work',
  'pharmacy-clinical',
  'wound-care',
  'pain-management',
] as const;

export type SpecialtyTag = (typeof SPECIALTY_TAGS)[number];
