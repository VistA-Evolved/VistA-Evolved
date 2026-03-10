/**
 * Export Formats -- Phase 245: Data Exports v2
 *
 * Streaming-capable format writers for CSV, JSON, JSONL, and NDJSON.
 * Each formatter takes rows (Record<string,unknown>[]) and returns a string.
 * Reuses the CSV escaping logic from export-governance.ts.
 */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ExportV2Format = 'csv' | 'json' | 'jsonl' | 'ndjson';

export const SUPPORTED_FORMATS: ExportV2Format[] = ['csv', 'json', 'jsonl', 'ndjson'];

export interface FormatResult {
  data: string;
  mimeType: string;
  extension: string;
  rowCount: number;
}

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

function escapeCsvField(val: unknown): string {
  const s = String(val ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

export function formatCsv(rows: Record<string, unknown>[]): FormatResult {
  if (rows.length === 0) {
    return { data: '', mimeType: 'text/csv', extension: 'csv', rowCount: 0 };
  }
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escapeCsvField(row[h])).join(',')),
  ];
  return {
    data: lines.join('\n'),
    mimeType: 'text/csv',
    extension: 'csv',
    rowCount: rows.length,
  };
}

/* ------------------------------------------------------------------ */
/* JSON                                                                */
/* ------------------------------------------------------------------ */

export function formatJson(rows: Record<string, unknown>[]): FormatResult {
  return {
    data: JSON.stringify(rows, null, 2),
    mimeType: 'application/json',
    extension: 'json',
    rowCount: rows.length,
  };
}

/* ------------------------------------------------------------------ */
/* JSONL / NDJSON                                                      */
/* ------------------------------------------------------------------ */

export function formatJsonl(rows: Record<string, unknown>[]): FormatResult {
  const lines = rows.map((r) => JSON.stringify(r));
  return {
    data: lines.join('\n'),
    mimeType: 'application/x-ndjson',
    extension: 'jsonl',
    rowCount: rows.length,
  };
}

/** NDJSON is identical to JSONL in wire format */
export function formatNdjson(rows: Record<string, unknown>[]): FormatResult {
  return formatJsonl(rows);
}

/* ------------------------------------------------------------------ */
/* Dispatcher                                                          */
/* ------------------------------------------------------------------ */

export function formatRows(format: ExportV2Format, rows: Record<string, unknown>[]): FormatResult {
  switch (format) {
    case 'csv':
      return formatCsv(rows);
    case 'json':
      return formatJson(rows);
    case 'jsonl':
      return formatJsonl(rows);
    case 'ndjson':
      return formatNdjson(rows);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}
