/**
 * Phase 79 — UI Preferences Routes
 *
 * GET  /ui-prefs/coversheet   — Get user's coversheet layout (or defaults)
 * PUT  /ui-prefs/coversheet   — Save user's coversheet layout (partial merge allowed)
 * DELETE /ui-prefs/coversheet — Reset to defaults (deletes saved prefs)
 *
 * All routes require session auth (covered by catch-all AUTH_RULES).
 * Audited via config.ui-prefs-save (metadata only — no PHI).
 */

import type { FastifyInstance } from "fastify";
import { requireSession } from "../auth/auth-routes.js";
import { audit } from "../lib/audit.js";
import {
  getUIPrefs,
  saveUIPrefs,
  deleteUIPrefs,
  getDefaultCoverSheetLayout,
  validateCoverSheetLayout,
} from "../services/ui-prefs-store.js";

export default async function uiPrefsRoutes(server: FastifyInstance): Promise<void> {

  /* ----------------------------------------------------------------
   * GET /ui-prefs/coversheet
   * Returns the user's saved coversheet layout, or defaults if none saved.
   * ---------------------------------------------------------------- */
  server.get("/ui-prefs/coversheet", async (request, reply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    const tenantId = (request as any).session?.tenantId ?? "default";
    const duz = session.duz;

    const saved = getUIPrefs(tenantId, duz);

    if (saved) {
      return {
        ok: true,
        source: "server",
        layout: saved.coverSheet,
        updatedAt: saved.updatedAt,
      };
    }

    return {
      ok: true,
      source: "defaults",
      layout: getDefaultCoverSheetLayout(),
      updatedAt: null,
    };
  });

  /* ----------------------------------------------------------------
   * PUT /ui-prefs/coversheet
   * Save the user's coversheet layout. Partial updates are merged with defaults.
   * ---------------------------------------------------------------- */
  server.put("/ui-prefs/coversheet", async (request, reply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    const tenantId = (request as any).session?.tenantId ?? "default";
    const duz = session.duz;
    const body = (request.body as any) || {};

    const result = validateCoverSheetLayout(body);
    if (!result.ok) {
      return reply.code(400).send({ ok: false, errors: result.errors });
    }

    const doc = saveUIPrefs(tenantId, duz, result.layout, session.userName || duz);

    audit("config.ui-prefs-save", "success", { duz, name: session.userName }, {
      detail: {
        tenantId,
        layoutMode: result.layout.layoutMode,
        panelCount: result.layout.panelOrder.length,
      },
    });

    return {
      ok: true,
      layout: doc.coverSheet,
      updatedAt: doc.updatedAt,
    };
  });

  /* ----------------------------------------------------------------
   * DELETE /ui-prefs/coversheet
   * Reset to defaults (removes saved prefs).
   * ---------------------------------------------------------------- */
  server.delete("/ui-prefs/coversheet", async (request, reply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    const tenantId = (request as any).session?.tenantId ?? "default";
    const duz = session.duz;

    deleteUIPrefs(tenantId, duz);

    audit("config.ui-prefs-save", "success", { duz, name: session.userName }, {
      detail: { tenantId, action: "reset-to-defaults" },
    });

    return {
      ok: true,
      layout: getDefaultCoverSheetLayout(),
      updatedAt: null,
      message: "Layout reset to defaults",
    };
  });
}
