/**
 * Server — Build Server
 *
 * Phase 173: Assembles the fully-configured Fastify instance by composing
 * plugins, routes, and inline handlers. Does NOT call listen().
 */

import Fastify from "fastify";
import { registerPlugins } from "./register-plugins.js";
import { registerRoutes } from "./register-routes.js";

/**
 * Create and configure a Fastify server instance with all plugins and routes.
 * Does NOT start listening -- call `server.listen()` separately.
 */
export async function buildServer() {
  const server = Fastify();

  // Plugins: cors, cookie, websocket, security, module guard, content parsers
  await registerPlugins(server);

  // All routes: 92+ plugin routes + inline handlers (/health, /ready, etc.)
  await registerRoutes(server);

  return server;
}
