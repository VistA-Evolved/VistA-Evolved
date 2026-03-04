/**
 * tripwire-monitor.ts -- RPC Tripwire Monitoring (Phase 161)
 *
 * Tripwires detect unexpected changes in RPC behavior:
 * - Empty responses where data was expected
 * - Errors on previously stable RPCs
 * - Timeouts exceeding thresholds
 * - Unregistered RPCs appearing in call sites
 * - Registry drift between captures
 *
 * In-memory stores -- reset on API restart. Future: persist to PG.
 */

import { randomUUID } from 'node:crypto';
import type { RpcTripwire, TripwireEvent, TripwireCondition } from './types.js';

/* ------------------------------------------------------------------ */
/*  In-memory stores                                                   */
/* ------------------------------------------------------------------ */
const tripwireStore = new Map<string, RpcTripwire>();
const eventStore: TripwireEvent[] = [];
const MAX_EVENTS = 5000;

/* ------------------------------------------------------------------ */
/*  Default tripwires for common RPC failure patterns                  */
/* ------------------------------------------------------------------ */
const DEFAULT_TRIPWIRES: Array<{
  rpcName: string;
  condition: TripwireCondition;
  description: string;
  threshold?: number;
}> = [
  {
    rpcName: 'ORQQAL LIST',
    condition: 'response_empty',
    description: 'Allergy list returns empty for patient with known allergies',
  },
  {
    rpcName: 'ORWPT LIST ALL',
    condition: 'timeout',
    description: 'Patient list takes >10s (VistA File 2 scan bottleneck)',
    threshold: 10000,
  },
  {
    rpcName: 'ORWPS ACTIVE',
    condition: 'schema_mismatch',
    description: 'Medication list returns unexpected multi-line format',
  },
  {
    rpcName: 'TIU CREATE RECORD',
    condition: 'response_error',
    description: 'Note creation returns error (unsigned note limit, lock, etc.)',
  },
  {
    rpcName: '*',
    condition: 'new_rpc_unregistered',
    description: 'Any callRpc invocation referencing unregistered RPC name',
  },
];

/* ------------------------------------------------------------------ */
/*  Tripwire CRUD                                                      */
/* ------------------------------------------------------------------ */

export function registerTripwire(
  rpcName: string,
  condition: TripwireCondition,
  description: string,
  threshold?: number
): RpcTripwire {
  const tw: RpcTripwire = {
    id: randomUUID(),
    rpcName,
    condition,
    enabled: true,
    fireCount: 0,
    description,
    threshold,
    createdAt: new Date().toISOString(),
  };
  tripwireStore.set(tw.id, tw);
  return tw;
}

export function listTripwires(): RpcTripwire[] {
  return [...tripwireStore.values()];
}

export function getTripwire(id: string): RpcTripwire | undefined {
  return tripwireStore.get(id);
}

export function enableTripwire(id: string, enabled: boolean): boolean {
  const tw = tripwireStore.get(id);
  if (!tw) return false;
  tw.enabled = enabled;
  return true;
}

export function deleteTripwire(id: string): boolean {
  return tripwireStore.delete(id);
}

/* ------------------------------------------------------------------ */
/*  Fire a tripwire                                                    */
/* ------------------------------------------------------------------ */

export function checkTripwires(
  rpcName: string,
  condition: TripwireCondition,
  detail: string
): TripwireEvent[] {
  const fired: TripwireEvent[] = [];

  for (const tw of tripwireStore.values()) {
    if (!tw.enabled) continue;
    if (tw.condition !== condition) continue;
    if (tw.rpcName !== '*' && tw.rpcName !== rpcName) continue;

    tw.fireCount++;
    tw.lastFiredAt = new Date().toISOString();

    const event: TripwireEvent = {
      id: randomUUID(),
      tripwireId: tw.id,
      rpcName,
      condition,
      detail,
      firedAt: tw.lastFiredAt,
      resolved: false,
    };
    fired.push(event);

    // Ring buffer for events
    if (eventStore.length >= MAX_EVENTS) {
      eventStore.shift();
    }
    eventStore.push(event);
  }

  return fired;
}

/* ------------------------------------------------------------------ */
/*  Event queries                                                      */
/* ------------------------------------------------------------------ */

export function listTripwireEvents(limit = 100): TripwireEvent[] {
  return eventStore.slice(-limit).reverse();
}

export function resolveEvent(eventId: string): boolean {
  const ev = eventStore.find((e) => e.id === eventId);
  if (!ev) return false;
  ev.resolved = true;
  ev.resolvedAt = new Date().toISOString();
  return true;
}

export function getTripwireStats(): {
  totalTripwires: number;
  activeTripwires: number;
  totalEvents: number;
  unresolvedEvents: number;
  topFiring: Array<{ rpcName: string; condition: string; count: number }>;
} {
  const active = [...tripwireStore.values()].filter((t) => t.enabled).length;
  const unresolved = eventStore.filter((e) => !e.resolved).length;

  // Top firing tripwires
  const countMap = new Map<string, number>();
  for (const tw of tripwireStore.values()) {
    if (tw.fireCount > 0) {
      countMap.set(`${tw.rpcName}|${tw.condition}`, tw.fireCount);
    }
  }
  const topFiring = [...countMap.entries()]
    .map(([key, count]) => {
      const [rpcName, condition] = key.split('|');
      return { rpcName, condition, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalTripwires: tripwireStore.size,
    activeTripwires: active,
    totalEvents: eventStore.length,
    unresolvedEvents: unresolved,
    topFiring,
  };
}

/* ------------------------------------------------------------------ */
/*  Seed default tripwires (idempotent)                                */
/* ------------------------------------------------------------------ */

export function seedDefaultTripwires(): number {
  let seeded = 0;
  for (const def of DEFAULT_TRIPWIRES) {
    const existing = [...tripwireStore.values()].find(
      (t) => t.rpcName === def.rpcName && t.condition === def.condition
    );
    if (!existing) {
      registerTripwire(def.rpcName, def.condition, def.description, def.threshold);
      seeded++;
    }
  }
  return seeded;
}
