/**
 * Integration Marketplace & Registry
 *
 * Phase 324 (W14-P8): Marketplace catalog for discovering, publishing, and
 * managing integration packages (connectors, templates, adapters).
 *
 * Architecture:
 *  1. MarketplaceListing — published integration packages
 *  2. ListingVersion — SemVer-tracked releases per listing
 *  3. ListingReview — community ratings & reviews
 *  4. ListingInstall — installation tracking per tenant
 *  5. MarketplaceCategory — taxonomy for discovery/search
 *  6. Built-in seed catalog — pre-loaded VistA-Evolved integrations
 */

import crypto from "node:crypto";

/* ═══════════════════════════════════════════════════════════════════
   1. TYPES & TAXONOMY
   ═══════════════════════════════════════════════════════════════════ */

export type ListingType = "connector" | "adapter" | "template" | "transform" | "validator" | "suite";
export type ListingStatus = "draft" | "published" | "deprecated" | "archived";
export type InstallStatus = "installed" | "uninstalled" | "pending" | "failed";

export interface MarketplaceCategory {
  id: string;
  name: string;
  description: string;
  parentId?: string;
}

export interface ListingVersion {
  version: string;
  releaseNotes: string;
  publishedAt: string;
  minApiVersion?: string;
  checksum: string;
}

export interface ListingReview {
  id: string;
  listingId: string;
  tenantId: string;
  rating: number; // 1-5
  comment?: string;
  createdAt: string;
}

