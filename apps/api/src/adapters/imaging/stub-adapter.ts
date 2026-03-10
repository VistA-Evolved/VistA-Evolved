/**
 * Stub Imaging Adapter -- Phase 37C.
 * Returns pending stubs when no imaging backend is configured.
 */

import type { ImagingAdapter, ImagingStudy, ImagingOrder } from './interface.js';
import type { AdapterResult } from '../types.js';

export class StubImagingAdapter implements ImagingAdapter {
  readonly adapterType = 'imaging' as const;
  readonly implementationName = 'stub';
  readonly _isStub = true;

  async healthCheck() {
    return { ok: true, latencyMs: 0, detail: 'Stub imaging adapter -- no backend' };
  }

  async getStudies(_dfn: string): Promise<AdapterResult<ImagingStudy[]>> {
    return { ok: false, pending: true, error: 'Imaging adapter not configured' };
  }

  async getStudyMetadata(_id: string): Promise<AdapterResult<Record<string, unknown>>> {
    return { ok: false, pending: true, error: 'Imaging adapter not configured' };
  }

  async getViewerUrl(_id: string): Promise<AdapterResult<string>> {
    return { ok: false, pending: true, error: 'Imaging adapter not configured' };
  }

  async submitOrder(): Promise<AdapterResult<ImagingOrder>> {
    return { ok: false, pending: true, error: 'Imaging adapter not configured' };
  }

  async getWorklist(): Promise<AdapterResult<ImagingOrder[]>> {
    return { ok: false, pending: true, error: 'Imaging adapter not configured' };
  }
}
