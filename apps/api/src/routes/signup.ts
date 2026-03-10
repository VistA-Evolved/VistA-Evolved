/**
 * Public signup endpoint -- creates a pending tenant without requiring authentication.
 *
 * This is the entry point for the marketing site's signup wizard.
 * The tenant is created in 'pending' status and must be provisioned by an admin.
 *
 * Rate limited: 5 registrations per IP per hour.
 *
 * Phase C4 (PromptFolder: SaaS-Orchestration)
 */

import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { log } from '../lib/logger.js';
import { isPgConfigured, getPgPool } from '../platform/pg/pg-db.js';

// Simple in-memory rate limiter (per IP, resets hourly)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = parseInt(process.env.SIGNUP_RATE_LIMIT || '5', 10);
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// Periodic cleanup of stale rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now >= entry.resetAt) rateLimitMap.delete(ip);
  }
}, 15 * 60 * 1000).unref();


const ENTITY_TYPES: Record<string, { modules: string[]; sku: string }> = {
  SOLO_CLINIC: { modules: ['kernel', 'clinical', 'scheduling', 'portal', 'analytics', 'rcm'], sku: 'CLINICIAN_ONLY' },
  GROUP_PRACTICE: { modules: ['kernel', 'clinical', 'scheduling', 'portal', 'analytics', 'rcm', 'imaging'], sku: 'FULL_SUITE' },
  MULTI_CLINIC: { modules: ['kernel', 'clinical', 'scheduling', 'portal', 'analytics', 'rcm', 'imaging', 'telehealth'], sku: 'FULL_SUITE' },
  SPECIALTY_CENTER: { modules: ['kernel', 'clinical', 'scheduling', 'portal', 'analytics', 'rcm', 'imaging'], sku: 'FULL_SUITE' },
  HOSPITAL: { modules: ['kernel', 'clinical', 'scheduling', 'portal', 'analytics', 'rcm', 'imaging', 'interop', 'iam'], sku: 'FULL_SUITE' },
  HEALTH_SYSTEM: { modules: ['kernel', 'clinical', 'scheduling', 'portal', 'analytics', 'rcm', 'imaging', 'interop', 'iam', 'telehealth'], sku: 'FULL_SUITE' },
  GOVERNMENT: { modules: ['kernel', 'clinical', 'scheduling', 'portal', 'analytics', 'rcm', 'imaging', 'interop', 'iam'], sku: 'FULL_SUITE' },
};

export default async function signupRoutes(server: FastifyInstance) {
  server.post('/signup/register', async (request, reply) => {
    const ip = request.ip;
    if (!checkRateLimit(ip)) {
      return reply.code(429).send({ ok: false, error: 'Too many signup requests. Please try again later.' });
    }

    const body = (request.body as any) || {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const contactEmail = typeof body.contactEmail === 'string' ? body.contactEmail.trim() : '';
    const country = typeof body.country === 'string' ? body.country.trim().toUpperCase() : 'US';
    const entityType = typeof body.entityType === 'string' ? body.entityType.trim() : '';

    // Validation
    if (!name || name.length < 2) {
      return reply.code(400).send({ ok: false, error: 'Organization name is required (min 2 characters)' });
    }
    if (!contactEmail || !contactEmail.includes('@') || !contactEmail.includes('.')) {
      return reply.code(400).send({ ok: false, error: 'Valid email address is required' });
    }
    if (!ENTITY_TYPES[entityType]) {
      return reply.code(400).send({ ok: false, error: `Invalid entity type. Valid: ${Object.keys(ENTITY_TYPES).join(', ')}` });
    }

    const entityConfig = ENTITY_TYPES[entityType];
    const id = randomUUID();
    const tenantId = randomUUID();
    const now = new Date().toISOString();

    try {
      if (isPgConfigured()) {
        const pool = getPgPool();
        await pool.query(
          `INSERT INTO tenant_catalog (id, tenant_id, name, entity_type, country, contact_email, sku, status, modules, config, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [id, tenantId, name, entityType, country, contactEmail, entityConfig.sku, 'pending',
           JSON.stringify(entityConfig.modules), JSON.stringify({}), now, now],
        );
      }

      log.info('Signup registration received', { tenantId: id, entityType, country });

      return reply.code(201).send({
        ok: true,
        tenant: {
          id,
          tenantId,
          name,
          status: 'pending',
          entityType,
          country,
          modules: entityConfig.modules,
        },
        message: 'Your organization has been registered. An administrator will complete provisioning and you will receive credentials at ' + contactEmail + '.',
      });
    } catch (err: any) {
      // Handle duplicate email gracefully
      if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
        return reply.code(409).send({ ok: false, error: 'An organization with this email already exists. Please contact support.' });
      }
      log.error('Signup registration failed', { err: err.message });
      return reply.code(500).send({ ok: false, error: 'Registration failed. Please try again or contact support.' });
    }
  });

  // Public endpoint: check signup status by tenant ID
  server.get('/signup/status/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!isPgConfigured()) {
      return reply.code(503).send({ ok: false, error: 'Service unavailable' });
    }
    const pool = getPgPool();
    const result = await pool.query(
      'SELECT id, name, status, entity_type, created_at FROM tenant_catalog WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) {
      return reply.code(404).send({ ok: false, error: 'Not found' });
    }
    const row = result.rows[0];
    return {
      ok: true,
      tenant: {
        id: row.id,
        name: row.name,
        status: row.status,
        entityType: row.entity_type,
        createdAt: row.created_at,
      },
    };
  });
}
