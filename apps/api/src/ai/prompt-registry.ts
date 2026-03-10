/**
 * AI Gateway -- Prompt Registry (Phase 33)
 *
 * Versioned prompt templates. No ad-hoc hidden prompts.
 * Every prompt has a SHA-256 content hash for tamper-detection
 * audit trail. Only registered prompts may be used.
 */

import { createHash } from 'node:crypto';
import type { PromptTemplate } from './types.js';

/* ------------------------------------------------------------------ */
/* In-memory registry                                                  */
/* ------------------------------------------------------------------ */

const prompts = new Map<string, PromptTemplate>();

/* ------------------------------------------------------------------ */
/* Hash helper                                                         */
/* ------------------------------------------------------------------ */

/** SHA-256 hash of prompt content for audit tamper detection. */
export function hashPromptContent(systemPrompt: string, userPromptTemplate: string): string {
  return createHash('sha256')
    .update(systemPrompt + '\n---\n' + userPromptTemplate)
    .digest('hex')
    .slice(0, 32);
}

/* ------------------------------------------------------------------ */
/* Built-in prompt templates (Phase 33 initial use cases)              */
/* ------------------------------------------------------------------ */

const INTAKE_SUMMARY_PROMPT: PromptTemplate = {
  id: 'intake-summary-v1',
  version: '1.0.0',
  useCase: 'intake-summary',
  systemPrompt: [
    'You are a clinical documentation assistant. Your role is to draft',
    'a clinician-ready summary from patient intake data. You must:',
    '- Summarize ONLY facts present in the provided intake data',
    '- Never invent, infer, or add information not in the source',
    '- Include citations to specific intake items',
    '- Flag any concerning findings with [ATTENTION]',
    '- Use standard medical abbreviations where appropriate',
    '- This is a DRAFT that REQUIRES clinician review and confirmation',
    '',
    'You must NOT:',
    '- Provide diagnoses or differential diagnoses',
    '- Suggest treatment plans or prescribing guidance',
    '- Make prognostic statements',
    '- Recommend ordering any tests or procedures',
  ].join('\n'),
  userPromptTemplate: [
    'Patient intake data collected at {{intakeDate}}:',
    '',
    '{{intakeData}}',
    '',
    'Clinical context (from chart):',
    '{{chartContext}}',
    '',
    'Please draft a structured clinician-ready summary of this intake.',
    'Include [CITE: source] for each fact referenced.',
  ].join('\n'),
  contentHash: '', // set below
  allowedVariables: ['intakeDate', 'intakeData', 'chartContext'],
  updatedAt: new Date().toISOString(),
  approvedBy: 'system-builtin',
};
INTAKE_SUMMARY_PROMPT.contentHash = hashPromptContent(
  INTAKE_SUMMARY_PROMPT.systemPrompt,
  INTAKE_SUMMARY_PROMPT.userPromptTemplate
);

const LAB_EDUCATION_PROMPT: PromptTemplate = {
  id: 'lab-education-v1',
  version: '1.0.0',
  useCase: 'lab-education',
  systemPrompt: [
    'You are a patient education assistant. Your role is to explain',
    'lab results in plain, easy-to-understand language. You must:',
    '- Use 6th-grade reading level language',
    '- Explain what the test measures and why it matters',
    '- Explain if the result is within normal range',
    '- Provide general context about what high/low values might mean',
    '- Always recommend discussing results with their doctor',
    '',
    'You must NOT:',
    '- Provide diagnoses or suggest what condition the patient has',
    '- Recommend treatment or medication changes',
    '- Make predictions about health outcomes',
    '- Tell the patient to stop or start any medication',
    '- Cause alarm -- use reassuring, educational tone',
  ].join('\n'),
  userPromptTemplate: [
    'Please explain the following lab result in simple terms:',
    '',
    'Test: {{labName}}',
    'Result: {{labValue}} {{labUnits}}',
    'Reference range: {{referenceRange}}',
    'Date: {{labDate}}',
    '',
    'Explain what this test measures and what this result means',
    'in plain language a patient can understand.',
  ].join('\n'),
  contentHash: '',
  allowedVariables: ['labName', 'labValue', 'labUnits', 'referenceRange', 'labDate'],
  updatedAt: new Date().toISOString(),
  approvedBy: 'system-builtin',
};
LAB_EDUCATION_PROMPT.contentHash = hashPromptContent(
  LAB_EDUCATION_PROMPT.systemPrompt,
  LAB_EDUCATION_PROMPT.userPromptTemplate
);

