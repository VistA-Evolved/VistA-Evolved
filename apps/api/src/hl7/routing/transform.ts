/**
 * HL7v2 Routing — Transform Pipeline
 *
 * Phase 240 (Wave 6 P3): Applies a chain of transformation steps to an
 * HL7v2 message before dispatch. Transforms operate on the raw message text.
 *
 * PHI safety: Transform operations are logged by step ID only.
 * Message content never appears in logs.
 */

import { log } from "../../lib/logger.js";
import type { TransformStep, TransformResult } from "./types.js";
import { HL7_SEGMENT_SEP } from "../types.js";

/**
 * Run the transform pipeline on a message.
 *
 * @param messageText - Raw HL7v2 message text
 * @param steps - Ordered transform steps
 * @returns Transform result with modified message text
 */
export function runTransformPipeline(
  messageText: string,
  steps: TransformStep[],
): TransformResult {
  let current = messageText;
  const appliedSteps: string[] = [];
  const skippedSteps: string[] = [];
  const warnings: string[] = [];

  for (const step of steps) {
    try {
      const result = applyStep(current, step);
      if (result.applied) {
        current = result.text;
        appliedSteps.push(step.id);
      } else {
        skippedSteps.push(step.id);
      }
      if (result.warning) {
        warnings.push(`${step.id}: ${result.warning}`);
      }
    } catch (err) {
      warnings.push(`${step.id}: transform error - ${(err as Error).message}`);
      skippedSteps.push(step.id);
    }
  }

  if (appliedSteps.length > 0) {
    log.info("HL7 transforms applied", {
      component: "hl7-transform",
      applied: appliedSteps,
      skipped: skippedSteps,
    });
  }

  return {
    messageText: current,
    appliedSteps,
    skippedSteps,
    warnings,
  };
}

/* ------------------------------------------------------------------ */
/*  Individual Transform Operations                                    */
/* ------------------------------------------------------------------ */

interface StepResult {
  text: string;
  applied: boolean;
  warning?: string;
}

function applyStep(text: string, step: TransformStep): StepResult {
  switch (step.op) {
    case "remove-segment":
      return removeSegment(text, step.params);
    case "filter-segments":
      return filterSegments(text, step.params);
    case "set-field":
      return setField(text, step.params);
    case "replace-value":
      return replaceValue(text, step.params);
    case "copy-field":
      return copyField(text, step.params);
    case "custom":
      return { text, applied: false, warning: "Custom transforms not yet implemented" };
    default:
      return { text, applied: false, warning: `Unknown op: ${step.op}` };
  }
}

/**
 * Remove all segments of a given type.
 * Params: { segmentName: string }
 */
function removeSegment(text: string, params: Record<string, unknown>): StepResult {
  const segName = params.segmentName as string;
  if (!segName) return { text, applied: false, warning: "Missing segmentName param" };

  const segments = text.split(HL7_SEGMENT_SEP);
  const filtered = segments.filter((s) => !s.startsWith(segName + "|") && s !== segName);
  const newText = filtered.join(HL7_SEGMENT_SEP);
  const removed = segments.length - filtered.length;

  return {
    text: newText,
    applied: removed > 0,
    warning: removed === 0 ? `No ${segName} segments found` : undefined,
  };
}

/**
 * Keep only specified segment types (plus MSH which is always kept).
 * Params: { keep: string[] }
 */
function filterSegments(text: string, params: Record<string, unknown>): StepResult {
  const keep = new Set(params.keep as string[]);
  if (keep.size === 0) return { text, applied: false, warning: "Empty keep list" };
  keep.add("MSH"); // Always keep MSH

  const segments = text.split(HL7_SEGMENT_SEP);
  const filtered = segments.filter((s) => {
    const name = s.split("|")[0] || "";
    return keep.has(name);
  });

  return {
    text: filtered.join(HL7_SEGMENT_SEP),
    applied: true,
  };
}

/**
 * Set a field in a specific segment to a fixed value.
 * Params: { segmentName: string, fieldIndex: number, value: string }
 */
function setField(text: string, params: Record<string, unknown>): StepResult {
  const segName = params.segmentName as string;
  const fieldIdx = params.fieldIndex as number;
  const value = params.value as string;

  if (!segName || fieldIdx === undefined || value === undefined) {
    return { text, applied: false, warning: "Missing params for set-field" };
  }

  const segments = text.split(HL7_SEGMENT_SEP);
  let applied = false;

  const updated = segments.map((seg) => {
    if (!seg.startsWith(segName + "|")) return seg;
    const fields = seg.split("|");
    if (fieldIdx < fields.length) {
      fields[fieldIdx] = value;
      applied = true;
    }
    return fields.join("|");
  });

  return { text: updated.join(HL7_SEGMENT_SEP), applied };
}

/**
 * Find/replace within all field values.
 * Params: { find: string, replace: string, segmentName?: string }
 */
function replaceValue(text: string, params: Record<string, unknown>): StepResult {
  const find = params.find as string;
  const replace = params.replace as string;

  if (!find) return { text, applied: false, warning: "Missing find param" };

  const segFilter = params.segmentName as string | undefined;
  const segments = text.split(HL7_SEGMENT_SEP);
  let applied = false;

  const updated = segments.map((seg) => {
    if (segFilter && !seg.startsWith(segFilter + "|")) return seg;
    if (seg.includes(find)) {
      applied = true;
      return seg.replaceAll(find, replace ?? "");
    }
    return seg;
  });

  return { text: updated.join(HL7_SEGMENT_SEP), applied };
}

/**
 * Copy a field value from one segment/field to another.
 * Params: { fromSegment: string, fromField: number, toSegment: string, toField: number }
 */
function copyField(text: string, params: Record<string, unknown>): StepResult {
  const fromSeg = params.fromSegment as string;
  const fromField = params.fromField as number;
  const toSeg = params.toSegment as string;
  const toField = params.toField as number;

  if (!fromSeg || !toSeg || fromField === undefined || toField === undefined) {
    return { text, applied: false, warning: "Missing params for copy-field" };
  }

  const segments = text.split(HL7_SEGMENT_SEP);

  // Find source value
  let sourceValue = "";
  for (const seg of segments) {
    if (seg.startsWith(fromSeg + "|")) {
      const fields = seg.split("|");
      sourceValue = fields[fromField] || "";
      break;
    }
  }

  if (!sourceValue) return { text, applied: false, warning: `Source ${fromSeg}-${fromField} empty` };

  // Set target value
  let applied = false;
  const updated = segments.map((seg) => {
    if (!seg.startsWith(toSeg + "|")) return seg;
    const fields = seg.split("|");
    while (fields.length <= toField) fields.push("");
    fields[toField] = sourceValue;
    applied = true;
    return fields.join("|");
  });

  return { text: updated.join(HL7_SEGMENT_SEP), applied };
}
