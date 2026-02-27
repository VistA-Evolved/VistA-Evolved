/**
 * Server module barrel — Phase 173
 *
 * Re-exports the public API for the decomposed server module.
 */

export { buildServer } from "./build-server.js";
export { startServer } from "./start.js";
export { runLifecycle } from "./lifecycle.js";
export { registerPlugins } from "./register-plugins.js";
export { registerRoutes } from "./register-routes.js";
export { registerInlineRoutes } from "./inline-routes.js";
