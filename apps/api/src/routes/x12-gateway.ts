/**
 * X12 Gateway Routes
 *
 * Phase 321 (W14-P5): REST endpoints for the X12 inbound processing gateway.
 *
 * Routes:
 *   POST   /x12/gateway/ingest           -- full inbound X12 processing pipeline
 *   POST   /x12/gateway/parse            -- parse raw X12 without routing
 *   POST   /x12/gateway/validate         -- parse + validate envelope only
 *   POST   /x12/gateway/ack/ta1          -- generate TA1 for a given interchange
 *   POST   /x12/gateway/ack/999          -- generate 999 for a given interchange
 *   GET    /x12/gateway/handlers         -- list registered transaction handlers
 *   GET    /x12/gateway/control-numbers  -- control number tracking stats
 *   DELETE /x12/gateway/control-numbers  -- clear control number store (admin)
 *   GET    /x12/gateway/health           -- gateway health summary
 */

import type { FastifyInstance } from 'fastify';
import {
  parseX12,
  validateEnvelope,
  generateTA1,
  generate999,
  processInboundX12,
  getRegisteredHandlers,
  getControlNumberStats,
  clearControlNumbers,
} from '../rcm/edi/x12-gateway.js';

const DEFAULT_SENDER_ID = process.env.X12_GATEWAY_SENDER_ID || 'VISTAEVOLVED';
const DEFAULT_SENDER_QUAL = process.env.X12_GATEWAY_SENDER_QUAL || 'ZZ';

