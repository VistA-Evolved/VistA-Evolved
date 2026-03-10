/**
 * PG Intake Question Schema Repository -- Phase 132.
 *
 * Stores locale-aware question definitions for intake forms.
 * Each question_key has entries per locale (en, fil, es).
 * Questions are rendered in the patient's preferred language.
 *
 * VistA mapping: vistaFieldTarget points to the VistA field
 * where the answer should be filed (future integration).
 */

import { eq, and, asc } from 'drizzle-orm';
import { getPgDb } from '../pg-db.js';
import { pgIntakeQuestionSchema } from '../pg-schema.js';
import { randomBytes } from 'node:crypto';

export type IntakeQuestionRow = typeof pgIntakeQuestionSchema.$inferSelect;

function genId(): string {
  return randomBytes(16).toString('hex');
}

function now(): string {
  return new Date().toISOString();
}

/** Get all active questions for a locale, ordered by displayOrder */
export async function getQuestionsByLocale(
  tenantId: string,
  locale: string
): Promise<IntakeQuestionRow[]> {
  const db = getPgDb();
  return db
    .select()
    .from(pgIntakeQuestionSchema)
    .where(
      and(
        eq(pgIntakeQuestionSchema.tenantId, tenantId),
        eq(pgIntakeQuestionSchema.locale, locale),
        eq(pgIntakeQuestionSchema.active, true)
      )
    )
    .orderBy(asc(pgIntakeQuestionSchema.displayOrder));
}

/** Get all questions (all locales) for admin view */
export async function getAllQuestions(tenantId: string): Promise<IntakeQuestionRow[]> {
  const db = getPgDb();
  return db
    .select()
    .from(pgIntakeQuestionSchema)
    .where(eq(pgIntakeQuestionSchema.tenantId, tenantId))
    .orderBy(asc(pgIntakeQuestionSchema.questionKey), asc(pgIntakeQuestionSchema.locale));
}

/** Insert a new question definition */
export async function insertQuestion(
  data: Omit<IntakeQuestionRow, 'id' | 'createdAt' | 'updatedAt'>
): Promise<IntakeQuestionRow> {
  const db = getPgDb();
  const row: IntakeQuestionRow = {
    ...data,
    id: genId(),
    createdAt: now(),
    updatedAt: now(),
  };
  await db.insert(pgIntakeQuestionSchema).values(row);
  return row;
}

/** Update an existing question */
export async function updateQuestion(
  id: string,
  patch: Partial<
    Pick<
      IntakeQuestionRow,
      | 'questionText'
      | 'questionType'
      | 'optionsJson'
      | 'displayOrder'
      | 'required'
      | 'active'
      | 'category'
      | 'vistaFieldTarget'
    >
  >
): Promise<void> {
  const db = getPgDb();
  await db
    .update(pgIntakeQuestionSchema)
    .set({ ...patch, updatedAt: now() })
    .where(eq(pgIntakeQuestionSchema.id, id));
}

/** Seed default intake questions if none exist */
export async function seedDefaultQuestions(tenantId: string): Promise<number> {
  const existing = await getAllQuestions(tenantId);
  if (existing.length > 0) return 0;

  const defaults = getDefaultQuestions(tenantId);
  const db = getPgDb();
  let count = 0;
  for (const q of defaults) {
    await db.insert(pgIntakeQuestionSchema).values(q);
    count++;
  }
  return count;
}

