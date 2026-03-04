/**
 * Integration Marketplace Routes — Phase 324 (W14-P8)
 *
 * 17 REST endpoints for marketplace/registry operations:
 *  - Categories: create, list
 *  - Listings: create, get, list, search, publish version, update status
 *  - Reviews: add, list
 *  - Installs: install, uninstall, list, get
 *  - Stats: marketplace dashboard
 */

import { FastifyInstance } from 'fastify';
import {
  createCategory,
  listCategories,
  createListing,
  getListing,
  findListingBySlug,
  listListings,
  publishVersion,
  updateListingStatus,
  addReview,
  listReviews,
  installListing,
  uninstallListing,
  listInstalls,
  getInstall,
  getMarketplaceStats,
  seedMarketplace,
  type ListingStatus,
} from '../services/integration-marketplace.js';

export default async function marketplaceRoutes(server: FastifyInstance): Promise<void> {
  // Seed built-in marketplace on first load
  seedMarketplace();

  /* ── Category endpoints ──────────────────────────────────────── */

  server.post('/marketplace/categories', async (request, reply) => {
    const body = (request.body as any) || {};
    const { name, description, parentId } = body;
    if (!name) return reply.code(400).send({ ok: false, error: 'name required' });
    const cat = createCategory({ name, description: description || '', parentId });
    return reply.code(201).send({ ok: true, category: cat });
  });

  server.get('/marketplace/categories', async () => {
    return { ok: true, categories: listCategories() };
  });

  /* ── Listing endpoints ───────────────────────────────────────── */

  server.post('/marketplace/listings', async (request, reply) => {
    const body = (request.body as any) || {};
    const { name, description, type, categoryId, publisherId, publisherName } = body;
    if (!name || !description || !type || !categoryId) {
      return reply
        .code(400)
        .send({ ok: false, error: 'name, description, type, categoryId required' });
    }
    const listing = createListing({
      name,
      description,
      longDescription: body.longDescription,
      type,
      categoryId,
      publisherId: publisherId || 'unknown',
      publisherName: publisherName || 'Unknown',
      tags: body.tags,
      dependencies: body.dependencies,
      standards: body.standards,
      iconUrl: body.iconUrl,
      docsUrl: body.docsUrl,
    });
    return reply.code(201).send({ ok: true, listing });
  });

  server.get('/marketplace/listings', async (request) => {
    const q = request.query as any;
    return {
      ok: true,
      listings: listListings({
        type: q.type,
        categoryId: q.categoryId,
        status: q.status,
        tag: q.tag,
        search: q.search,
        publisherId: q.publisherId,
      }),
    };
  });

  server.get('/marketplace/listings/:id', async (request, reply) => {
    const { id } = request.params as any;
    // Try by ID first, then by slug
    const listing = getListing(id) || findListingBySlug(id);
    if (!listing) return reply.code(404).send({ ok: false, error: 'listing_not_found' });
    return { ok: true, listing };
  });

  server.post('/marketplace/listings/:id/versions', async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const { version, releaseNotes, minApiVersion } = body;
    if (!version || !releaseNotes) {
      return reply.code(400).send({ ok: false, error: 'version and releaseNotes required' });
    }
    if (!publishVersion(id, version, releaseNotes, minApiVersion)) {
      return reply.code(404).send({ ok: false, error: 'listing_not_found' });
    }
    return { ok: true, version };
  });

  server.post('/marketplace/listings/:id/status', async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const validStatuses: ListingStatus[] = ['draft', 'published', 'deprecated', 'archived'];
    if (!validStatuses.includes(body.status)) {
      return reply
        .code(400)
        .send({ ok: false, error: `status must be: ${validStatuses.join(', ')}` });
    }
    if (!updateListingStatus(id, body.status)) {
      return reply.code(404).send({ ok: false, error: 'listing_not_found' });
    }
    return { ok: true, status: body.status };
  });

  /* ── Review endpoints ────────────────────────────────────────── */

  server.post('/marketplace/listings/:id/reviews', async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const { tenantId, rating, comment } = body;
    if (!tenantId || rating === undefined) {
      return reply.code(400).send({ ok: false, error: 'tenantId and rating required' });
    }
    const review = addReview(id, tenantId, Number(rating), comment);
    if (!review)
      return reply
        .code(400)
        .send({ ok: false, error: 'invalid_listing_or_rating_or_duplicate_review' });
    return reply.code(201).send({ ok: true, review });
  });

  server.get('/marketplace/listings/:id/reviews', async (request) => {
    const { id } = request.params as any;
    return { ok: true, reviews: listReviews(id) };
  });

  /* ── Install endpoints ───────────────────────────────────────── */

  server.post('/marketplace/install', async (request, reply) => {
    const body = (request.body as any) || {};
    const { listingId, tenantId, version, config } = body;
    if (!listingId || !tenantId) {
      return reply.code(400).send({ ok: false, error: 'listingId and tenantId required' });
    }
    const install = installListing(listingId, tenantId, version, config);
    if (!install)
      return reply
        .code(400)
        .send({ ok: false, error: 'listing_not_published_or_already_installed' });
    return reply.code(201).send({ ok: true, install });
  });

  server.post('/marketplace/uninstall', async (request, reply) => {
    const body = (request.body as any) || {};
    const { listingId, tenantId } = body;
    if (!listingId || !tenantId) {
      return reply.code(400).send({ ok: false, error: 'listingId and tenantId required' });
    }
    if (!uninstallListing(listingId, tenantId)) {
      return reply.code(404).send({ ok: false, error: 'install_not_found' });
    }
    return { ok: true, status: 'uninstalled' };
  });

  server.get('/marketplace/installs', async (request) => {
    const { tenantId } = request.query as any;
    if (!tenantId) return { ok: true, installs: [] };
    return { ok: true, installs: listInstalls(tenantId) };
  });

  server.get('/marketplace/installs/:id', async (request, reply) => {
    const { id } = request.params as any;
    const install = getInstall(id);
    if (!install) return reply.code(404).send({ ok: false, error: 'install_not_found' });
    return { ok: true, install };
  });

  /* ── Stats ─────────────────────────────────────────────────────── */

  server.get('/marketplace/stats', async () => {
    return { ok: true, stats: getMarketplaceStats() };
  });
}
