/**
 * Unit tests for PHI redaction engine (Phase 34).
 *
 * Run with: node --test apps/api/src/ai/redaction.test.ts
 * Requires: Node.js >= 22 built-in test runner.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { redactPhi, detectPhi, redactContext, getRedactionCategories } from "./redaction.js";

/* ------------------------------------------------------------------ */
/* redactPhi                                                           */
/* ------------------------------------------------------------------ */

describe("redactPhi", () => {
  it("redacts SSN (dashed)", () => {
    const r = redactPhi("SSN is 123-45-6789 on file.");
    assert.ok(!r.text.includes("123-45-6789"), "SSN should be redacted");
    assert.ok(r.text.includes("[SSN-REDACTED]"));
    assert.ok(r.phiDetected);
    assert.ok(r.categoriesFound.includes("SSN"));
  });

  it("redacts SSN (no dash)", () => {
    const r = redactPhi("SSN: 123456789 here.");
    assert.ok(!r.text.includes("123456789"), "SSN-no-dash should be redacted");
    assert.ok(r.phiDetected);
  });

  it("redacts phone numbers", () => {
    const r = redactPhi("Call (555) 123-4567 for appt.");
    assert.ok(!r.text.includes("555"), "Phone should be redacted");
    assert.ok(r.text.includes("[PHONE-REDACTED]"));
    assert.ok(r.categoriesFound.includes("Phone"));
  });

  it("redacts email addresses", () => {
    const r = redactPhi("Contact patient@example.com today.");
    assert.ok(!r.text.includes("patient@example.com"));
    assert.ok(r.text.includes("[EMAIL-REDACTED]"));
    assert.ok(r.categoriesFound.includes("Email"));
  });

  it("redacts DOB", () => {
    const r = redactPhi("DOB: 01/15/1980 confirmed.");
    assert.ok(!r.text.includes("01/15/1980"));
    assert.ok(r.text.includes("[DOB-REDACTED]"));
    assert.ok(r.categoriesFound.includes("DOB"));
  });

  it("redacts MRN", () => {
    const r = redactPhi("MRN: 00112345 in chart.");
    assert.ok(!r.text.includes("00112345"));
    assert.ok(r.text.includes("[MRN-REDACTED]"));
    assert.ok(r.categoriesFound.includes("MRN"));
  });

  it("redacts street addresses", () => {
    const r = redactPhi("Lives at 123 Main Street today.");
    assert.ok(!r.text.includes("123 Main Street"));
    assert.ok(r.text.includes("[ADDRESS-REDACTED]"));
    assert.ok(r.categoriesFound.includes("Address"));
  });

  it("redacts patient names", () => {
    const r = redactPhi("Patient: Smith, John admitted.");
    assert.ok(!r.text.includes("Smith, John"));
    assert.ok(r.text.includes("[NAME-REDACTED]"));
    assert.ok(r.categoriesFound.includes("PatientName"));
  });

  it("redacts DFN identifiers", () => {
    const r = redactPhi("Loaded DFN: 100022 record.");
    assert.ok(!r.text.includes("DFN: 100022"));
    assert.ok(r.text.includes("[DFN-REDACTED]"));
    assert.ok(r.categoriesFound.includes("DFN"));
  });

  it("redacts DUZ identifiers", () => {
    const r = redactPhi("Provider DUZ 87 signed.");
    assert.ok(!r.text.includes("DUZ 87"));
    assert.ok(r.text.includes("[DUZ-REDACTED]"));
    assert.ok(r.categoriesFound.includes("DUZ"));
  });

  it("returns zero redactions for clean text", () => {
    const r = redactPhi("The quick brown fox jumps over the lazy dog.");
    assert.equal(r.redactionCount, 0);
    assert.equal(r.phiDetected, false);
    assert.equal(r.categoriesFound.length, 0);
  });

  it("counts all redactions in mixed input", () => {
    const r = redactPhi("SSN 123-45-6789, email test@test.com, DOB: 01/01/1990");
    assert.ok(r.redactionCount >= 3, `Expected >=3 redactions, got ${r.redactionCount}`);
    assert.ok(r.phiDetected);
  });
});

/* ------------------------------------------------------------------ */
/* detectPhi                                                           */
/* ------------------------------------------------------------------ */

describe("detectPhi", () => {
  it("detects PHI without modifying text", () => {
    const result = detectPhi("SSN is 123-45-6789");
    assert.ok(result.phiDetected);
    assert.ok(result.categories.includes("SSN"));
  });

  it("returns false for clean text", () => {
    const result = detectPhi("No sensitive data here");
    assert.equal(result.phiDetected, false);
    assert.equal(result.categories.length, 0);
  });
});

/* ------------------------------------------------------------------ */
/* redactContext                                                        */
/* ------------------------------------------------------------------ */

describe("redactContext", () => {
  it("redacts PHI in structured chunks", () => {
    const chunks = [
      { content: "SSN: 111-22-3333", label: "demographics" },
      { content: "No PHI here", label: "vitals" },
    ];
    const result = redactContext(chunks);
    assert.ok(!result.chunks[0].content.includes("111-22-3333"));
    assert.ok(result.totalRedactions >= 1);
    assert.equal(result.chunks[1].content, "No PHI here");
  });
});

/* ------------------------------------------------------------------ */
/* getRedactionCategories                                              */
/* ------------------------------------------------------------------ */

describe("getRedactionCategories", () => {
  it("returns all 10 category names", () => {
    const cats = getRedactionCategories();
    assert.ok(cats.length >= 10, `Expected >=10 categories, got ${cats.length}`);
    assert.ok(cats.includes("SSN"));
    assert.ok(cats.includes("Email"));
    assert.ok(cats.includes("DFN"));
    assert.ok(cats.includes("DUZ"));
  });
});
