/**
 * index.ts -- Barrel export for VistA Alignment module (Phase 161)
 */
export * from './types.js';
export {
  captureGoldenSnapshot,
  compareSnapshots,
  getSnapshot,
  listSnapshots,
  deleteSnapshot,
  getSnapshotCount,
} from './golden-tracer.js';
export {
  registerTripwire,
  listTripwires,
  getTripwire,
  enableTripwire,
  deleteTripwire,
  checkTripwires,
  listTripwireEvents,
  resolveEvent,
  getTripwireStats,
  seedDefaultTripwires,
} from './tripwire-monitor.js';
export { calculateAlignmentScore, runAlignmentGates } from './alignment-scorer.js';
