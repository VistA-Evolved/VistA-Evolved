/**
 * Adapter Loader — Phase 37C.
 *
 * Central registry that loads and manages adapter instances. Each adapter type
 * (clinical-engine, scheduling, billing, imaging, messaging) has a VistA
 * implementation and a stub fallback.
 *
 * Selection logic per adapter:
 *   1. If env var ADAPTER_<TYPE>=stub → use stub
 *   2. If env var ADAPTER_<TYPE>=vista → use VistA impl
 *   3. Default → VistA impl (since VistA is the core backend)
 *
 * All adapters are singletons — loaded once at startup.
 */

import { log } from '../lib/logger.js';
import type { BaseAdapter } from './types.js';

/* ------------------------------------------------------------------ */
/* Adapter registry (type → instance)                                  */
/* ------------------------------------------------------------------ */

const adapters = new Map<string, BaseAdapter>();

/* ------------------------------------------------------------------ */
/* Loader functions — lazy-imported to avoid circular deps             */
/* ------------------------------------------------------------------ */

async function loadClinicalEngineAdapter(variant: string): Promise<BaseAdapter> {
  if (variant === 'stub') {
    const { StubClinicalAdapter } = await import('./clinical-engine/stub-adapter.js');
    return new StubClinicalAdapter();
  }
  const { VistaClinicalAdapter } = await import('./clinical-engine/vista-adapter.js');
  return new VistaClinicalAdapter();
}

async function loadSchedulingAdapter(variant: string): Promise<BaseAdapter> {
  if (variant === 'stub') {
    const { StubSchedulingAdapter } = await import('./scheduling/stub-adapter.js');
    return new StubSchedulingAdapter();
  }
  const { VistaSchedulingAdapter } = await import('./scheduling/vista-adapter.js');
  return new VistaSchedulingAdapter();
}

async function loadBillingAdapter(variant: string): Promise<BaseAdapter> {
  if (variant === 'stub') {
    const { StubBillingAdapter } = await import('./billing/stub-adapter.js');
    return new StubBillingAdapter();
  }
  const { VistaBillingAdapter } = await import('./billing/vista-adapter.js');
  return new VistaBillingAdapter();
}

async function loadImagingAdapter(variant: string): Promise<BaseAdapter> {
  if (variant === 'stub') {
    const { StubImagingAdapter } = await import('./imaging/stub-adapter.js');
    return new StubImagingAdapter();
  }
  const { VistaImagingAdapter } = await import('./imaging/vista-adapter.js');
  return new VistaImagingAdapter();
}

async function loadMessagingAdapter(variant: string): Promise<BaseAdapter> {
  if (variant === 'stub') {
    const { StubMessagingAdapter } = await import('./messaging/stub-adapter.js');
    return new StubMessagingAdapter();
  }
  const { VistaMessagingAdapter } = await import('./messaging/vista-adapter.js');
  return new VistaMessagingAdapter();
}

/* ------------------------------------------------------------------ */
/* Type → loader mapping                                               */
/* ------------------------------------------------------------------ */

const ADAPTER_LOADERS: Record<string, (variant: string) => Promise<BaseAdapter>> = {
  'clinical-engine': loadClinicalEngineAdapter,
  scheduling: loadSchedulingAdapter,
  billing: loadBillingAdapter,
  imaging: loadImagingAdapter,
  messaging: loadMessagingAdapter,
};

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Initialize all adapters. Call once at startup.
 *
 * Reads ADAPTER_<TYPE> env vars to determine implementation:
 *   ADAPTER_CLINICAL_ENGINE=stub|vista (default: vista)
 *   ADAPTER_SCHEDULING=stub|vista     (default: vista)
 *   ADAPTER_BILLING=stub|vista        (default: vista)
 *   ADAPTER_IMAGING=stub|vista        (default: vista)
 *   ADAPTER_MESSAGING=stub|vista      (default: vista)
 */
export async function initAdapters(): Promise<void> {
  const types = Object.keys(ADAPTER_LOADERS);

  for (const type of types) {
    const envKey = `ADAPTER_${type.replace(/-/g, '_').toUpperCase()}`;
    const variant = (process.env[envKey] || 'vista').toLowerCase();

    try {
      const loader = ADAPTER_LOADERS[type];
      const adapter = await loader(variant);
      adapters.set(type, adapter);

      log.info('Adapter loaded', {
        type,
        implementation: adapter.implementationName,
        isStub: adapter._isStub,
      });
    } catch (err: any) {
      log.warn(`Failed to load adapter '${type}', falling back to stub`, {
        error: err.message,
      });
      // Fallback to stub
      try {
        const adapter = await ADAPTER_LOADERS[type]('stub');
        adapters.set(type, adapter);
      } catch {
        log.error(`Failed to load even stub adapter for '${type}'`);
      }
    }
  }

  log.info('Adapter loader initialized', {
    loaded: adapters.size,
    types: [...adapters.keys()],
    stubs: [...adapters.values()].filter((a) => a._isStub).map((a) => a.adapterType),
  });
}

/**
 * Get an adapter by type. Returns undefined if not loaded.
 */
export function getAdapter(type: string): BaseAdapter | undefined {
  return adapters.get(type);
}

/**
 * Get all loaded adapters.
 */
export function getAllAdapters(): Map<string, BaseAdapter> {
  return new Map(adapters);
}

/**
 * Get adapter health status for all loaded adapters.
 */
export async function getAdapterHealth(): Promise<
  Record<string, { ok: boolean; implementation: string; isStub: boolean; latencyMs: number }>
> {
  const result: Record<
    string,
    { ok: boolean; implementation: string; isStub: boolean; latencyMs: number }
  > = {};

  for (const [type, adapter] of adapters) {
    try {
      const health = await adapter.healthCheck();
      result[type] = {
        ok: health.ok,
        implementation: adapter.implementationName,
        isStub: adapter._isStub,
        latencyMs: health.latencyMs,
      };
    } catch {
      result[type] = {
        ok: false,
        implementation: adapter.implementationName,
        isStub: adapter._isStub,
        latencyMs: -1,
      };
    }
  }

  return result;
}

/**
 * Check if a specific adapter type is loaded and not a stub.
 */
export function isAdapterLive(type: string): boolean {
  const adapter = adapters.get(type);
  return !!adapter && !adapter._isStub;
}

/**
 * Replace an adapter at runtime (for testing or hot-swap).
 */
export function setAdapter(type: string, adapter: BaseAdapter): void {
  adapters.set(type, adapter);
  log.info('Adapter replaced at runtime', {
    type,
    implementation: adapter.implementationName,
    isStub: adapter._isStub,
  });
}
