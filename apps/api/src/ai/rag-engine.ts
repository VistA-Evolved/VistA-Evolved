/**
 * AI Gateway -- RAG Grounding Engine (Phase 33)
 *
 * Assembles patient context for AI requests from allowed sources.
 * Only sources that the actor's role is permitted to view are included.
 * Every fact injected into the AI prompt is tracked for citation.
 *
 * Sources: demographics, medications, allergies, problems,
 * vitals, labs, notes, intake, appointments.
 */

import type { RAGChunk, RAGContext, RAGSourceCategory, AIActorRole } from './types.js';

/* ------------------------------------------------------------------ */
/* Role-based source access control                                    */
/* ------------------------------------------------------------------ */

/**
 * Which RAG source categories each role may access.
 * Patients see their own visible data; clinicians see all.
 */
const ROLE_ALLOWED_SOURCES: Record<AIActorRole, RAGSourceCategory[]> = {
  clinician: [
    'demographics',
    'medications',
    'allergies',
    'problems',
    'vitals',
    'labs',
    'notes',
    'intake',
    'appointments',
  ],
  patient: [
    'demographics',
    'medications',
    'allergies',
    'problems',
    'vitals',
    'labs',
    'appointments',
  ],
  proxy: ['demographics', 'medications', 'allergies', 'vitals', 'appointments'],
  system: [],
};

/** Max context size (characters) to prevent prompt overflow. */
const MAX_CONTEXT_CHARS = 12000;

/** Max chunks per category to keep context focused. */
const MAX_CHUNKS_PER_CATEGORY = 10;

/* ------------------------------------------------------------------ */
/* Context provider registry                                           */
/* ------------------------------------------------------------------ */

type ContextProvider = (patientDfn: string) => Promise<RAGChunk[]>;

const providers = new Map<RAGSourceCategory, ContextProvider>();

/**
 * Register a context provider for a source category.
 * Called at startup to wire in VistA data sources.
 */
export function registerRAGProvider(category: RAGSourceCategory, provider: ContextProvider): void {
  providers.set(category, provider);
}

/* ------------------------------------------------------------------ */
/* Built-in stub providers (demo data, replaceable with VistA RPCs)    */
/* ------------------------------------------------------------------ */

function stubDemographics(_dfn: string): Promise<RAGChunk[]> {
  return Promise.resolve([
    {
      category: 'demographics',
      label: 'Patient Demographics',
      content: 'Age: 67, Sex: Male, Veteran Status: Service-Connected',
      dataTimestamp: new Date().toISOString(),
    },
  ]);
}

function stubMedications(_dfn: string): Promise<RAGChunk[]> {
  return Promise.resolve([
    {
      category: 'medications',
      label: 'Active Medications',
      content:
        '1. LISINOPRIL 10MG TAB - Take 1 daily\n2. METFORMIN 500MG TAB - Take 2 daily\n3. ASPIRIN 81MG TAB - Take 1 daily',
      dataTimestamp: new Date().toISOString(),
    },
  ]);
}

function stubAllergies(_dfn: string): Promise<RAGChunk[]> {
  return Promise.resolve([
    {
      category: 'allergies',
      label: 'Allergies',
      content: 'PENICILLIN - Reaction: RASH (Moderate)\nSULFA DRUGS - Reaction: HIVES (Severe)',
      dataTimestamp: new Date().toISOString(),
    },
  ]);
}

function stubProblems(_dfn: string): Promise<RAGChunk[]> {
  return Promise.resolve([
    {
      category: 'problems',
      label: 'Active Problems',
      content:
        '1. Essential Hypertension (I10)\n2. Type 2 Diabetes Mellitus (E11.9)\n3. Obesity (E66.9)',
      dataTimestamp: new Date().toISOString(),
    },
  ]);
}

function stubVitals(_dfn: string): Promise<RAGChunk[]> {
  return Promise.resolve([
    {
      category: 'vitals',
      label: 'Recent Vitals',
      content: 'BP: 138/82 mmHg, HR: 76, Temp: 98.6F, SpO2: 97%, Wt: 210 lbs, Ht: 70 in, BMI: 30.1',
      dataTimestamp: new Date().toISOString(),
    },
  ]);
}

