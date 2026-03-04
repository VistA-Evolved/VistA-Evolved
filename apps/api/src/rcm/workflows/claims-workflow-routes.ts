/**
 * Claims Workflow Routes — Phase 94: PH HMO Workflow Automation
 *
 * REST endpoints for HMO-aware claims submission workflow:
 *   POST  /rcm/claims/hmo           — create HMO claim with submission plan
 *   GET   /rcm/claims/hmo/board     — status board summary
 *   GET   /rcm/claims/hmo/:id/plan  — submission plan for existing claim
 *   POST  /rcm/claims/hmo/:id/transition — transition claim status
 *   POST  /rcm/claims/hmo/:id/denial    — record denial
 *   GET   /rcm/claims/hmo/:id/denials   — get denial history
 *   GET   /rcm/claims/hmo/:id/packet    — generate claim packet
 *   GET   /rcm/claims/source-map        — VistA source map
 *   GET   /rcm/payers/rulepacks         — payer rulepacks
 *   GET   /rcm/payers/rulepacks/:id     — single rulepack
 *
 * Auth: session-level (matched by /rcm/ catch-all in AUTH_RULES).
 */

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  createHmoClaim,
  generateClaimPacketForClaim,
  transitionHmoClaim,
  recordDenial,
  getDenials,
  getClaimsStatusBoard,
} from '../workflows/claims-workflow.js';
import type { ClaimStatus } from '../domain/claim.js';
import { getVistaSourceMap, getVistaSourceStats } from '../workflows/vista-source-map.js';
import {
  loadPayerRulepacks,
  getPayerRulepack,
  listPayerRulepacks,
  getRulepackStats,
} from '../payers/payer-rulepacks.js';
import { safeErr } from '../../lib/safe-error.js';

const claimsWorkflowRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  // Load rulepacks once
  loadPayerRulepacks();

  /* ── POST /rcm/claims/hmo — create HMO claim ──────────── */
  server.post('/rcm/claims/hmo', async (request, reply) => {
    const body = (request.body as any) || {};
    const {
      tenantId = 'default',
      patientDfn,
      patientName,
      payerId,
      dateOfService,
      diagnosisCodes,
      lines,
      totalCharge,
      loaReferenceNumber,
      actor = 'system',
    } = body;

    if (!patientDfn || !payerId || !dateOfService) {
      return reply.status(400).send({
        ok: false,
        error: 'patientDfn, payerId, and dateOfService required',
      });
    }

    try {
      const result = createHmoClaim({
        tenantId,
        patientDfn,
        patientName,
        payerId,
        dateOfService,
        diagnosisCodes,
        lines,
        totalCharge,
        loaReferenceNumber,
        actor,
      });

      return reply.status(201).send({
        ok: true,
        claim: result.claim,
        submissionPlan: result.submissionPlan,
      });
    } catch (err) {
      return reply.status(500).send({
        ok: false,
        error: safeErr(err),
      });
    }
  });

  /* ── GET /rcm/claims/hmo/board — status board ──────────── */
  server.get('/rcm/claims/hmo/board', async (request, reply) => {
    const tenantId = (request.query as any)?.tenantId ?? 'default';
    const board = getClaimsStatusBoard(tenantId);
    return reply.send({ ok: true, ...board });
  });

  /* ── GET /rcm/claims/hmo/:id/plan — submission plan ────── */
  server.get('/rcm/claims/hmo/:id/plan', async (request, reply) => {
    const { id } = request.params as { id: string };
    // For plan resolution, we get the payer from the claim
    const result = generateClaimPacketForClaim(id);
    if (!result.ok) {
      return reply.status(404).send({ ok: false, error: result.error });
    }
    return reply.send({ ok: true, submissionPlan: result.submissionPlan, packet: result.packet });
  });

  /* ── POST /rcm/claims/hmo/:id/transition ───────────────── */
  server.post('/rcm/claims/hmo/:id/transition', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { toStatus, actor = 'system', detail } = body;

    if (!toStatus) {
      return reply.status(400).send({ ok: false, error: 'toStatus required' });
    }

    try {
      const claim = transitionHmoClaim(id, toStatus as ClaimStatus, actor, detail);
      return reply.send({ ok: true, claim });
    } catch (err) {
      return reply.status(400).send({
        ok: false,
        error: safeErr(err),
      });
    }
  });

  /* ── POST /rcm/claims/hmo/:id/denial — record denial ──── */
  server.post('/rcm/claims/hmo/:id/denial', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { reasonText, reasonCode, actor = 'system' } = body;

    if (!reasonText) {
      return reply.status(400).send({ ok: false, error: 'reasonText required' });
    }

    const denial = recordDenial({ claimId: id, reasonText, reasonCode, actor });
    return reply.status(201).send({ ok: true, denial });
  });

  /* ── GET /rcm/claims/hmo/:id/denials — denial history ─── */
  server.get('/rcm/claims/hmo/:id/denials', async (request, reply) => {
    const { id } = request.params as { id: string };
    const denials = getDenials(id);
    return reply.send({ ok: true, count: denials.length, denials });
  });

  /* ── GET /rcm/claims/hmo/:id/packet — generate packet ─── */
  server.get('/rcm/claims/hmo/:id/packet', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = generateClaimPacketForClaim(id);
    if (!result.ok) {
      return reply.status(404).send({ ok: false, error: result.error });
    }
    return reply.send({ ok: true, packet: result.packet, submissionPlan: result.submissionPlan });
  });

  /* ── GET /rcm/claims/source-map — VistA source map ─────── */
  server.get('/rcm/claims/source-map', async (_request, reply) => {
    const map = getVistaSourceMap();
    const stats = getVistaSourceStats();
    return reply.send({ ok: true, entries: map, stats });
  });

  /* ── GET /rcm/payers/rulepacks ─────────────────────────── */
  server.get('/rcm/payers/rulepacks', async (_request, reply) => {
    const packs = listPayerRulepacks();
    const stats = getRulepackStats();
    return reply.send({ ok: true, count: packs.length, stats, rulepacks: packs });
  });

  /* ── GET /rcm/payers/rulepacks/:id ─────────────────────── */
  server.get('/rcm/payers/rulepacks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const pack = getPayerRulepack(id);
    if (!pack) return reply.status(404).send({ ok: false, error: 'Rulepack not found' });
    return reply.send({ ok: true, rulepack: pack });
  });
};

export default claimsWorkflowRoutes;
