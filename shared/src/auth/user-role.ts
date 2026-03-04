/**
 * Canonical UserRole type — single source of truth.
 *
 * Consolidates duplicates from:
 *   - apps/api/src/auth/session-store.ts
 *   - apps/web/src/stores/session-context.tsx
 */

/**
 * User roles across the VistA-Evolved system.
 * Maps to VistA user classes and controls RBAC policies.
 */
export type UserRole =
  | 'provider'
  | 'nurse'
  | 'pharmacist'
  | 'clerk'
  | 'admin'
  | 'billing'
  | 'support';