function stubLabs(_dfn: string): Promise<RAGChunk[]> {
  return Promise.resolve([
    {
      category: 'labs',
      label: 'Recent Lab Results',
      content: [
        'BMP (2025-02-15):',
        '  Glucose: 142 mg/dL (H) [Ref: 70-100]',
        '  BUN: 18 mg/dL [Ref: 7-20]',
        '  Creatinine: 1.1 mg/dL [Ref: 0.7-1.3]',
        '  Na: 140 mEq/L [Ref: 136-145]',
        '  K: 4.2 mEq/L [Ref: 3.5-5.1]',
        'HbA1c (2025-02-15): 7.2% (H) [Ref: <5.7%]',
      ].join('\n'),
      dataTimestamp: '2025-02-15T00:00:00.000Z',
    },
  ]);
}

function stubIntake(_dfn: string): Promise<RAGChunk[]> {
  return Promise.resolve([
    {
      category: 'intake',
      label: 'Latest Intake Summary',
      content:
        'Chief Complaint: Follow-up for diabetes management\nHPI: Patient reports occasional dizziness. Blood sugars running 140-180 fasting. Compliant with medications. No chest pain, SOB, or edema.',
      dataTimestamp: new Date().toISOString(),
    },
  ]);
}

function stubAppointments(_dfn: string): Promise<RAGChunk[]> {
  return Promise.resolve([
    {
      category: 'appointments',
      label: 'Upcoming Appointments',
      content:
        '1. Primary Care Follow-up - Feb 25, 2025 10:00 AM\n2. Ophthalmology - Mar 10, 2025 2:30 PM',
      dataTimestamp: new Date().toISOString(),
    },
  ]);
}

// Seed stub providers (replaced with VistA RPC providers at runtime)
providers.set('demographics', stubDemographics);
providers.set('medications', stubMedications);
providers.set('allergies', stubAllergies);
providers.set('problems', stubProblems);
providers.set('vitals', stubVitals);
providers.set('labs', stubLabs);
providers.set('intake', stubIntake);
providers.set('appointments', stubAppointments);

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Assemble RAG context for a patient, filtered by role permissions.
 * Returns chunks within MAX_CONTEXT_CHARS budget.
 */
export async function assembleContext(
  patientDfn: string,
  actorRole: AIActorRole,
  requestedCategories?: RAGSourceCategory[]
): Promise<RAGContext> {
  const allowedCategories = ROLE_ALLOWED_SOURCES[actorRole] ?? [];
  const targetCategories = requestedCategories
    ? requestedCategories.filter((c) => allowedCategories.includes(c))
    : allowedCategories;

  const excludedCategories = (requestedCategories ?? allowedCategories).filter(
    (c) => !allowedCategories.includes(c)
  );

  const chunks: RAGChunk[] = [];
  let totalChars = 0;

  for (const category of targetCategories) {
    const provider = providers.get(category);
    if (!provider) continue;

    try {
      const categoryChunks = await provider(patientDfn);
      for (const chunk of categoryChunks.slice(0, MAX_CHUNKS_PER_CATEGORY)) {
        if (totalChars + chunk.content.length > MAX_CONTEXT_CHARS) break;
        chunks.push(chunk);
        totalChars += chunk.content.length;
      }
    } catch {
      // Skip failed providers -- don't block the request
    }

    if (totalChars >= MAX_CONTEXT_CHARS) break;
  }

  return {
    chunks,
    totalChars,
    categoriesIncluded: [...new Set(chunks.map((c) => c.category))],
    categoriesExcluded: excludedCategories as RAGSourceCategory[],
  };
}

/**
 * Format RAG context as a text string for prompt injection.
 * Each chunk includes a citation label.
 */
export function formatContextForPrompt(context: RAGContext): string {
  if (context.chunks.length === 0) return '(No patient context available)';
  return context.chunks
    .map((c) => `[${c.label}] (${c.category}, ${c.dataTimestamp}):\n${c.content}`)
    .join('\n\n');
}

/** Get which categories a role may access. */
export function getAllowedCategories(role: AIActorRole): RAGSourceCategory[] {
  return [...(ROLE_ALLOWED_SOURCES[role] ?? [])];
}