export interface MarketplaceListing {
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription?: string;
  type: ListingType;
  categoryId: string;
  publisherId: string;
  publisherName: string;
  status: ListingStatus;
  currentVersion: string;
  versions: ListingVersion[];
  tags: string[];
  /** Required capabilities/modules for this integration */
  dependencies: string[];
  /** Supported interop standards */
  standards: string[];
  iconUrl?: string;
  docsUrl?: string;
  /** Average rating */
  rating: number;
  reviewCount: number;
  installCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListingInstall {
  id: string;
  listingId: string;
  tenantId: string;
  version: string;
  status: InstallStatus;
  installedAt: string;
  uninstalledAt?: string;
  config?: Record<string, string>;
}

/* ═══════════════════════════════════════════════════════════════════
   2. STORES
   ═══════════════════════════════════════════════════════════════════ */

const categoryStore = new Map<string, MarketplaceCategory>();
const listingStore = new Map<string, MarketplaceListing>();
const reviewStore = new Map<string, ListingReview>();
const installStore = new Map<string, ListingInstall>();

/* ═══════════════════════════════════════════════════════════════════
   3. CATEGORIES
   ═══════════════════════════════════════════════════════════════════ */

export function createCategory(input: Omit<MarketplaceCategory, "id">): MarketplaceCategory {
  const id = crypto.randomUUID();
  const cat: MarketplaceCategory = { ...input, id };
  categoryStore.set(id, cat);
  return cat;
}

export function listCategories(): MarketplaceCategory[] {
  return [...categoryStore.values()];
}

export function getCategory(id: string): MarketplaceCategory | undefined {
  return categoryStore.get(id);
}

/* ═══════════════════════════════════════════════════════════════════
   4. LISTINGS
   ═══════════════════════════════════════════════════════════════════ */

export function createListing(input: {
  name: string;
  description: string;
  longDescription?: string;
  type: ListingType;
  categoryId: string;
  publisherId: string;
  publisherName: string;
  tags?: string[];
  dependencies?: string[];
  standards?: string[];
  iconUrl?: string;
  docsUrl?: string;
}): MarketplaceListing {
  const id = crypto.randomUUID();
  const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const now = new Date().toISOString();
  const listing: MarketplaceListing = {
    id,
    name: input.name,
    slug,
    description: input.description,
    longDescription: input.longDescription,
    type: input.type,
    categoryId: input.categoryId,
    publisherId: input.publisherId,
    publisherName: input.publisherName,
    status: "draft",
    currentVersion: "0.0.0",
    versions: [],
    tags: input.tags || [],
    dependencies: input.dependencies || [],
    standards: input.standards || [],
    iconUrl: input.iconUrl,
    docsUrl: input.docsUrl,
    rating: 0,
    reviewCount: 0,
    installCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  listingStore.set(id, listing);
  return listing;
}

export function getListing(id: string): MarketplaceListing | undefined {
  return listingStore.get(id);
}

export function findListingBySlug(slug: string): MarketplaceListing | undefined {
  return [...listingStore.values()].find((l) => l.slug === slug);
}

export function listListings(filters?: {
  type?: string;
  categoryId?: string;
  status?: string;
  tag?: string;
  search?: string;
  publisherId?: string;
}): MarketplaceListing[] {
  let results = [...listingStore.values()];
  if (filters?.type) results = results.filter((l) => l.type === filters.type);
  if (filters?.categoryId) results = results.filter((l) => l.categoryId === filters.categoryId);
  if (filters?.status) results = results.filter((l) => l.status === filters.status);
  if (filters?.tag) results = results.filter((l) => l.tags.includes(filters.tag!));
  if (filters?.publisherId) results = results.filter((l) => l.publisherId === filters.publisherId);
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(
      (l) => l.name.toLowerCase().includes(q) || l.description.toLowerCase().includes(q) || l.tags.some((t) => t.includes(q)),
    );
  }
  return results.sort((a, b) => b.installCount - a.installCount || b.rating - a.rating);
}

export function publishVersion(
  listingId: string,
  version: string,
  releaseNotes: string,
  minApiVersion?: string,
): boolean {
  const listing = listingStore.get(listingId);
  if (!listing) return false;

  const checksum = crypto.createHash("sha256").update(`${listingId}:${version}:${Date.now()}`).digest("hex").slice(0, 16);
  listing.versions.push({
    version,
    releaseNotes,
    publishedAt: new Date().toISOString(),
    minApiVersion,
    checksum,
  });
  listing.currentVersion = version;
  if (listing.status === "draft") listing.status = "published";
  listing.updatedAt = new Date().toISOString();
  return true;
}

export function updateListingStatus(id: string, status: ListingStatus): boolean {
  const listing = listingStore.get(id);
  if (!listing) return false;
  listing.status = status;
  listing.updatedAt = new Date().toISOString();
  return true;
}

/* ═══════════════════════════════════════════════════════════════════
   5. REVIEWS
   ═══════════════════════════════════════════════════════════════════ */

export function addReview(listingId: string, tenantId: string, rating: number, comment?: string): ListingReview | null {
  const listing = listingStore.get(listingId);
  if (!listing) return null;
  if (rating < 1 || rating > 5) return null;

  // Prevent duplicate reviews from the same tenant for the same listing
  const existing = [...reviewStore.values()].find(
    (r) => r.listingId === listingId && r.tenantId === tenantId,
  );
  if (existing) return null;

  const id = crypto.randomUUID();
  const review: ListingReview = {
    id,
    listingId,
    tenantId,
    rating,
    comment,
    createdAt: new Date().toISOString(),
  };
  reviewStore.set(id, review);

  // Recalculate average
  const reviews = [...reviewStore.values()].filter((r) => r.listingId === listingId);
  listing.reviewCount = reviews.length;
  listing.rating = Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10;
  listing.updatedAt = new Date().toISOString();

  return review;
}

export function listReviews(listingId: string): ListingReview[] {
  return [...reviewStore.values()]
    .filter((r) => r.listingId === listingId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* ═══════════════════════════════════════════════════════════════════
   6. INSTALLS
   ═══════════════════════════════════════════════════════════════════ */

export function installListing(
  listingId: string,
  tenantId: string,
  version?: string,
  config?: Record<string, string>,
): ListingInstall | null {
  const listing = listingStore.get(listingId);
  if (!listing || listing.status !== "published") return null;

  // Check for existing active install
  const existing = [...installStore.values()].find(
    (i) => i.listingId === listingId && i.tenantId === tenantId && i.status === "installed",
  );
  if (existing) return null; // Already installed

  const id = crypto.randomUUID();
  const install: ListingInstall = {
    id,
    listingId,
    tenantId,
    version: version || listing.currentVersion,
    status: "installed",
    installedAt: new Date().toISOString(),
    config,
  };
  installStore.set(id, install);
  listing.installCount++;
  return install;
}

export function uninstallListing(listingId: string, tenantId: string): boolean {
  const install = [...installStore.values()].find(
    (i) => i.listingId === listingId && i.tenantId === tenantId && i.status === "installed",
  );
  if (!install) return false;
  install.status = "uninstalled";
  install.uninstalledAt = new Date().toISOString();
  const listing = listingStore.get(listingId);
  if (listing && listing.installCount > 0) listing.installCount--;
  return true;
}

export function listInstalls(tenantId: string): ListingInstall[] {
  return [...installStore.values()]
    .filter((i) => i.tenantId === tenantId && i.status === "installed")
    .sort((a, b) => b.installedAt.localeCompare(a.installedAt));
}

export function getInstall(id: string): ListingInstall | undefined {
  return installStore.get(id);
}

export function getInstallForTenant(tenantId: string, id: string): ListingInstall | undefined {
  const install = installStore.get(id);
  if (!install || install.tenantId !== tenantId) return undefined;
  return install;
}

/* ═══════════════════════════════════════════════════════════════════
   7. MARKETPLACE STATS
   ═══════════════════════════════════════════════════════════════════ */

export function getMarketplaceStats(tenantId?: string): {
  categories: number;
  listings: { total: number; published: number; draft: number };
  reviews: number;
  installs: { total: number; active: number };
  topListings: Array<{ id: string; name: string; type: ListingType; installs: number; rating: number }>;
} {
  const listings = [...listingStore.values()];
  const installs = tenantId
    ? [...installStore.values()].filter((install) => install.tenantId === tenantId)
    : [...installStore.values()];
  const reviews = tenantId
    ? [...reviewStore.values()].filter((review) => review.tenantId === tenantId)
    : [...reviewStore.values()];
  const installCountsByListing = new Map<string, number>();
  for (const install of installs) {
    if (install.status !== "installed") continue;
    installCountsByListing.set(
      install.listingId,
      (installCountsByListing.get(install.listingId) || 0) + 1
    );
  }

  return {
    categories: categoryStore.size,
    listings: {
      total: listings.length,
      published: listings.filter((l) => l.status === "published").length,
      draft: listings.filter((l) => l.status === "draft").length,
    },
    reviews: reviews.length,
    installs: {
      total: installs.length,
      active: installs.filter((i) => i.status === "installed").length,
    },
    topListings: listings
      .filter((l) => l.status === "published")
      .map((listing) => ({
        listing,
        installs: installCountsByListing.get(listing.id) || 0,
      }))
      .filter((entry) => entry.installs > 0 || !tenantId)
      .sort((a, b) => b.installs - a.installs)
      .slice(0, 10)
      .map((entry) => ({
        id: entry.listing.id,
        name: entry.listing.name,
        type: entry.listing.type,
        installs: entry.installs,
        rating: entry.listing.rating,
      })),
  };
}

/* ═══════════════════════════════════════════════════════════════════
   8. SEED CATALOG
   ═══════════════════════════════════════════════════════════════════ */

export function seedMarketplace(): void {
  if (categoryStore.size > 0) return;

  // Categories
  const catHl7 = createCategory({ name: "HL7v2", description: "HL7 Version 2.x messaging integrations" });
  const catX12 = createCategory({ name: "X12/EDI", description: "ANSI X12 EDI transaction processing" });
  const catFhir = createCategory({ name: "FHIR R4", description: "HL7 FHIR R4 resource exchange" });
  const catImaging = createCategory({ name: "Imaging", description: "DICOM and imaging workflow integrations" });
  const catRcm = createCategory({ name: "Revenue Cycle", description: "Billing, claims, and payment integrations" });
  const catTransport = createCategory({ name: "Transport", description: "Transport layer adapters (SFTP, AS2, REST)" });

  // Built-in listings (VistA-Evolved native)
  const publisher = { publisherId: "vista-evolved", publisherName: "VistA-Evolved Core" };

  const hl7Adapter = createListing({
    name: "HL7v2 Engine",
    description: "Full HL7v2 message parsing, generation, and routing engine with ADT/ORM/ORU/SIU support",
    type: "adapter",
    categoryId: catHl7.id,
    ...publisher,
    tags: ["hl7v2", "adt", "orm", "oru", "siu", "mllp"],
    standards: ["HL7v2.3", "HL7v2.5.1"],
  });
  publishVersion(hl7Adapter.id, "1.0.0", "Initial release: parser + 4 message packs + channel health");

  const x12Gateway = createListing({
    name: "X12 Gateway",
    description: "Inbound X12 5010 processing with parsing, envelope validation, TA1/999 generation",
    type: "adapter",
    categoryId: catX12.id,
    ...publisher,
    tags: ["x12", "5010", "837", "835", "270", "271", "edi"],
    standards: ["X12-5010"],
  });
  publishVersion(x12Gateway.id, "1.0.0", "Initial release: parser + duplicate detection + routing");

  const fhirGateway = createListing({
    name: "FHIR R4 Gateway",
    description: "FHIR R4 resource server with Patient, Observation, Condition, and Bundle support",
    type: "adapter",
    categoryId: catFhir.id,
    ...publisher,
    tags: ["fhir", "r4", "smart", "patient", "observation"],
    standards: ["FHIR-R4", "SMART-on-FHIR"],
  });
  publishVersion(fhirGateway.id, "1.0.0", "Initial release: CRUD + search + SMART auth");

  const clearinghouseConn = createListing({
    name: "Clearinghouse Transport",
    description: "Multi-protocol transport layer supporting SFTP, AS2, HTTPS REST/SOAP with credential vault",
    type: "connector",
    categoryId: catTransport.id,
    ...publisher,
    tags: ["sftp", "as2", "rest", "soap", "transport", "vault"],
    standards: ["AS2", "SFTP"],
  });
  publishVersion(clearinghouseConn.id, "1.0.0", "Initial release: SFTP/AS2/REST transports + vault + rate limiting");

  const imagingConn = createListing({
    name: "DICOM/DICOMweb Bridge",
    description: "Orthanc integration with DICOMweb proxy, OHIF viewer, and study ingest reconciliation",
    type: "connector",
    categoryId: catImaging.id,
    ...publisher,
    tags: ["dicom", "dicomweb", "orthanc", "ohif", "pacs"],
    standards: ["DICOM", "DICOMweb"],
  });
  publishVersion(imagingConn.id, "1.0.0", "Initial release: proxy + ingest + device registry");

  const rcmEngine = createListing({
    name: "RCM Gateway",
    description: "Revenue cycle management with claims, EDI pipeline, payer connectors, and VistA billing grounding",
    type: "adapter",
    categoryId: catRcm.id,
    ...publisher,
    tags: ["rcm", "claims", "837", "835", "billing", "payer"],
    standards: ["X12-5010", "PhilHealth-eClaims"],
    dependencies: ["rcm"],
  });
  publishVersion(rcmEngine.id, "1.0.0", "Initial release: claim FSM + validation + 4 connectors");
}
