/**
 * Default Policy Configuration -- Phase 35.
 *
 * Defines the default role-action-resource policy for VistA Evolved.
 * This can be overridden by tenant-specific policies or OPA sidecar.
 */

import type { PolicyRole } from '../policy-engine.js';

/* ------------------------------------------------------------------ */
/* Role descriptions                                                   */
/* ------------------------------------------------------------------ */

export interface RoleDefinition {
  name: PolicyRole;
  description: string;
  /** Actions explicitly allowed */
  allowedPatterns: string[];
  /** Actions explicitly denied (overrides allowed) */
  deniedPatterns: string[];
  /** Can this role use break-glass? */
  canBreakGlass: boolean;
}

export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    name: 'provider',
    description: 'Clinical provider - full clinical access, read/write patient data',
    allowedPatterns: [
      'clinical.*',
      'phi.*',
      'imaging.view',
      'imaging.order',
      'report.generate',
      'telehealth.*',
      'analytics.view',
    ],
    deniedPatterns: ['admin.*', 'system.config'],
    canBreakGlass: true,
  },
  {
    name: 'nurse',
    description: 'Nurse - vital signs, notes, read access to clinical data',
    allowedPatterns: [
      'clinical.vitals-add',
      'clinical.note-create',
      'clinical.draft-*',
      'phi.*',
      'imaging.view',
      'report.generate',
      'telehealth.join',
      'analytics.view',
    ],
    deniedPatterns: ['clinical.medication-add', 'clinical.order-sign', 'admin.*'],
    canBreakGlass: true,
  },
  {
    name: 'pharmacist',
    description: 'Pharmacist - medication management, read access to clinical data',
    allowedPatterns: ['clinical.medication-add', 'phi.*', 'imaging.view', 'analytics.view'],
    deniedPatterns: ['clinical.order-sign', 'admin.*'],
    canBreakGlass: true,
  },
  {
    name: 'clerk',
    description: 'Clerk - limited read access, no clinical writes',
    allowedPatterns: ['phi.patient-search', 'phi.patient-list', 'phi.demographics-view'],
    deniedPatterns: ['clinical.*', 'admin.*', 'imaging.*', 'report.*'],
    canBreakGlass: false,
  },
  {
    name: 'admin',
    description: 'System administrator - unrestricted access',
    allowedPatterns: ['*'],
    deniedPatterns: [],
    canBreakGlass: true,
  },
  {
    name: 'patient',
    description: 'Patient portal user - own data only',
    allowedPatterns: ['portal.*'],
    deniedPatterns: ['clinical.*', 'admin.*', 'phi.*', 'imaging.*'],
    canBreakGlass: false,
  },
  {
    name: 'support',
    description: 'Support staff - audit visibility, system health, no clinical data',
    allowedPatterns: ['audit.*', 'system.health', 'system.metrics'],
    deniedPatterns: ['clinical.*', 'phi.*', 'admin.config', 'imaging.*'],
    canBreakGlass: false,
  },
];

/* ------------------------------------------------------------------ */
/* Environment-specific overrides                                       */
/* ------------------------------------------------------------------ */

export interface EnvironmentPolicy {
  name: string;
  allowBreakGlass: boolean;
  auditLevel: 'minimal' | 'standard' | 'verbose';
  maxSessionTtlHours: number;
  requireMfa: boolean;
}

export const ENVIRONMENT_POLICIES: Record<string, EnvironmentPolicy> = {
  development: {
    name: 'development',
    allowBreakGlass: true,
    auditLevel: 'verbose',
    maxSessionTtlHours: 8,
    requireMfa: false,
  },
  staging: {
    name: 'staging',
    allowBreakGlass: true,
    auditLevel: 'standard',
    maxSessionTtlHours: 4,
    requireMfa: false,
  },
  production: {
    name: 'production',
    allowBreakGlass: true,
    auditLevel: 'standard',
    maxSessionTtlHours: 4,
    requireMfa: true,
  },
};

/**
 * Get the environment policy.
 */
export function getEnvironmentPolicy(): EnvironmentPolicy {
  const env = process.env.NODE_ENV || 'development';
  return ENVIRONMENT_POLICIES[env] || ENVIRONMENT_POLICIES.development;
}