export async function x12GatewayRoutes(app: FastifyInstance): Promise<void> {
  // --- Full Inbound Processing -------------------------------------

  app.post('/x12/gateway/ingest', async (request, reply) => {
    const body = (request.body as any) || {};
    const rawX12 = body.rawX12 || body.payload;
    if (!rawX12 || typeof rawX12 !== 'string') {
      reply.code(400);
      return { ok: false, error: 'rawX12 string is required in request body' };
    }

    const result = await processInboundX12(rawX12.trim(), {
      senderId: body.senderId || DEFAULT_SENDER_ID,
      senderQualifier: body.senderQualifier || DEFAULT_SENDER_QUAL,
    });

    if (!result.parseResult.ok) {
      reply.code(422);
      return { ok: false, error: 'parse_failed', errors: result.parseResult.errors };
    }

    if (result.isDuplicate) {
      reply.code(409);
      return {
        ok: false,
        error: 'duplicate_interchange',
        controlNumber: result.parseResult.interchange?.envelope.controlNumber,
        ta1Ack: result.routingResult?.ta1Ack,
      };
    }

    return {
      ok: true,
      interchangeControlNumber: result.routingResult?.interchangeControlNumber,
      totalTransactions: result.routingResult?.totalTransactions,
      results: result.routingResult?.results,
      validation: result.validationResult
        ? {
            valid: result.validationResult.valid,
            errorCount: result.validationResult.errors.length,
            warningCount: result.validationResult.warnings.length,
          }
        : undefined,
      ta1Ack: result.routingResult?.ta1Ack,
      ack999: result.routingResult?.ack999,
    };
  });

  // --- Parse Only --------------------------------------------------

  app.post('/x12/gateway/parse', async (request, reply) => {
    const body = (request.body as any) || {};
    const rawX12 = body.rawX12 || body.payload;
    if (!rawX12 || typeof rawX12 !== 'string') {
      reply.code(400);
      return { ok: false, error: 'rawX12 string is required' };
    }

    const result = parseX12(rawX12.trim());
    if (!result.ok) {
      reply.code(422);
      return { ok: false, errors: result.errors };
    }

    const ix = result.interchange!;
    return {
      ok: true,
      envelope: {
        senderId: ix.envelope.senderId,
        receiverId: ix.envelope.receiverId,
        controlNumber: ix.envelope.controlNumber,
        versionNumber: ix.envelope.versionNumber,
        usageIndicator: ix.envelope.usageIndicator,
      },
      functionalGroups: ix.functionalGroups.map((g) => ({
        functionalCode: g.envelope.functionalCode,
        controlNumber: g.envelope.controlNumber,
        versionCode: g.envelope.versionCode,
        transactionSets: g.transactionSets.map((t) => ({
          transactionSet: t.transactionSet,
          controlNumber: t.controlNumber,
          segmentCount: t.segments.length,
        })),
      })),
      errors: result.errors,
    };
  });

  // --- Validate Only ----------------------------------------------

  app.post('/x12/gateway/validate', async (request, reply) => {
    const body = (request.body as any) || {};
    const rawX12 = body.rawX12 || body.payload;
    if (!rawX12 || typeof rawX12 !== 'string') {
      reply.code(400);
      return { ok: false, error: 'rawX12 string is required' };
    }

    const parseResult = parseX12(rawX12.trim());
    if (!parseResult.ok || !parseResult.interchange) {
      reply.code(422);
      return { ok: false, error: 'parse_failed', errors: parseResult.errors };
    }

    const envResult = validateEnvelope(parseResult.interchange);
    return {
      ok: envResult.valid,
      valid: envResult.valid,
      errors: envResult.errors,
      warnings: envResult.warnings,
    };
  });

  // --- TA1 Generation ---------------------------------------------

  app.post('/x12/gateway/ack/ta1', async (request, reply) => {
    const body = (request.body as any) || {};
    const rawX12 = body.rawX12 || body.payload;
    if (!rawX12 || typeof rawX12 !== 'string') {
      reply.code(400);
      return { ok: false, error: 'rawX12 string is required' };
    }

    const parseResult = parseX12(rawX12.trim());
    if (!parseResult.ok || !parseResult.interchange) {
      reply.code(422);
      return { ok: false, error: 'parse_failed', errors: parseResult.errors };
    }

    const accepted = body.accepted !== false;
    const ta1 = generateTA1(
      parseResult.interchange,
      accepted,
      {
        senderId: body.senderId || DEFAULT_SENDER_ID,
        senderQualifier: body.senderQualifier || DEFAULT_SENDER_QUAL,
      },
      body.errorCode
    );

    return { ok: true, ta1 };
  });

  // --- 999 Generation ---------------------------------------------

  app.post('/x12/gateway/ack/999', async (request, reply) => {
    const body = (request.body as any) || {};
    const rawX12 = body.rawX12 || body.payload;
    if (!rawX12 || typeof rawX12 !== 'string') {
      reply.code(400);
      return { ok: false, error: 'rawX12 string is required' };
    }

    const parseResult = parseX12(rawX12.trim());
    if (!parseResult.ok || !parseResult.interchange) {
      reply.code(422);
      return { ok: false, error: 'parse_failed', errors: parseResult.errors };
    }

    const envResult = validateEnvelope(parseResult.interchange);
    const ack999 = generate999(parseResult.interchange, envResult, {
      senderId: body.senderId || DEFAULT_SENDER_ID,
      senderQualifier: body.senderQualifier || DEFAULT_SENDER_QUAL,
    });

    return { ok: true, ack999 };
  });

  // --- Handler Registry -------------------------------------------

  app.get('/x12/gateway/handlers', async () => {
    const handlers = getRegisteredHandlers();
    return { ok: true, count: handlers.length, handlers };
  });

  // --- Control Number Stats ---------------------------------------

  app.get('/x12/gateway/control-numbers', async () => {
    const stats = getControlNumberStats();
    return { ok: true, ...stats };
  });

  app.delete('/x12/gateway/control-numbers', async () => {
    clearControlNumbers();
    return { ok: true, cleared: true };
  });

  // --- Health -----------------------------------------------------

  app.get('/x12/gateway/health', async () => {
    const handlers = getRegisteredHandlers();
    const ctrlStats = getControlNumberStats();
    return {
      ok: true,
      status: handlers.length > 0 ? 'active' : 'no_handlers',
      registeredHandlers: handlers.length,
      handlerTypes: handlers,
      controlNumbersTracked: ctrlStats.total,
      senderId: DEFAULT_SENDER_ID,
    };
  });
}
