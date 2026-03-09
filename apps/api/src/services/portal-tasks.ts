/**
 * Portal Tasks & Notifications — Phase 32
 *
 * Unified task/notification feed for patients and staff.
 * Aggregates from:
 *  - Appointments (upcoming reminders)
 *  - Messages (unread count)
 *  - Refill requests (status changes)
 *  - General clinical tasks (e.g., form completion, lab results available)
 *
 * Patient view: notification badge counts + task list
 * Staff view: aggregated queue across patients
 *
 * This is not a VistA-native task system. VistA has OE/RR notifications
 * (ORB mechanism) which are complex and provider-facing. This service
 * provides a patient-portal-oriented task stream that COULD be extended
 * to wrap ORB notifications for clinicians in the future.
 */

import { randomBytes } from "node:crypto";
import { portalAudit } from "./portal-audit.js";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export type TaskCategory =
  | "appointment_reminder"
  | "message_unread"
  | "refill_status"
  | "form_due"
  | "lab_result"
  | "general";

export type TaskPriority = "low" | "normal" | "high" | "urgent";
export type TaskStatus = "active" | "completed" | "dismissed" | "expired";

export interface PortalTask {
  id: string;
  tenantId: string;
  patientDfn: string;
  patientName: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  title: string;
  body: string;
  /** Deep link within the portal (e.g., /dashboard/messages, /dashboard/refills) */
  actionUrl: string | null;
  actionLabel: string | null;
  /** Source reference — e.g., refill ID, appointment ID, message thread ID */
  sourceId: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  /** Staff-generated or system-generated */
  createdBy: string;
  isSystemGenerated: boolean;
}

/* ------------------------------------------------------------------ */
/* Store + seed data                                                    */
/* ------------------------------------------------------------------ */

const taskStore = new Map<string, PortalTask>();
let taskSeq = 0;

/* Phase 146: DB repo wiring */
let taskDbRepo: { upsert(d: any): Promise<any>; update?(id: string, u: any): Promise<any> } | null = null;
export function initTaskStoreRepo(repo: typeof taskDbRepo): void { taskDbRepo = repo; }

function persistTaskRow(task: PortalTask): void {
  taskDbRepo
    ?.upsert({
      id: task.id,
      tenantId: task.tenantId,
      patientDfn: task.patientDfn,
      title: task.title,
      description: task.body,
      taskType: task.category,
      status: task.status,
      priority: task.priority,
      dueDate: task.expiresAt,
      assignedTo: task.createdBy,
      completedAt: task.status === 'completed' ? task.updatedAt : null,
      metadataJson: JSON.stringify({
        patientName: task.patientName,
        actionUrl: task.actionUrl,
        actionLabel: task.actionLabel,
        sourceId: task.sourceId,
        isSystemGenerated: task.isSystemGenerated,
      }),
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    })
    .catch(() => {});
}

function generateId(): string {
  return `task-${++taskSeq}-${randomBytes(4).toString("hex")}`;
}

/** Seed demo tasks for dev patient */
function seedDemoTasks() {
  const now = new Date();

  const demos: Partial<PortalTask>[] = [
    {
      patientDfn: "100022", patientName: "CARTER,DAVID",
      category: "appointment_reminder", priority: "normal",
      title: "Upcoming appointment in 3 days",
      body: "Primary Care appointment with Dr. Provider on " +
            new Date(now.getTime() + 3 * 86400000).toLocaleDateString(),
      actionUrl: "/dashboard/appointments",
      actionLabel: "View Appointments",
      sourceId: "appt-demo-1",
      status: "active",
      expiresAt: new Date(now.getTime() + 3 * 86400000).toISOString(),
    },
    {
      patientDfn: "100022", patientName: "CARTER,DAVID",
      category: "refill_status", priority: "normal",
      title: "Refill request approved",
      body: "Your refill request for LISINOPRIL 10MG TAB has been approved.",
      actionUrl: "/dashboard/refills",
      actionLabel: "View Refills",
      sourceId: "refill-1",
      status: "active",
      expiresAt: new Date(now.getTime() + 7 * 86400000).toISOString(),
    },
    {
      patientDfn: "100022", patientName: "CARTER,DAVID",
      category: "message_unread", priority: "normal",
      title: "New message from your care team",
      body: "You have 1 unread message.",
      actionUrl: "/dashboard/messages",
      actionLabel: "View Messages",
      sourceId: "thread-demo-1",
      status: "active",
      expiresAt: null,
    },
    {
      patientDfn: "100022", patientName: "CARTER,DAVID",
      category: "form_due", priority: "high",
      title: "Health questionnaire due",
      body: "Please complete the pre-visit health questionnaire before your next appointment.",
      actionUrl: null,
      actionLabel: null,
      sourceId: null,
      status: "active",
      expiresAt: new Date(now.getTime() + 3 * 86400000).toISOString(),
    },
  ];

  for (const d of demos) {
    const id = generateId();
    taskStore.set(id, {
      id,
      tenantId: "default",
      patientDfn: d.patientDfn!,
      patientName: d.patientName!,
      category: d.category!,
      priority: d.priority!,
      status: d.status || "active",
      title: d.title!,
      body: d.body!,
      actionUrl: d.actionUrl ?? null,
      actionLabel: d.actionLabel ?? null,
      sourceId: d.sourceId ?? null,
      createdAt: new Date(now.getTime() - 86400000).toISOString(),
      updatedAt: new Date(now.getTime() - 86400000).toISOString(),
      expiresAt: d.expiresAt ?? null,
      createdBy: "system",
      isSystemGenerated: true,
    });
  }
}

seedDemoTasks();

/* ------------------------------------------------------------------ */
/* Expire stale tasks on read                                           */
/* ------------------------------------------------------------------ */

