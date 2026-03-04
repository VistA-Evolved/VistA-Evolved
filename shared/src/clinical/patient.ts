/**
 * Canonical Patient types — THE single source of truth for patient data.
 *
 * All patient-related type definitions across the monorepo MUST reference
 * these types. Do NOT create local Patient/PatientDemographics interfaces
 * in individual apps — import from @vista-evolved/shared-types instead.
 *
 * --------------------------------------------------------------------------
 * Design notes:
 *   - `dfn` is the VistA internal patient identifier (Data File Number).
 *   - Fields shared across the legacy CPRS Delphi client, web UI, API,
 *     and portal are unified here.
 *   - Optional fields use `?` to allow partial construction (e.g., from
 *     search results that only return dfn+name).
 *   - The `PatientSummary` type covers lightweight list/search use cases.
 *   - The full `Patient` type covers the comprehensive patient record.
 * --------------------------------------------------------------------------
 */

/* ================================================================== */
/* Core identity                                                       */
/* ================================================================== */

/** Lightweight patient reference for search results and lists. */
export interface PatientSummary {
  /** VistA Data File Number (primary patient identifier) */
  dfn: string;
  /** Full display name (e.g., "PROVIDER,CLYDE WV") */
  name: string;
  /** Last 4 of SSN (for display/matching) */
  ssn?: string;
  /** Date of birth (ISO 8601 date string) */
  dob?: string;
  /** Administrative sex */
  sex?: string;
}

/** Comprehensive patient record — canonical across all apps. */
export interface Patient {
  /* --- Core identity ------------------------------------------------ */
  /** VistA Data File Number (primary patient identifier) */
  dfn: string;
  /** Full display name */
  name: string;
  /** Medical Record Number */
  mrn?: string;
  /** First name (parsed from full name) */
  firstName?: string;
  /** Last name (parsed from full name) */
  lastName?: string;
  /** Middle name */
  middleName?: string;

  /* --- Demographics ------------------------------------------------- */
  /** Date of birth (ISO 8601 date string) */
  dob: string;
  /** Administrative sex */
  sex: string;
  /** Social Security Number */
  ssn?: string;
  /** Race */
  race?: string;
  /** Ethnicity */
  ethnicity?: string;
  /** Blood type */
  bloodType?: string;
  /** Preferred language */
  preferredLanguage?: string;

  /* --- Contact ------------------------------------------------------ */
  /** Mailing/home address */
  address?: string;
  /** Phone number */
  phone?: string;
  /** Email address */
  email?: string;
  /** Emergency contact */
  emergencyContact?: string;

  /* --- Clinical ----------------------------------------------------- */
  /** Veteran status */
  veteran?: boolean;
  /** Current room/bed assignment (inpatient) */
  roomBed?: string;
  /** Current location (ward or clinic) */
  location?: string;

  /* --- Administrative ----------------------------------------------- */
  /** Tenant ID for multi-tenant deployments */
  tenantId?: string;
  /** Registration date (ISO 8601) */
  registrationDate?: string;
  /** Patient status */
  status?: 'active' | 'inactive' | 'deceased';
  /** Primary insurance identifier */
  primaryInsurance?: string;
  /** Secondary insurance identifier */
  secondaryInsurance?: string;
  /** PhilHealth number (PH market) */
  philhealthNumber?: string;

  /* --- Audit -------------------------------------------------------- */
  /** Record creation timestamp (ISO 8601) */
  createdAt?: string;
  /** Last update timestamp (ISO 8601) */
  updatedAt?: string;
  /** DUZ of the user who created the record */
  createdBy?: string;
  /** DUZ of the user who last modified the record */
  lastModifiedBy?: string;
}

/* ================================================================== */
/* Request / Response shapes                                           */
/* ================================================================== */

/** Fields required to create a new patient. */
export interface PatientCreateRequest {
  name: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dob: string;
  sex: string;
  ssn?: string;
  race?: string;
  ethnicity?: string;
  address?: string;
  phone?: string;
  email?: string;
  emergencyContact?: string;
  preferredLanguage?: string;
  primaryInsurance?: string;
  secondaryInsurance?: string;
  philhealthNumber?: string;
  tenantId?: string;
}

/** Fields allowed in a patient update. All optional (partial update). */
export interface PatientUpdateRequest {
  name?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dob?: string;
  sex?: string;
  ssn?: string;
  race?: string;
  ethnicity?: string;
  address?: string;
  phone?: string;
  email?: string;
  emergencyContact?: string;
  preferredLanguage?: string;
  bloodType?: string;
  primaryInsurance?: string;
  secondaryInsurance?: string;
  philhealthNumber?: string;
  status?: 'active' | 'inactive' | 'deceased';
}

/* ================================================================== */
/* Backward-compatibility aliases                                      */
/* ================================================================== */

/**
 * @deprecated Use `PatientSummary` instead. Alias kept for migration period.
 */
export type PatientDemographics = PatientSummary;

/**
 * @deprecated Use `Patient` instead. Alias kept for migration period.
 */
export type PatientRecord = Patient;

/**
 * @deprecated Use `PatientSummary` instead. Alias kept for migration period.
 */
export type PatientSearchResult = PatientSummary;
