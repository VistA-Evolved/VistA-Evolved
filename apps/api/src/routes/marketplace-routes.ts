/**
 * Plugin Marketplace routes — Phase 360 (W18-P7)
 *
 * REST endpoints for marketplace catalog, approval workflow, installs, reviews.
 * Prefix: /marketplace
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  createListing,
  getListing,
  updateListing,
  transitionListing,
  installFromMarketplace,
  uninstallFromMarketplace,
  addReview,
  searchListings,
  getInstalls,
  getListingReviews,
  getMarketplaceAudit,
  getMarketplaceStats,
  LISTING_CATEGORIES,
  type ListingStatus,
} from "../services/marketplace-service.js";

export async function marketplaceRoutes(server: FastifyInstance): Promise<void> {
  const TENANT = "default";

  // ── Health ──────────────────────────────────────────────────────────
  server.get("/marketplace/health", async (_req: FastifyRequest, reply: FastifyReply) => {
    const stats = getMarketplaceStats();
    return reply.send({ ok: true, phase: 360, ...stats });
  });

  // ── Categories ─────────────────────────────────────────────────────
  server.get("/marketplace/categories", async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ ok: true, categories: LISTING_CATEGORIES });
  });

  // ── Create listing ─────────────────────────────────────────────────
  server.post("/marketplace/listings", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    const { pluginId, name, version, description, summary, category, tags, manifestHash } = body;

    if (!pluginId || !name || !version || !manifestHash) {
      return reply.code(400).send({
        ok: false,
        error: "pluginId, name, version, manifestHash required",
      });
    }

    const listing = createListing(TENANT, {
      pluginId,
      name,
      version,
      description: description || "",
      summary,
      category,
      tags,
      manifestHash,
    });
    return reply.code(201).send({ ok: true, listing });
  });

  // ── Get listing ────────────────────────────────────────────────────
  server.get("/marketplace/listings/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as any;
    const listing = getListing(id);
    if (!listing) return reply.code(404).send({ ok: false, error: "Listing not found" });
    return reply.send({ ok: true, listing });
  });

  // ── Update listing ─────────────────────────────────────────────────
  server.patch("/marketplace/listings/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    try {
      const listing = updateListing(id, TENANT, body);
      if (!listing) return reply.code(404).send({ ok: false, error: "Listing not found" });
      return reply.send({ ok: true, listing });
    } catch (err: any) {
      return reply.code(400).send({ ok: false, error: err.message });
    }
  });

  // ── Transition listing status ──────────────────────────────────────
  server.post("/marketplace/listings/:id/transition", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    const { status, notes } = body;

    if (!status) {
      return reply.code(400).send({ ok: false, error: "status required" });
    }

    try {
      const listing = transitionListing(id, status as ListingStatus, "admin", notes);
      return reply.send({ ok: true, listing });
    } catch (err: any) {
      return reply.code(400).send({ ok: false, error: err.message });
    }
  });

  // ── Search listings ────────────────────────────────────────────────
  server.get("/marketplace/search", async (req: FastifyRequest, reply: FastifyReply) => {
    const query = (req.query as any) || {};
    const results = searchListings({
      status: query.status,
      category: query.category,
      search: query.q,
      limit: query.limit ? parseInt(query.limit, 10) : 50,
    });
    return reply.send({ ok: true, listings: results, count: results.length });
  });

  // ── Install from marketplace ───────────────────────────────────────
  server.post("/marketplace/listings/:id/install", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as any;
    try {
      const install = installFromMarketplace(TENANT, id, "admin");
      return reply.code(201).send({ ok: true, install });
    } catch (err: any) {
      return reply.code(400).send({ ok: false, error: err.message });
    }
  });

  // ── Uninstall ──────────────────────────────────────────────────────
  server.delete("/marketplace/installs/:installId", async (req: FastifyRequest, reply: FastifyReply) => {
    const { installId } = req.params as any;
    const removed = uninstallFromMarketplace(TENANT, installId, "admin");
    if (!removed) return reply.code(404).send({ ok: false, error: "Install not found" });
    return reply.send({ ok: true, uninstalled: true });
  });

  // ── List tenant installs ───────────────────────────────────────────
  server.get("/marketplace/installs", async (req: FastifyRequest, reply: FastifyReply) => {
    const query = (req.query as any) || {};
    const list = getInstalls(TENANT, {
      active: query.active === "true",
    });
    return reply.send({ ok: true, installs: list, count: list.length });
  });

  // ── Add review ─────────────────────────────────────────────────────
  server.post("/marketplace/listings/:id/reviews", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    const { rating, comment } = body;

    if (!rating || typeof rating !== "number") {
      return reply.code(400).send({ ok: false, error: "rating (1-5) required" });
    }

    try {
      const review = addReview(id, TENANT, rating, comment);
      return reply.send({ ok: true, review });
    } catch (err: any) {
      return reply.code(400).send({ ok: false, error: err.message });
    }
  });

  // ── Get listing reviews ────────────────────────────────────────────
  server.get("/marketplace/listings/:id/reviews", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as any;
    const query = (req.query as any) || {};
    const revs = getListingReviews(id, query.limit ? parseInt(query.limit, 10) : 50);
    return reply.send({ ok: true, reviews: revs, count: revs.length });
  });

  // ── Audit log ──────────────────────────────────────────────────────
  server.get("/marketplace/audit", async (req: FastifyRequest, reply: FastifyReply) => {
    const query = (req.query as any) || {};
    const entries = getMarketplaceAudit({
      listingId: query.listingId,
      limit: query.limit ? parseInt(query.limit, 10) : 100,
    });
    return reply.send({ ok: true, audit: entries, count: entries.length });
  });

  // ── Stats ──────────────────────────────────────────────────────────
  server.get("/marketplace/stats", async (_req: FastifyRequest, reply: FastifyReply) => {
    const stats = getMarketplaceStats();
    return reply.send({ ok: true, ...stats });
  });
}
