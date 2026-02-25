/**
 * I18N Routes — Phase 132: Internationalization Foundation
 *
 * Endpoints:
 *   GET  /i18n/locale             -- Get current clinician locale preference
 *   PUT  /i18n/locale             -- Set clinician locale preference
 *   GET  /i18n/locales            -- List supported locales
 *   GET  /intake/question-schema  -- Get locale-aware intake questions
 *   POST /admin/intake/question-schema -- Create/update intake question (admin)
 *   GET  /admin/intake/question-schema -- List all intake questions (admin)
 *
 * Auth: /i18n/* requires session, /admin/* requires admin role.
 * Portal language is managed via existing /portal/settings endpoint.
 */

import type { FastifyInstance } from "fastify";
import { requireSession, requireRole } from "../auth/auth-routes.js";
import { isPgConfigured } from "../platform/pg/index.js";
import { log } from "../lib/logger.js";

const SUPPORTED_LOCALES = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "fil", label: "Filipino", nativeLabel: "Filipino" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
] as const;

const VALID_LOCALE_CODES = SUPPORTED_LOCALES.map((l) => l.code);

export default async function i18nRoutes(server: FastifyInstance): Promise<void> {
  /* ------------------------------------------------------------------ */
  /* GET /i18n/locales — list supported locales (public, no auth)        */
  /* ------------------------------------------------------------------ */
  server.get("/i18n/locales", async () => {
    return { ok: true, locales: SUPPORTED_LOCALES };
  });

  /* ------------------------------------------------------------------ */
  /* GET /i18n/locale — get current clinician locale                     */
  /* ------------------------------------------------------------------ */
  server.get("/i18n/locale", async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    if (!isPgConfigured()) {
      return { ok: true, locale: "en", source: "default", note: "PG not configured" };
    }

    try {
      const repo = await import("../platform/pg/repo/pg-user-locale-repo.js");
      const pref = await repo.getLocalePreference(
        session.tenantId || "default",
        session.duz
      );
      return {
        ok: true,
        locale: pref?.locale ?? "en",
        source: pref ? "database" : "default",
      };
    } catch (err: any) {
      log.warn("Failed to get locale preference", { error: err.message });
      return { ok: true, locale: "en", source: "default", note: "DB read failed" };
    }
  });

  /* ------------------------------------------------------------------ */
  /* PUT /i18n/locale — set clinician locale preference                  */
  /* ------------------------------------------------------------------ */
  server.put("/i18n/locale", async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const body = (request.body as any) || {};
    const locale = body.locale;

    if (!locale || !VALID_LOCALE_CODES.includes(locale)) {
      reply.code(400);
      return {
        ok: false,
        error: `Invalid locale. Supported: ${VALID_LOCALE_CODES.join(", ")}`,
      };
    }

    if (!isPgConfigured()) {
      reply.code(503);
      return { ok: false, error: "Postgres not configured — locale cannot be persisted" };
    }

    try {
      const repo = await import("../platform/pg/repo/pg-user-locale-repo.js");
      const row = await repo.upsertLocalePreference(
        session.tenantId || "default",
        session.duz,
        locale
      );
      log.info("Locale preference updated", { duz: session.duz, locale });
      return { ok: true, locale: row.locale, persisted: true };
    } catch (err: any) {
      log.error("Failed to set locale preference", { error: err.message });
      reply.code(500);
      return { ok: false, error: "Failed to persist locale preference" };
    }
  });

  /* ------------------------------------------------------------------ */
  /* GET /intake/question-schema — locale-aware intake questions          */
  /* ------------------------------------------------------------------ */
  server.get("/intake/question-schema", async (request, reply) => {
    const query = request.query as any;
    const locale = query.locale || "en";
    const tenantId = query.tenantId || "default";

    if (!VALID_LOCALE_CODES.includes(locale)) {
      reply.code(400);
      return {
        ok: false,
        error: `Invalid locale. Supported: ${VALID_LOCALE_CODES.join(", ")}`,
      };
    }

    if (!isPgConfigured()) {
      // Return static default questions when PG is not configured
      return {
        ok: true,
        locale,
        questions: getStaticQuestions(locale),
        source: "static",
        note: "PG not configured — returning static defaults",
      };
    }

    try {
      const repo = await import("../platform/pg/repo/pg-intake-question-repo.js");
      // Seed defaults if needed (idempotent)
      await repo.seedDefaultQuestions(tenantId);
      const questions = await repo.getQuestionsByLocale(tenantId, locale);
      return {
        ok: true,
        locale,
        questions: questions.map(formatQuestion),
        source: "database",
        count: questions.length,
      };
    } catch (err: any) {
      log.warn("Failed to get intake questions from DB", { error: err.message });
      return {
        ok: true,
        locale,
        questions: getStaticQuestions(locale),
        source: "static",
        note: "DB read failed — returning static defaults",
      };
    }
  });

  /* ------------------------------------------------------------------ */
  /* GET /admin/intake/question-schema — list all questions (admin)       */
  /* ------------------------------------------------------------------ */
  server.get("/admin/intake/question-schema", async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    requireRole(session, ["admin"], reply);

    if (!isPgConfigured()) {
      reply.code(503);
      return { ok: false, error: "Postgres not configured" };
    }

    try {
      const repo = await import("../platform/pg/repo/pg-intake-question-repo.js");
      const tenantId = session.tenantId || "default";
      const questions = await repo.getAllQuestions(tenantId);
      return { ok: true, questions: questions.map(formatQuestion), count: questions.length };
    } catch (err: any) {
      log.error("Failed to list intake questions", { error: err.message });
      reply.code(500);
      return { ok: false, error: "Failed to list questions" };
    }
  });

  /* ------------------------------------------------------------------ */
  /* POST /admin/intake/question-schema — create question (admin)        */
  /* ------------------------------------------------------------------ */
  server.post("/admin/intake/question-schema", async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    requireRole(session, ["admin"], reply);

    const body = (request.body as any) || {};
    const { questionKey, locale, category, questionText, questionType, options, displayOrder, required, vistaFieldTarget } = body;

    if (!questionKey || !questionText) {
      reply.code(400);
      return { ok: false, error: "questionKey and questionText are required" };
    }

    if (locale && !VALID_LOCALE_CODES.includes(locale)) {
      reply.code(400);
      return { ok: false, error: `Invalid locale. Supported: ${VALID_LOCALE_CODES.join(", ")}` };
    }

    if (!isPgConfigured()) {
      reply.code(503);
      return { ok: false, error: "Postgres not configured" };
    }

    try {
      const repo = await import("../platform/pg/repo/pg-intake-question-repo.js");
      const row = await repo.insertQuestion({
        tenantId: session.tenantId || "default",
        questionKey,
        locale: locale || "en",
        category: category || "general",
        questionText,
        questionType: questionType || "text",
        optionsJson: options ? JSON.stringify(options) : null,
        displayOrder: displayOrder ?? 99,
        required: required ?? false,
        active: true,
        vistaFieldTarget: vistaFieldTarget || null,
      });
      return { ok: true, question: formatQuestion(row) };
    } catch (err: any) {
      log.error("Failed to create intake question", { error: err.message });
      reply.code(500);
      return { ok: false, error: "Failed to create question" };
    }
  });
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function formatQuestion(row: any) {
  return {
    id: row.id,
    questionKey: row.questionKey,
    locale: row.locale,
    category: row.category,
    questionText: row.questionText,
    questionType: row.questionType,
    options: row.optionsJson ? JSON.parse(row.optionsJson) : null,
    displayOrder: row.displayOrder,
    required: row.required,
    active: row.active,
    vistaFieldTarget: row.vistaFieldTarget,
  };
}

