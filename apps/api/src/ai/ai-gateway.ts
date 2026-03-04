/**
 * AI Gateway — Main Orchestrator (Phase 33)
 *
 * Ties together: model registry, prompt registry, safety layer,
 * redaction engine, RAG grounding, provider adapters, and audit log.
 *
 * Flow: validate → safety check → resolve model → assemble RAG context
 * → optionally redact → render prompt → call provider → post-safety
 * check → audit → return response.
 */

import { randomBytes } from 'node:crypto';
import type { AIRequest, AIResponse, Citation, ConfidenceLevel } from './types.js';
import { resolveModel, canHandlePhi } from './model-registry.js';
import { renderPrompt } from './prompt-registry.js';
import {
  checkRequestSafety,
  checkResponseSafety,
  getFacilityPolicy,
  isUseCaseAllowed,
} from './safety-layer.js';
import { redactPhi, detectPhi } from './redaction.js';
import { assembleContext, formatContextForPrompt } from './rag-engine.js';
import { getProvider } from './providers/index.js';
import { logAiAudit } from './ai-audit.js';
import { log } from '../lib/logger.js';

/* ------------------------------------------------------------------ */
/* Rate limiting (per-user, per-hour)                                  */
/* ------------------------------------------------------------------ */

const userRequestTimestamps = new Map<string, number[]>();

function checkAiRateLimit(userId: string): { allowed: boolean; retryAfterMs?: number } {
  const policy = getFacilityPolicy();
  const maxPerHour = policy.maxRequestsPerUserPerHour;
  const now = Date.now();
  const windowMs = 3600000;

  const timestamps = userRequestTimestamps.get(userId) ?? [];
  const recent = timestamps.filter((t) => now - t < windowMs);
  userRequestTimestamps.set(userId, recent);

  if (recent.length >= maxPerHour) {
    const oldest = recent[0];
    return { allowed: false, retryAfterMs: windowMs - (now - oldest) };
  }
  return { allowed: true };
}

function recordAiRequest(userId: string): void {
  const timestamps = userRequestTimestamps.get(userId) ?? [];
  timestamps.push(Date.now());
  userRequestTimestamps.set(userId, timestamps);
}

/* ------------------------------------------------------------------ */
/* Citation extraction                                                 */
/* ------------------------------------------------------------------ */

/** Extract [CITE: source] markers from AI response text. */
function extractCitations(
  text: string,
  contextChunks: Array<{ label: string; category: string; content: string }>
): Citation[] {
  const citations: Citation[] = [];
  const citePattern = /\[CITE:\s*([^\]]+)\]/g;
  let match: RegExpExecArray | null;

  while ((match = citePattern.exec(text)) !== null) {
    const citeRef = match[1].trim();
    // Try to match to a context chunk
    const matchedChunk = contextChunks.find(
      (c) =>
        c.label.toLowerCase().includes(citeRef.toLowerCase()) ||
        citeRef.toLowerCase().includes(c.category.toLowerCase())
    );
    citations.push({
      source: citeRef,
      category: matchedChunk?.category ?? 'unknown',
      snippet: matchedChunk?.content?.slice(0, 200) ?? '',
    });
  }

  return citations;
}

/** Determine confidence level based on citation coverage. */
function assessConfidence(citations: Citation[], ragChunkCount: number): ConfidenceLevel {
  if (ragChunkCount === 0) return 'low';
  if (citations.length === 0) return 'low';
  const ratio = citations.length / Math.max(ragChunkCount, 1);
  if (ratio >= 0.5) return 'high';
  if (ratio >= 0.2) return 'medium';
  return 'low';
}

/* ------------------------------------------------------------------ */
/* Main gateway function                                               */
/* ------------------------------------------------------------------ */

export interface GatewayResult {
  ok: boolean;
  response?: AIResponse;
  error?: string;
  auditEventId?: string;
}

/**
 * Process an AI request through the full governed pipeline.
 *
 * 1. Validate use case + facility policy
 * 2. Rate limit check
 * 3. Pre-request safety check
 * 4. Resolve model
 * 5. Assemble RAG context
 * 6. Optionally redact PHI
 * 7. Render prompt
 * 8. Call provider
 * 9. Post-response safety check
 * 10. Audit log
 * 11. Return response
 */
