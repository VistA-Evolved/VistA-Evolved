/**
 * Phase 172: Certification Evidence Export -- API Routes
 *
 * Provides admin-only endpoints for certification evidence:
 *   GET  /admin/certification/status    -- Current certification readiness
 *   POST /admin/certification/generate  -- Trigger evidence generation
 *   GET  /admin/certification/bundles   -- List generated bundles
 *   GET  /admin/certification/bundle/:id -- Get bundle manifest
 *
 * All endpoints require admin role (AUTH_RULES /admin/*).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import { log } from '../lib/logger.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';

// -- Types ---------------------------------------------------

export interface CertBundleInfo {
  buildId: string;
  createdAt: string;
  artifactCount: number;
  phiClean: boolean;
  manifestHash: string;
}

export type CertReadiness = 'production' | 'staging' | 'development' | 'incomplete';

export interface CertStatus {
  readiness: CertReadiness;
  postureModules: number;
  auditTrails: number;
  complianceDocs: number;
  runbooks: number;
  gapMatrixPresent: boolean;
  lastBundleId: string | null;
}

// -- Helpers -------------------------------------------------

function getRepoRoot(): string {
  return resolve(import.meta.dirname, '../../../..');
}

function countDir(dir: string, ext: string): number {
  try {
    if (!existsSync(dir)) return 0;
    return readdirSync(dir).filter((f) => f.endsWith(ext)).length;
  } catch {
    return 0;
  }
}

function safeReadJson(filePath: string): any {
  try {
    if (!existsSync(filePath)) return null;
    const raw = readFileSync(filePath, 'utf-8');
    const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

// -- Routes --------------------------------------------------

export default async function certificationEvidenceRoutes(server: FastifyInstance) {
  const root = getRepoRoot();
  const bundlesDir = join(root, 'artifacts', 'evidence', 'certification');

  // GET /admin/certification/status -- readiness assessment
  server.get(
    '/admin/certification/status',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;

      const postureDir = join(root, 'apps/api/src/posture');
      const complianceDir = join(root, 'docs/compliance');
      const runbookDir = join(root, 'docs/runbooks');
      const gapMatrixPath = join(root, 'qa/gauntlet/system-gap-matrix.json');

      const postureModules = countDir(postureDir, '.ts');
      const complianceDocs = countDir(complianceDir, '.md');
      const runbooks = countDir(runbookDir, '.md');
      const gapMatrixPresent = existsSync(gapMatrixPath);

      // Check audit trail files
      const auditTrails = [
        'apps/api/src/lib/immutable-audit.ts',
        'apps/api/src/services/imaging-audit.ts',
        'apps/api/src/rcm/audit/rcm-audit.ts',
      ].filter((f) => existsSync(join(root, f))).length;

      // Find latest bundle
      let lastBundleId: string | null = null;
      try {
        if (existsSync(bundlesDir)) {
          const bundles = readdirSync(bundlesDir).sort().reverse();
          lastBundleId = bundles[0] || null;
        }
      } catch {
        /* ignore */
      }

      // Determine readiness
      let readiness: CertReadiness = 'incomplete';
      if (postureModules >= 7 && auditTrails >= 3 && complianceDocs >= 5 && gapMatrixPresent) {
        readiness = 'production';
      } else if (postureModules >= 5 && auditTrails >= 2 && complianceDocs >= 3) {
        readiness = 'staging';
      } else if (postureModules >= 3 && auditTrails >= 1) {
        readiness = 'development';
      }

      const status: CertStatus = {
        readiness,
        postureModules,
        auditTrails,
        complianceDocs,
        runbooks,
        gapMatrixPresent,
        lastBundleId,
      };

      return { ok: true, status };
    }
  );

  // POST /admin/certification/generate -- trigger evidence bundle generation
  server.post(
    '/admin/certification/generate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;

      const body = (request.body as any) || {};
      const buildId =
        body.buildId || `cert-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;

      // Prevent path traversal in buildId
      if (/[/\\.]/.test(buildId)) {
        return reply.code(400).send({ ok: false, error: 'Invalid buildId (no slashes or dots)' });
      }

      // Run the generator script asynchronously
      const scriptPath = join(root, 'scripts/generate-certification-evidence.mjs');
      if (!existsSync(scriptPath)) {
        return reply.code(500).send({
          ok: false,
          error: 'Evidence generator script not found',
        });
      }

      log.info('Starting certification evidence generation', {
        buildId,
        actor: session.duz,
        tenantId: session.tenantId,
      });

      // Fire and forget -- the script runs independently
      const child = execFile('node', [scriptPath, '--build-id', buildId, '--skip-gates'], {
        cwd: root,
        timeout: 300_000,
      });

      child.on('error', (err) => {
        log.warn('Evidence generation error', { buildId, error: String(err) });
      });

      return {
        ok: true,
        message: 'Evidence generation started',
        buildId,
        outputDir: `artifacts/evidence/certification/${buildId}`,
        note: 'Run scripts/generate-certification-evidence.mjs directly for full gates',
      };
    }
  );

  // GET /admin/certification/bundles -- list generated bundles
  server.get(
    '/admin/certification/bundles',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;

      const bundles: CertBundleInfo[] = [];

      try {
        if (existsSync(bundlesDir)) {
          const dirs = readdirSync(bundlesDir);
          for (const dir of dirs) {
            const bundlePath = join(bundlesDir, dir);
            const manifestPath = join(bundlePath, 'manifest.json');
            const phiScanPath = join(bundlePath, 'phi-scan.json');

            const manifest = safeReadJson(manifestPath);
            const phiScan = safeReadJson(phiScanPath);

            bundles.push({
              buildId: dir,
              createdAt: manifest?.generatedAt || 'unknown',
              artifactCount: manifest?.artifacts ? Object.keys(manifest.artifacts).length : 0,
              phiClean: phiScan?.allClean ?? false,
              manifestHash: manifest
                ? createHash('sha256').update(JSON.stringify(manifest)).digest('hex').slice(0, 16)
                : 'none',
            });
          }
        }
      } catch {
        /* ignore */
      }

      return {
        ok: true,
        bundles: bundles.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        total: bundles.length,
      };
    }
  );

  // GET /admin/certification/bundle/:buildId -- get specific bundle manifest
  server.get(
    '/admin/certification/bundle/:buildId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;

      const { buildId } = request.params as { buildId: string };
      if (!buildId || /[/\\.]/.test(buildId)) {
        return reply.code(400).send({ ok: false, error: 'Invalid build ID' });
      }

      const bundlePath = join(bundlesDir, buildId);
      const manifestPath = join(bundlePath, 'manifest.json');
      const summaryPath = join(bundlePath, 'summary.md');

      if (!existsSync(manifestPath)) {
        return reply.code(404).send({ ok: false, error: 'Bundle not found' });
      }

      const manifest = safeReadJson(manifestPath);
      const hasSummary = existsSync(summaryPath);

      return {
        ok: true,
        buildId,
        manifest,
        hasSummary,
        files: existsSync(bundlePath) ? readdirSync(bundlePath) : [],
      };
    }
  );
}
