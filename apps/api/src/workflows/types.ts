/**
 * Phase 160: Department Workflow Packs — Types
 */

/** Workflow step status */
export type WorkflowStepStatus = "pending" | "active" | "completed" | "skipped";

/** Overall workflow instance status */
export type WorkflowInstanceStatus = "not_started" | "in_progress" | "completed" | "cancelled";

/** A single step in a workflow definition */
export interface WorkflowStepDef {
  id: string;
  name: string;
  description: string;
  order: number;
  requiredRole?: string;          // e.g., "nurse", "provider", "clerk"
  estimatedMinutes?: number;
  specialtyTag?: string;          // Links to Phase 158 template specialty
  templateId?: string;            // Links to a specific template
  isOptional?: boolean;
  automationHook?: string;        // Future: RPC or webhook trigger
  vistaIntegration?: {
    targetRpc?: string;
    status: "available" | "integration-pending";
  };
}

/** A department workflow definition (reusable blueprint) */
export interface WorkflowDefinition {
  id: string;
  tenantId: string;
  department: string;
  name: string;
  description: string;
  version: number;
  status: "draft" | "active" | "archived";
  steps: WorkflowStepDef[];
  tags: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

/** A step instance (runtime state) */
export interface WorkflowStepInstance {
  stepId: string;
  name: string;
  status: WorkflowStepStatus;
  startedAt?: string;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
  skippedReason?: string;
}

/** A workflow instance (runtime execution) */
export interface WorkflowInstance {
  id: string;
  tenantId: string;
  definitionId: string;
  department: string;
  patientDfn: string;
  encounterRef?: string;           // Link to VistA encounter
  queueTicketId?: string;          // Link to Phase 159 queue
  status: WorkflowInstanceStatus;
  steps: WorkflowStepInstance[];
  startedAt: string;
  completedAt?: string;
  startedBy?: string;
}

/** Department pack metadata */
export interface DepartmentPack {
  department: string;
  displayName: string;
  description: string;
  workflows: WorkflowDefinition[];
}
