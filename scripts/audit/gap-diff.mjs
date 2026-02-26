#!/usr/bin/env node
/**
 * scripts/audit/gap-diff.mjs
 * Phase 145: Generate automated diff between before/after gap matrices.
 *
 * Usage:
 *   node scripts/audit/gap-diff.mjs \
 *     --before artifacts/phase145/system-gap-matrix.before.json \
 *     --after  artifacts/phase145/system-gap-matrix.after.json \
 *     --out    artifacts/phase145/gap-diff.json
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

function stripBom(s) {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function readJson(p) {
  return JSON.parse(stripBom(readFileSync(p, "utf8")));
}

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (name) => {
    const idx = args.indexOf(`--${name}`);
    return idx >= 0 ? args[idx + 1] : undefined;
  };
  return {
    before: get("before") || "artifacts/phase145/system-gap-matrix.before.json",
    after: get("after") || "artifacts/phase145/system-gap-matrix.after.json",
    out: get("out") || "artifacts/phase145/gap-diff.json",
  };
}

function diffDomains(beforeDomains, afterDomains) {
  const bMap = new Map(beforeDomains.map((d) => [d.domain, d]));
  const aMap = new Map(afterDomains.map((d) => [d.domain, d]));

  const added = [];
  const removed = [];
  const statusChanges = [];

  for (const [domain, ad] of aMap) {
    if (!bMap.has(domain)) {
      added.push({ domain, newStatus: ad.status, gapCount: ad.topGaps.length });
    }
  }

  for (const [domain, bd] of bMap) {
    if (!aMap.has(domain)) {
      removed.push({ domain, oldStatus: bd.status });
    } else {
      const ad = aMap.get(domain);
      if (bd.status !== ad.status) {
        statusChanges.push({
          domain,
          oldStatus: bd.status,
          newStatus: ad.status,
        });
      }
    }
  }

  return { added, removed, statusChanges };
}

function diffGaps(beforeDomains, afterDomains) {
  function gapKey(domain, gap) {
    return `${domain}::${gap}`;
  }

  const bGaps = new Map();
  const aGaps = new Map();

  for (const d of beforeDomains) {
    for (const g of d.topGaps || []) {
      bGaps.set(gapKey(d.domain, g.gap), { domain: d.domain, ...g });
    }
  }
  for (const d of afterDomains) {
    for (const g of d.topGaps || []) {
      aGaps.set(gapKey(d.domain, g.gap), { domain: d.domain, ...g });
    }
  }

  const gapsAdded = [];
  const gapsRemoved = [];
  const severityChanges = [];

  for (const [key, ag] of aGaps) {
    if (!bGaps.has(key)) {
      gapsAdded.push(ag);
    } else {
      const bg = bGaps.get(key);
      if (bg.severity !== ag.severity) {
        severityChanges.push({
          domain: ag.domain,
          gap: ag.gap,
          oldSeverity: bg.severity,
          newSeverity: ag.severity,
        });
      }
    }
  }

  for (const [key, bg] of bGaps) {
    if (!aGaps.has(key)) {
      gapsRemoved.push(bg);
    }
  }

  return { gapsAdded, gapsRemoved, severityChanges };
}

function diffPersistence(beforeAudit, afterAudit) {
  // If full audit available, compare stores. Otherwise compare from matrix topRisks
  const result = {
    mapStoreCountBefore: null,
    mapStoreCountAfter: null,
    highRiskBefore: null,
    highRiskAfter: null,
  };

  // Extract from DATABASE_POSTURE domain if available
  function extractDbPosture(domains) {
    const dbDomain = domains.find((d) => d.domain === "DATABASE_POSTURE");
    if (!dbDomain) return {};
    const metrics = {};
    for (const ev of dbDomain.evidence || []) {
      if (ev.metric) metrics[ev.metric] = ev.value;
    }
    return metrics;
  }

  const bMetrics = extractDbPosture(beforeAudit.domains || []);
  const aMetrics = extractDbPosture(afterAudit.domains || []);

  result.mapStoreCountBefore = bMetrics.inMemoryMaps ?? null;
  result.mapStoreCountAfter = aMetrics.inMemoryMaps ?? null;
  result.highRiskBefore = bMetrics.highRiskMaps ?? null;
  result.highRiskAfter = aMetrics.highRiskMaps ?? null;

  return result;
}

function main() {
  const { before, after, out } = parseArgs();

  const bMatrix = readJson(before);
  const aMatrix = readJson(after);

  const domainDiff = diffDomains(bMatrix.domains || [], aMatrix.domains || []);
  const gapDiff = diffGaps(bMatrix.domains || [], aMatrix.domains || []);
  const persistenceDiff = diffPersistence(bMatrix, aMatrix);

  // Aggregate gap counts
  const bGapCount = (bMatrix.domains || []).reduce(
    (s, d) => s + d.topGaps.length,
    0
  );
  const aGapCount = (aMatrix.domains || []).reduce(
    (s, d) => s + d.topGaps.length,
    0
  );

  // Count by severity
  function severityCounts(domains) {
    const counts = { high: 0, med: 0, low: 0 };
    for (const d of domains) {
      for (const g of d.topGaps || []) {
        counts[g.severity] = (counts[g.severity] || 0) + 1;
      }
    }
    return counts;
  }

  const bSev = severityCounts(bMatrix.domains || []);
  const aSev = severityCounts(aMatrix.domains || []);

  // Domain status summary
  function statusSummary(domains) {
    const counts = {};
    for (const d of domains) {
      counts[d.status] = (counts[d.status] || 0) + 1;
    }
    return counts;
  }

  const diff = {
    generatedAt: new Date().toISOString(),
    beforeSha: bMatrix.headSha,
    afterSha: aMatrix.headSha,
    summary: {
      domainsBeforeCount: (bMatrix.domains || []).length,
      domainsAfterCount: (aMatrix.domains || []).length,
      gapCountBefore: bGapCount,
      gapCountAfter: aGapCount,
      gapCountDelta: aGapCount - bGapCount,
      severityBefore: bSev,
      severityAfter: aSev,
      statusBefore: statusSummary(bMatrix.domains || []),
      statusAfter: statusSummary(aMatrix.domains || []),
    },
    persistence: persistenceDiff,
    domains: domainDiff,
    gaps: gapDiff,
  };

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(diff, null, 2) + "\n");
  console.log(`Gap diff written to ${out}`);
  console.log(`  Domains: ${diff.summary.domainsBeforeCount} -> ${diff.summary.domainsAfterCount}`);
  console.log(`  Gaps: ${bGapCount} -> ${aGapCount} (delta: ${aGapCount - bGapCount >= 0 ? "+" : ""}${aGapCount - bGapCount})`);
  console.log(`  Severity before: high=${bSev.high} med=${bSev.med} low=${bSev.low}`);
  console.log(`  Severity after:  high=${aSev.high} med=${aSev.med} low=${aSev.low}`);
  console.log(`  Domains added: ${domainDiff.added.length}, removed: ${domainDiff.removed.length}, status changed: ${domainDiff.statusChanges.length}`);
  console.log(`  Gaps added: ${gapDiff.gapsAdded.length}, removed: ${gapDiff.gapsRemoved.length}, severity changed: ${gapDiff.severityChanges.length}`);
  console.log(`  Map stores: ${persistenceDiff.mapStoreCountBefore ?? "?"} -> ${persistenceDiff.mapStoreCountAfter ?? "?"}`);
  console.log(`  High-risk maps: ${persistenceDiff.highRiskBefore ?? "?"} -> ${persistenceDiff.highRiskAfter ?? "?"}`);
}

main();
