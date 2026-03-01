/**
 * HL7v2 Message Template Library — Template Validator
 *
 * Phase 319 (W14-P3): Validates HL7v2 messages against templates.
 * Checks segment structure, field constraints, and conformance profiles.
 */

import type { Hl7Message, Hl7Segment } from "../types.js";
import { getField, getSegments } from "../parser.js";
import type {
  MessageTemplate,
  SegmentTemplate,
  FieldConstraint,
  TemplateValidationResult,
  TemplateValidationIssue,
} from "./types.js";

/**
 * Validate an HL7v2 message against a message template.
 * Checks: segment presence/cardinality, field optionality, field length,
 * fixed values, and reports conformance profile coverage.
 */
export function validateAgainstTemplate(
  message: Hl7Message,
  template: MessageTemplate,
): TemplateValidationResult {
  const issues: TemplateValidationIssue[] = [];
  let checksPerformed = 0;

  // Check message type matches template
  checksPerformed++;
  const mshSegments = getSegments(message, "MSH");
  const mshSeg = mshSegments[0];
  const mshType = mshSeg ? getField(mshSeg, 9) : "";
  if (!mshType.startsWith(template.messageType.split("^")[0]!)) {
    issues.push({
      severity: "error",
      category: "structure",
      ruleCode: "TPL-001",
      message: `Message type ${mshType} does not match template ${template.messageType}`,
    });
  }

  // Check HL7 version
  checksPerformed++;
  const mshVersion = mshSeg ? getField(mshSeg, 12) : "";
  if (mshVersion && template.hl7Version && !mshVersion.startsWith(template.hl7Version.split(".").slice(0, 2).join("."))) {
    issues.push({
      severity: "warning",
      category: "conformance",
      ruleCode: "TPL-002",
      message: `HL7 version ${mshVersion} may not match template version ${template.hl7Version}`,
    });
  }

  // Check each segment template
  for (const segTpl of template.segments) {
    const segments = getSegments(message, segTpl.segmentId);
    const segCount = segments.length;

    // Check segment presence
    checksPerformed++;
    if (segTpl.usage === "R" && segCount < Math.max(1, segTpl.minReps)) {
      issues.push({
        severity: "error",
        category: "segment",
        segmentRef: segTpl.segmentId,
        ruleCode: "TPL-SEG-001",
        message: `Required segment ${segTpl.segmentId} is missing (min: ${segTpl.minReps})`,
      });
      continue;
    }

    if (segTpl.usage === "X" && segCount > 0) {
      issues.push({
        severity: "warning",
        category: "segment",
        segmentRef: segTpl.segmentId,
        ruleCode: "TPL-SEG-002",
        message: `Segment ${segTpl.segmentId} is marked as not-used but is present`,
      });
    }

    // Check cardinality
    checksPerformed++;
    if (segTpl.maxReps > 0 && segCount > segTpl.maxReps) {
      issues.push({
        severity: "error",
        category: "segment",
        segmentRef: segTpl.segmentId,
        ruleCode: "TPL-SEG-003",
        message: `Segment ${segTpl.segmentId} appears ${segCount} times but max is ${segTpl.maxReps}`,
      });
    }

    // Check fields in each segment instance
    for (let idx = 0; idx < segCount; idx++) {
      const segRef = segCount > 1 ? `${segTpl.segmentId}[${idx + 1}]` : segTpl.segmentId;
      const seg = segments[idx];
      if (!seg) continue;

      for (const fc of segTpl.fields) {
        checksPerformed++;
        const fieldIssues = validateFieldConstraint(seg, fc, segRef);
        issues.push(...fieldIssues);
      }
    }
  }

  // Profile coverage reporting
  const profilesChecked = template.profiles.map((p) => p.id);

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return {
    templateId: template.id,
    valid: errorCount === 0,
    checksPerformed,
    issues,
    errorCount,
    warningCount,
    profilesChecked,
  };
}

/**
 * Validate a single field against its constraint.
 */
function validateFieldConstraint(
  segment: Hl7Segment,
  constraint: FieldConstraint,
  segRef: string,
): TemplateValidationIssue[] {
  const issues: TemplateValidationIssue[] = [];
  const fieldValue = getField(segment, constraint.position);
  const fieldRef = `${segRef}-${constraint.position}`;

  // Required field check
  if (constraint.optionality === "R" && !fieldValue.trim()) {
    issues.push({
      severity: "error",
      category: "field",
      segmentRef: segRef,
      fieldRef,
      ruleCode: "TPL-FLD-001",
      message: `Required field ${fieldRef} (${constraint.name}) is empty`,
    });
    return issues;
  }

  // Skip further checks if field is empty and optional
  if (!fieldValue.trim()) return issues;

  // Max length check
  if (constraint.maxLength && constraint.maxLength > 0 && fieldValue.length > constraint.maxLength) {
    issues.push({
      severity: "warning",
      category: "field",
      segmentRef: segRef,
      fieldRef,
      ruleCode: "TPL-FLD-002",
      message: `Field ${fieldRef} (${constraint.name}) exceeds max length ${constraint.maxLength} (actual: ${fieldValue.length})`,
    });
  }

  // Fixed value check
  if (constraint.fixedValue && fieldValue !== constraint.fixedValue) {
    issues.push({
      severity: "error",
      category: "field",
      segmentRef: segRef,
      fieldRef,
      ruleCode: "TPL-FLD-003",
      message: `Field ${fieldRef} (${constraint.name}) must be "${constraint.fixedValue}" but is "${fieldValue}"`,
    });
  }

  return issues;
}

/**
 * Generate a summary of template conformance for reporting.
 */
export function getConformanceSummary(template: MessageTemplate): {
  templateId: string;
  templateName: string;
  messageType: string;
  profiles: Array<{ id: string; name: string; source: string }>;
  segmentCount: number;
  requiredSegments: string[];
  totalFieldConstraints: number;
  requiredFields: number;
} {
  const requiredSegments = template.segments
    .filter((s) => s.usage === "R")
    .map((s) => s.segmentId);

  const totalFieldConstraints = template.segments.reduce(
    (sum, s) => sum + s.fields.length,
    0,
  );

  const requiredFields = template.segments.reduce(
    (sum, s) => sum + s.fields.filter((f) => f.optionality === "R").length,
    0,
  );

  return {
    templateId: template.id,
    templateName: template.name,
    messageType: template.messageType,
    profiles: template.profiles.map((p) => ({ id: p.id, name: p.name, source: p.source })),
    segmentCount: template.segments.length,
    requiredSegments,
    totalFieldConstraints,
    requiredFields,
  };
}
