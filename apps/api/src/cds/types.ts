/**
 * Phase 395 (W22-P7): CDS Hooks + SMART Launch -- Types
 *
 * Implements HL7 CDS Hooks 1.0 specification:
 *   - CDS Services discovery endpoint
 *   - Hook invocation with prefetch
 *   - Card responses (info, warning, critical, suggestion, app link)
 *   - SMART on FHIR app launch context
 *
 * Also: native CDS rule engine for in-process evaluation,
 * and CQF Ruler adapter for external CQL-based rules.
 *
 * Dependencies:
 *   - Phase 390 (W22-P2): ContentPackV2 CdsRule definitions
 *   - Phase 35: Policy engine for authorization
 *   - ADR-W22-CDS-ARCH: Hybrid native + CQF Ruler architecture
 */

// -- CDS Hooks 1.0 Types (HL7 spec) --

export type CdsHookType =
  | 'patient-view'
  | 'order-select'
  | 'order-sign'
  | 'order-dispatch'
  | 'encounter-start'
  | 'encounter-discharge'
  | 'appointment-book'
  | 'medication-prescribe';

export interface CdsService {
  id: string;
  hook: CdsHookType;
  title: string;
  description: string;
  /** Prefetch template (FHIR path expressions) */
  prefetch?: Record<string, string>;
  /** Whether this service uses an external CQF Ruler */
  useCqfRuler?: boolean;
}

export interface CdsHookRequest {
  hookInstance: string;
  hook: CdsHookType;
  /** FHIR server URL */
  fhirServer?: string;
  /** OAuth2 access token for FHIR server */
  fhirAuthorization?: {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    subject: string;
  };
  context: Record<string, unknown>;
  prefetch?: Record<string, unknown>;
}

export type CardIndicator = 'info' | 'warning' | 'critical';

export type CardSource = {
  label: string;
  url?: string;
  icon?: string;
};

export interface CdsSuggestion {
  label: string;
  uuid?: string;
  isRecommended?: boolean;
  actions?: CdsSuggestionAction[];
}

export interface CdsSuggestionAction {
  type: 'create' | 'update' | 'delete';
  description: string;
  resource?: Record<string, unknown>;
}

export interface CdsLink {
  label: string;
  url: string;
  type: 'absolute' | 'smart';
  appContext?: string;
}

export interface CdsCard {
  uuid?: string;
  summary: string;
  detail?: string;
  indicator: CardIndicator;
  source: CardSource;
  suggestions?: CdsSuggestion[];
  selectionBehavior?: 'at-most-one' | 'any';
  overrideReasons?: Array<{ code: string; display: string }>;
  links?: CdsLink[];
}

export interface CdsHookResponse {
  cards: CdsCard[];
  systemActions?: CdsSuggestionAction[];
  /** Extension: service ID that produced these cards */
  extension?: Record<string, unknown>;
}

// -- SMART on FHIR App Launch --

export interface SmartApp {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  launchUrl: string;
  /** SMART scopes requested */
  scopes: string[];
  /** Icon URL */
  iconUrl: string | null;
  /** Allowed hook contexts for launch */
  allowedHooks: CdsHookType[];
  /** Active / disabled */
  enabled: boolean;
  /** Client ID for SMART OAuth */
  clientId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SmartLaunchContext {
  /** Launch token */
  launch: string;
  /** Patient context */
  patientDfn: string;
  /** Encounter context (if applicable) */
  encounterIen: string | null;
  /** User context */
  userDuz: string;
  /** FHIR server endpoint */
  fhirServerUrl: string;
  /** Intent (e.g., "order-sign") */
  intent: string | null;
  createdAt: string;
  expiresAt: string;
}

// -- Native CDS Rule Engine --

export type RuleConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'contains'
  | 'not_contains'
  | 'in'
  | 'not_in'
  | 'exists'
  | 'not_exists'
  | 'regex';

export interface RuleCondition {
  field: string;
  operator: RuleConditionOperator;
  value: unknown;
}

export interface CdsRuleDefinition {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  /** Which hook triggers this rule */
  hook: CdsHookType;
  /** Priority (lower = evaluated first) */
  priority: number;
  /** Conditions (all must be true -- AND logic) */
  conditions: RuleCondition[];
  /** Card to produce when conditions match */
  cardTemplate: Omit<CdsCard, 'uuid'>;
  /** Whether this rule is active */
  enabled: boolean;
  /** Source: native (in-process) or cqf (external CQL) */
  engine: 'native' | 'cqf';
  /** CQL library name (if engine=cqf) */
  cqlLibraryName: string | null;
  cqlLibraryVersion: string | null;
  /** Content pack ID that installed this rule */
  contentPackId: string | null;
  createdAt: string;
  updatedAt: string;
}

// -- CDS Feedback (HL7 CDS Hooks spec) --

export interface CdsFeedback {
  card: string; // card UUID
  outcome: 'accepted' | 'overridden';
  overrideReason?: { code: string; display: string };
  outcomeTimestamp: string;
}

// -- CDS Dashboard Stats --

export interface CdsDashboardStats {
  totalServices: number;
  totalRules: number;
  enabledRules: number;
  invocationsToday: number;
  cardsGeneratedToday: number;
  overridesToday: number;
  smartAppsRegistered: number;
  smartLaunchesToday: number;
}
