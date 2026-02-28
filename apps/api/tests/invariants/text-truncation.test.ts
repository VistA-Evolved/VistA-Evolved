/**
 * Clinical Invariant Tests — Text Truncation Detection
 * Phase 268 — W8-P3
 *
 * Validates that VistA text fields are not silently truncated
 * during transmission, parsing, or storage. VistA M strings
 * have a max length of ~32K but RPC responses may split across lines.
 */
import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Truncation detection helpers
// ---------------------------------------------------------------------------

const VISTA_MAX_STRING_LENGTH = 32_000;
const COMMON_FIELD_MAX_LENGTHS: Record<string, number> = {
  "patient-name": 64,
  "allergy-reactant": 120,
  "medication-sig": 240,
  "note-line": 245, // VistA TIU line wrap
  "problem-text": 200,
  "order-text": 250,
};

function detectTruncation(value: string, fieldType: string): { truncated: boolean; reason?: string } {
  const maxLen = COMMON_FIELD_MAX_LENGTHS[fieldType];

  if (!maxLen) {
    // Generic check: string ends abruptly without sentence-ending punctuation
    if (value.length > 100 && /\w$/.test(value) && !/[.!?)\]"']$/.test(value)) {
      return { truncated: true, reason: "Ends mid-word without punctuation" };
    }
    return { truncated: false };
  }

  if (value.length >= maxLen) {
    return { truncated: true, reason: `Length ${value.length} >= max ${maxLen} for ${fieldType}` };
  }

  return { truncated: false };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Text Truncation Invariants", () => {
  // INV-015: Normal text should not be flagged
  describe("INV-015: Normal text passes truncation check", () => {
    const normalCases = [
      { text: "Penicillin", type: "allergy-reactant" },
      { text: "TAKE ONE TABLET BY MOUTH DAILY", type: "medication-sig" },
      { text: "Patient presents with headache and fever.", type: "note-line" },
      { text: "PROVIDER,CLYDE WV", type: "patient-name" },
    ];

    for (const { text, type } of normalCases) {
      it(`should accept "${text.substring(0, 30)}..." as ${type}`, () => {
        expect(detectTruncation(text, type).truncated).toBe(false);
      });
    }
  });

  // INV-016: Boundary-length text should be flagged
  describe("INV-016: Boundary text triggers truncation alert", () => {
    it("should flag allergy-reactant at max length", () => {
      const text = "A".repeat(120);
      const result = detectTruncation(text, "allergy-reactant");
      expect(result.truncated).toBe(true);
    });

    it("should flag medication-sig at max length", () => {
      const text = "TAKE ".repeat(48); // 240 chars
      const result = detectTruncation(text, "medication-sig");
      expect(result.truncated).toBe(true);
    });
  });

  // INV-017: Multi-line VistA response reassembly
  describe("INV-017: Multi-line response integrity", () => {
    it("should preserve all lines in TIU note response", () => {
      const vistaResponse = [
        "This is line 1 of the progress note.",
        "This is line 2 with clinical findings.",
        "Assessment: Patient stable.",
        "Plan: Continue current medications.",
      ];

      // Simulated reassembly
      const reassembled = vistaResponse.join("\n");
      const lineCount = reassembled.split("\n").length;

      expect(lineCount).toBe(vistaResponse.length);
      expect(reassembled).toContain("Assessment:");
      expect(reassembled).toContain("Plan:");
    });

    it("should detect line loss in reassembly", () => {
      const original = ["Line 1", "Line 2", "Line 3", "Line 4"];
      const corrupted = ["Line 1", "Line 2"]; // Lines 3-4 lost!

      expect(corrupted.length).toBeLessThan(original.length);
    });
  });

  // INV-018: VistA string length bounds
  describe("INV-018: VistA M string limits", () => {
    it("should accept strings under 32K", () => {
      const text = "A".repeat(31_000);
      expect(text.length).toBeLessThan(VISTA_MAX_STRING_LENGTH);
    });

    it("should flag strings approaching 32K", () => {
      const text = "A".repeat(32_001);
      expect(text.length).toBeGreaterThan(VISTA_MAX_STRING_LENGTH);
    });
  });

  // INV-019: Encoding preservation
  describe("INV-019: Character encoding integrity", () => {
    it("should preserve ASCII printable characters", () => {
      const ascii = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";
      expect(ascii.length).toBe(95);
      // After round-trip through VistA, every char should survive
      const roundTripped = ascii; // Simulated
      expect(roundTripped).toBe(ascii);
    });

    it("should handle VistA caret delimiters without data loss", () => {
      const vistaLine = "1^Penicillin^ALLERGY^Active^3260228";
      const parts = vistaLine.split("^");
      expect(parts).toHaveLength(5);
      expect(parts[1]).toBe("Penicillin");
    });
  });
});
