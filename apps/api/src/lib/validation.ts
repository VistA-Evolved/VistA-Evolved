/**
 * Input validation schemas — Phase 15A.
 *
 * Zod schemas for all request bodies and query parameters.
 * Used by the validation middleware to reject malformed input early.
 */

import { z } from "zod/v4";

/* ================================================================== */
/* Auth schemas                                                        */
/* ================================================================== */

export const LoginBodySchema = z.object({
  accessCode: z.string().min(1, "accessCode is required").max(64),
  verifyCode: z.string().min(1, "verifyCode is required").max(64),
});

/* ================================================================== */
/* Patient query schemas                                               */
/* ================================================================== */

export const PatientSearchQuerySchema = z.object({
  q: z.string().min(2, "Query must be at least 2 characters").max(100),
});

export const DfnQuerySchema = z.object({
  dfn: z.string().regex(/^\d+$/, "dfn must be a positive integer"),
});

export const DfnWithDateQuerySchema = z.object({
  dfn: z.string().regex(/^\d+$/, "dfn must be a positive integer"),
  dateRange: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

/* ================================================================== */
/* Write-back schemas                                                   */
/* ================================================================== */

export const AllergyAddSchema = z.object({
  dfn: z.union([z.string(), z.number()]),
  allergyName: z.string().min(1, "allergyName is required"),
  allergyIEN: z.union([z.string(), z.number()]),
  fileRoot: z.string().optional(),
  symptoms: z.array(z.string()).optional(),
  severity: z.string().optional(),
  comment: z.string().optional(),
});

export const VitalsAddSchema = z.object({
  dfn: z.union([z.string(), z.number()]),
  vitals: z.array(z.object({
    type: z.string().min(1),
    value: z.string().min(1),
    unit: z.string().optional(),
  })).min(1, "At least one vital measurement required"),
  locationIen: z.union([z.string(), z.number()]).optional(),
});

export const NoteCreateSchema = z.object({
  dfn: z.union([z.string(), z.number()]),
  title: z.string().optional(),
  titleIen: z.union([z.string(), z.number()]).optional(),
  text: z.string().min(1, "Note text is required"),
  locationIen: z.union([z.string(), z.number()]).optional(),
});

export const MedicationAddSchema = z.object({
  dfn: z.union([z.string(), z.number()]),
  orderDialogIen: z.union([z.string(), z.number()]),
  drug: z.string().optional(),
  dose: z.string().optional(),
  route: z.string().optional(),
  schedule: z.string().optional(),
});

export const ProblemSaveSchema = z.object({
  dfn: z.union([z.string(), z.number()]),
  problemText: z.string().min(1, "problemText is required"),
  icdCode: z.string().optional(),
  onset: z.string().optional(),
  status: z.string().optional(),
  action: z.enum(["add", "edit"]).optional(),
  savedBy: z.string().optional(),
});

export const OrderSignSchema = z.object({
  dfn: z.union([z.string(), z.number()]),
  orderId: z.union([z.string(), z.number()]),
  orderName: z.string().optional(),
  signedBy: z.string().optional(),
});

export const OrderReleaseSchema = z.object({
  dfn: z.union([z.string(), z.number()]),
  orderId: z.union([z.string(), z.number()]),
  releasedBy: z.string().optional(),
});

export const LabAckSchema = z.object({
  dfn: z.union([z.string(), z.number()]),
  labIds: z.array(z.union([z.string(), z.number()])).min(1, "At least one labId required"),
  acknowledgedBy: z.string().optional(),
});

export const ConsultCreateSchema = z.object({
  dfn: z.union([z.string(), z.number()]),
  service: z.string().min(1, "service is required"),
  urgency: z.string().optional(),
  reason: z.string().optional(),
  requestedBy: z.string().optional(),
});

export const SurgeryCreateSchema = z.object({
  dfn: z.union([z.string(), z.number()]),
  procedure: z.string().min(1, "procedure is required"),
  surgeon: z.string().optional(),
  scheduledDate: z.string().optional(),
  createdBy: z.string().optional(),
});

/* ================================================================== */
/* Query/filter schemas                                                 */
/* ================================================================== */

export const DraftQuerySchema = z.object({
  type: z.string().optional(),
  status: z.string().optional(),
  dfn: z.string().optional(),
});

export const AuditQuerySchema = z.object({
  actionPrefix: z.string().optional(),
  actorDuz: z.string().optional(),
  patientDfn: z.string().optional(),
  since: z.string().optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});

export const ReportTextQuerySchema = z.object({
  dfn: z.string().regex(/^\d+$/, "dfn must be a positive integer"),
  id: z.string().min(1, "report id is required"),
  hsType: z.string().optional(),
});

/* ================================================================== */
/* Helper: validate and return typed result or error                    */
/* ================================================================== */

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; details: Array<{ path: string; message: string }> };

/**
 * Validate input against a zod schema.
 * Returns typed result or structured error with field-level details.
 */
export function validate<T>(schema: z.ZodType<T>, input: unknown): ValidationResult<T> {
  const result = schema.safeParse(input);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  const details = result.error.issues.map((issue) => ({
    path: (issue.path || []).join("."),
    message: issue.message,
  }));
  return {
    ok: false,
    error: "Validation failed",
    details,
  };
}
