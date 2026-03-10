/**
 * Department RBAC Templates -- Phase 348
 *
 * Provides department-scoped role templates that constrain RBAC grants.
 * Templates define which actions are available per department type + role
 * combination. Integrates with the existing ABAC engine (Phase 340) --
 * department templates DENY or CONSTRAIN, never grant beyond RBAC.
 *
 * Pattern: RBAC allows by role -> Department template constrains by
 * department membership -> ABAC further constrains by attributes.
 */

import { randomUUID } from 'node:crypto';
import type { DepartmentType } from '../services/facility-service.js';

// --- Types -----------------------------------------------

export type DeptRoleAction =
  | 'view_patient'
  | 'edit_patient'
  | 'write_orders'
  | 'sign_orders'
  | 'administer_meds'
  | 'view_imaging'
  | 'order_imaging'
  | 'view_labs'
  | 'order_labs'
  | 'write_notes'
  | 'sign_notes'
  | 'view_schedule'
  | 'manage_schedule'
  | 'triage'
  | 'discharge'
  | 'admit'
  | 'transfer'
  | 'prescribe'
  | 'dispense'
  | 'view_vitals'
  | 'record_vitals'
  | 'manage_department'
  | 'view_reports'
  | 'manage_templates'
  | 'view_billing'
  | 'manage_billing'
  | 'telehealth_initiate'
  | 'break_glass';

