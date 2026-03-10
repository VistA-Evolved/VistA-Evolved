/**
 * Writeback Executors -- Barrel Export
 *
 * Phase 301+ (W12-P3+): Re-exports all domain executors.
 * Each executor implements the RpcExecutor interface from the command bus.
 */

export { tiuExecutor } from './tiu-executor.js';
export { ordersExecutor } from './orders-executor.js';
export { pharmExecutor } from './pharm-executor.js';
export { labExecutor } from './lab-executor.js';
export { adtExecutor } from './adt-executor.js';
export { imgExecutor } from './img-executor.js';
