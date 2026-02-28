/**
 * Contract tests for locale-utils formatting functions.
 *
 * These validate that formatDate, formatNumber, formatCurrency,
 * and RTL detection work correctly across supported locales.
 */

import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatTime,
  formatDateTime,
  formatNumber,
  formatCurrency,
  formatRelativeTime,
  isRtlLocale,
  getTextDirection,
  SUPPORTED_LOCALES,
} from "../src/index.js";

describe("formatDate", () => {
  const testDate = new Date("2025-06-15T10:30:00Z");

  it("formats to ISO", () => {
    expect(formatDate(testDate, "en", "iso")).toBe("2025-06-15");
  });

  it("formats short date for en", () => {
    const result = formatDate(testDate, "en-US", "short");
    expect(result).toMatch(/06\/15\/2025/);
  });

  it("handles null/undefined", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
  });

  it("handles invalid date", () => {
    expect(formatDate("not-a-date")).toBe("");
  });

  it("accepts epoch ms", () => {
    const result = formatDate(testDate.getTime(), "en", "iso");
    expect(result).toBe("2025-06-15");
  });

  it("accepts ISO string", () => {
    const result = formatDate("2025-06-15T10:30:00Z", "en", "iso");
    expect(result).toBe("2025-06-15");
  });
});

describe("formatTime", () => {
  it("formats time", () => {
    const result = formatTime(new Date("2025-06-15T10:30:00Z"), "en-US", "short");
    expect(result).toBeTruthy();
  });

  it("handles null", () => {
    expect(formatTime(null)).toBe("");
  });
});

describe("formatDateTime", () => {
  it("formats date and time together", () => {
    const result = formatDateTime(new Date("2025-06-15T10:30:00Z"), "en-US");
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(5);
  });
});

describe("formatNumber", () => {
  it("formats with US locale", () => {
    expect(formatNumber(1234567.89, "en-US")).toBe("1,234,567.89");
  });

  it("handles null", () => {
    expect(formatNumber(null)).toBe("");
  });

  it("formats with options", () => {
    const result = formatNumber(0.456, "en", { style: "percent" });
    expect(result).toMatch(/46/); // 46% approximately
  });
});

describe("formatCurrency", () => {
  it("formats USD", () => {
    const result = formatCurrency(1234.56, "USD", "en-US");
    expect(result).toMatch(/\$1,234\.56/);
  });

  it("formats PHP", () => {
    const result = formatCurrency(5000, "PHP", "en");
    expect(result).toBeTruthy();
  });

  it("handles null", () => {
    expect(formatCurrency(null)).toBe("");
  });
});

describe("formatRelativeTime", () => {
  it("returns a string for recent dates", () => {
    const recent = new Date(Date.now() - 60_000); // 1 minute ago
    const result = formatRelativeTime(recent, "en");
    expect(result).toBeTruthy();
  });

  it("handles null", () => {
    expect(formatRelativeTime(null)).toBe("");
  });
});

describe("RTL detection", () => {
  it("detects LTR for supported locales", () => {
    for (const loc of SUPPORTED_LOCALES) {
      expect(isRtlLocale(loc)).toBe(false);
    }
  });

  it("detects RTL for Arabic", () => {
    expect(isRtlLocale("ar")).toBe(true);
    expect(isRtlLocale("ar-SA")).toBe(true);
  });

  it("detects RTL for Hebrew", () => {
    expect(isRtlLocale("he")).toBe(true);
  });

  it("returns correct direction", () => {
    expect(getTextDirection("en")).toBe("ltr");
    expect(getTextDirection("ar")).toBe("rtl");
    expect(getTextDirection("fil")).toBe("ltr");
  });
});

describe("SUPPORTED_LOCALES", () => {
  it("includes en, fil, es", () => {
    expect(SUPPORTED_LOCALES).toContain("en");
    expect(SUPPORTED_LOCALES).toContain("fil");
    expect(SUPPORTED_LOCALES).toContain("es");
  });
});
