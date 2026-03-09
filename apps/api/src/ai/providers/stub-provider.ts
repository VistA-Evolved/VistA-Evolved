/**
 * AI Gateway — Stub Provider (Phase 33)
 *
 * Development/testing provider that generates deterministic responses
 * without calling an external model. Always available.
 *
 * Production providers (OpenAI, Anthropic, local Ollama/vLLM) follow
 * the same AIProvider interface and are registered in providers/index.ts.
 */

import type { AIProvider } from '../types.js';

/* ------------------------------------------------------------------ */
/* Stub completion templates keyed by use case hint in prompt          */
/* ------------------------------------------------------------------ */

function generateStubResponse(systemPrompt: string, userPrompt: string): string {
  // Detect use case from prompt content
  if (systemPrompt.includes('clinical documentation assistant')) {
    return generateIntakeSummary(userPrompt);
  }
  if (systemPrompt.includes('patient education assistant')) {
    return generateLabEducation(userPrompt);
  }
  if (systemPrompt.includes('portal navigation assistant')) {
    return generatePortalSearch(userPrompt);
  }
  return 'This is a stub AI response for development purposes. No real model was invoked.';
}

function generateIntakeSummary(userPrompt: string): string {
  const intakeSection = userPrompt.match(/Patient intake data collected at .*?:\s*([\s\S]*)/);
  const intakeExcerpt = intakeSection?.[1]?.trim().slice(0, 240) || 'No intake content was provided.';

  return [
    '**DEVELOPMENT STUB OUTPUT -- NOT CLINICAL CONTENT**',
    '',
    '## Intake Summary Preview',
    '',
    'No live model was invoked. This output only confirms that the governed AI',
    'pipeline is wired end to end in the current environment.',
    '',
    '### Intake Source Check',
    intakeExcerpt,
    '',
    '### Interpretation',
    'Because the configured provider is a development stub, no grounded clinical',
    'draft has been generated from patient data. Use a non-stub provider for',
    'real intake summarization.',
    '',
    '### Next Step',
    'Review the patient intake session directly, or configure a live governed AI',
    'provider before relying on generated draft content.',
    '',
    '---',
    '*Development stub only. No patient-specific clinical facts were inferred or',
    'validated by a live model.*',
  ].join('\n');
}

function generateLabEducation(userPrompt: string): string {
  // Extract lab name from prompt if possible
  const labMatch = userPrompt.match(/Test:\s*(.+)/);
  const labName = labMatch ? labMatch[1].trim() : 'this lab test';

  return [
    `## Understanding Your ${labName} Result`,
    '',
    `**What is this test?**`,
    `${labName} is a blood test that helps your doctor understand how well`,
    'certain parts of your body are working.',
    '',
    '**What does your result mean?**',
    'Your result has been compared to a standard reference range.',
    "Values outside this range don't always mean something is wrong --",
    'many factors can affect results, including what you ate, medications,',
    'and time of day.',
    '',
    '**What should you do?**',
    'Your doctor will review this result along with your complete health',
    'picture. If you have questions about your result, please discuss them',
    'at your next appointment or send a message through the patient portal.',
    '',
    '---',
    '*This explanation is for educational purposes only and is not medical',
    'advice. Always discuss your lab results with your healthcare provider.*',
  ].join('\n');
}

function generatePortalSearch(userPrompt: string): string {
  const questionMatch = userPrompt.match(/Patient question:\s*(.+)/s);
  const question = questionMatch ? questionMatch[1].trim().toLowerCase() : '';

  if (question.includes('medication') || question.includes('prescription')) {
    return 'You can find your medications list under **Medications** in the left navigation menu. To request a refill, go to **Refill Requests**.';
  }
  if (question.includes('appointment')) {
    return 'You can view and manage appointments under **Appointments** in the left navigation menu. You can request new appointments or cancel existing ones from there.';
  }
  if (question.includes('message') || question.includes('contact') || question.includes('doctor')) {
    return 'You can send messages to your care team under **Messages** in the left navigation menu. Please note that messages are for non-urgent matters. For emergencies, call 911.';
  }
  if (question.includes('lab') || question.includes('result') || question.includes('test')) {
    return 'You can view your lab results and test results under **Health Records** in the left navigation menu.';
  }
  if (question.includes('record') || question.includes('health')) {
    return 'Your health records, including conditions, allergies, and vitals, are available under **Health Records** in the left navigation menu.';
  }

  return 'I can help you navigate the patient portal. The main sections are available in the left navigation menu: Home, Tasks, Health Records, Medications, Refill Requests, Messages, Appointments, Telehealth, Share Records, Export, Family Access, Activity Log, and Account settings.';
}

/* ------------------------------------------------------------------ */
/* Provider implementation                                             */
/* ------------------------------------------------------------------ */

export const stubProvider: AIProvider = {
  id: 'stub',
  name: 'Development Stub Provider',

  async complete(opts) {
    const start = Date.now();
    // Simulate small latency
    await new Promise((r) => setTimeout(r, 50));
    const text = generateStubResponse(opts.systemPrompt, opts.userPrompt);
    return {
      text,
      inputTokens: Math.ceil((opts.systemPrompt.length + opts.userPrompt.length) / 4),
      outputTokens: Math.ceil(text.length / 4),
      latencyMs: Date.now() - start,
    };
  },

  async healthCheck() {
    return { ok: true, detail: 'Stub provider always healthy' };
  },
};
