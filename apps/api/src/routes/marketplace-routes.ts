/**
 * Plugin Marketplace routes -- Phase 360 (W18-P7)
 *
 * REST endpoints for marketplace catalog, approval workflow, installs, reviews.
 * Prefix: /plugin-marketplace
 *
 * NOTE: /marketplace/ is already used by Phase 324 Integration Marketplace.
 * W18 plugin marketplace uses /plugin-marketplace/ to avoid route collisions.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
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
  LISTING_CATEGORIES,
  type ListingStatus,
} from '../services/marketplace-service.js';

export async function marketplaceRoutes(server: FastifyInstance): Promise<void> {
  function resolveTenantId(req: FastifyRequest): string | null {
    const headerTenantId = req.headers['x-tenant-id'];
    const headerTenant =
      typeof headerTenantId === 'string' && headerTenantId.trim().length > 0
        ? headerTenantId.trim()
        : undefined;
    return (req as any).session?.tenantId || (req as any).tenantId || headerTenant || null;
  }

  function requireTenantId(req: FastifyRequest, reply: FastifyReply): string | null {
    const tenantId = resolveTenantId(req);
    if (tenantId) return tenantId;
    reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
    return null;
  }

  function canViewListing(listing: any, tenantId: string): boolean {
    return listing.publisherId === tenantId || listing.status === 'published';
  }

  function canManageListing(listing: any, tenantId: string): boolean {
    return listing.publisherId === tenantId;
  }

  function getTenantOwnedListings(tenantId: string) {
    return searchListings({ limit: 1000 }).filter((listing) => listing.publisherId === tenantId);
  }

  function getTenantMarketplaceStats(tenantId: string) {
    const listings = getTenantOwnedListings(tenantId);
    const installs = getInstalls(tenantId);
    return {
      totalListings: listings.length,
      publishedListings: listings.filter((listing) => listing.status === 'published').length,
      pendingReview: listings.filter(
        (listing) => listing.status === 'submitted' || listing.status === 'under_review'
      ).length,
      totalInstalls: installs.length,
      totalReviews: listings.reduce(
        (count, listing) => count + getListingReviews(listing.id, 1000).length,
        0
      ),
      categories: LISTING_CATEGORIES,
    };
  }

  // -- Health ----------------------------------------------------------
  server.get('/plugin-marketplace/health', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const stats = getTenantMarketplaceStats(tenantId);
    return reply.send({ ok: true, phase: 360, ...stats });
  });

  // -- Categories -----------------------------------------------------
  server.get(
    '/plugin-marketplace/categories',
    async (_req: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ ok: true, categories: LISTING_CATEGORIES });
    }
  );

  // -- Create listing -------------------------------------------------
  server.post('/plugin-marketplace/listings', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const body = (req.body as any) || {};
    const { pluginId, name, version, description, summary, category, tags, manifestHash } = body;

    if (!pluginId || !name || !version || !manifestHash) {
      return reply.code(400).send({
        ok: false,
        error: 'pluginId, name, version, manifestHash required',
      });
    }

    const listing = createListing(tenantId, {
      pluginId,
      name,
      version,
      description: description || '',
      summary,
      category,
      tags,
      manifestHash,
    });
    return reply.code(201).send({ ok: true, listing });
  });

  // -- Get listing ----------------------------------------------------
  server.get(
    '/plugin-marketplace/listings/:id',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const tenantId = requireTenantId(req, reply);
      if (!tenantId) return;
      const { id } = req.params as any;
      const listing = getListing(id);
      if (!listing || !canViewListing(listing, tenantId)) {
        return reply.code(404).send({ ok: false, error: 'Listing not found' });
      }
      return reply.send({ ok: true, listing });
    }
  );

  // -- Update listing -------------------------------------------------
  server.patch(
    '/plugin-marketplace/listings/:id',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const tenantId = requireTenantId(req, reply);
      if (!tenantId) return;
      const { id } = req.params as any;
      const body = (req.body as any) || {};
      const existing = getListing(id);
      if (!existing || !canManageListing(existing, tenantId)) {
        return reply.code(404).send({ ok: false, error: 'Listing not found' });
      }
      try {
        const listing = updateListing(id, tenantId, body);
        if (!listing) return reply.code(404).send({ ok: false, error: 'Listing not found' });
        return reply.send({ ok: true, listing });
      } catch (_err: any) {
        return reply.code(400).send({ ok: false, error: 'Marketplace listing update failed' });
      }
    }
  );

  // -- Transition listing status --------------------------------------
  server.post(
    '/plugin-marketplace/listings/:id/transition',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const tenantId = requireTenantId(req, reply);
      if (!tenantId) return;
      const { id } = req.params as any;
      const body = (req.body as any) || {};
      const { status, notes } = body;

      if (!status) {
        return reply.code(400).send({ ok: false, error: 'status required' });
      }

      const existing = getListing(id);
      if (!existing || !canManageListing(existing, tenantId)) {
        return reply.code(404).send({ ok: false, error: 'Listing not found' });
      }

      try {
        const listing = transitionListing(id, status as ListingStatus, tenantId, notes);
        return reply.send({ ok: true, listing });
      } catch (_err: any) {
        return reply.code(400).send({ ok: false, error: 'Listing status transition failed' });
      }
    }
  );

  // -- Search listings ------------------------------------------------
  server.get('/plugin-marketplace/search', async (req: FastifyRequest, reply: FastifyReply) => {
    const query = (req.query as any) || {};
    const results = searchListings({
      status: query.status,
      category: query.category,
      search: query.q,
      limit: query.limit ? parseInt(query.limit, 10) : 50,
    });
    return reply.send({ ok: true, listings: results, count: results.length });
  });

  // -- Install from marketplace ---------------------------------------
  server.post(
    '/plugin-marketplace/listings/:id/install',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const tenantId = requireTenantId(req, reply);
      if (!tenantId) return;
      const { id } = req.params as any;
      try {
        const install = installFromMarketplace(tenantId, id, tenantId);
        return reply.code(201).send({ ok: true, install });
      } catch (_err: any) {
        return reply.code(400).send({ ok: false, error: 'Marketplace install failed' });
      }
    }
  );

  // -- Uninstall ------------------------------------------------------
  server.delete(
    '/plugin-marketplace/installs/:installId',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const tenantId = requireTenantId(req, reply);
      if (!tenantId) return;
      const { installId } = req.params as any;
      const removed = uninstallFromMarketplace(tenantId, installId, tenantId);
      if (!removed) return reply.code(404).send({ ok: false, error: 'Install not found' });
      return reply.send({ ok: true, uninstalled: true });
    }
  );

  // -- List tenant installs -------------------------------------------
  server.get('/plugin-marketplace/installs', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const query = (req.query as any) || {};
    const list = getInstalls(tenantId, {
      active: query.active !== undefined ? query.active === 'true' : undefined,
    });
    return reply.send({ ok: true, installs: list, count: list.length });
  });

  // -- Add review -----------------------------------------------------
  server.post(
    '/plugin-marketplace/listings/:id/reviews',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const tenantId = requireTenantId(req, reply);
      if (!tenantId) return;
      const { id } = req.params as any;
      const body = (req.body as any) || {};
      const { rating, comment } = body;

      if (!rating || typeof rating !== 'number') {
        return reply.code(400).send({ ok: false, error: 'rating (1-5) required' });
      }

      const listing = getListing(id);
      if (!listing || !canViewListing(listing, tenantId)) {
        return reply.code(404).send({ ok: false, error: 'Listing not found' });
      }

      try {
        const review = addReview(id, tenantId, rating, comment);
        return reply.send({ ok: true, review });
      } catch (_err: any) {
        return reply.code(400).send({ ok: false, error: 'Review submission failed' });
      }
    }
  );

  // -- Get listing reviews --------------------------------------------
  server.get(
    '/plugin-marketplace/listings/:id/reviews',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const tenantId = requireTenantId(req, reply);
      if (!tenantId) return;
      const { id } = req.params as any;
      const query = (req.query as any) || {};
      const listing = getListing(id);
      if (!listing || !canViewListing(listing, tenantId)) {
        return reply.code(404).send({ ok: false, error: 'Listing not found' });
      }
      const revs = getListingReviews(id, query.limit ? parseInt(query.limit, 10) : 50);
      return reply.send({ ok: true, reviews: revs, count: revs.length });
    }
  );

  // -- Audit log ------------------------------------------------------
  server.get('/plugin-marketplace/audit', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const query = (req.query as any) || {};
    const listingId = query.listingId;
    if (listingId) {
      const listing = getListing(listingId);
      if (!listing || !canManageListing(listing, tenantId)) {
        return reply.code(404).send({ ok: false, error: 'Listing not found' });
      }
    }
    const ownedListingIds = new Set(getTenantOwnedListings(tenantId).map((listing) => listing.id));
    const entries = getMarketplaceAudit({
      listingId: query.listingId,
      limit: query.limit ? parseInt(query.limit, 10) : 100,
    }).filter((entry) => ownedListingIds.has(entry.listingId));
    return reply.send({ ok: true, audit: entries, count: entries.length });
  });

  // -- Stats ----------------------------------------------------------
  server.get('/plugin-marketplace/stats', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const stats = getTenantMarketplaceStats(tenantId);
    return reply.send({ ok: true, ...stats });
  });
}