export interface DeptRoleTemplate {
  id: string;
  tenantId: string;
  name: string;
  departmentType: DepartmentType;
  role: string;
  allowedActions: DeptRoleAction[];
  deniedActions: DeptRoleAction[];
  constraints: Record<string, unknown>;
  isDefault: boolean;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface DeptRoleMembership {
  id: string;
  tenantId: string;
  userId: string;
  departmentId: string;
  templateId: string;
  grantedBy: string;
  grantedAt: string;
  expiresAt: string | null;
  status: 'active' | 'revoked' | 'expired';
}

export interface DeptAccessDecision {
  allowed: boolean;
  action: DeptRoleAction;
  departmentId: string;
  templateId: string | null;
  reason: string;
  constraints: Record<string, unknown>;
}

// --- Default Templates per Department Type ---------------

const DEFAULT_TEMPLATES: Array<{
  departmentType: DepartmentType;
  role: string;
  allowedActions: DeptRoleAction[];
  deniedActions: DeptRoleAction[];
}> = [
  // Emergency Department
  {
    departmentType: 'emergency',
    role: 'provider',
    allowedActions: [
      'view_patient',
      'edit_patient',
      'write_orders',
      'sign_orders',
      'view_imaging',
      'order_imaging',
      'view_labs',
      'order_labs',
      'write_notes',
      'sign_notes',
      'triage',
      'discharge',
      'admit',
      'prescribe',
      'view_vitals',
      'record_vitals',
      'view_reports',
      'break_glass',
    ],
    deniedActions: ['manage_billing', 'manage_department'],
  },
  {
    departmentType: 'emergency',
    role: 'nurse',
    allowedActions: [
      'view_patient',
      'edit_patient',
      'view_imaging',
      'view_labs',
      'write_notes',
      'triage',
      'view_vitals',
      'record_vitals',
      'administer_meds',
      'view_schedule',
    ],
    deniedActions: ['sign_orders', 'prescribe', 'manage_billing', 'manage_department'],
  },
  // Inpatient
  {
    departmentType: 'inpatient',
    role: 'provider',
    allowedActions: [
      'view_patient',
      'edit_patient',
      'write_orders',
      'sign_orders',
      'view_imaging',
      'order_imaging',
      'view_labs',
      'order_labs',
      'write_notes',
      'sign_notes',
      'discharge',
      'admit',
      'transfer',
      'prescribe',
      'view_vitals',
      'record_vitals',
      'view_reports',
    ],
    deniedActions: ['manage_billing'],
  },
  {
    departmentType: 'inpatient',
    role: 'nurse',
    allowedActions: [
      'view_patient',
      'edit_patient',
      'view_imaging',
      'view_labs',
      'write_notes',
      'view_vitals',
      'record_vitals',
      'administer_meds',
      'view_schedule',
    ],
    deniedActions: ['sign_orders', 'prescribe', 'manage_billing'],
  },
  // Outpatient / Primary Care
  {
    departmentType: 'outpatient',
    role: 'provider',
    allowedActions: [
      'view_patient',
      'edit_patient',
      'write_orders',
      'sign_orders',
      'view_imaging',
      'order_imaging',
      'view_labs',
      'order_labs',
      'write_notes',
      'sign_notes',
      'prescribe',
      'view_vitals',
      'record_vitals',
      'view_schedule',
      'manage_schedule',
      'telehealth_initiate',
      'view_reports',
    ],
    deniedActions: ['admit', 'transfer', 'manage_billing'],
  },
  {
    departmentType: 'primary_care',
    role: 'provider',
    allowedActions: [
      'view_patient',
      'edit_patient',
      'write_orders',
      'sign_orders',
      'view_imaging',
      'order_imaging',
      'view_labs',
      'order_labs',
      'write_notes',
      'sign_notes',
      'prescribe',
      'view_vitals',
      'record_vitals',
      'view_schedule',
      'manage_schedule',
      'telehealth_initiate',
      'view_reports',
    ],
    deniedActions: ['admit', 'transfer', 'manage_billing'],
  },
  // Radiology
  {
    departmentType: 'radiology',
    role: 'provider',
    allowedActions: [
      'view_patient',
      'view_imaging',
      'order_imaging',
      'write_notes',
      'sign_notes',
      'view_labs',
      'view_vitals',
      'view_reports',
      'manage_templates',
    ],
    deniedActions: ['prescribe', 'admit', 'discharge', 'manage_billing'],
  },
  // Laboratory
  {
    departmentType: 'laboratory',
    role: 'provider',
    allowedActions: [
      'view_patient',
      'view_labs',
      'order_labs',
      'write_notes',
      'sign_notes',
      'view_vitals',
      'view_reports',
      'manage_templates',
    ],
    deniedActions: ['prescribe', 'admit', 'discharge', 'order_imaging', 'manage_billing'],
  },
  // Pharmacy
  {
    departmentType: 'pharmacy',
    role: 'pharmacist',
    allowedActions: [
      'view_patient',
      'view_labs',
      'view_vitals',
      'dispense',
      'view_reports',
      'write_notes',
    ],
    deniedActions: [
      'sign_orders',
      'admit',
      'discharge',
      'order_imaging',
      'triage',
      'manage_billing',
    ],
  },
  // Surgery
  {
    departmentType: 'surgery',
    role: 'provider',
    allowedActions: [
      'view_patient',
      'edit_patient',
      'write_orders',
      'sign_orders',
      'view_imaging',
      'order_imaging',
      'view_labs',
      'order_labs',
      'write_notes',
      'sign_notes',
      'admit',
      'discharge',
      'prescribe',
      'view_vitals',
      'record_vitals',
      'view_reports',
    ],
    deniedActions: ['manage_billing'],
  },
  // Mental Health
  {
    departmentType: 'mental_health',
    role: 'provider',
    allowedActions: [
      'view_patient',
      'edit_patient',
      'write_orders',
      'sign_orders',
      'view_labs',
      'order_labs',
      'write_notes',
      'sign_notes',
      'prescribe',
      'view_vitals',
      'view_schedule',
      'manage_schedule',
      'telehealth_initiate',
      'view_reports',
    ],
    deniedActions: ['admit', 'manage_billing', 'order_imaging'],
  },
  // Administration
  {
    departmentType: 'administration',
    role: 'clerk',
    allowedActions: [
      'view_schedule',
      'manage_schedule',
      'view_billing',
      'manage_billing',
      'view_reports',
      'manage_department',
    ],
    deniedActions: [
      'view_patient',
      'edit_patient',
      'write_orders',
      'sign_orders',
      'prescribe',
      'administer_meds',
    ],
  },
];

// --- Stores ----------------------------------------------

const templateStore = new Map<string, DeptRoleTemplate>();
const membershipStore = new Map<string, DeptRoleMembership>();

// --- Template CRUD ---------------------------------------

export function seedDefaultTemplates(tenantId: string): DeptRoleTemplate[] {
  const seeded: DeptRoleTemplate[] = [];
  const now = new Date().toISOString();

  for (const def of DEFAULT_TEMPLATES) {
    const existing = Array.from(templateStore.values()).find(
      (t) =>
        t.tenantId === tenantId &&
        t.departmentType === def.departmentType &&
        t.role === def.role &&
        t.isDefault
    );
    if (existing) {
      seeded.push(existing);
      continue;
    }

    const template: DeptRoleTemplate = {
      id: randomUUID(),
      tenantId,
      name: `${def.departmentType}-${def.role}-default`,
      departmentType: def.departmentType,
      role: def.role,
      allowedActions: def.allowedActions,
      deniedActions: def.deniedActions,
      constraints: {},
      isDefault: true,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    templateStore.set(template.id, template);
    seeded.push(template);
  }

  return seeded;
}

export function createTemplate(
  tenantId: string,
  input: Omit<DeptRoleTemplate, 'id' | 'tenantId' | 'isDefault' | 'createdAt' | 'updatedAt'>
): DeptRoleTemplate {
  const now = new Date().toISOString();
  const t: DeptRoleTemplate = {
    id: randomUUID(),
    tenantId,
    ...input,
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  };
  templateStore.set(t.id, t);
  return t;
}

export function getTemplate(id: string): DeptRoleTemplate | undefined {
  return templateStore.get(id);
}

export function listTemplates(
  tenantId: string,
  departmentType?: DepartmentType,
  role?: string
): DeptRoleTemplate[] {
  return Array.from(templateStore.values()).filter(
    (t) =>
      t.tenantId === tenantId &&
      t.status === 'active' &&
      (!departmentType || t.departmentType === departmentType) &&
      (!role || t.role === role)
  );
}

export function updateTemplate(
  tenantId: string,
  id: string,
  patch: Partial<
    Pick<DeptRoleTemplate, 'name' | 'allowedActions' | 'deniedActions' | 'constraints' | 'status'>
  >
): DeptRoleTemplate | undefined {
  const existing = templateStore.get(id);
  if (!existing || existing.tenantId !== tenantId) return undefined;
  const updated: DeptRoleTemplate = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  templateStore.set(id, updated);
  return updated;
}

// --- Membership CRUD -------------------------------------

export function assignMembership(
  tenantId: string,
  input: Omit<DeptRoleMembership, 'id' | 'tenantId' | 'grantedAt'>
): DeptRoleMembership {
  const m: DeptRoleMembership = {
    id: randomUUID(),
    tenantId,
    ...input,
    grantedAt: new Date().toISOString(),
  };
  membershipStore.set(m.id, m);
  return m;
}

export function listMemberships(
  tenantId: string,
  userId?: string,
  departmentId?: string
): DeptRoleMembership[] {
  const now = new Date();
  return Array.from(membershipStore.values()).filter(
    (m) =>
      m.tenantId === tenantId &&
      m.status === 'active' &&
      (!m.expiresAt || new Date(m.expiresAt) > now) &&
      (!userId || m.userId === userId) &&
      (!departmentId || m.departmentId === departmentId)
  );
}

export function revokeMembership(tenantId: string, id: string): boolean {
  const m = membershipStore.get(id);
  if (!m || m.tenantId !== tenantId) return false;
  m.status = 'revoked';
  return true;
}

// --- Access Decision -------------------------------------

export function evaluateDeptAccess(
  tenantId: string,
  userId: string,
  departmentId: string,
  action: DeptRoleAction
): DeptAccessDecision {
  // Find active memberships for this user + department
  const memberships = listMemberships(tenantId, userId, departmentId);
  if (memberships.length === 0) {
    return {
      allowed: false,
      action,
      departmentId,
      templateId: null,
      reason: 'No active department membership',
      constraints: {},
    };
  }

  // Check each membership's template
  for (const membership of memberships) {
    const template = templateStore.get(membership.templateId);
    if (!template || template.status !== 'active') continue;

    // Explicit deny takes precedence
    if (template.deniedActions.includes(action)) {
      return {
        allowed: false,
        action,
        departmentId,
        templateId: template.id,
        reason: `Action '${action}' denied by template '${template.name}'`,
        constraints: template.constraints,
      };
    }

    // Check allowed
    if (template.allowedActions.includes(action)) {
      return {
        allowed: true,
        action,
        departmentId,
        templateId: template.id,
        reason: `Action '${action}' allowed by template '${template.name}'`,
        constraints: template.constraints,
      };
    }
  }

  // Default deny -- action not in any template
  return {
    allowed: false,
    action,
    departmentId,
    templateId: null,
    reason: `Action '${action}' not covered by any active template`,
    constraints: {},
  };
}

// --- Store Reset -----------------------------------------

export function _resetDeptRbacStores(): void {
  templateStore.clear();
  membershipStore.clear();
}
