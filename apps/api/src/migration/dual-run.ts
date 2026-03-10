/**
 * apps/api/src/migration/dual-run.ts
 *
 * Phase 459 (W30-P4). Dual-run harness for migration validation.
 * Executes operations against both VistA (primary) and target (secondary)
 * simultaneously, capturing field-level discrepancies.
 *
 * Modes:
 *   - off: no dual-run, VistA only
 *   - shadow: VistA response returned, secondary logged for comparison
 *   - compare: both results returned side-by-side
 */

// -- Types ----------------------------------------------------------

export type DualRunMode = 'off' | 'shadow' | 'compare';

export interface DualRunConfig {
  mode: DualRunMode;
  /** Max discrepancy log entries before rotation */
  maxLogEntries: number;
}

export interface FieldDiscrepancy {
  field: string;
  primary: unknown;
  secondary: unknown;
}

export interface DualRunComparison {
  id: string;
  operation: string;
  timestamp: string;
  primarySource: string;
  secondarySource: string;
  match: boolean;
  discrepancies: FieldDiscrepancy[];
  primaryDurationMs: number;
  secondaryDurationMs: number;
}

export interface DualRunStats {
  mode: DualRunMode;
  totalComparisons: number;
  matchCount: number;
  mismatchCount: number;
  errorCount: number;
  avgPrimaryMs: number;
  avgSecondaryMs: number;
  lastComparisonAt: string | null;
}

export interface DualRunResult<T> {
  primary: T;
  secondary?: T;
  comparison?: DualRunComparison;
}

// -- In-memory stores -----------------------------------------------

const comparisons: DualRunComparison[] = [];
let comparisonSeq = 0;
let errorCount = 0;

const config: DualRunConfig = {
  mode: (process.env.DUAL_RUN_MODE as DualRunMode) || 'off',
  maxLogEntries: 1000,
};

// -- Harness --------------------------------------------------------

export class DualRunHarness {
  getConfig(): DualRunConfig {
    return { ...config };
  }

  setMode(mode: DualRunMode): void {
    config.mode = mode;
  }

  getStats(): DualRunStats {
    const total = comparisons.length;
    const matches = comparisons.filter((c) => c.match).length;
    const avgPrimary =
      total > 0 ? comparisons.reduce((s, c) => s + c.primaryDurationMs, 0) / total : 0;
    const avgSecondary =
      total > 0 ? comparisons.reduce((s, c) => s + c.secondaryDurationMs, 0) / total : 0;

    return {
      mode: config.mode,
      totalComparisons: total,
      matchCount: matches,
      mismatchCount: total - matches,
      errorCount,
      avgPrimaryMs: Math.round(avgPrimary),
      avgSecondaryMs: Math.round(avgSecondary),
      lastComparisonAt: total > 0 ? comparisons[total - 1].timestamp : null,
    };
  }

  getComparisons(limit = 50): DualRunComparison[] {
    return comparisons.slice(-limit);
  }

  /**
   * Execute an operation against both sources and compare results.
   * @param operation - Name of the operation (e.g., "patient-lookup")
   * @param primaryFn - Function returning the primary (VistA) result
   * @param secondaryFn - Function returning the secondary (target) result
   * @param compareFn - Custom comparison function for field-level diff
   */
  async execute<T>(
    operation: string,
    primaryFn: () => Promise<T>,
    secondaryFn: () => Promise<T>,
    compareFn?: (a: T, b: T) => FieldDiscrepancy[]
  ): Promise<DualRunResult<T>> {
    // Always run primary
    const pStart = Date.now();
    const primary = await primaryFn();
    const pDuration = Date.now() - pStart;

    if (config.mode === 'off') {
      return { primary };
    }

    // Run secondary
    let secondary: T | undefined;
    let sDuration = 0;
    try {
      const sStart = Date.now();
      secondary = await secondaryFn();
      sDuration = Date.now() - sStart;
    } catch (_err) {
      errorCount++;
      // In shadow mode, suppress secondary errors
      if (config.mode === 'shadow') return { primary };
      throw _err;
    }

    // Compare
    const discrepancies = compareFn
      ? compareFn(primary, secondary!)
      : defaultCompare(primary, secondary!);

    const comparison: DualRunComparison = {
      id: `dr-${++comparisonSeq}`,
      operation,
      timestamp: new Date().toISOString(),
      primarySource: 'vista',
      secondarySource: 'target',
      match: discrepancies.length === 0,
      discrepancies,
      primaryDurationMs: pDuration,
      secondaryDurationMs: sDuration,
    };

    // Log comparison (with rotation)
    comparisons.push(comparison);
    if (comparisons.length > config.maxLogEntries) {
      comparisons.splice(0, comparisons.length - config.maxLogEntries);
    }

    if (config.mode === 'shadow') {
      return { primary, comparison };
    }

    // compare mode: return both
    return { primary, secondary, comparison };
  }
}

// -- Default shallow compare ----------------------------------------

function defaultCompare(a: unknown, b: unknown): FieldDiscrepancy[] {
  const discrepancies: FieldDiscrepancy[] = [];

  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    if (a !== b) {
      discrepancies.push({ field: '$root', primary: a, secondary: b });
    }
    return discrepancies;
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const allKeys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);

  for (const key of allKeys) {
    if (JSON.stringify(aObj[key]) !== JSON.stringify(bObj[key])) {
      discrepancies.push({ field: key, primary: aObj[key], secondary: bObj[key] });
    }
  }

  return discrepancies;
}

// -- Singleton ------------------------------------------------------

export const dualRunHarness = new DualRunHarness();
