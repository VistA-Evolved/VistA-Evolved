/**
 * Unit tests for structured logger redaction (Phase 34).
 *
 * Run with: node --test apps/api/src/lib/logger.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { redactObject } from "./logger.js";

describe("redactObject", () => {
  it("redacts known sensitive field names", () => {
    const input = {
      accessCode: "PROV123",
      verifyCode: "PROV123!!",
      password: "s3cret",
      message: "ok",
    };
    const result = redactObject(input) as Record<string, unknown>;
    assert.equal(result.accessCode, "[REDACTED]");
    assert.equal(result.verifyCode, "[REDACTED]");
    assert.equal(result.password, "[REDACTED]");
    assert.equal(result.message, "ok");
  });

  it("redacts SSN patterns in string values", () => {
    const input = { text: "SSN is 123-45-6789 on file" };
    const result = redactObject(input) as Record<string, unknown>;
    assert.ok(!(result.text as string).includes("123-45-6789"), "SSN should be redacted inline");
  });

  it("redacts Bearer tokens in string values", () => {
    const input = { header: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.AAAA" };
    const result = redactObject(input) as Record<string, unknown>;
    assert.ok(!(result.header as string).includes("eyJ"), "JWT should be redacted inline");
  });

  it("redacts session hex tokens in string values", () => {
    const token = "a".repeat(64);
    const input = { sid: token };
    const result = redactObject(input) as Record<string, unknown>;
    assert.ok(!(result.sid as string).includes(token), "Session token should be redacted");
  });

  it("handles nested objects", () => {
    const input = { outer: { password: "secret", safe: "ok" } };
    const result = redactObject(input) as Record<string, Record<string, unknown>>;
    assert.equal(result.outer.password, "[REDACTED]");
    assert.equal(result.outer.safe, "ok");
  });

  it("handles arrays", () => {
    const input = { items: [{ password: "x" }, { name: "safe" }] };
    const result = redactObject(input) as Record<string, Array<Record<string, unknown>>>;
    assert.equal(result.items[0].password, "[REDACTED]");
    assert.equal(result.items[1].name, "safe");
  });

  it("returns null/undefined as-is", () => {
    assert.equal(redactObject(null), null);
    assert.equal(redactObject(undefined), undefined);
  });

  it("caps recursion depth", () => {
    // Build a deeply nested object
    let obj: unknown = { val: "leaf" };
    for (let i = 0; i < 15; i++) {
      obj = { child: obj };
    }
    const result = redactObject(obj) as Record<string, unknown>;
    // Should not throw; just stops at MAX_DEPTH
    assert.ok(result !== null);
  });

  it("does not leak PHI fields", () => {
    const input = {
      ssn: "123-45-6789",
      socialSecurityNumber: "987-65-4321",
      dob: "01/01/1990",
      dateOfBirth: "1990-01-01",
      noteText: "Patient presents with...",
      noteContent: "Clinical note content",
      problemText: "HTN",
    };
    const result = redactObject(input) as Record<string, unknown>;
    assert.equal(result.ssn, "[REDACTED]");
    assert.equal(result.socialSecurityNumber, "[REDACTED]");
    assert.equal(result.dob, "[REDACTED]");
    assert.equal(result.dateOfBirth, "[REDACTED]");
    assert.equal(result.noteText, "[REDACTED]");
    assert.equal(result.noteContent, "[REDACTED]");
    assert.equal(result.problemText, "[REDACTED]");
  });
});
