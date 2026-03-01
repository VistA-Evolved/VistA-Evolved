/**
 * Workflow Inbox Service — Phase 350
 *
 * Unified task inbox with producer/consumer model. Tasks are facility+department
 * scoped, support priority, assignment, and lifecycle transitions.
 * PG-backed via migration v41; in-memory for dev speed.
 */

import { randomUUID } from "node:crypto";

// ─── Types ───────────────────────────────────────────────

export type TaskPriority = "critical" | "high" | "normal" | "low";
export type TaskStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "escalated"
  | "deferred";

export type TaskCategory =
  | "order_review"
  | "result_review"
  | "note_cosign"
  | "discharge_planning"
  | "referral"
  | "prior_auth"
  | "prescription_renewal"
  | "imaging_review"
  | "lab_critical"
  | "patient_message"
  | "scheduling"
  | "admin"
  | "custom";

export interface WorkflowTask {
  id: string;
  tenantId: string;
  facilityId: string | null;
  departmentId: string | null;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo: string | null;
  assignedBy: string | null;
  createdBy: string;
  patientDfn: string | null;
  sourceType: string | null;
  sourceId: string | null;
  dueAt: string | null;
  escalateAt: string | null;
  completedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TaskEvent {
  id: string;
  taskId: string;
  tenantId: string;
  action: string;
  actor: string;
  previousStatus: TaskStatus | null;
  newStatus: TaskStatus | null;
  comment: string | null;
  createdAt: string;
}

export interface TaskFilter {
  tenantId: string;
  facilityId?: string;
  departmentId?: string;
  assignedTo?: string;
  status?: TaskStatus;
  category?: TaskCategory;
  priority?: TaskPriority;
  limit?: number;
}

export interface TaskCounts {
  total: number;
  pending: number;
  assigned: number;
  inProgress: number;
  completed: number;
  escalated: number;
  byPriority: Record<TaskPriority, number>;
  byCategory: Record<string, number>;
}

// ─── Stores ──────────────────────────────────────────────

const taskStore = new Map<string, WorkflowTask>();
const eventStore: TaskEvent[] = [];
const MAX_EVENT_STORE_SIZE = 50_000;

/** Valid source states for each transition action */
const VALID_TRANSITION_SOURCES: Record<string, ReadonlySet<TaskStatus>> = {
  assign:   new Set(["pending", "assigned", "deferred", "escalated"]),
  start:    new Set(["assigned"]),
  complete: new Set(["pending", "assigned", "in_progress", "escalated"]),
  cancel:   new Set(["pending", "assigned", "in_progress", "deferred", "escalated"]),
  escalate: new Set(["pending", "assigned", "in_progress", "deferred"]),
  defer:    new Set(["pending", "assigned", "in_progress"]),
};

function pushEvent(evt: TaskEvent): void {
  eventStore.push(evt);
  // FIFO eviction when cap exceeded
  if (eventStore.length > MAX_EVENT_STORE_SIZE) {
    eventStore.splice(0, eventStore.length - MAX_EVENT_STORE_SIZE);
  }
}

// ─── Task CRUD ───────────────────────────────────────────

export function createTask(
  tenantId: string,
  input: Omit<WorkflowTask, "id" | "tenantId" | "status" | "completedAt" | "createdAt" | "updatedAt">,
): WorkflowTask {
  const now = new Date().toISOString();
  const task: WorkflowTask = {
    id: randomUUID(),
    tenantId,
    ...input,
    status: "pending",
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  taskStore.set(task.id, task);

  pushEvent({
    id: randomUUID(),
    taskId: task.id,
    tenantId,
    action: "created",
    actor: input.createdBy,
    previousStatus: null,
    newStatus: "pending",
    comment: null,
    createdAt: now,
  });

  return task;
}

export function getTask(id: string): WorkflowTask | undefined {
  return taskStore.get(id);
}

export function listTasks(filter: TaskFilter): WorkflowTask[] {
  let tasks = Array.from(taskStore.values()).filter(
    (t) => t.tenantId === filter.tenantId,
  );

  if (filter.facilityId) tasks = tasks.filter((t) => t.facilityId === filter.facilityId);
  if (filter.departmentId) tasks = tasks.filter((t) => t.departmentId === filter.departmentId);
  if (filter.assignedTo) tasks = tasks.filter((t) => t.assignedTo === filter.assignedTo);
  if (filter.status) tasks = tasks.filter((t) => t.status === filter.status);
  if (filter.category) tasks = tasks.filter((t) => t.category === filter.category);
  if (filter.priority) tasks = tasks.filter((t) => t.priority === filter.priority);

  // Sort: critical first, then by creation date desc
  const priorityOrder: Record<TaskPriority, number> = {
    critical: 0,
    high: 1,
    normal: 2,
    low: 3,
  };
  tasks.sort((a, b) => {
    const pd = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pd !== 0) return pd;
    return b.createdAt.localeCompare(a.createdAt);
  });

  const limit = filter.limit || 100;
  return tasks.slice(0, limit);
}

// ─── Task Transitions ────────────────────────────────────

export function assignTask(
  taskId: string,
  assignedTo: string,
  assignedBy: string,
): WorkflowTask | undefined {
  const task = taskStore.get(taskId);
  if (!task || !VALID_TRANSITION_SOURCES.assign.has(task.status)) return undefined;

  const prev = task.status;
  task.assignedTo = assignedTo;
  task.assignedBy = assignedBy;
  task.status = "assigned";
  task.updatedAt = new Date().toISOString();

  pushEvent({
    id: randomUUID(),
    taskId,
    tenantId: task.tenantId,
    action: "assigned",
    actor: assignedBy,
    previousStatus: prev,
    newStatus: "assigned",
    comment: `Assigned to ${assignedTo}`,
    createdAt: task.updatedAt,
  });

  return task;
}

export function startTask(taskId: string, actor: string): WorkflowTask | undefined {
  const task = taskStore.get(taskId);
  if (!task || !VALID_TRANSITION_SOURCES.start.has(task.status)) return undefined;

  const prev = task.status;
  task.status = "in_progress";
  task.updatedAt = new Date().toISOString();

  pushEvent({
    id: randomUUID(),
    taskId,
    tenantId: task.tenantId,
    action: "started",
    actor,
    previousStatus: prev,
    newStatus: "in_progress",
    comment: null,
    createdAt: task.updatedAt,
  });

  return task;
}

export function completeTask(
  taskId: string,
  actor: string,
  comment?: string,
): WorkflowTask | undefined {
  const task = taskStore.get(taskId);
  if (!task || !VALID_TRANSITION_SOURCES.complete.has(task.status)) return undefined;

  const prev = task.status;
  task.status = "completed";
  task.completedAt = new Date().toISOString();
  task.updatedAt = task.completedAt;

  pushEvent({
    id: randomUUID(),
    taskId,
    tenantId: task.tenantId,
    action: "completed",
    actor,
    previousStatus: prev,
    newStatus: "completed",
    comment: comment || null,
    createdAt: task.updatedAt,
  });

  return task;
}

export function cancelTask(
  taskId: string,
  actor: string,
  comment?: string,
): WorkflowTask | undefined {
  const task = taskStore.get(taskId);
  if (!task || !VALID_TRANSITION_SOURCES.cancel.has(task.status)) return undefined;

  const prev = task.status;
  task.status = "cancelled";
  task.updatedAt = new Date().toISOString();

  pushEvent({
    id: randomUUID(),
    taskId,
    tenantId: task.tenantId,
    action: "cancelled",
    actor,
    previousStatus: prev,
    newStatus: "cancelled",
    comment: comment || null,
    createdAt: task.updatedAt,
  });

  return task;
}

export function escalateTask(
  taskId: string,
  actor: string,
  comment?: string,
): WorkflowTask | undefined {
  const task = taskStore.get(taskId);
  if (!task || !VALID_TRANSITION_SOURCES.escalate.has(task.status)) return undefined;

  const prev = task.status;
  task.status = "escalated";
  task.priority = "critical";
  task.updatedAt = new Date().toISOString();

  pushEvent({
    id: randomUUID(),
    taskId,
    tenantId: task.tenantId,
    action: "escalated",
    actor,
    previousStatus: prev,
    newStatus: "escalated",
    comment: comment || null,
    createdAt: task.updatedAt,
  });

  return task;
}

export function deferTask(
  taskId: string,
  actor: string,
  dueAt: string,
  comment?: string,
): WorkflowTask | undefined {
  const task = taskStore.get(taskId);
  if (!task || !VALID_TRANSITION_SOURCES.defer.has(task.status)) return undefined;

  const prev = task.status;
  task.status = "deferred";
  task.dueAt = dueAt;
  task.updatedAt = new Date().toISOString();

  pushEvent({
    id: randomUUID(),
    taskId,
    tenantId: task.tenantId,
    action: "deferred",
    actor,
    previousStatus: prev,
    newStatus: "deferred",
    comment: comment || null,
    createdAt: task.updatedAt,
  });

  return task;
}

// ─── Task Events ─────────────────────────────────────────

export function getTaskEvents(taskId: string): TaskEvent[] {
  return eventStore.filter((e) => e.taskId === taskId);
}

// ─── Counts / Dashboard ──────────────────────────────────

export function getTaskCounts(tenantId: string, departmentId?: string): TaskCounts {
  let tasks = Array.from(taskStore.values()).filter(
    (t) => t.tenantId === tenantId && t.status !== "cancelled",
  );
  if (departmentId) tasks = tasks.filter((t) => t.departmentId === departmentId);

  const byPriority: Record<TaskPriority, number> = { critical: 0, high: 0, normal: 0, low: 0 };
  const byCategory: Record<string, number> = {};

  for (const t of tasks) {
    byPriority[t.priority]++;
    byCategory[t.category] = (byCategory[t.category] || 0) + 1;
  }

  return {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    assigned: tasks.filter((t) => t.status === "assigned").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    escalated: tasks.filter((t) => t.status === "escalated").length,
    byPriority,
    byCategory,
  };
}

// ─── Store Reset ─────────────────────────────────────────

export function _resetWorkflowStores(): void {
  taskStore.clear();
  eventStore.length = 0;
}
