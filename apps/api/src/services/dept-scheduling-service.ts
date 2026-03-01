/**
 * Department Scheduling Service — Phase 352
 *
 * Department-scoped scheduling resources: schedule templates, resource
 * allocation (rooms/equipment/staff), scheduling rules, and cross-department
 * referral queue. Builds on top of the Phase 63/123/131/139/147 scheduling
 * infrastructure and integrates with the facility hierarchy from Phase 347.
 *
 * All stores are in-memory with PG migration v43 tables ready for migration.
 */

import { randomUUID } from "node:crypto";

// ─── Types ─────────────────────────────────────────────

export type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export interface TimeBlock {
  dayOfWeek: DayOfWeek;
  startTime: string;   // HH:mm (24h)
  endTime: string;     // HH:mm (24h)
  slotDurationMin: number;
  maxConcurrent: number;
}

export interface ScheduleTemplate {
  id: string;
  tenantId: string;
  departmentId: string;
  facilityId: string;
  name: string;
  description: string;
  effectiveFrom: string;     // ISO date
  effectiveTo: string | null;
  blocks: TimeBlock[];
  holidays: string[];        // ISO dates when template is suspended
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type ResourceType = "room" | "equipment" | "staff" | "bay" | "operating_room" | "exam_room";
export type ResourceStatus = "available" | "in_use" | "maintenance" | "reserved" | "decommissioned";

export interface DeptResource {
  id: string;
  tenantId: string;
  departmentId: string;
  facilityId: string;
  type: ResourceType;
  name: string;
  description: string;
  status: ResourceStatus;
  capacity: number;
  capabilities: string[];    // e.g. ["xray", "ct_scan", "mri"]
  location: string;          // physical location descriptor
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceAllocation {
  id: string;
  tenantId: string;
  resourceId: string;
  departmentId: string;
  scheduledStart: string;    // ISO datetime
  scheduledEnd: string;      // ISO datetime
  appointmentRef: string | null;
  patientDfn: string | null;
  allocatedBy: string;
  reason: string;
  status: "pending" | "confirmed" | "active" | "completed" | "cancelled";
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type RuleAction = "allow" | "deny" | "require_approval";

export interface SchedulingRule {
  id: string;
  tenantId: string;
  departmentId: string;
  facilityId: string;
  name: string;
  description: string;
  priority: number;                      // lower = evaluated first
  condition: SchedulingRuleCondition;
  action: RuleAction;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SchedulingRuleCondition {
  appointmentTypes?: string[];           // restrict to certain types
  minDurationMin?: number;
  maxDurationMin?: number;
  maxDailyPerProvider?: number;
  maxDailyPerDepartment?: number;
  requiredResources?: ResourceType[];
  blockedDaysOfWeek?: DayOfWeek[];
  maxAdvanceBookingDays?: number;
  minAdvanceBookingHours?: number;
}

export type ReferralStatus = "pending" | "accepted" | "scheduled" | "completed" | "declined" | "expired";
export type ReferralUrgency = "routine" | "urgent" | "emergent";

export interface CrossDeptReferral {
  id: string;
  tenantId: string;
  fromDepartmentId: string;
  toDepartmentId: string;
  fromFacilityId: string;
  toFacilityId: string;
  patientDfn: string;
  referredBy: string;              // DUZ
  reason: string;
  clinicalNotes: string;
  urgency: ReferralUrgency;
  status: ReferralStatus;
  appointmentRef: string | null;   // linked once scheduled
  requestedDate: string | null;
  expiresAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ─── Stores ────────────────────────────────────────────

const templateStore = new Map<string, ScheduleTemplate>();
const resourceStore = new Map<string, DeptResource>();
const allocationStore = new Map<string, ResourceAllocation>();
const ruleStore = new Map<string, SchedulingRule>();
const referralStore = new Map<string, CrossDeptReferral>();

// ─── Schedule Templates ────────────────────────────────

export function createScheduleTemplate(
  tenantId: string,
  input: {
    departmentId: string;
    facilityId: string;
    name: string;
    description?: string;
    effectiveFrom: string;
    effectiveTo?: string;
    blocks: TimeBlock[];
    holidays?: string[];
    metadata?: Record<string, unknown>;
  },
): ScheduleTemplate {
  const now = new Date().toISOString();
  const t: ScheduleTemplate = {
    id: randomUUID(),
    tenantId,
    departmentId: input.departmentId,
    facilityId: input.facilityId,
    name: input.name,
    description: input.description || "",
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo || null,
    blocks: input.blocks,
    holidays: input.holidays || [],
    metadata: input.metadata || {},
    createdAt: now,
    updatedAt: now,
  };
  templateStore.set(t.id, t);
  return t;
}

export function listScheduleTemplates(tenantId: string, departmentId?: string): ScheduleTemplate[] {
  return [...templateStore.values()].filter(
    (t) => t.tenantId === tenantId && (!departmentId || t.departmentId === departmentId),
  );
}

export function getScheduleTemplate(id: string): ScheduleTemplate | undefined {
  return templateStore.get(id);
}

export function updateScheduleTemplate(
  id: string,
  patch: Partial<Pick<ScheduleTemplate, "name" | "description" | "effectiveTo" | "blocks" | "holidays" | "metadata">>,
): ScheduleTemplate | undefined {
  const t = templateStore.get(id);
  if (!t) return undefined;
  Object.assign(t, patch, { updatedAt: new Date().toISOString() });
  return t;
}

export function deleteScheduleTemplate(id: string): boolean {
  return templateStore.delete(id);
}

// ─── Resources ─────────────────────────────────────────

export function createResource(
  tenantId: string,
  input: {
    departmentId: string;
    facilityId: string;
    type: ResourceType;
    name: string;
    description?: string;
    capacity?: number;
    capabilities?: string[];
    location?: string;
    metadata?: Record<string, unknown>;
  },
): DeptResource {
  const now = new Date().toISOString();
  const r: DeptResource = {
    id: randomUUID(),
    tenantId,
    departmentId: input.departmentId,
    facilityId: input.facilityId,
    type: input.type,
    name: input.name,
    description: input.description || "",
    status: "available",
    capacity: input.capacity || 1,
    capabilities: input.capabilities || [],
    location: input.location || "",
    metadata: input.metadata || {},
    createdAt: now,
    updatedAt: now,
  };
  resourceStore.set(r.id, r);
  return r;
}

export function listResources(
  tenantId: string,
  departmentId?: string,
  type?: ResourceType,
): DeptResource[] {
  return [...resourceStore.values()].filter(
    (r) =>
      r.tenantId === tenantId &&
      (!departmentId || r.departmentId === departmentId) &&
      (!type || r.type === type),
  );
}

export function getResource(id: string): DeptResource | undefined {
  return resourceStore.get(id);
}

export function updateResource(
  id: string,
  patch: Partial<Pick<DeptResource, "name" | "description" | "status" | "capacity" | "capabilities" | "location" | "metadata">>,
): DeptResource | undefined {
  const r = resourceStore.get(id);
  if (!r) return undefined;
  Object.assign(r, patch, { updatedAt: new Date().toISOString() });
  return r;
}

// ─── Resource Allocations ──────────────────────────────

export function createAllocation(
  tenantId: string,
  input: {
    resourceId: string;
    departmentId: string;
    scheduledStart: string;
    scheduledEnd: string;
    appointmentRef?: string;
    patientDfn?: string;
    allocatedBy: string;
    reason: string;
    metadata?: Record<string, unknown>;
  },
): ResourceAllocation | { error: string } {
  const resource = resourceStore.get(input.resourceId);
  if (!resource) return { error: "Resource not found" };
  if (resource.status === "decommissioned" || resource.status === "maintenance") {
    return { error: `Resource is ${resource.status}` };
  }

  // Check for overlap
  const overlapping = [...allocationStore.values()].filter(
    (a) =>
      a.resourceId === input.resourceId &&
      a.status !== "cancelled" &&
      a.status !== "completed" &&
      a.scheduledStart < input.scheduledEnd &&
      a.scheduledEnd > input.scheduledStart,
  );
  if (overlapping.length >= resource.capacity) {
    return { error: "Resource already fully allocated during requested time" };
  }

  const alloc: ResourceAllocation = {
    id: randomUUID(),
    tenantId,
    resourceId: input.resourceId,
    departmentId: input.departmentId,
    scheduledStart: input.scheduledStart,
    scheduledEnd: input.scheduledEnd,
    appointmentRef: input.appointmentRef || null,
    patientDfn: input.patientDfn || null,
    allocatedBy: input.allocatedBy,
    reason: input.reason,
    status: "pending",
    metadata: input.metadata || {},
    createdAt: new Date().toISOString(),
  };
  allocationStore.set(alloc.id, alloc);
  return alloc;
}

export function listAllocations(
  tenantId: string,
  filters?: {
    resourceId?: string;
    departmentId?: string;
    date?: string;
    status?: string;
  },
): ResourceAllocation[] {
  return [...allocationStore.values()].filter((a) => {
    if (a.tenantId !== tenantId) return false;
    if (filters?.resourceId && a.resourceId !== filters.resourceId) return false;
    if (filters?.departmentId && a.departmentId !== filters.departmentId) return false;
    if (filters?.status && a.status !== filters.status) return false;
    if (filters?.date) {
      const d = filters.date;
      if (!a.scheduledStart.startsWith(d) && a.scheduledStart > d + "T23:59:59") return false;
      if (a.scheduledEnd < d + "T00:00:00") return false;
    }
    return true;
  });
}

export function updateAllocationStatus(
  id: string,
  status: ResourceAllocation["status"],
): ResourceAllocation | undefined {
  const a = allocationStore.get(id);
  if (!a) return undefined;
  a.status = status;
  return a;
}

// ─── Scheduling Rules ──────────────────────────────────

export function createSchedulingRule(
  tenantId: string,
  input: {
    departmentId: string;
    facilityId: string;
    name: string;
    description?: string;
    priority?: number;
    condition: SchedulingRuleCondition;
    action: RuleAction;
  },
): SchedulingRule {
  const now = new Date().toISOString();
  const rule: SchedulingRule = {
    id: randomUUID(),
    tenantId,
    departmentId: input.departmentId,
    facilityId: input.facilityId,
    name: input.name,
    description: input.description || "",
    priority: input.priority ?? 100,
    condition: input.condition,
    action: input.action,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  ruleStore.set(rule.id, rule);
  return rule;
}

export function listSchedulingRules(tenantId: string, departmentId?: string): SchedulingRule[] {
  return [...ruleStore.values()]
    .filter(
      (r) => r.tenantId === tenantId && r.active && (!departmentId || r.departmentId === departmentId),
    )
    .sort((a, b) => a.priority - b.priority);
}

export function evaluateSchedulingRules(
  tenantId: string,
  departmentId: string,
  context: {
    appointmentType?: string;
    durationMin?: number;
    dayOfWeek?: DayOfWeek;
    resourceTypes?: ResourceType[];
    advanceBookingDays?: number;
    advanceBookingHours?: number;
  },
): { allowed: boolean; blockers: { rule: string; action: RuleAction; reason: string }[] } {
  const rules = listSchedulingRules(tenantId, departmentId);
  const blockers: { rule: string; action: RuleAction; reason: string }[] = [];

  for (const rule of rules) {
    const c = rule.condition;

    if (c.appointmentTypes?.length && context.appointmentType) {
      if (!c.appointmentTypes.includes(context.appointmentType)) {
        blockers.push({ rule: rule.name, action: rule.action, reason: `Appointment type '${context.appointmentType}' not allowed` });
      }
    }

    if (c.minDurationMin != null && context.durationMin != null) {
      if (context.durationMin < c.minDurationMin) {
        blockers.push({ rule: rule.name, action: rule.action, reason: `Duration ${context.durationMin}min below minimum ${c.minDurationMin}min` });
      }
    }

    if (c.maxDurationMin != null && context.durationMin != null) {
      if (context.durationMin > c.maxDurationMin) {
        blockers.push({ rule: rule.name, action: rule.action, reason: `Duration ${context.durationMin}min exceeds maximum ${c.maxDurationMin}min` });
      }
    }

    if (c.blockedDaysOfWeek?.length && context.dayOfWeek) {
      if (c.blockedDaysOfWeek.includes(context.dayOfWeek)) {
        blockers.push({ rule: rule.name, action: rule.action, reason: `Day '${context.dayOfWeek}' is blocked` });
      }
    }

    if (c.maxAdvanceBookingDays != null && context.advanceBookingDays != null) {
      if (context.advanceBookingDays > c.maxAdvanceBookingDays) {
        blockers.push({ rule: rule.name, action: rule.action, reason: `Booking ${context.advanceBookingDays}d advance exceeds max ${c.maxAdvanceBookingDays}d` });
      }
    }

    if (c.minAdvanceBookingHours != null && context.advanceBookingHours != null) {
      if (context.advanceBookingHours < c.minAdvanceBookingHours) {
        blockers.push({ rule: rule.name, action: rule.action, reason: `Booking ${context.advanceBookingHours}h advance below min ${c.minAdvanceBookingHours}h` });
      }
    }
  }

  const hasDeny = blockers.some((b) => b.action === "deny");
  return { allowed: !hasDeny, blockers };
}

export function updateSchedulingRule(
  id: string,
  patch: Partial<Pick<SchedulingRule, "name" | "description" | "priority" | "condition" | "action" | "active">>,
): SchedulingRule | undefined {
  const r = ruleStore.get(id);
  if (!r) return undefined;
  Object.assign(r, patch, { updatedAt: new Date().toISOString() });
  return r;
}

export function deleteSchedulingRule(id: string): boolean {
  return ruleStore.delete(id);
}

// ─── Cross-Department Referrals ────────────────────────

export function createReferral(
  tenantId: string,
  input: {
    fromDepartmentId: string;
    toDepartmentId: string;
    fromFacilityId: string;
    toFacilityId: string;
    patientDfn: string;
    referredBy: string;
    reason: string;
    clinicalNotes?: string;
    urgency?: ReferralUrgency;
    requestedDate?: string;
    expiresAt?: string;
    metadata?: Record<string, unknown>;
  },
): CrossDeptReferral {
  const now = new Date().toISOString();
  const ref: CrossDeptReferral = {
    id: randomUUID(),
    tenantId,
    fromDepartmentId: input.fromDepartmentId,
    toDepartmentId: input.toDepartmentId,
    fromFacilityId: input.fromFacilityId,
    toFacilityId: input.toFacilityId,
    patientDfn: input.patientDfn,
    referredBy: input.referredBy,
    reason: input.reason,
    clinicalNotes: input.clinicalNotes || "",
    urgency: input.urgency || "routine",
    status: "pending",
    appointmentRef: null,
    requestedDate: input.requestedDate || null,
    expiresAt: input.expiresAt || null,
    metadata: input.metadata || {},
    createdAt: now,
    updatedAt: now,
  };
  referralStore.set(ref.id, ref);
  return ref;
}

export function listReferrals(
  tenantId: string,
  filters?: {
    fromDepartmentId?: string;
    toDepartmentId?: string;
    status?: ReferralStatus;
    urgency?: ReferralUrgency;
  },
): CrossDeptReferral[] {
  return [...referralStore.values()].filter((r) => {
    if (r.tenantId !== tenantId) return false;
    if (filters?.fromDepartmentId && r.fromDepartmentId !== filters.fromDepartmentId) return false;
    if (filters?.toDepartmentId && r.toDepartmentId !== filters.toDepartmentId) return false;
    if (filters?.status && r.status !== filters.status) return false;
    if (filters?.urgency && r.urgency !== filters.urgency) return false;
    return true;
  });
}

export function getReferral(id: string): CrossDeptReferral | undefined {
  return referralStore.get(id);
}

const REFERRAL_TRANSITIONS: Record<ReferralStatus, ReferralStatus[]> = {
  pending: ["accepted", "declined", "expired"],
  accepted: ["scheduled", "declined", "expired"],
  scheduled: ["completed", "declined"],
  completed: [],
  declined: [],
  expired: [],
};

export function transitionReferral(
  id: string,
  newStatus: ReferralStatus,
  appointmentRef?: string,
): CrossDeptReferral | { error: string } {
  const ref = referralStore.get(id);
  if (!ref) return { error: "Referral not found" };
  const allowed = REFERRAL_TRANSITIONS[ref.status];
  if (!allowed.includes(newStatus)) {
    return { error: `Cannot transition from '${ref.status}' to '${newStatus}'` };
  }
  ref.status = newStatus;
  ref.updatedAt = new Date().toISOString();
  if (appointmentRef) ref.appointmentRef = appointmentRef;
  return ref;
}

// ─── Test helpers ──────────────────────────────────────

export function _resetDeptSchedulingStores(): void {
  templateStore.clear();
  resourceStore.clear();
  allocationStore.clear();
  ruleStore.clear();
  referralStore.clear();
}