export async function processAiRequest(request: AIRequest): Promise<GatewayResult> {
  const startMs = Date.now();
  const responseId = `ai-${randomBytes(8).toString('hex')}`;
  const policy = getFacilityPolicy();

  // 1. Validate use case
  if (!isUseCaseAllowed(request.useCase)) {
    const audit = logAiAudit({
      useCase: request.useCase,
      modelId: 'none',
      promptId: request.promptId,
      promptHash: '',
      actorId: request.actor.id,
      actorRole: request.actor.role,
      patientDfn: request.patientDfn,
      outcome: 'blocked',
      safetyWarnings: [`Use case '${request.useCase}' not allowed by facility policy`],
      wasRedacted: false,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - startMs,
      ragCategories: [],
      citationCount: 0,
    });
    return {
      ok: false,
      error: `Use case '${request.useCase}' is not enabled at this facility`,
      auditEventId: audit.id,
    };
  }

  // 2. Rate limit
  const rateCheck = checkAiRateLimit(request.actor.id);
  if (!rateCheck.allowed) {
    const audit = logAiAudit({
      useCase: request.useCase,
      modelId: 'none',
      promptId: request.promptId,
      promptHash: '',
      actorId: request.actor.id,
      actorRole: request.actor.role,
      patientDfn: request.patientDfn,
      outcome: 'blocked',
      safetyWarnings: ['Rate limit exceeded'],
      wasRedacted: false,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - startMs,
      ragCategories: [],
      citationCount: 0,
    });
    return {
      ok: false,
      error: `Rate limit exceeded. Try again in ${Math.ceil((rateCheck.retryAfterMs ?? 0) / 1000)}s`,
      auditEventId: audit.id,
    };
  }
  recordAiRequest(request.actor.id);

  // 3. Pre-request safety check
  const inputText = Object.values(request.variables).join(' ');
  const safetyCheck = checkRequestSafety(inputText, request.useCase);
  if (!safetyCheck.allowed) {
    const audit = logAiAudit({
      useCase: request.useCase,
      modelId: 'none',
      promptId: request.promptId,
      promptHash: '',
      actorId: request.actor.id,
      actorRole: request.actor.role,
      patientDfn: request.patientDfn,
      outcome: 'blocked',
      blockedCategory: safetyCheck.blockedCategory,
      safetyWarnings: safetyCheck.warnings,
      wasRedacted: false,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - startMs,
      ragCategories: [],
      citationCount: 0,
    });
    return {
      ok: false,
      error: `Request blocked by safety filter: ${safetyCheck.blockedCategory}`,
      auditEventId: audit.id,
    };
  }

  // 4. Resolve model
  const model = resolveModel(request.useCase, request.preferredModelId);
  if (!model) {
    return {
      ok: false,
      error: `No active model available for use case '${request.useCase}'`,
    };
  }

  // 5. Assemble RAG context (if patient-scoped)
  let contextText = '';
  let ragCategories: string[] = [];
  let contextChunks: Array<{ label: string; category: string; content: string }> = [];

  if (request.patientDfn) {
    const context = await assembleContext(request.patientDfn, request.actor.role);
    contextChunks = context.chunks.map((c) => ({
      label: c.label,
      category: c.category,
      content: c.content,
    }));

    // 6. Optionally redact PHI
    if (policy.redactPhi && !canHandlePhi(model.id)) {
      const phiCheck = detectPhi(formatContextForPrompt(context));
      if (phiCheck.phiDetected) {
        // Redact each chunk individually
        for (const chunk of contextChunks) {
          const redacted = redactPhi(chunk.content);
          chunk.content = redacted.text;
        }
      }
    }

    contextText = contextChunks
      .map((c) => `[${c.label}] (${c.category}):\n${c.content}`)
      .join('\n\n');
    ragCategories = context.categoriesIncluded;
  }

  // 7. Render prompt
  const enrichedVars = { ...request.variables };
  if (contextText && enrichedVars.chartContext === undefined) {
    enrichedVars.chartContext = contextText;
  }

  const rendered = renderPrompt(request.promptId, enrichedVars);
  if (!rendered) {
    return {
      ok: false,
      error: `Prompt '${request.promptId}' not found or variable validation failed`,
    };
  }

  // 8. Call provider
  const provider = getProvider(model.provider);
  if (!provider) {
    return { ok: false, error: `Provider '${model.provider}' not registered` };
  }

  let providerResult: {
    text: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
  };
  try {
    providerResult = await provider.complete({
      systemPrompt: rendered.systemPrompt,
      userPrompt: rendered.userPrompt,
      maxTokens: Math.min(request.maxTokens ?? model.maxOutputTokens, model.maxOutputTokens),
    });
  } catch (err) {
    log.error('AI provider call failed', { modelId: model.id, error: String(err) });
    const audit = logAiAudit({
      useCase: request.useCase,
      modelId: model.id,
      promptId: request.promptId,
      promptHash: rendered.contentHash,
      actorId: request.actor.id,
      actorRole: request.actor.role,
      patientDfn: request.patientDfn,
      outcome: 'error',
      safetyWarnings: [],
      wasRedacted: false,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - startMs,
      ragCategories: ragCategories as any,
      citationCount: 0,
    });
    return { ok: false, error: 'AI model call failed', auditEventId: audit.id };
  }

  // 9. Post-response safety check
  const responseSafety = checkResponseSafety(providerResult.text, request.useCase);
  const safetyWarnings = [...safetyCheck.warnings, ...responseSafety.warnings];

  // 10. Extract citations
  const citations = extractCitations(providerResult.text, contextChunks);
  const confidence = assessConfidence(citations, contextChunks.length);

  // Determine if clinician confirmation is needed
  const requiresConfirmation =
    policy.requireClinicianConfirmation &&
    (request.useCase === 'intake-summary' || request.useCase === 'custom');

  // Redaction status
  const wasRedacted = policy.redactPhi && !canHandlePhi(model.id);

  // Build response
  const response: AIResponse = {
    text: responseSafety.filteredText,
    modelId: model.id,
    promptId: request.promptId,
    promptHash: rendered.contentHash,
    citations,
    confidence,
    requiresConfirmation,
    wasRedacted,
    safetyWarnings,
    latencyMs: Date.now() - startMs,
    responseId,
    generatedAt: new Date().toISOString(),
  };

  // 11. Audit log
  const outcome =
    responseSafety.categoriesFound.length > 0 ? ('safety_filtered' as const) : ('success' as const);
  const audit = logAiAudit({
    useCase: request.useCase,
    modelId: model.id,
    promptId: request.promptId,
    promptHash: rendered.contentHash,
    actorId: request.actor.id,
    actorRole: request.actor.role,
    patientDfn: request.patientDfn,
    outcome,
    safetyWarnings,
    wasRedacted,
    inputTokens: providerResult.inputTokens,
    outputTokens: providerResult.outputTokens,
    latencyMs: response.latencyMs,
    ragCategories: ragCategories as any,
    citationCount: citations.length,
  });

  return { ok: true, response, auditEventId: audit.id };
}
