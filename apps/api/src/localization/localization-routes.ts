/**
 * Phase 397 (W22-P9): Localization + Multi-Country Packs + Theming -- REST Routes
 *
 * Locales:
 *   GET  /localization/locales              -- List locales
 *   POST /localization/locales              -- Create locale (admin)
 *   GET  /localization/locales/:id          -- Get locale
 *   PUT  /localization/locales/:id          -- Update locale (admin)
 *   DELETE /localization/locales/:id        -- Delete locale (admin)
 *
 * Translations:
 *   GET  /localization/translations         -- List bundles
 *   POST /localization/translations         -- Create bundle (admin)
 *   GET  /localization/translations/:id     -- Get bundle
 *   PUT  /localization/translations/:id     -- Update bundle (admin)
 *   DELETE /localization/translations/:id   -- Delete bundle (admin)
 *   GET  /localization/resolve              -- Resolve translations (locale+namespace)
 *
 * UCUM Unit Profiles:
 *   GET  /localization/unit-profiles        -- List profiles
 *   POST /localization/unit-profiles        -- Create profile (admin)
 *   GET  /localization/unit-profiles/:id    -- Get profile
 *
 * Country Packs:
 *   GET  /localization/country-packs        -- List packs
 *   POST /localization/country-packs        -- Create pack (admin)
 *   GET  /localization/country-packs/:id    -- Get pack
 *   PUT  /localization/country-packs/:id    -- Update pack (admin)
 *   DELETE /localization/country-packs/:id  -- Delete pack (admin)
 *
 * Themes:
 *   GET  /localization/themes               -- List themes
 *   POST /localization/themes               -- Create theme (admin)
 *   GET  /localization/themes/:id           -- Get theme
 *   PUT  /localization/themes/:id           -- Update theme (admin)
 *   DELETE /localization/themes/:id         -- Delete theme (admin)
 *
 * Tenant Config:
 *   GET  /localization/config               -- Get tenant locale/theme config
 *   PUT  /localization/config               -- Update tenant config (admin)
 *
 * Dashboard:
 *   GET  /localization/dashboard            -- Dashboard stats
 *
 * Auth: session-based; admin for mutating operations.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireSession } from "../auth/auth-routes.js";
import { log } from "../lib/logger.js";
import {
  listLocales,
  getLocale,
  createLocale,
  updateLocale,
  deleteLocale,
  listTranslationBundles,
  getTranslationBundle,
  createTranslationBundle,
  updateTranslationBundle,
  deleteTranslationBundle,
  resolveTranslations,
  listUnitProfiles,
  getUnitProfile,
  createUnitProfile,
  listCountryPacks,
  getCountryPack,
  createCountryPack,
  updateCountryPack,
  deleteCountryPack,
  listThemes,
  getTheme,
  createTheme,
  updateTheme,
  deleteTheme,
  getTenantLocaleConfig,
  updateTenantLocaleConfig,
  getLocalizationDashboardStats,
} from "./localization-store.js";

export default async function localizationRoutes(server: FastifyInstance) {
  // ---- Locales ----

  server.get("/localization/locales", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    return { ok: true, locales: listLocales() };
  });

  server.post("/localization/locales", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const body = (request.body as any) || {};
    const { languageTag, nativeName, englishName, direction, dateFormat, decimalSeparator, thousandsSeparator, defaultUnitProfileId, enabled } = body;
    if (!languageTag || !nativeName || !englishName) {
      return reply.code(400).send({ ok: false, error: "languageTag, nativeName, and englishName required" });
    }
    try {
      const loc = createLocale({
        languageTag,
        nativeName,
        englishName,
        direction: direction || "ltr",
        dateFormat: dateFormat || "MM/DD/YYYY",
        decimalSeparator: decimalSeparator || ".",
        thousandsSeparator: thousandsSeparator || ",",
        defaultUnitProfileId: defaultUnitProfileId || null,
        enabled: enabled !== false,
      });
      return reply.code(201).send({ ok: true, locale: loc });
    } catch (err: any) {
      log.error("Locale creation failed", { error: err instanceof Error ? err.message : String(err) });
      return reply.code(409).send({ ok: false, error: "Internal error" });
    }
  });

  server.get("/localization/locales/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const loc = getLocale(id);
    if (!loc) return reply.code(404).send({ ok: false, error: "Locale not found" });
    return { ok: true, locale: loc };
  });

  server.put("/localization/locales/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const updated = updateLocale(id, body);
    if (!updated) return reply.code(404).send({ ok: false, error: "Locale not found" });
    return { ok: true, locale: updated };
  });

  server.delete("/localization/locales/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    if (!deleteLocale(id)) return reply.code(404).send({ ok: false, error: "Locale not found" });
    return { ok: true };
  });

  // ---- Translation Bundles ----

  server.get("/localization/translations", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const { languageTag } = request.query as { languageTag?: string };
    return { ok: true, bundles: listTranslationBundles(session.tenantId, languageTag) };
  });

  server.post("/localization/translations", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body as any) || {};
    const { languageTag, namespace, translations, source, contentPackId } = body;
    if (!languageTag || !namespace || !translations) {
      return reply.code(400).send({ ok: false, error: "languageTag, namespace, and translations required" });
    }
    try {
      const bundle = createTranslationBundle({
        tenantId: session.tenantId,
        languageTag,
        namespace,
        translations,
        source: source || "manual",
        contentPackId: contentPackId || null,
      });
      return reply.code(201).send({ ok: true, bundle });
    } catch (err: any) {
      log.error("Translation bundle creation failed", { error: err instanceof Error ? err.message : String(err) });
      return reply.code(409).send({ ok: false, error: "Internal error" });
    }
  });

  server.get("/localization/translations/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const bundle = getTranslationBundle(id);
    if (!bundle) return reply.code(404).send({ ok: false, error: "Translation bundle not found" });
    return { ok: true, bundle };
  });

  server.put("/localization/translations/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const updated = updateTranslationBundle(id, body);
    if (!updated) return reply.code(404).send({ ok: false, error: "Translation bundle not found" });
    return { ok: true, bundle: updated };
  });

  server.delete("/localization/translations/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    if (!deleteTranslationBundle(id)) return reply.code(404).send({ ok: false, error: "Translation bundle not found" });
    return { ok: true };
  });

  server.get("/localization/resolve", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const { languageTag, namespace } = request.query as { languageTag?: string; namespace?: string };
    if (!languageTag || !namespace) {
      return reply.code(400).send({ ok: false, error: "languageTag and namespace query params required" });
    }
    const translations = resolveTranslations(session.tenantId, languageTag, namespace);
    return { ok: true, languageTag, namespace, translations };
  });

  // ---- UCUM Unit Profiles ----

  server.get("/localization/unit-profiles", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    return { ok: true, profiles: listUnitProfiles() };
  });

  server.post("/localization/unit-profiles", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const body = (request.body as any) || {};
    const { name, description, preferredUnits, conversions, region } = body;
    if (!name || !preferredUnits) {
      return reply.code(400).send({ ok: false, error: "name and preferredUnits required" });
    }
    try {
      const profile = createUnitProfile({
        name,
        description: description || "",
        preferredUnits,
        conversions: conversions || [],
        region: region || "Custom",
      });
      return reply.code(201).send({ ok: true, profile });
    } catch (err: any) {
      log.error("Unit profile creation failed", { error: err instanceof Error ? err.message : String(err) });
      return reply.code(409).send({ ok: false, error: "Internal error" });
    }
  });

  server.get("/localization/unit-profiles/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const profile = getUnitProfile(id);
    if (!profile) return reply.code(404).send({ ok: false, error: "Unit profile not found" });
    return { ok: true, profile };
  });

  // ---- Country Packs ----

  server.get("/localization/country-packs", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    return { ok: true, countryPacks: listCountryPacks(session.tenantId) };
  });

  server.post("/localization/country-packs", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body as any) || {};
    const { countryCode, name, description, icdVersion, defaultLocale, formularyReference, labRangeProfileId, documentTemplateIds, contentPackId, enabled } = body;
    if (!countryCode || !name || !icdVersion) {
      return reply.code(400).send({ ok: false, error: "countryCode, name, and icdVersion required" });
    }
    try {
      const pack = createCountryPack({
        tenantId: session.tenantId,
        countryCode,
        name,
        description: description || "",
        icdVersion,
        defaultLocale: defaultLocale || "en-US",
        formularyReference: formularyReference || null,
        labRangeProfileId: labRangeProfileId || null,
        documentTemplateIds: documentTemplateIds || [],
        contentPackId: contentPackId || null,
        enabled: enabled !== false,
      });
      return reply.code(201).send({ ok: true, countryPack: pack });
    } catch (err: any) {
      log.error("Country pack creation failed", { error: err instanceof Error ? err.message : String(err) });
      return reply.code(409).send({ ok: false, error: "Internal error" });
    }
  });

  server.get("/localization/country-packs/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const pack = getCountryPack(id);
    if (!pack) return reply.code(404).send({ ok: false, error: "Country pack not found" });
    return { ok: true, countryPack: pack };
  });

  server.put("/localization/country-packs/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const updated = updateCountryPack(id, body);
    if (!updated) return reply.code(404).send({ ok: false, error: "Country pack not found" });
    return { ok: true, countryPack: updated };
  });

  server.delete("/localization/country-packs/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    if (!deleteCountryPack(id)) return reply.code(404).send({ ok: false, error: "Country pack not found" });
    return { ok: true };
  });

  // ---- Themes ----

  server.get("/localization/themes", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    return { ok: true, themes: listThemes() };
  });

  server.post("/localization/themes", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const body = (request.body as any) || {};
    const { name, preset, description, variables, darkModeVariables, fontFamily, baseFontSize, borderRadius } = body;
    if (!name) {
      return reply.code(400).send({ ok: false, error: "name required" });
    }
    try {
      const theme = createTheme({
        name,
        preset: preset || "custom",
        description: description || "",
        variables: variables || [],
        darkModeVariables: darkModeVariables || null,
        fontFamily: fontFamily || "'Inter', sans-serif",
        baseFontSize: baseFontSize || 14,
        borderRadius: borderRadius ?? 8,
        isSystem: false,
      });
      return reply.code(201).send({ ok: true, theme });
    } catch (err: any) {
      log.error("Theme creation failed", { error: err instanceof Error ? err.message : String(err) });
      return reply.code(409).send({ ok: false, error: "Internal error" });
    }
  });

  server.get("/localization/themes/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const theme = getTheme(id);
    if (!theme) return reply.code(404).send({ ok: false, error: "Theme not found" });
    return { ok: true, theme };
  });

  server.put("/localization/themes/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const updated = updateTheme(id, body);
    if (!updated) return reply.code(404).send({ ok: false, error: "Theme not found or is a system theme" });
    return { ok: true, theme: updated };
  });

  server.delete("/localization/themes/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    if (!deleteTheme(id)) return reply.code(404).send({ ok: false, error: "Theme not found or is a system theme" });
    return { ok: true };
  });

  // ---- Tenant Config ----

  server.get("/localization/config", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    return { ok: true, config: getTenantLocaleConfig(session.tenantId) };
  });

  server.put("/localization/config", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body as any) || {};
    const updated = updateTenantLocaleConfig(session.tenantId, body);
    return { ok: true, config: updated };
  });

  // ---- Dashboard ----

  server.get("/localization/dashboard", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    return { ok: true, stats: getLocalizationDashboardStats() };
  });
}