/** Default intake questions in en, fil, es */
function getDefaultQuestions(tenantId: string): IntakeQuestionRow[] {
  const ts = now();
  const questions: IntakeQuestionRow[] = [];

  const defs: Array<{
    key: string;
    category: string;
    type: string;
    order: number;
    required: boolean;
    vistaTarget?: string;
    options?: string[];
    texts: { en: string; fil: string; es: string };
  }> = [
    {
      key: 'reason_for_visit',
      category: 'chief_complaint',
      type: 'text',
      order: 1,
      required: true,
      vistaTarget: 'TIU(8925) CHIEF COMPLAINT',
      texts: {
        en: 'What is the reason for your visit today?',
        fil: 'Ano ang dahilan ng iyong pagbisita ngayon?',
        es: 'Cual es el motivo de su visita hoy?',
      },
    },
    {
      key: 'symptom_duration',
      category: 'chief_complaint',
      type: 'select',
      order: 2,
      required: true,
      options: ['Less than 1 week', '1-4 weeks', '1-3 months', 'More than 3 months'],
      texts: {
        en: 'How long have you had these symptoms?',
        fil: 'Gaano na katagal ang mga sintomas na ito?',
        es: 'Cuanto tiempo ha tenido estos sintomas?',
      },
    },
    {
      key: 'known_allergies',
      category: 'allergies',
      type: 'yes_no_detail',
      order: 3,
      required: true,
      vistaTarget: 'GMR ALLERGY(120.8)',
      texts: {
        en: 'Do you have any known allergies to medications, food, or environmental factors?',
        fil: 'Mayroon ka bang mga kilalang allergy sa gamot, pagkain, o kapaligiran?',
        es: 'Tiene alguna alergia conocida a medicamentos, alimentos o factores ambientales?',
      },
    },
    {
      key: 'current_medications',
      category: 'medications',
      type: 'yes_no_detail',
      order: 4,
      required: true,
      vistaTarget: 'PRESCRIPTION(52)',
      texts: {
        en: 'Are you currently taking any medications (including over-the-counter and supplements)?',
        fil: 'Kasalukuyan ka bang umiinom ng anumang gamot (kasama ang over-the-counter at supplements)?',
        es: 'Esta tomando algun medicamento actualmente (incluidos los de venta libre y suplementos)?',
      },
    },
    {
      key: 'medical_history',
      category: 'history',
      type: 'multiselect',
      order: 5,
      required: false,
      vistaTarget: 'PROBLEM(9000011)',
      options: [
        'Diabetes',
        'Hypertension',
        'Heart Disease',
        'Asthma/COPD',
        'Cancer',
        'Stroke',
        'Kidney Disease',
        'Mental Health Condition',
        'None of the above',
      ],
      texts: {
        en: 'Do you have any of the following conditions? (Select all that apply)',
        fil: 'Mayroon ka ba ng alinman sa mga sumusunod na kondisyon? (Piliin lahat ng naaangkop)',
        es: 'Tiene alguna de las siguientes condiciones? (Seleccione todas las que apliquen)',
      },
    },
    {
      key: 'pain_level',
      category: 'vitals',
      type: 'scale',
      order: 6,
      required: false,
      vistaTarget: 'GMR VITAL MEASUREMENT(120.5) PAIN',
      texts: {
        en: 'On a scale of 0-10, what is your current pain level?',
        fil: 'Sa iskor na 0-10, ano ang iyong kasalukuyang antas ng sakit?',
        es: 'En una escala del 0 al 10, cual es su nivel de dolor actual?',
      },
    },
    {
      key: 'smoking_status',
      category: 'social_history',
      type: 'select',
      order: 7,
      required: false,
      vistaTarget: 'HEALTH FACTORS(9000010.23)',
      options: ['Never smoked', 'Former smoker', 'Current smoker', 'E-cigarette/vape user'],
      texts: {
        en: 'What is your smoking/tobacco status?',
        fil: 'Ano ang iyong katayuan sa paninigarilyo/tabako?',
        es: 'Cual es su estado de tabaquismo?',
      },
    },
    {
      key: 'additional_concerns',
      category: 'general',
      type: 'textarea',
      order: 8,
      required: false,
      texts: {
        en: 'Is there anything else you would like your provider to know?',
        fil: 'May iba pa ba kayong gustong ipaalam sa inyong doktor?',
        es: 'Hay algo mas que le gustaria que su medico supiera?',
      },
    },
  ];

  for (const def of defs) {
    for (const locale of ['en', 'fil', 'es'] as const) {
      questions.push({
        id: genId(),
        tenantId,
        questionKey: def.key,
        locale,
        category: def.category,
        questionText: def.texts[locale],
        questionType: def.type,
        optionsJson: def.options
          ? JSON.stringify(
              locale === 'en' ? def.options : def.options // Options stay in English for now -- translation is a future enhancement
            )
          : null,
        displayOrder: def.order,
        required: def.required,
        active: true,
        vistaFieldTarget: def.vistaTarget ?? null,
        createdAt: ts,
        updatedAt: ts,
      });
    }
  }

  return questions;
}