function expireStale() {
  const now = Date.now();
  for (const task of taskStore.values()) {
    if (task.status === "active" && task.expiresAt) {
      if (new Date(task.expiresAt).getTime() < now) {
        task.status = "expired";
        task.updatedAt = new Date().toISOString();
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Patient queries                                                      */
/* ------------------------------------------------------------------ */

export function getPatientTasks(tenantId: string, patientDfn: string, opts?: {
  statusFilter?: TaskStatus[];
  categoryFilter?: TaskCategory[];
}): PortalTask[] {
  expireStale();
  return [...taskStore.values()]
    .filter(t => t.tenantId === tenantId && t.patientDfn === patientDfn)
    .filter(t => !opts?.statusFilter?.length || opts.statusFilter.includes(t.status))
    .filter(t => !opts?.categoryFilter?.length || opts.categoryFilter.includes(t.category))
    .sort((a, b) => {
      // Sort by priority (urgent first), then by date
      const pMap: Record<TaskPriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
      const pd = pMap[a.priority] - pMap[b.priority];
      if (pd !== 0) return pd;
      return b.createdAt.localeCompare(a.createdAt);
    });
}

export function getPatientTaskCounts(tenantId: string, patientDfn: string): {
  total: number;
  byCategory: Record<TaskCategory, number>;
} {
  expireStale();
  const active = [...taskStore.values()]
    .filter(t => t.tenantId === tenantId && t.patientDfn === patientDfn && t.status === "active");

  const byCategory: Record<TaskCategory, number> = {
    appointment_reminder: 0,
    message_unread: 0,
    refill_status: 0,
    form_due: 0,
    lab_result: 0,
    general: 0,
  };

  for (const t of active) byCategory[t.category]++;

  return { total: active.length, byCategory };
}

/* ------------------------------------------------------------------ */
/* Staff queries                                                        */
/* ------------------------------------------------------------------ */

/** All active tasks across all patients — staff dashboard */
export function getStaffTaskQueue(opts?: {
  tenantId?: string;
  categoryFilter?: TaskCategory[];
}): PortalTask[] {
  expireStale();
  return [...taskStore.values()]
    .filter(t => t.tenantId === (opts?.tenantId || 'default'))
    .filter(t => t.status === "active")
    .filter(t => !opts?.categoryFilter?.length || opts.categoryFilter.includes(t.category))
    .sort((a, b) => {
      const pMap: Record<TaskPriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
      const pd = pMap[a.priority] - pMap[b.priority];
      if (pd !== 0) return pd;
      return a.createdAt.localeCompare(b.createdAt);  // FIFO for staff
    });
}

/* ------------------------------------------------------------------ */
/* Mutations                                                            */
/* ------------------------------------------------------------------ */

/** Create a new task (system or staff) */
export function createTask(opts: {
  tenantId?: string;
  patientDfn: string;
  patientName: string;
  category: TaskCategory;
  priority: TaskPriority;
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
  sourceId?: string;
  expiresAt?: string;
  createdBy: string;
  isSystemGenerated: boolean;
}): PortalTask {
  const id = generateId();
  const now = new Date().toISOString();

  const task: PortalTask = {
    id,
    tenantId: opts.tenantId ?? 'default',
    patientDfn: opts.patientDfn,
    patientName: opts.patientName,
    category: opts.category,
    priority: opts.priority,
    status: "active",
    title: opts.title.slice(0, 200),
    body: opts.body.slice(0, 2000),
    actionUrl: opts.actionUrl ?? null,
    actionLabel: opts.actionLabel ?? null,
    sourceId: opts.sourceId ?? null,
    createdAt: now,
    updatedAt: now,
    expiresAt: opts.expiresAt ?? null,
    createdBy: opts.createdBy,
    isSystemGenerated: opts.isSystemGenerated,
  };

  taskStore.set(id, task);

  // Phase 146: Write-through to PG
  persistTaskRow(task);

  portalAudit("portal.task.create" as any, "success", opts.patientDfn, {
    tenantId: opts.tenantId ?? 'default',
    detail: { taskId: id, category: opts.category, title: opts.title },
  });

  return task;
}

/** Patient or staff dismisses a task */
export function dismissTask(taskId: string, patientDfn: string, tenantId: string = 'default'): PortalTask | null {
  const task = taskStore.get(taskId);
  if (!task || task.tenantId !== tenantId || task.patientDfn !== patientDfn) return null;
  if (task.status !== "active") return null;

  task.status = "dismissed";
  task.updatedAt = new Date().toISOString();

  // Phase 146: Write-through dismiss
  if (taskDbRepo?.update) {
    taskDbRepo.update(taskId, {
      status: task.status,
      updatedAt: task.updatedAt,
    }).catch(() => {});
  } else {
    persistTaskRow(task);
  }

  portalAudit("portal.task.dismiss" as any, "success", patientDfn, {
    tenantId,
    detail: { taskId },
  });

  return task;
}

/** Mark a task as completed */
export function completeTask(taskId: string, patientDfn: string, tenantId: string = 'default'): PortalTask | null {
  const task = taskStore.get(taskId);
  if (!task || task.tenantId !== tenantId || task.patientDfn !== patientDfn) return null;
  if (task.status !== "active") return null;

  task.status = "completed";
  task.updatedAt = new Date().toISOString();

  // Phase 146: Write-through complete
  if (taskDbRepo?.update) {
    taskDbRepo.update(taskId, {
      status: task.status,
      completedAt: task.updatedAt,
      updatedAt: task.updatedAt,
    }).catch(() => {});
  } else {
    persistTaskRow(task);
  }

  portalAudit("portal.task.complete" as any, "success", patientDfn, {
    tenantId,
    detail: { taskId },
  });

  return task;
}
