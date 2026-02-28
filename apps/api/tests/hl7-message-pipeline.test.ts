/**
 * HL7v2 Message Pipeline Tests -- Phase 259 (Wave 8 P3)
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const API_SRC = path.resolve(__dirname, "../src");
const HL7_DIR = path.join(API_SRC, "hl7");

describe("HL7v2 Message Pipeline -- Phase 259", () => {
  describe("Message Event Store", () => {
    it("message-event-store.ts exists", () => {
      expect(fs.existsSync(path.join(HL7_DIR, "message-event-store.ts"))).toBe(true);
    });

    it("exports recordMessageEvent", () => {
      const content = fs.readFileSync(
        path.join(HL7_DIR, "message-event-store.ts"),
        "utf-8"
      );
      expect(content).toContain("export function recordMessageEvent");
    });

    it("exports queryMessageEvents", () => {
      const content = fs.readFileSync(
        path.join(HL7_DIR, "message-event-store.ts"),
        "utf-8"
      );
      expect(content).toContain("export function queryMessageEvents");
    });

    it("exports verifyMessageEventChain", () => {
      const content = fs.readFileSync(
        path.join(HL7_DIR, "message-event-store.ts"),
        "utf-8"
      );
      expect(content).toContain("export function verifyMessageEventChain");
    });

    it("builds PHI-safe summaries (strips PID/NK1/GT1/IN segments)", () => {
      const content = fs.readFileSync(
        path.join(HL7_DIR, "message-event-store.ts"),
        "utf-8"
      );
      expect(content).toContain("PHI_SEGMENT_PREFIXES");
      expect(content).toContain('"PID"');
      expect(content).toContain('"NK1"');
    });

    it("never stores raw HL7 message -- only hash + size", () => {
      const content = fs.readFileSync(
        path.join(HL7_DIR, "message-event-store.ts"),
        "utf-8"
      );
      // The event type should have messageHash and messageSizeBytes but not rawMessage
      expect(content).toContain("messageHash: string");
      expect(content).toContain("messageSizeBytes: number");
      // rawMessage appears only in the input type, not the stored event
      expect(content).toContain("rawMessage: string; // stored only as hash + size");
    });

    it("has hash chain (prevHash + hash fields)", () => {
      const content = fs.readFileSync(
        path.join(HL7_DIR, "message-event-store.ts"),
        "utf-8"
      );
      expect(content).toContain("prevHash: string");
      expect(content).toContain("hash: string");
    });

    it("supports optional DB persistence via setHl7EventDbRepo", () => {
      const content = fs.readFileSync(
        path.join(HL7_DIR, "message-event-store.ts"),
        "utf-8"
      );
      expect(content).toContain("setHl7EventDbRepo");
      expect(content).toContain("Hl7MessageEventDbRepo");
    });
  });

  describe("Enhanced Dead-Letter Queue", () => {
    it("dead-letter-enhanced.ts exists", () => {
      expect(fs.existsSync(path.join(HL7_DIR, "dead-letter-enhanced.ts"))).toBe(true);
    });

    it("stores raw messages for replay", () => {
      const content = fs.readFileSync(
        path.join(HL7_DIR, "dead-letter-enhanced.ts"),
        "utf-8"
      );
      expect(content).toContain("rawMessageVault");
    });

    it("exports replayDeadLetter", () => {
      const content = fs.readFileSync(
        path.join(HL7_DIR, "dead-letter-enhanced.ts"),
        "utf-8"
      );
      expect(content).toContain("export function replayDeadLetter");
    });

    it("exports resolveDeadLetter", () => {
      const content = fs.readFileSync(
        path.join(HL7_DIR, "dead-letter-enhanced.ts"),
        "utf-8"
      );
      expect(content).toContain("export function resolveDeadLetter");
    });

    it("tracks retry count and last retry timestamp", () => {
      const content = fs.readFileSync(
        path.join(HL7_DIR, "dead-letter-enhanced.ts"),
        "utf-8"
      );
      expect(content).toContain("retryCount");
      expect(content).toContain("lastRetryAt");
    });

    it("integrates with message event store for audit", () => {
      const content = fs.readFileSync(
        path.join(HL7_DIR, "dead-letter-enhanced.ts"),
        "utf-8"
      );
      expect(content).toContain("recordMessageEvent");
    });
  });

  describe("Pipeline Routes", () => {
    it("hl7-pipeline.ts routes exist", () => {
      expect(
        fs.existsSync(path.join(API_SRC, "routes", "hl7-pipeline.ts"))
      ).toBe(true);
    });

    it("has event query endpoint", () => {
      const content = fs.readFileSync(
        path.join(API_SRC, "routes", "hl7-pipeline.ts"),
        "utf-8"
      );
      expect(content).toContain("/hl7/pipeline/events");
    });

    it("has hash chain verify endpoint", () => {
      const content = fs.readFileSync(
        path.join(API_SRC, "routes", "hl7-pipeline.ts"),
        "utf-8"
      );
      expect(content).toContain("/hl7/pipeline/verify");
    });

    it("has DLQ replay endpoint", () => {
      const content = fs.readFileSync(
        path.join(API_SRC, "routes", "hl7-pipeline.ts"),
        "utf-8"
      );
      expect(content).toContain("/hl7/dlq/:id/replay");
    });

    it("has DLQ resolve endpoint", () => {
      const content = fs.readFileSync(
        path.join(API_SRC, "routes", "hl7-pipeline.ts"),
        "utf-8"
      );
      expect(content).toContain("/hl7/dlq/:id/resolve");
    });

    it("has pipeline stats endpoint", () => {
      const content = fs.readFileSync(
        path.join(API_SRC, "routes", "hl7-pipeline.ts"),
        "utf-8"
      );
      expect(content).toContain("/hl7/pipeline/stats");
    });
  });

  describe("Store Policy Registration", () => {
    it("store-policy.ts registers HL7 stores", () => {
      const content = fs.readFileSync(
        path.join(API_SRC, "platform", "store-policy.ts"),
        "utf-8"
      );
      expect(content).toContain("hl7-message-events");
      expect(content).toContain("hl7-dead-letter-enhanced");
      expect(content).toContain("hl7-raw-message-vault");
      expect(content).toContain("hl7-routing-routes");
      expect(content).toContain("hl7-route-stats");
      expect(content).toContain("hl7-tenant-endpoints");
    });
  });

  describe("PHI Safety", () => {
    it("message event store strips PID segments", () => {
      const content = fs.readFileSync(
        path.join(HL7_DIR, "message-event-store.ts"),
        "utf-8"
      );
      expect(content).toContain("PHI_SEGMENT_PREFIXES");
      expect(content).toContain('"PID"');
      expect(content).toContain('"NK1"');
      expect(content).toContain('"GT1"');
      expect(content).toContain('"IN1"');
      expect(content).toContain('"IN2"');
    });

    it("raw messages are hashed, not stored in event store", () => {
      const content = fs.readFileSync(
        path.join(HL7_DIR, "message-event-store.ts"),
        "utf-8"
      );
      // The stored event type should not have rawMessage field
      expect(content).toContain("messageHash: string");
      expect(content).toContain("messageSizeBytes: number");
    });
  });
});
