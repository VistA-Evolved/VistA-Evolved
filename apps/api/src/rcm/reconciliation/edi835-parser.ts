/**
 * EDI 835 Parser Adapter — Phase 99
 *
 * Implements the Edi835Parser interface with a built-in scaffold parser.
 * The scaffold parser handles structured JSON input (pre-parsed 835).
 *
 * Raw X12 wire format parsing is integration-pending — requires a
 * streaming X12 parser (MIT-licensed) to be added in a future phase.
 *
 * The adapter pattern allows swapping the parser without changing
 * any consuming code.
 */

import type {
  Edi835Parser,
  NormalizedRemittance,
  NormalizedPaymentLine,
  PaymentCode,
} from "./types.js";

/* ── Scaffold Parser (Structured JSON input) ────────────────── */

/**
 * Scaffold 835 parser that accepts pre-structured JSON.
 * Use this when upstream has already parsed the X12 wire format.
 *
 * Input format: JSON string with shape:
 * {
 *   payerId: string,
 *   checkNumber?: string,
 *   lines: Array<{
 *     claimRef: string,
 *     billedAmount: number,
 *     paidAmount: number,
 *     allowedAmount?: number,
 *     adjustmentAmount?: number,
 *     patientResp?: number,
 *     traceNumber?: string,
 *     serviceDate?: string,
 *     postedDate?: string,
 *     patientDfn?: string,
 *     codes?: Array<{ type: string, code: string, description?: string }>
 *   }>
 * }
 */
class ScaffoldEdi835Parser implements Edi835Parser {
  readonly name = "scaffold-json";
  readonly version = "1.0.0";

  parse(content: string): NormalizedRemittance {
    const errors: string[] = [];

    let data: any;
    try {
      data = JSON.parse(content);
    } catch {
      return {
        lines: [],
        payerId: "",
        totalPaidAmount: 0,
        totalBilledAmount: 0,
        parseErrors: ["Invalid JSON input"],
      };
    }

    const payerId = String(data.payerId ?? "UNKNOWN");
    const checkNumber = data.checkNumber ?? undefined;
    const rawLines = Array.isArray(data.lines) ? data.lines : [];

    let totalPaid = 0;
    let totalBilled = 0;
    const lines: NormalizedPaymentLine[] = [];

    for (let i = 0; i < rawLines.length; i++) {
      const entry = rawLines[i];
      try {
        if (!entry.claimRef) {
          errors.push(`Line ${i}: missing claimRef`);
          continue;
        }

        const billedAmount = Number(entry.billedAmount ?? 0);
        const paidAmount = Number(entry.paidAmount ?? 0);

        const codes: PaymentCode[] = [];
        if (Array.isArray(entry.codes)) {
          for (const c of entry.codes) {
            codes.push({
              type: (c.type === "CARC" || c.type === "RARC") ? c.type : "OTHER",
              code: String(c.code ?? ""),
              description: c.description,
            });
          }
        }

        lines.push({
          claimRef: String(entry.claimRef),
          payerId: entry.payerId ?? payerId,
          billedAmount,
          paidAmount,
          allowedAmount: entry.allowedAmount != null ? Number(entry.allowedAmount) : undefined,
          patientResp: entry.patientResp != null ? Number(entry.patientResp) : undefined,
          adjustmentAmount: entry.adjustmentAmount != null ? Number(entry.adjustmentAmount) : undefined,
          traceNumber: entry.traceNumber ?? undefined,
          checkNumber: entry.checkNumber ?? checkNumber,
          postedDate: entry.postedDate ?? undefined,
          serviceDate: entry.serviceDate ?? undefined,
          patientDfn: entry.patientDfn ?? undefined,
          rawCodes: codes,
        });

        totalPaid += paidAmount;
        totalBilled += billedAmount;
      } catch (err) {
        errors.push(`Line ${i}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return {
      lines,
      payerId,
      checkNumber,
      totalPaidAmount: totalPaid,
      totalBilledAmount: totalBilled,
      parseErrors: errors,
    };
  }
}

/* ── Parser Registry ────────────────────────────────────────── */

const parsers = new Map<string, Edi835Parser>();

// Register built-in scaffold parser
parsers.set("scaffold-json", new ScaffoldEdi835Parser());

export function getParser(name?: string): Edi835Parser {
  const key = name ?? "scaffold-json";
  const parser = parsers.get(key);
  if (!parser) {
    throw new Error(`EDI 835 parser not found: ${key}. Available: ${[...parsers.keys()].join(", ")}`);
  }
  return parser;
}

export function registerParser(parser: Edi835Parser): void {
  parsers.set(parser.name, parser);
}

export function listParsers(): string[] {
  return [...parsers.keys()];
}
