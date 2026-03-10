/**
 * Plugin Marketplace -- Phase 360 (W18-P7)
 *
 * Approval workflow FSM for plugin publishing (submitted -> under_review ->
 * approved/rejected), install/uninstall tracking, and marketplace catalog.
 *
 * ADR: ADR-PLUGIN-MODEL.md -- marketplace approval flow.
 */

import { randomBytes } from "node:crypto";

// -- Types ---------------------------------------------------------------

export type ListingStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "published"
  | "deprecated";

export type ReviewDecision = "approve" | "reject" | "request_changes";

export interface MarketplaceListing {
  id: string;
  pluginId: string;
  /** Publisher tenant or vendor ID */
  publisherId: string;
  name: string;
  version: string;
  description: string;
  /** Short tagline */
  summary: string;
  /** Category for marketplace browsing */
  category: string;
  /** Tags for search */
  tags: string[];
  /** Content hash of the plugin manifest */
  manifestHash: string;
  status: ListingStatus;
  /** Review notes from admin */
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  /** Install count (across all tenants) */
  installCount: number;
  /** Average rating (1-5) */
  rating: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceInstall {
  id: string;
  tenantId: string;
  listingId: string;
  pluginId: string;
  version: string;
  installedAt: string;
  uninstalledAt?: string;
  installedBy: string;
}

export interface MarketplaceReview {
  id: string;
  listingId: string;
  tenantId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface MarketplaceAuditEntry {
  id: string;
  listingId: string;
  action: string;
  actor: string;
  detail: Record<string, unknown>;
  createdAt: string;
}

/** Allowed listing categories */
export const LISTING_CATEGORIES = [
  "clinical",
  "administrative",
  "integration",
  "analytics",
  "security",
  "imaging",
  "telehealth",
  "billing",
  "scheduling",
  "other",
] as const;

// -- Stores --------------------------------------------------------------

/** Marketplace listings -- keyed by listing ID */
const listings = new Map<string, MarketplaceListing>();

/** Install records -- keyed by install ID */
const installs = new Map<string, MarketplaceInstall>();

/** Reviews -- keyed by review ID */
const reviews: MarketplaceReview[] = [];

/** Audit log -- max 10K entries */
const auditLog: MarketplaceAuditEntry[] = [];
const MAX_AUDIT = 10_000;

// -- Helpers -------------------------------------------------------------

function genId(): string {
  return randomBytes(16).toString("hex");
}

function now(): string {
  return new Date().toISOString();
}

function logAudit(
  listingId: string,
  action: string,
  actor: string,
  detail: Record<string, unknown>,
): void {
  auditLog.push({
    id: genId(),
    listingId,
    action,
    actor,
    detail,
    createdAt: now(),
  });
  if (auditLog.length > MAX_AUDIT) {
    auditLog.splice(0, auditLog.length - MAX_AUDIT);
  }
}

/** Valid state transitions */
const VALID_TRANSITIONS: Record<ListingStatus, ListingStatus[]> = {
  draft: ["submitted"],
  submitted: ["under_review", "draft"],
  under_review: ["approved", "rejected", "submitted"],
  approved: ["published"],
  rejected: ["draft"],
  published: ["deprecated"],
  deprecated: [],
};

// -- Listing CRUD --------------------------------------------------------

export function createListing(
  publisherId: string,
  opts: {
    pluginId: string;
    name: string;
    version: string;
    description: string;
    summary?: string;
    category?: string;
    tags?: string[];
    manifestHash: string;
  },
): MarketplaceListing {
  const listing: MarketplaceListing = {
    id: genId(),
    pluginId: opts.pluginId,
    publisherId,
    name: opts.name,
    version: opts.version,
    description: opts.description,
    summary: opts.summary || "",
    category: opts.category || "other",
    tags: opts.tags || [],
    manifestHash: opts.manifestHash,
    status: "draft",
    installCount: 0,
    rating: 0,
    ratingCount: 0,
    createdAt: now(),
    updatedAt: now(),
  };

  listings.set(listing.id, listing);
  logAudit(listing.id, "create", publisherId, { pluginId: opts.pluginId, version: opts.version });
  return listing;
}

export function getListing(id: string): MarketplaceListing | undefined {
  return listings.get(id);
}

export function updateListing(
  id: string,
  publisherId: string,
  updates: Partial<Pick<MarketplaceListing, "name" | "description" | "summary" | "category" | "tags" | "version">>,
): MarketplaceListing | undefined {
  const listing = listings.get(id);
  if (!listing || listing.publisherId !== publisherId) return undefined;
  if (listing.status !== "draft" && listing.status !== "rejected") {
    throw new Error("Can only update listings in draft or rejected status");
  }

  if (updates.name !== undefined) listing.name = updates.name;
  if (updates.description !== undefined) listing.description = updates.description;
  if (updates.summary !== undefined) listing.summary = updates.summary;
  if (updates.category !== undefined) listing.category = updates.category;
  if (updates.tags !== undefined) listing.tags = updates.tags;
  if (updates.version !== undefined) listing.version = updates.version;
  listing.updatedAt = now();

  logAudit(id, "update", publisherId, { updates: Object.keys(updates) });
  return listing;
}

/**
 * Transition listing status through the approval FSM.
 */
export function transitionListing(
  id: string,
  targetStatus: ListingStatus,
  actor: string,
  notes?: string,
): MarketplaceListing {
  const listing = listings.get(id);
  if (!listing) throw new Error("Listing not found");

  const allowed = VALID_TRANSITIONS[listing.status];
  if (!allowed.includes(targetStatus)) {
    throw new Error(
      `Invalid transition: ${listing.status} -> ${targetStatus}. Allowed: ${allowed.join(", ")}`,
    );
  }

  const prevStatus = listing.status;
  listing.status = targetStatus;
  listing.updatedAt = now();

  if (
    targetStatus === "approved" ||
    targetStatus === "rejected" ||
    targetStatus === "under_review"
  ) {
    listing.reviewedBy = actor;
    listing.reviewedAt = now();
    if (notes) listing.reviewNotes = notes;
  }

  logAudit(id, `transition:${prevStatus}->${targetStatus}`, actor, {
    from: prevStatus,
    to: targetStatus,
    notes,
  });

  return listing;
}

// -- Install/Uninstall ---------------------------------------------------

export function installFromMarketplace(
  tenantId: string,
  listingId: string,
  actor: string,
): MarketplaceInstall {
  const listing = listings.get(listingId);
  if (!listing) throw new Error("Listing not found");
  if (listing.status !== "published") {
    throw new Error("Can only install published listings");
  }

  // Check for duplicate install
  for (const inst of installs.values()) {
    if (
      inst.tenantId === tenantId &&
      inst.listingId === listingId &&
      !inst.uninstalledAt
    ) {
      throw new Error("Plugin already installed for this tenant");
    }
  }

  const install: MarketplaceInstall = {
    id: genId(),
    tenantId,
    listingId,
    pluginId: listing.pluginId,
    version: listing.version,
    installedAt: now(),
    installedBy: actor,
  };

  installs.set(install.id, install);
  listing.installCount++;
  listing.updatedAt = now();

  logAudit(listingId, "install", actor, { tenantId, installId: install.id });
  return install;
}

export function uninstallFromMarketplace(
  tenantId: string,
  installId: string,
  actor: string,
): boolean {
  const install = installs.get(installId);
  if (!install || install.tenantId !== tenantId) return false;
  if (install.uninstalledAt) return false;

  install.uninstalledAt = now();

  const listing = listings.get(install.listingId);
  if (listing && listing.installCount > 0) {
    listing.installCount--;
    listing.updatedAt = now();
  }

  logAudit(install.listingId, "uninstall", actor, { tenantId, installId });
  return true;
}

// -- Reviews -------------------------------------------------------------

export function addReview(
  listingId: string,
  tenantId: string,
  rating: number,
  comment?: string,
): MarketplaceReview {
  const listing = listings.get(listingId);
  if (!listing) throw new Error("Listing not found");
  if (rating < 1 || rating > 5) throw new Error("Rating must be 1-5");

  const review: MarketplaceReview = {
    id: genId(),
    listingId,
    tenantId,
    rating,
    comment,
    createdAt: now(),
  };

  reviews.push(review);

  // Recalculate average rating
  const listingReviews = reviews.filter((r) => r.listingId === listingId);
  listing.ratingCount = listingReviews.length;
  listing.rating =
    listingReviews.reduce((sum, r) => sum + r.rating, 0) /
    listingReviews.length;
  listing.updatedAt = now();

  logAudit(listingId, "review", tenantId, { rating, reviewId: review.id });
  return review;
}

// -- Query Helpers -------------------------------------------------------

export function searchListings(opts?: {
  status?: ListingStatus;
  category?: string;
  search?: string;
  limit?: number;
}): MarketplaceListing[] {
  const limit = opts?.limit ?? 50;
  const result: MarketplaceListing[] = [];

  for (const listing of listings.values()) {
    if (opts?.status && listing.status !== opts.status) continue;
    if (opts?.category && listing.category !== opts.category) continue;
    if (opts?.search) {
      const s = opts.search.toLowerCase();
      const matches =
        listing.name.toLowerCase().includes(s) ||
        listing.description.toLowerCase().includes(s) ||
        listing.tags.some((t) => t.toLowerCase().includes(s));
      if (!matches) continue;
    }
    result.push(listing);
    if (result.length >= limit) break;
  }

  return result;
}

export function getInstalls(
  tenantId: string,
  opts?: { active?: boolean },
): MarketplaceInstall[] {
  const result: MarketplaceInstall[] = [];
  for (const inst of installs.values()) {
    if (inst.tenantId !== tenantId) continue;
    if (opts?.active && inst.uninstalledAt) continue;
    result.push(inst);
  }
  return result;
}

export function getListingReviews(
  listingId: string,
  limit?: number,
): MarketplaceReview[] {
  const max = limit ?? 50;
  return reviews
    .filter((r) => r.listingId === listingId)
    .slice(-max);
}

export function getMarketplaceAudit(
  opts?: { listingId?: string; limit?: number },
): MarketplaceAuditEntry[] {
  const limit = opts?.limit ?? 100;
  const result: MarketplaceAuditEntry[] = [];
  for (let i = auditLog.length - 1; i >= 0 && result.length < limit; i--) {
    const e = auditLog[i];
    if (opts?.listingId && e.listingId !== opts.listingId) continue;
    result.push(e);
  }
  return result;
}

export function getMarketplaceStats(): {
  totalListings: number;
  publishedListings: number;
  pendingReview: number;
  totalInstalls: number;
  totalReviews: number;
  categories: readonly string[];
} {
  let total = 0;
  let published = 0;
  let pending = 0;
  for (const l of listings.values()) {
    total++;
    if (l.status === "published") published++;
    if (l.status === "submitted" || l.status === "under_review") pending++;
  }

  let totalInstalls = 0;
  for (const inst of installs.values()) {
    if (!inst.uninstalledAt) totalInstalls++;
  }

  return {
    totalListings: total,
    publishedListings: published,
    pendingReview: pending,
    totalInstalls,
    totalReviews: reviews.length,
    categories: LISTING_CATEGORIES,
  };
}

// -- Reset (testing) -----------------------------------------------------

export function _resetMarketplace(): void {
  listings.clear();
  installs.clear();
  reviews.length = 0;
  auditLog.length = 0;
}
