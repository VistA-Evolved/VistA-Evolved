/**
 * Portal PDF Export — Phase 27
 *
 * Server-side PDF generation for health record sections.
 * No external dependencies — builds simple text-based PDF manually.
 * Each export is audited. No PHI leaks to client logs.
 *
 * Target VistA integration: ORWRP REPORT TEXT (for full clinical reports)
 */

/* ------------------------------------------------------------------ */
/* Minimal PDF builder (no deps)                                        */
/* ------------------------------------------------------------------ */

/**
 * Build a minimal valid PDF document from text content.
 * Uses PDF 1.4 spec — plaintext stream, no images/fonts embedded.
 * Sufficient for health record text exports.
 */
export function buildTextPdf(title: string, sections: { heading: string; lines: string[] }[]): Buffer {
  const objects: string[] = [];
  let objCount = 0;
  const offsets: number[] = [];

  function addObj(content: string): number {
    objCount++;
    offsets.push(-1); // placeholder
    objects.push(content);
    return objCount;
  }

  // Object 1: Catalog
  addObj("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  // Build text content
  const contentLines: string[] = [];
  contentLines.push("BT");
  contentLines.push("/F1 16 Tf");
  contentLines.push(`50 780 Td`);
  contentLines.push(`(${escapePdf(title)}) Tj`);
  contentLines.push("/F1 10 Tf");

  let y = 755;
  const pageHeight = 800;
  const marginBottom = 50;

  for (const section of sections) {
    if (y < marginBottom + 40) { y = 780; } // simple page overflow — single page for now
    y -= 20;
    contentLines.push(`50 ${y} Td`);
    contentLines.push(`/F1 12 Tf`);
    contentLines.push(`(${escapePdf(section.heading)}) Tj`);
    contentLines.push(`/F1 9 Tf`);

    for (const line of section.lines) {
      y -= 14;
      if (y < marginBottom) { y = 780; } // wrap
      contentLines.push(`50 ${y} Td`);
      contentLines.push(`(${escapePdf(line)}) Tj`);
    }
    y -= 8;
  }

  // Timestamp footer
  y = 30;
  contentLines.push(`/F1 7 Tf`);
  contentLines.push(`50 ${y} Td`);
  contentLines.push(`(Generated: ${new Date().toISOString()} | VistA-Evolved Health Portal) Tj`);
  contentLines.push("ET");

  const stream = contentLines.join("\n");

  // Object 2: Pages
  addObj("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  // Object 3: Page
  addObj(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]\n" +
    "   /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
  );

  // Object 4: Content stream
  addObj(
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`
  );

  // Object 5: Font
  addObj(
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n"
  );

  // Build final PDF bytes
  let pdf = "%PDF-1.4\n";
  for (let i = 0; i < objects.length; i++) {
    offsets[i] = pdf.length;
    pdf += objects[i];
  }

  const xrefOffset = pdf.length;
  pdf += "xref\n";
  pdf += `0 ${objCount + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 0; i < objCount; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += "trailer\n";
  pdf += `<< /Size ${objCount + 1} /Root 1 0 R >>\n`;
  pdf += "startxref\n";
  pdf += `${xrefOffset}\n`;
  pdf += "%%EOF\n";

  return Buffer.from(pdf, "latin1");
}

function escapePdf(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[\x00-\x1f]/g, " ")
    .slice(0, 200); // Truncate very long lines
}

/* ------------------------------------------------------------------ */
/* Section formatters                                                   */
/* ------------------------------------------------------------------ */

export function formatAllergiesForPdf(data: any[]): { heading: string; lines: string[] } {
  return {
    heading: "Allergies",
    lines: data.length > 0
      ? data.map(a => `${a.allergen || "Unknown"} — Severity: ${a.severity || "N/A"} | Reactions: ${a.reactions || "None noted"}`)
      : ["No allergy data available"],
  };
}

export function formatProblemsForPdf(data: any[]): { heading: string; lines: string[] } {
  return {
    heading: "Active Problems",
    lines: data.length > 0
      ? data.map(p => `${p.text || "Unknown"} [${p.status || "N/A"}]${p.onset ? ` — Onset: ${p.onset}` : ""}`)
      : ["No problem data available"],
  };
}

export function formatVitalsForPdf(data: any[]): { heading: string; lines: string[] } {
  return {
    heading: "Vitals",
    lines: data.length > 0
      ? data.map(v => `${v.type || ""}: ${v.value || ""} @ ${v.takenAt || ""}`)
      : ["No vitals data available"],
  };
}

export function formatMedicationsForPdf(data: any[]): { heading: string; lines: string[] } {
  return {
    heading: "Medications",
    lines: data.length > 0
      ? data.map(m => `${m.drugName || "Unknown"} [${m.status || ""}] ${m.sig ? "Sig: " + m.sig : ""}`)
      : ["No medication data available"],
  };
}

export function formatDemographicsForPdf(data: any[]): { heading: string; lines: string[] } {
  const d = data[0];
  return {
    heading: "Demographics",
    lines: d ? [`Name: ${d.name}`, `DOB: ${d.dob}`, `Sex: ${d.sex}`] : ["No demographics available"],
  };
}