/** Static fallback questions when PG is unavailable */
function getStaticQuestions(locale: string) {
  const questions: Record<string, Array<{ key: string; text: string; type: string; required: boolean; category: string; order: number }>> = {
    en: [
      { key: "reason_for_visit", text: "What is the reason for your visit today?", type: "text", required: true, category: "chief_complaint", order: 1 },
      { key: "known_allergies", text: "Do you have any known allergies?", type: "yes_no_detail", required: true, category: "allergies", order: 2 },
      { key: "current_medications", text: "Are you currently taking any medications?", type: "yes_no_detail", required: true, category: "medications", order: 3 },
      { key: "additional_concerns", text: "Is there anything else you would like your provider to know?", type: "textarea", required: false, category: "general", order: 4 },
    ],
    fil: [
      { key: "reason_for_visit", text: "Ano ang dahilan ng iyong pagbisita ngayon?", type: "text", required: true, category: "chief_complaint", order: 1 },
      { key: "known_allergies", text: "Mayroon ka bang mga kilalang allergy?", type: "yes_no_detail", required: true, category: "allergies", order: 2 },
      { key: "current_medications", text: "Kasalukuyan ka bang umiinom ng anumang gamot?", type: "yes_no_detail", required: true, category: "medications", order: 3 },
      { key: "additional_concerns", text: "May iba pa ba kayong gustong ipaalam sa inyong doktor?", type: "textarea", required: false, category: "general", order: 4 },
    ],
    es: [
      { key: "reason_for_visit", text: "Cual es el motivo de su visita hoy?", type: "text", required: true, category: "chief_complaint", order: 1 },
      { key: "known_allergies", text: "Tiene alguna alergia conocida?", type: "yes_no_detail", required: true, category: "allergies", order: 2 },
      { key: "current_medications", text: "Esta tomando algun medicamento actualmente?", type: "yes_no_detail", required: true, category: "medications", order: 3 },
      { key: "additional_concerns", text: "Hay algo mas que le gustaria que su medico supiera?", type: "textarea", required: false, category: "general", order: 4 },
    ],
  };
  return questions[locale] || questions.en;
}
