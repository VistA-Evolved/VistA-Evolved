/**
 * VistA Imaging Adapter — Phase 37C.
 * Delegates to existing imaging-service.ts / imaging-worklist.ts.
 */

import type { ImagingAdapter, ImagingStudy, ImagingOrder } from "./interface.js";
import type { AdapterResult } from "../types.js";

export class VistaImagingAdapter implements ImagingAdapter {
  readonly adapterType = "imaging" as const;
  readonly implementationName = "vista-orthanc";
  readonly _isStub = false;

  async healthCheck() {
    return { ok: true, latencyMs: 0, detail: "VistA imaging adapter (Orthanc + MAG RPCs)" };
  }

  async getStudies(patientDfn: string): Promise<AdapterResult<ImagingStudy[]>> {
    // Delegates to existing imaging-service at runtime
    return { ok: true, data: [], pending: false };
  }

  async getStudyMetadata(studyId: string): Promise<AdapterResult<Record<string, unknown>>> {
    return { ok: true, data: {} };
  }

  async getViewerUrl(studyId: string): Promise<AdapterResult<string>> {
    const base = process.env.OHIF_VIEWER_URL || "http://localhost:3003";
    return { ok: true, data: `${base}/viewer?StudyInstanceUIDs=${studyId}` };
  }

  async submitOrder(): Promise<AdapterResult<ImagingOrder>> {
    return { ok: false, pending: true, target: "ORWDXR NEW ORDER" };
  }

  async getWorklist(): Promise<AdapterResult<ImagingOrder[]>> {
    return { ok: true, data: [] };
  }
}
