/**
 * HL7v2 Message Template Library -- Types
 *
 * Phase 319 (W14-P3): Versioned message templates with conformance profiles.
 *
 * Templates extend the core message pack system by adding:
 * - Version tracking (semver)
 * - Conformance profiles (IHE, HL7 profiles)
 * - Segment templates with field-level constraints
 * - Custom validation rules per template
 */

/* ------------------------------------------------------------------ */
/*  Conformance Profiles                                               */
/* ------------------------------------------------------------------ */

/** IHE or HL7 conformance profile reference */
export interface ConformanceProfile {
  /** Profile ID (e.g., "IHE-PAM-ITI-31", "HL7-2.5.1-ADT") */
  id: string;
  /** Profile name */
  name: string;
  /** Profile source (IHE, HL7, custom) */
  source: 'IHE' | 'HL7' | 'custom';
  /** Profile version */
  version: string;
  /** URL to profile specification */
  specUrl?: string;
}

/** Well-known conformance profiles */
export const WELL_KNOWN_PROFILES: ConformanceProfile[] = [
  {
    id: 'IHE-PAM-ITI-31',
    name: 'IHE PAM ITI-31 Patient Encounter Management',
    source: 'IHE',
    version: '2.0',
    specUrl: 'https://profiles.ihe.net/ITI/TF/Volume2/ITI-31.html',
  },
  {
    id: 'IHE-PAM-ITI-30',
    name: 'IHE PAM ITI-30 Patient Identity Management',
    source: 'IHE',
    version: '2.0',
    specUrl: 'https://profiles.ihe.net/ITI/TF/Volume2/ITI-30.html',
  },
  {
    id: 'IHE-SWF-RAD-4',
    name: 'IHE SWF RAD-4 Procedure Scheduled',
    source: 'IHE',
    version: '3.0',
    specUrl: 'https://profiles.ihe.net/RAD/Scheduled-Workflow/',
  },
  {
    id: 'IHE-LAB-LTW-LAB-1',
    name: 'IHE LAB LTW Lab-1 Order Placer',
    source: 'IHE',
    version: '2.0',
  },
  { id: 'HL7-251-ADT', name: 'HL7 v2.5.1 ADT Messages', source: 'HL7', version: '2.5.1' },
  { id: 'HL7-251-ORM', name: 'HL7 v2.5.1 Order Messages', source: 'HL7', version: '2.5.1' },
  { id: 'HL7-251-ORU', name: 'HL7 v2.5.1 Result Messages', source: 'HL7', version: '2.5.1' },
  { id: 'HL7-251-SIU', name: 'HL7 v2.5.1 Scheduling Messages', source: 'HL7', version: '2.5.1' },
];

/* ------------------------------------------------------------------ */
/*  Field Constraints                                                  */
/* ------------------------------------------------------------------ */

/** Optionality of a field in a segment template */
export type FieldOptionality = 'R' | 'RE' | 'O' | 'C' | 'X';

/** Data type of a field */
export type Hl7DataType =
  | 'ST'
  | 'TX'
  | 'FT'
  | 'NM'
  | 'SI'
  | 'ID'
  | 'IS'
  | 'DT'
  | 'TM'
  | 'DTM'
  | 'TS'
  | 'CWE'
  | 'CE'
  | 'CNE'
  | 'XPN'
  | 'XAD'
  | 'XTN'
  | 'XCN'
  | 'XON'
  | 'CX'
  | 'EI'
  | 'HD'
  | 'PL'
  | 'MSG'
  | 'VID'
  | 'PT'
  | 'varies';

/** Constraint for a single field in a segment */
export interface FieldConstraint {
  /** Field position (1-based) */
  position: number;
  /** Field name */
  name: string;
  /** Optionality: R=Required, RE=Required but may be Empty, O=Optional, C=Conditional, X=Not used */
  optionality: FieldOptionality;
  /** HL7 data type */
  dataType: Hl7DataType;
  /** Max length (0 = unlimited) */
  maxLength?: number;
  /** Fixed value constraint */
  fixedValue?: string;
  /** Value set / table number */
  tableId?: string;
  /** Description */
  description?: string;
}

/* ------------------------------------------------------------------ */
/*  Segment Templates                                                  */
/* ------------------------------------------------------------------ */

/** Segment optionality in a message template */
export type SegmentUsage = 'R' | 'RE' | 'O' | 'C' | 'X';

/** Template for a single HL7 segment */
export interface SegmentTemplate {
  /** Segment ID (e.g., "MSH", "PID", "OBR") */
  segmentId: string;
  /** Usage in this template */
  usage: SegmentUsage;
  /** Minimum repetitions (0 = optional) */
  minReps: number;
  /** Maximum repetitions (0 = unlimited) */
  maxReps: number;
  /** Field-level constraints */
  fields: FieldConstraint[];
  /** Description of this segment's purpose in this template */
  description?: string;
}

/* ------------------------------------------------------------------ */
/*  Message Templates                                                  */
/* ------------------------------------------------------------------ */

/** Status of a message template */
export type TemplateStatus = 'draft' | 'active' | 'deprecated' | 'archived';

/** Tenant ownership for a template */
export type TemplateScope = 'system' | 'tenant';

/** A versioned message template with conformance profiles */
export interface MessageTemplate {
  /** Unique template ID */
  id: string;
  /** Template name */
  name: string;
  /** Description */
  description: string;
  /** HL7v2 message type (e.g., "ADT^A01", "ORM^O01") */
  messageType: string;
  /** HL7v2 version (e.g., "2.5.1") */
  hl7Version: string;
  /** Semantic version of this template */
  templateVersion: string;
  /** Status */
  status: TemplateStatus;
  /** Scope: system (built-in) or tenant (custom) */
  scope: TemplateScope;
  /** Tenant ID (null for system scope) */
  tenantId: string | null;
  /** Conformance profiles this template adheres to */
  profiles: ConformanceProfile[];
  /** Segment templates (ordered) */
  segments: SegmentTemplate[];
  /** ID of the message pack this template extends (if any) */
  packId?: string;
  /** Created timestamp */
  createdAt: string;
  /** Updated timestamp */
  updatedAt: string;
  /** Created by user ID */
  createdBy: string;
  /** Tags for search/filtering */
  tags: string[];
}

/* ------------------------------------------------------------------ */
/*  Template Validation                                                */
/* ------------------------------------------------------------------ */

/** Result of validating a message against a template */
export interface TemplateValidationResult {
  /** Template used for validation */
  templateId: string;
  /** Overall validity */
  valid: boolean;
  /** Total checks performed */
  checksPerformed: number;
  /** Issues found */
  issues: TemplateValidationIssue[];
  /** Error count */
  errorCount: number;
  /** Warning count */
  warningCount: number;
  /** Conformance profiles checked */
  profilesChecked: string[];
}

/** An issue found during template validation */
export interface TemplateValidationIssue {
  /** Severity */
  severity: 'error' | 'warning' | 'info';
  /** Category */
  category: 'segment' | 'field' | 'conformance' | 'structure';
  /** Segment reference (e.g., "PID", "OBR[2]") */
  segmentRef?: string;
  /** Field reference (e.g., "PID-3", "OBR[2]-4") */
  fieldRef?: string;
  /** Rule that triggered */
  ruleCode: string;
  /** Human-readable message */
  message: string;
  /** Profile ID (for conformance issues) */
  profileId?: string;
}
