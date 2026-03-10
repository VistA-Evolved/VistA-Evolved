/**
 * Phase 390 (W22-P2): Clinical Content Pack Framework v2 -- Types
 *
 * Extends the Phase 158 template engine with order sets, flowsheets, inbox
 * rules, dashboards, and CDS rules. Packs are installable, versioned (semver),
 * and rollbackable per tenant.
 *
 * ADR: docs/decisions/ADR-W22-CONTENT-PACKS.md
 */

import type { TemplateSetting, ClinicalTemplate } from '../templates/types.js';

// --- Order Set Types --------------------------------------------

export interface OrderSetItem {
  /** Internal key for the item within the order set */
  key: string;
  /** Display label */
  label: string;
  /** Order category */
  category:
    | 'medication'
    | 'lab'
    | 'imaging'
    | 'nursing'
    | 'diet'
    | 'activity'
    | 'consult'
    | 'other';
  /** Default ordering details (free-text or structured) */
  defaultDetails?: string;
  /** VistA orderable item IEN (if known) */
  vistaOrderableIen?: string;
  /** LOINC/CPT code (for lab/imaging) */
  code?: string;
  codeSystem?: 'LOINC' | 'CPT' | 'local';
  /** Whether this item is pre-checked by default */
  defaultSelected: boolean;
  /** Display order */
  order: number;
}

export interface OrderSet {
  id: string;
  tenantId: string;
  packId: string | null;
  packVersion: string | null;
  name: string;
  specialty: string;
  setting: TemplateSetting;
  description?: string;
  items: OrderSetItem[];
  tags?: string[];
  status: 'draft' | 'published' | 'archived';
  version: number;
  forked: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- Flowsheet Types --------------------------------------------

export interface FlowsheetColumn {
  key: string;
  label: string;
  unit?: string;
  /** LOINC code for this observation */
  loincCode?: string;
  /** Numeric range for flagging (optional) */
  normalRange?: { low?: number; high?: number };
  /** Data type for input */
  dataType: 'numeric' | 'text' | 'select' | 'boolean' | 'timestamp';
  allowedValues?: string[];
  order: number;
}

export interface Flowsheet {
  id: string;
  tenantId: string;
  packId: string | null;
  packVersion: string | null;
  name: string;
  specialty: string;
  setting: TemplateSetting;
  description?: string;
  /** Columns define the data points collected per row */
  columns: FlowsheetColumn[];
  /** Default frequency label (e.g., "q4h", "q1h", "prn") */
  defaultFrequency?: string;
  tags?: string[];
  status: 'draft' | 'published' | 'archived';
  version: number;
  forked: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- Inbox Rule Types -------------------------------------------

export type InboxTriggerType =
  | 'critical_result'
  | 'order_sign'
  | 'consult_response'
  | 'note_cosign'
  | 'task_assignment'
  | 'custom';

export type InboxRecipientType = 'provider' | 'role' | 'team' | 'department';

export interface InboxRule {
  id: string;
  tenantId: string;
  packId: string | null;
  packVersion: string | null;
  name: string;
  triggerType: InboxTriggerType;
  /** Condition expression (simple key-value matching) */
  conditions: Record<string, string | string[]>;
  /** Who receives the task/alert */
  recipientType: InboxRecipientType;
  recipientValue: string;
  /** Priority */
  priority: 'low' | 'normal' | 'high' | 'critical';
  /** Auto-escalation timeout in minutes (0 = none) */
  escalationMinutes: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

// --- Dashboard KPI Types ----------------------------------------

export interface DashboardKpi {
  key: string;
  label: string;
  /** Data source: which API route or RPC to query */
  dataSource: string;
  /** Aggregation type */
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'latest';
  /** Display format */
  format: 'number' | 'percentage' | 'duration' | 'currency';
  /** Threshold for color coding */
  thresholds?: {
    warning?: number;
    critical?: number;
  };
  order: number;
}

export interface Dashboard {
  id: string;
  tenantId: string;
  packId: string | null;
  packVersion: string | null;
  name: string;
  specialty: string;
  setting: TemplateSetting;
  description?: string;
  kpis: DashboardKpi[];
  tags?: string[];
  status: 'draft' | 'published' | 'archived';
  version: number;
  createdAt: string;
  updatedAt: string;
}

// --- CDS Rule Types ---------------------------------------------

export type CdsHookType =
  | 'patient-view'
  | 'order-sign'
  | 'medication-prescribe'
  | 'encounter-start'
  | 'encounter-discharge'
  | 'custom';

export type CdsCardIndicator = 'info' | 'warning' | 'critical';

export interface CdsRuleCondition {
  /** Field to evaluate (e.g., "patient.age", "order.code", "allergy.substance") */
  field: string;
  /** Operator */
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
  /** Value to compare against */
  value: string | number | boolean | string[];
}

export interface CdsCardSuggestion {
  label: string;
  actions?: Array<{
    type: 'create' | 'update' | 'delete';
    description: string;
    resource?: string;
  }>;
}

export interface CdsRule {
  id: string;
  tenantId: string;
  packId: string | null;
  packVersion: string | null;
  name: string;
  hook: CdsHookType;
  /** Conditions that must ALL be true to fire */
  conditions: CdsRuleCondition[];
  /** Card to display when rule fires */
  card: {
    summary: string;
    detail?: string;
    indicator: CdsCardIndicator;
    source?: { label: string; url?: string };
    suggestions?: CdsCardSuggestion[];
  };
  /** Whether the rule is active */
  enabled: boolean;
  /** Priority for ordering when multiple rules fire */
  priority: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// --- Content Pack v2 (Installable Bundle) -----------------------

export interface PackMigration {
  fromVersion: string;
  toVersion: string;
  description: string;
  /** Transforms applied during upgrade */
  up: PackTransform[];
  /** Transforms applied during rollback */
  down: PackTransform[];
}

export interface PackTransform {
  type:
    | 'add_field'
    | 'remove_field'
    | 'rename_field'
    | 'update_content'
    | 'add_item'
    | 'remove_item';
  target: string;
  details: Record<string, unknown>;
}

export interface ContentPackV2 {
  packId: string;
  version: string;
  name: string;
  specialty: string;
  setting: TemplateSetting;
  description: string;
  country?: string;
  locale?: string;

