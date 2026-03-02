/**
 * PhilHealth Claim Pack Zip Bundler — Phase 516 (Wave 37 B4)
 *
 * Creates downloadable zip archives from eClaims 3.0 ExportBundle.
 * Uses Node.js built-in zlib (no external deps) with a minimal
 * zip file format builder.
 *
 * Output: .zip file containing JSON + PDF text + XML + manifest.json
 */

import { deflateRawSync } from "node:zlib";
import { createHash } from "node:crypto";
import type { ExportBundle } from "./types.js";

/* ── Minimal ZIP builder (no external deps) ──────────────── */

/**
 * Build a zip file from a list of named entries.
 * Implements the ZIP format with DEFLATE compression (method 8).
 * This is a minimal implementation suitable for small document bundles.
 */
function buildZipBuffer(entries: Array<{ name: string; data: Buffer }>): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, "utf-8");
    const compressed = deflateRawSync(entry.data);
    const crc = crc32(entry.data);

    // Local file header
    const local = Buffer.alloc(30 + nameBuffer.length);
    local.writeUInt32LE(0x04034b50, 0);       // Signature
    local.writeUInt16LE(20, 4);                // Version needed (2.0)
    local.writeUInt16LE(0, 6);                 // General purpose bit flag
    local.writeUInt16LE(8, 8);                 // Compression method (DEFLATE)
    local.writeUInt16LE(0, 10);                // Mod time
    local.writeUInt16LE(0, 12);                // Mod date
    local.writeUInt32LE(crc, 14);              // CRC-32
    local.writeUInt32LE(compressed.length, 18); // Compressed size
    local.writeUInt32LE(entry.data.length, 22); // Uncompressed size
    local.writeUInt16LE(nameBuffer.length, 26); // Filename length
    local.writeUInt16LE(0, 28);                // Extra field length
    nameBuffer.copy(local, 30);

    localHeaders.push(local, compressed);

    // Central directory header
    const central = Buffer.alloc(46 + nameBuffer.length);
    central.writeUInt32LE(0x02014b50, 0);       // Signature
    central.writeUInt16LE(20, 4);                // Version made by
    central.writeUInt16LE(20, 6);                // Version needed
    central.writeUInt16LE(0, 8);                 // General purpose bit flag
    central.writeUInt16LE(8, 10);                // Compression method
    central.writeUInt16LE(0, 12);                // Mod time
    central.writeUInt16LE(0, 14);                // Mod date
    central.writeUInt32LE(crc, 16);              // CRC-32
    central.writeUInt32LE(compressed.length, 20); // Compressed size
    central.writeUInt32LE(entry.data.length, 24); // Uncompressed size
    central.writeUInt16LE(nameBuffer.length, 28); // Filename length
    central.writeUInt16LE(0, 30);                // Extra field length
    central.writeUInt16LE(0, 32);                // File comment length
    central.writeUInt16LE(0, 34);                // Disk number start
    central.writeUInt16LE(0, 36);                // Internal file attributes
    central.writeUInt32LE(0, 38);                // External file attributes
    central.writeUInt32LE(offset, 42);           // Relative offset of local header
    nameBuffer.copy(central, 46);

    centralHeaders.push(central);
    offset += local.length + compressed.length;
  }

  const centralDirOffset = offset;
  const centralBuf = Buffer.concat(centralHeaders);

  // End of central directory record
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);              // Signature
  eocd.writeUInt16LE(0, 4);                        // Disk number
  eocd.writeUInt16LE(0, 6);                        // Disk with central dir
  eocd.writeUInt16LE(entries.length, 8);            // Central dir entries on disk
  eocd.writeUInt16LE(entries.length, 10);           // Total central dir entries
  eocd.writeUInt32LE(centralBuf.length, 12);        // Central dir size
  eocd.writeUInt32LE(centralDirOffset, 16);         // Central dir offset
  eocd.writeUInt16LE(0, 20);                        // Comment length

  return Buffer.concat([...localHeaders, centralBuf, eocd]);
}

/**
 * CRC-32 implementation (IEEE/ISO 3309).
 */
