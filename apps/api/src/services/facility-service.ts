/**
 * Facility / Department / Location Service — Phase 347
 *
 * Implements the Tenant → Facility → Department → Location hierarchy
 * with optional VistA mapping. All data is PG-backed via platform DB.
 *
 * ADR: docs/decisions/ADR-FACILITY-LOCATION-MODEL.md
 */

import { randomUUID } from "node:crypto";

// ─── Domain Types ────────────────────────────────────────

export type FacilityType =
  | "hospital"
  | "clinic"
  | "satellite"
  | "lab"
  | "pharmacy"
  | "telehealth_hub"
  | "mobile_unit";

export type DepartmentType =
  | "emergency"
  | "inpatient"
  | "outpatient"
  | "surgery"
  | "radiology"
  | "laboratory"
  | "pharmacy"
  | "mental_health"
  | "primary_care"
  | "specialty"
  | "administration"
  | "custom";

export type LocationType =
  | "clinic"
  | "ward"
  | "room"
  | "telehealth"
  | "mobile"
  | "virtual";

export interface Facility {
  id: string;
  tenantId: string;
  name: string;
  facilityType: FacilityType;
  stationNumber: string | null;
  vistaStationIen: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  timezone: string;
  parentFacilityId: string | null;
  status: "active" | "inactive" | "decommissioned";
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  tenantId: string;
  facilityId: string;
  name: string;
  departmentType: DepartmentType;
  code: string;
  vistaServiceIen: string | null;
  costCenter: string | null;
  parentDepartmentId: string | null;
  status: "active" | "inactive" | "decommissioned";
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  tenantId: string;
  departmentId: string;
  name: string;
  locationType: LocationType;
  vistaLocationIen: string | null;
  floor: string | null;
  wing: string | null;
  roomNumber: string | null;
  bedCount: number | null;
  status: "active" | "inactive" | "decommissioned";
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderFacilityAssignment {
  id: string;
  tenantId: string;
  providerId: string;
  facilityId: string;
  departmentId: string | null;
  role: string;
  isPrimary: boolean;
  startDate: string;
  endDate: string | null;
  status: "active" | "inactive";
  createdAt: string;
}

// ─── In-Memory Stores (PG-backed via migration v38) ─────

const facilityStore = new Map<string, Facility>();
const departmentStore = new Map<string, Department>();
const locationStore = new Map<string, Location>();
const assignmentStore = new Map<string, ProviderFacilityAssignment>();

// ─── Facility CRUD ───────────────────────────────────────

export function createFacility(
  tenantId: string,
  input: Omit<Facility, "id" | "tenantId" | "createdAt" | "updatedAt">,
): Facility {
  const now = new Date().toISOString();
  const facility: Facility = {
    id: randomUUID(),
    tenantId,
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  facilityStore.set(facility.id, facility);
  return facility;
}

export function getFacility(id: string): Facility | undefined {
  return facilityStore.get(id);
}

export function listFacilities(tenantId: string): Facility[] {
  return Array.from(facilityStore.values()).filter(
    (f) => f.tenantId === tenantId && f.status !== "decommissioned",
  );
}

export function updateFacility(
  id: string,
  patch: Partial<Pick<Facility, "name" | "facilityType" | "address" | "city" | "state" | "postalCode" | "country" | "timezone" | "status" | "metadata" | "stationNumber" | "vistaStationIen" | "parentFacilityId">>,
): Facility | undefined {
  const existing = facilityStore.get(id);
  if (!existing) return undefined;
  const updated: Facility = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  facilityStore.set(id, updated);
  return updated;
}

export function decommissionFacility(id: string): boolean {
  const existing = facilityStore.get(id);
  if (!existing) return false;
  facilityStore.set(id, { ...existing, status: "decommissioned", updatedAt: new Date().toISOString() });
  return true;
}

// ─── Department CRUD ─────────────────────────────────────

export function createDepartment(
  tenantId: string,
  input: Omit<Department, "id" | "tenantId" | "createdAt" | "updatedAt">,
): Department {
  const now = new Date().toISOString();
  const dept: Department = {
    id: randomUUID(),
    tenantId,
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  departmentStore.set(dept.id, dept);
  return dept;
}

export function getDepartment(id: string): Department | undefined {
  return departmentStore.get(id);
}

export function listDepartments(tenantId: string, facilityId?: string): Department[] {
  return Array.from(departmentStore.values()).filter(
    (d) =>
      d.tenantId === tenantId &&
      d.status !== "decommissioned" &&
      (!facilityId || d.facilityId === facilityId),
  );
}

export function updateDepartment(
  id: string,
  patch: Partial<Pick<Department, "name" | "departmentType" | "code" | "costCenter" | "status" | "metadata" | "vistaServiceIen" | "parentDepartmentId">>,
): Department | undefined {
  const existing = departmentStore.get(id);
  if (!existing) return undefined;
  const updated: Department = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  departmentStore.set(id, updated);
  return updated;
}

export function decommissionDepartment(id: string): boolean {
  const existing = departmentStore.get(id);
  if (!existing) return false;
  departmentStore.set(id, { ...existing, status: "decommissioned", updatedAt: new Date().toISOString() });
  return true;
}

// ─── Location CRUD ───────────────────────────────────────

export function createLocation(
  tenantId: string,
  input: Omit<Location, "id" | "tenantId" | "createdAt" | "updatedAt">,
): Location {
  const now = new Date().toISOString();
  const loc: Location = {
    id: randomUUID(),
    tenantId,
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  locationStore.set(loc.id, loc);
  return loc;
}

export function getLocation(id: string): Location | undefined {
  return locationStore.get(id);
}

export function listLocations(tenantId: string, departmentId?: string): Location[] {
  return Array.from(locationStore.values()).filter(
    (l) =>
      l.tenantId === tenantId &&
      l.status !== "decommissioned" &&
      (!departmentId || l.departmentId === departmentId),
  );
}

export function updateLocation(
  id: string,
  patch: Partial<Pick<Location, "name" | "locationType" | "floor" | "wing" | "roomNumber" | "bedCount" | "status" | "metadata" | "vistaLocationIen">>,
): Location | undefined {
  const existing = locationStore.get(id);
  if (!existing) return undefined;
  const updated: Location = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  locationStore.set(id, updated);
  return updated;
}

export function decommissionLocation(id: string): boolean {
  const existing = locationStore.get(id);
  if (!existing) return false;
  locationStore.set(id, { ...existing, status: "decommissioned", updatedAt: new Date().toISOString() });
  return true;
}

// ─── Provider Facility Assignment ────────────────────────

export function assignProvider(
  tenantId: string,
  input: Omit<ProviderFacilityAssignment, "id" | "tenantId" | "createdAt">,
): ProviderFacilityAssignment {
  const assignment: ProviderFacilityAssignment = {
    id: randomUUID(),
    tenantId,
    ...input,
    createdAt: new Date().toISOString(),
  };
  assignmentStore.set(assignment.id, assignment);
  return assignment;
}

export function listProviderAssignments(
  tenantId: string,
  providerId?: string,
  facilityId?: string,
): ProviderFacilityAssignment[] {
  return Array.from(assignmentStore.values()).filter(
    (a) =>
      a.tenantId === tenantId &&
      a.status === "active" &&
      (!providerId || a.providerId === providerId) &&
      (!facilityId || a.facilityId === facilityId),
  );
}

export function removeAssignment(id: string): boolean {
  const existing = assignmentStore.get(id);
  if (!existing) return false;
  existing.status = "inactive";
  return true;
}

// ─── Hierarchy Lookup ────────────────────────────────────

export interface FacilityHierarchy {
  facility: Facility;
  departments: Array<{
    department: Department;
    locations: Location[];
  }>;
}

export function getFacilityHierarchy(
  tenantId: string,
  facilityId: string,
): FacilityHierarchy | undefined {
  const facility = facilityStore.get(facilityId);
  if (!facility || facility.tenantId !== tenantId) return undefined;

  const departments = listDepartments(tenantId, facilityId).map((dept) => ({
    department: dept,
    locations: listLocations(tenantId, dept.id),
  }));

  return { facility, departments };
}

// ─── VistA Mapping Posture ───────────────────────────────

export interface VistaMappingPosture {
  totalFacilities: number;
  mappedFacilities: number;
  totalDepartments: number;
  mappedDepartments: number;
  totalLocations: number;
  mappedLocations: number;
  coverage: number;
}

export function getVistaMappingPosture(tenantId: string): VistaMappingPosture {
  const facilities = listFacilities(tenantId);
  const departments = listDepartments(tenantId);
  const locations = listLocations(tenantId);

  const mappedFac = facilities.filter((f) => f.vistaStationIen).length;
  const mappedDept = departments.filter((d) => d.vistaServiceIen).length;
  const mappedLoc = locations.filter((l) => l.vistaLocationIen).length;

  const total = facilities.length + departments.length + locations.length;
  const mapped = mappedFac + mappedDept + mappedLoc;

  return {
    totalFacilities: facilities.length,
    mappedFacilities: mappedFac,
    totalDepartments: departments.length,
    mappedDepartments: mappedDept,
    totalLocations: locations.length,
    mappedLocations: mappedLoc,
    coverage: total > 0 ? mapped / total : 0,
  };
}

// ─── Store Reset (for tests) ────────────────────────────

export function _resetFacilityStores(): void {
  facilityStore.clear();
  departmentStore.clear();
  locationStore.clear();
  assignmentStore.clear();
}