  /** Prerequisite pack IDs that must be installed first */
  requires?: string[];
  /** Minimum platform version (checked but not enforced currently) */
  minPlatformVersion?: string;

  /** Content sections -- all optional per pack */
  templates?: Omit<ClinicalTemplate, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>[];
  orderSets?: Omit<
    OrderSet,
    'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'packId' | 'packVersion' | 'forked'
  >[];
  flowsheets?: Omit<
    Flowsheet,
    'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'packId' | 'packVersion' | 'forked'
  >[];
  inboxRules?: Omit<
    InboxRule,
    'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'packId' | 'packVersion'
  >[];
  dashboards?: Omit<
    Dashboard,
    'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'packId' | 'packVersion'
  >[];
  cdsRules?: Omit<
    CdsRule,
    'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'packId' | 'packVersion'
  >[];

  /** Migrations between versions */
  migrations?: PackMigration[];
}

// --- Installation Event -----------------------------------------

export type PackInstallAction = 'install' | 'upgrade' | 'rollback' | 'uninstall';

export interface PackInstallEvent {
  id: string;
  tenantId: string;
  packId: string;
  packVersion: string;
  action: PackInstallAction;
  actor: string;
  previousVersion?: string;
  itemsCreated: number;
  itemsUpdated: number;
  itemsRemoved: number;
  status: 'success' | 'failed' | 'rolled_back';
  error?: string;
  createdAt: string;
}

// --- Pack Install Preview ---------------------------------------

export interface PackInstallPreview {
  packId: string;
  packVersion: string;
  action: PackInstallAction;
  templates: { name: string; action: 'create' | 'update' | 'skip' }[];
  orderSets: { name: string; action: 'create' | 'update' | 'skip' }[];
  flowsheets: { name: string; action: 'create' | 'update' | 'skip' }[];
  inboxRules: { name: string; action: 'create' | 'update' | 'skip' }[];
  dashboards: { name: string; action: 'create' | 'update' | 'skip' }[];
  cdsRules: { name: string; action: 'create' | 'update' | 'skip' }[];
  missingDependencies: string[];
  warnings: string[];
}