function crc32(buf: Buffer): number {
  const table = getCrc32Table();
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

let _crc32Table: Uint32Array | null = null;
function getCrc32Table(): Uint32Array {
  if (_crc32Table) return _crc32Table;
  _crc32Table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    _crc32Table[i] = c >>> 0;
  }
  return _crc32Table;
}

/* ── Manifest generator ──────────────────────────────────── */

interface BundleManifest {
  bundleId: string;
  packetId: string;
  generatedAt: string;
  generatedBy: string;
  files: Array<{
    filename: string;
    format: string;
    sizeBytes: number;
    sha256: string;
  }>;
  summary: ExportBundle["summary"];
}

function generateManifest(bundle: ExportBundle): BundleManifest {
  return {
    bundleId: bundle.bundleId,
    packetId: bundle.packetId,
    generatedAt: bundle.generatedAt,
    generatedBy: bundle.generatedBy,
    files: bundle.artifacts.map((a) => ({
      filename: a.filename,
      format: a.format,
      sizeBytes: a.sizeBytes,
      sha256: createHash("sha256").update(a.content).digest("hex").slice(0, 16),
    })),
    summary: bundle.summary,
  };
}

/* ── Public API ──────────────────────────────────────────── */

export interface ZipBundleResult {
  zipBuffer: Buffer;
  zipFilename: string;
  manifest: BundleManifest;
  sizeBytes: number;
  sha256: string;
}

/**
 * Create a downloadable zip archive from an ExportBundle.
 * Includes all artifacts + a manifest.json.
 */
export function createZipBundle(bundle: ExportBundle): ZipBundleResult {
  const manifest = generateManifest(bundle);
  const manifestJson = JSON.stringify(manifest, null, 2);

  const entries: Array<{ name: string; data: Buffer }> = [];

  // Add all artifacts
  for (const artifact of bundle.artifacts) {
    entries.push({
      name: artifact.filename,
      data: Buffer.from(artifact.content, "utf-8"),
    });
  }

  // Add manifest
  entries.push({
    name: "manifest.json",
    data: Buffer.from(manifestJson, "utf-8"),
  });

  const zipBuffer = buildZipBuffer(entries);
  const sha256 = createHash("sha256").update(zipBuffer).digest("hex").slice(0, 16);
  const zipFilename = `eclaims3_${bundle.packetId}_${bundle.generatedAt.slice(0, 10)}.zip`;

  return {
    zipBuffer,
    zipFilename,
    manifest,
    sizeBytes: zipBuffer.length,
    sha256,
  };
}

/**
 * Create a multi-packet zip bundle (batch export).
 * Useful for exporting all claims for a given period.
 */
export function createBatchZipBundle(
  bundles: ExportBundle[],
  batchLabel: string,
): ZipBundleResult {
  const entries: Array<{ name: string; data: Buffer }> = [];
  const batchManifest = {
    batchLabel,
    generatedAt: new Date().toISOString(),
    bundleCount: bundles.length,
    bundles: [] as BundleManifest[],
  };

  for (const bundle of bundles) {
    const manifest = generateManifest(bundle);
    batchManifest.bundles.push(manifest);

    // Namespace each bundle's files in a subfolder
    const prefix = `${bundle.packetId}/`;
    for (const artifact of bundle.artifacts) {
      entries.push({
        name: prefix + artifact.filename,
        data: Buffer.from(artifact.content, "utf-8"),
      });
    }
    entries.push({
      name: prefix + "manifest.json",
      data: Buffer.from(JSON.stringify(manifest, null, 2), "utf-8"),
    });
  }

  // Batch manifest at root
  entries.push({
    name: "batch-manifest.json",
    data: Buffer.from(JSON.stringify(batchManifest, null, 2), "utf-8"),
  });

  const zipBuffer = buildZipBuffer(entries);
  const sha256 = createHash("sha256").update(zipBuffer).digest("hex").slice(0, 16);
  const zipFilename = `eclaims3_batch_${batchLabel}_${new Date().toISOString().slice(0, 10)}.zip`;

  return {
    zipBuffer,
    zipFilename,
    manifest: batchManifest as any,
    sizeBytes: zipBuffer.length,
    sha256,
  };
}
