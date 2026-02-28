/**
 * Writeback Executor Bootstrap — Phase 300+ (W12)
 *
 * Registers all domain executors with the command bus at startup.
 * Called from server lifecycle after route registration.
 *
 * Each executor implements the RpcExecutor interface and handles
 * a specific clinical writeback domain (TIU, ORDERS, PHARM, LAB, ADT, IMG).
 */

import { registerExecutor } from "./command-bus.js";
import { tiuExecutor } from "./executors/tiu-executor.js";
import { ordersExecutor } from "./executors/orders-executor.js";
import { pharmExecutor } from "./executors/pharm-executor.js";
import { labExecutor } from "./executors/lab-executor.js";
import { adtExecutor } from "./executors/adt-executor.js";
import { imgExecutor } from "./executors/img-executor.js";
import { log } from "../lib/logger.js";

/**
 * Register all clinical writeback domain executors.
 * Safe to call multiple times (Map.set is idempotent).
 */
export function bootstrapWritebackExecutors(): void {
  registerExecutor("TIU", tiuExecutor);
  registerExecutor("ORDERS", ordersExecutor);
  registerExecutor("PHARM", pharmExecutor);
  registerExecutor("LAB", labExecutor);
  registerExecutor("ADT", adtExecutor);
  registerExecutor("IMG", imgExecutor);

  log.info("Writeback executors bootstrapped (6 domains)");
}
