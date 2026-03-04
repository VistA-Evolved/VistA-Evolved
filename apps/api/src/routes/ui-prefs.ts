/**
 * Phase 79 — UI Preferences Routes (extended Phase 281 for theme packs)
 *
 * GET  /ui-prefs/coversheet   — Get user's coversheet layout (or defaults)
 * PUT  /ui-prefs/coversheet   — Save user's coversheet layout (partial merge allowed)
 * DELETE /ui-prefs/coversheet — Reset to defaults (deletes saved prefs)
 * GET  /ui-prefs/theme        — Get user's active theme pack + available packs
 * PUT  /ui-prefs/theme        — Set user's theme pack
 *
 * All routes require session auth (covered by catch-all AUTH_RULES).
 * Audited via config.ui-prefs-save (metadata only — no PHI).
 */

import type { FastifyInstance } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import { audit } from '../lib/audit.js';
import {
  getUIPrefs,
  saveUIPrefs,
  deleteUIPrefs,
  getDefaultCoverSheetLayout,
  validateCoverSheetLayout,
  getUserThemePack,
  setUserThemePack,
} from '../services/ui-prefs-store.js';
import { getTenant } from '../config/tenant-config.js';

/* Built-in theme pack IDs (server-side validation set) */
const VALID_THEME_IDS = new Set([
  'modern-default',
  'modern-dark',
  'vista-legacy',
  'openmrs',
  'openemr',
  'high-contrast',
]);

/* Theme pack metadata (server-side, no tokens — tokens live in web) */
const THEME_PACK_LIST = [
  { id: 'modern-default', name: 'Modern Default', category: 'built-in', isDark: false },
  { id: 'modern-dark', name: 'Modern Dark', category: 'built-in', isDark: true },
  { id: 'vista-legacy', name: 'VistA Legacy', category: 'built-in', isDark: false },
  { id: 'openmrs', name: 'OpenMRS-Inspired', category: 'oss-inspired', isDark: false },
  { id: 'openemr', name: 'OpenEMR-Inspired', category: 'oss-inspired', isDark: false },
  { id: 'high-contrast', name: 'High Contrast', category: 'built-in', isDark: false },
];

export default async function uiPrefsRoutes(server: FastifyInstance): Promise<void> {
  /* ----------------------------------------------------------------
   * GET /ui-prefs/coversheet
   * Returns the user's saved coversheet layout, or defaults if none saved.
   * ---------------------------------------------------------------- */
  server.get('/ui-prefs/coversheet', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const tenantId = (request as any).session?.tenantId ?? 'default';
    const duz = session.duz;

    const saved = getUIPrefs(tenantId, duz);

    if (saved) {
      return {
        ok: true,
        source: 'server',
        layout: saved.coverSheet,
        updatedAt: saved.updatedAt,
      };
    }

    return {
      ok: true,
      source: 'defaults',
      layout: getDefaultCoverSheetLayout(),
      updatedAt: null,
    };
  });

  /* ----------------------------------------------------------------
   * PUT /ui-prefs/coversheet
   * Save the user's coversheet layout. Partial updates are merged with defaults.
   * ---------------------------------------------------------------- */
  server.put('/ui-prefs/coversheet', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const tenantId = (request as any).session?.tenantId ?? 'default';
    const duz = session.duz;
    const body = (request.body as any) || {};

    const result = validateCoverSheetLayout(body);
    if (!result.ok) {
      return reply.code(400).send({ ok: false, errors: result.errors });
    }

    const doc = saveUIPrefs(tenantId, duz, result.layout, session.userName || duz);

    audit(
      'config.ui-prefs-save',
      'success',
      { duz, name: session.userName },
      {
        detail: {
          tenantId,
          layoutMode: result.layout.layoutMode,
          panelCount: result.layout.panelOrder.length,
        },
      }
    );

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
  server.delete('/ui-prefs/coversheet', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const tenantId = (request as any).session?.tenantId ?? 'default';
    const duz = session.duz;

    deleteUIPrefs(tenantId, duz);

    audit(
      'config.ui-prefs-save',
      'success',
      { duz, name: session.userName },
      {
        detail: { tenantId, action: 'reset-to-defaults' },
      }
    );

    return {
      ok: true,
      layout: getDefaultCoverSheetLayout(),
      updatedAt: null,
      message: 'Layout reset to defaults',
    };
  });

  /* ----------------------------------------------------------------
   * GET /ui-prefs/theme
   * Returns the user's active theme pack + available theme packs.
   * Resolution: user pref → tenant default → "modern-default"
   * ---------------------------------------------------------------- */
  server.get('/ui-prefs/theme', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const tenantId = (request as any).session?.tenantId ?? 'default';
    const duz = session.duz;

    const userTheme = getUserThemePack(tenantId, duz);
    const tenant = getTenant(tenantId);
    const tenantDefault = tenant?.uiDefaults?.themePack ?? null;

    // Resolution: user > tenant > system default
    const active = userTheme || tenantDefault || 'modern-default';

    return {
      ok: true,
      activeThemePack: active,
      source: userTheme ? 'user' : tenantDefault ? 'tenant' : 'default',
      tenantDefault: tenantDefault || 'modern-default',
      availableThemes: THEME_PACK_LIST,
    };
  });

  /* ----------------------------------------------------------------
   * PUT /ui-prefs/theme
   * Set the user's active theme pack.
   * Body: { themePack: string }
   * ---------------------------------------------------------------- */
  server.put('/ui-prefs/theme', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const tenantId = (request as any).session?.tenantId ?? 'default';
    const duz = session.duz;
    const body = (request.body as any) || {};
    const { themePack } = body;

    if (!themePack || typeof themePack !== 'string') {
      return reply.code(400).send({
        ok: false,
        error: 'themePack is required and must be a string',
      });
    }

    // Validate: must be a known theme or custom:* prefix
    const isCustom = themePack.startsWith('custom:');
    if (!isCustom && !VALID_THEME_IDS.has(themePack)) {
      return reply.code(400).send({
        ok: false,
        error: `Invalid theme pack: ${themePack}. Valid: ${[...VALID_THEME_IDS].join(', ')} or custom:<id>`,
      });
    }

    const doc = setUserThemePack(tenantId, duz, themePack, session.userName || duz);

    audit(
      'config.ui-prefs-save',
      'success',
      { duz, name: session.userName },
      {
        detail: { tenantId, action: 'set-theme', themePack },
      }
    );

    return {
      ok: true,
      activeThemePack: doc.themePack,
      updatedAt: doc.updatedAt,
    };
  });
}
