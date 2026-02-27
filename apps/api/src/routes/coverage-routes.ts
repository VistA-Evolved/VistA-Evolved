/**
 * Phase 165 — Specialty Coverage REST Endpoints
 *
 * Exposes coverage scoring and QA ladder results via admin-only routes.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  generateCoverageReport,
  resetCoverageCache,
} from "../templates/coverage-scorer.js";
import { runSpecialtyCoverageGate } from "../templates/qa-ladder-ext.js";
import { SPECIALTY_TAGS } from "../templates/types.js";

export default async function coverageRoutes(server: FastifyInstance): Promise<void> {
  // ─── GET /admin/coverage/score ───────────────────────────────────────────
  // Overall coverage score + per-specialty breakdown
  server.get(
    "/admin/coverage/score",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const report = generateCoverageReport();
      return reply.send({
        ok: true,
        overallScore: report.overallScore,
        overallGrade: report.overallGrade,
        totalSpecialties: report.totalSpecialties,
        scoredSpecialties: report.scoredSpecialties,
        distribution: report.distribution,
        generatedAt: report.generatedAt,
      });
    },
  );

  // ─── GET /admin/coverage/specialties ─────────────────────────────────────
  // Per-specialty detailed scores
  server.get(
    "/admin/coverage/specialties",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = (request.query as any) || {};
      const report = generateCoverageReport();
      let specialties = report.specialties;

      // Optional filter by grade
      if (query.grade) {
        const grade = (query.grade as string).toUpperCase();
        specialties = specialties.filter((s) => s.grade === grade);
      }

      // Optional filter by specialty tag
      if (query.specialty) {
        specialties = specialties.filter((s) => s.specialty === query.specialty);
      }

      return reply.send({
        ok: true,
        count: specialties.length,
        specialties,
      });
    },
  );

  // ─── GET /admin/coverage/gaps ────────────────────────────────────────────
  // Specialties scoring < 50 (priority improvement list)
  server.get(
    "/admin/coverage/gaps",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const report = generateCoverageReport();
      return reply.send({
        ok: true,
        gapCount: report.gaps.length,
        gaps: report.gaps,
        improvementPriority: report.gaps
          .slice(0, 10)
          .map((g) => ({
            specialty: g.specialty,
            score: g.score,
            weakestDimension: getWeakestDimension(g.breakdown),
          })),
      });
    },
  );

  // ─── GET /admin/coverage/qa-ladder ───────────────────────────────────────
  // QA ladder specialty coverage gate result
  server.get(
    "/admin/coverage/qa-ladder",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const result = runSpecialtyCoverageGate();
      return reply.send({ ok: true, ...result });
    },
  );

  // ─── POST /admin/coverage/refresh ───────────────────────────────────────
  // Force-refresh the coverage cache
  server.post(
    "/admin/coverage/refresh",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      resetCoverageCache();
      const report = generateCoverageReport(true);
      return reply.send({
        ok: true,
        message: "Coverage cache refreshed",
        overallScore: report.overallScore,
        overallGrade: report.overallGrade,
      });
    },
  );

  // ─── GET /admin/coverage/tags ────────────────────────────────────────────
  // List all known specialty tags
  server.get(
    "/admin/coverage/tags",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({
        ok: true,
        count: SPECIALTY_TAGS.length,
        tags: [...SPECIALTY_TAGS] as string[],
      });
    },
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeakestDimension(
  breakdown: { packExistence: number; templateCount: number; fieldCoverage: number; sectionDepth: number },
): string {
  const dims: [string, number][] = [
    ["packExistence", breakdown.packExistence],
    ["templateCount", breakdown.templateCount],
    ["fieldCoverage", breakdown.fieldCoverage],
    ["sectionDepth", breakdown.sectionDepth],
  ];
  dims.sort((a, b) => a[1] - b[1]);
  return dims[0][0];
}
