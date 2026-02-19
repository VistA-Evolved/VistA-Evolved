/**
 * Imaging Adapter Interface — Phase 37C.
 */

import type { BaseAdapter, AdapterResult } from "../types.js";

export interface ImagingStudy {
  id: string;
  patientDfn: string;
  modality: string;
  description: string;
  dateTime: string;
  status: string;
  accessionNumber?: string;
  seriesCount?: number;
  instanceCount?: number;
}

export interface ImagingOrder {
  id: string;
  patientDfn: string;
  procedure: string;
  urgency: string;
  status: string;
  orderedBy?: string;
  orderedDate?: string;
}

export interface ImagingAdapter extends BaseAdapter {
  readonly adapterType: "imaging";
  getStudies(patientDfn: string): Promise<AdapterResult<ImagingStudy[]>>;
  getStudyMetadata(studyId: string): Promise<AdapterResult<Record<string, unknown>>>;
  getViewerUrl(studyId: string): Promise<AdapterResult<string>>;
  submitOrder(order: Partial<ImagingOrder>): Promise<AdapterResult<ImagingOrder>>;
  getWorklist(): Promise<AdapterResult<ImagingOrder[]>>;
}