const PORTAL_SEARCH_PROMPT: PromptTemplate = {
  id: 'portal-search-v1',
  version: '1.0.0',
  useCase: 'portal-search',
  systemPrompt: [
    'You are a patient portal navigation assistant. Your role is to help',
    'patients find information and features in their health portal. You must:',
    '- Answer ONLY about portal navigation and where to find features',
    '- Provide specific page names and paths when possible',
    '- Be concise and direct',
    "- If you're unsure, say so and suggest contacting support",
    '',
    'You must NOT:',
    '- Provide medical advice of any kind',
    '- Interpret lab results or health records',
    '- Suggest diagnoses or treatments',
    '- Access or display patient health data',
  ].join('\n'),
  userPromptTemplate: [
    'The patient portal has these sections:',
    '{{portalSections}}',
    '',
    'Patient question: {{question}}',
    '',
    "Help the patient find what they're looking for in the portal.",
  ].join('\n'),
  contentHash: '',
  allowedVariables: ['portalSections', 'question'],
  updatedAt: new Date().toISOString(),
  approvedBy: 'system-builtin',
};
PORTAL_SEARCH_PROMPT.contentHash = hashPromptContent(
  PORTAL_SEARCH_PROMPT.systemPrompt,
  PORTAL_SEARCH_PROMPT.userPromptTemplate
);

// Seed built-in prompts
prompts.set(INTAKE_SUMMARY_PROMPT.id, INTAKE_SUMMARY_PROMPT);
prompts.set(LAB_EDUCATION_PROMPT.id, LAB_EDUCATION_PROMPT);
prompts.set(PORTAL_SEARCH_PROMPT.id, PORTAL_SEARCH_PROMPT);

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Get a prompt by ID. Returns null if not found. */
export function getPrompt(id: string): PromptTemplate | null {
  return prompts.get(id) ?? null;
}

/** List all registered prompts. */
export function listPrompts(): PromptTemplate[] {
  return Array.from(prompts.values());
}

/** Register or update a prompt template. Recomputes content hash. */
export function registerPrompt(template: Omit<PromptTemplate, 'contentHash'>): {
  ok: boolean;
  contentHash: string;
  error?: string;
} {
  if (!template.id || !template.systemPrompt || !template.userPromptTemplate) {
    return { ok: false, contentHash: '', error: 'Missing required fields' };
  }
  const contentHash = hashPromptContent(template.systemPrompt, template.userPromptTemplate);
  const full: PromptTemplate = { ...template, contentHash };
  prompts.set(full.id, full);
  return { ok: true, contentHash };
}

/**
 * Render a prompt template by interpolating variables.
 * Only allows variables declared in allowedVariables.
 * Returns null if prompt not found or variable validation fails.
 */
export function renderPrompt(
  promptId: string,
  variables: Record<string, string>
): { systemPrompt: string; userPrompt: string; contentHash: string } | null {
  const template = prompts.get(promptId);
  if (!template) return null;

  // Validate only allowed variables are used
  for (const key of Object.keys(variables)) {
    if (!template.allowedVariables.includes(key)) {
      return null; // Reject unknown variables (prompt injection guard)
    }
  }

  let userPrompt = template.userPromptTemplate;
  for (const [key, value] of Object.entries(variables)) {
    // Sanitize: cap each variable value at 10000 chars
    const safeValue = value.slice(0, 10000);
    userPrompt = userPrompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), safeValue);
  }

  return {
    systemPrompt: template.systemPrompt,
    userPrompt,
    contentHash: template.contentHash,
  };
}

/** Get prompt count. */
export function getPromptCount(): number {
  return prompts.size;
}
