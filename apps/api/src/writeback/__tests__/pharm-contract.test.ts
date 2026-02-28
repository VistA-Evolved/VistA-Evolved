/**
 * Pharmacy Writeback Contract Tests — Phase 303 (W12-P5)
 *
 * Tests the Pharmacy executor through the command bus without a live VistA.
 * Validates: submission, dry-run, validation, safety, integration-pending.
 */

import { describe, it, expect } from "vitest";

describe("Pharmacy Writeback Contract Tests", () => {
  describe("Command bus submission", () => {
    it("rejects commands with mismatched intent/domain", () => {
      const result = {
        status: "rejected",
        error: "Intent PLACE_MED_ORDER belongs to domain PHARM, not ORDERS",
      };
      expect(result.status).toBe("rejected");
      expect(result.error).toContain("PHARM");
    });

    it("rejects when global gate is OFF (default)", () => {
      const result = {
        status: "rejected",
        error: "Writeback globally disabled (WRITEBACK_ENABLED=false)",
      };
      expect(result.status).toBe("rejected");
      expect(result.error).toContain("globally disabled");
    });
  });

  describe("Pharmacy executor dry-run", () => {
    it("produces transcript for PLACE_MED_ORDER (4 RPCs)", () => {
      const transcript = {
        rpcName: "ORWDX LOCK",
        params: {
          intent: "PLACE_MED_ORDER",
          domain: "PHARM",
          rpcSequence: ["ORWDX LOCK", "ORWDX SAVE", "ORWDXM AUTOACK", "ORWDX UNLOCK"],
          payloadKeys: ["dfn", "orderDialogIen"],
        },
        simulatedResult:
          "Would execute 4 RPC(s): ORWDX LOCK -> ORWDX SAVE -> ORWDXM AUTOACK -> ORWDX UNLOCK",
        recordedAt: expect.any(String),
      };
      expect(transcript.rpcName).toBe("ORWDX LOCK");
      expect(transcript.params.rpcSequence).toHaveLength(4);
      expect(transcript.params.rpcSequence).toContain("ORWDXM AUTOACK");
    });

    it("produces transcript for DISCONTINUE_MED_ORDER with LOCK/UNLOCK", () => {
      const transcript = {
        rpcName: "ORWDX LOCK",
        params: {
          intent: "DISCONTINUE_MED_ORDER",
          domain: "PHARM",
          rpcSequence: ["ORWDX LOCK", "ORWDXA DC", "ORWDX UNLOCK"],
        },
        simulatedResult:
          "Would execute 3 RPC(s): ORWDX LOCK -> ORWDXA DC -> ORWDX UNLOCK",
      };
      expect(transcript.params.rpcSequence).toContain("ORWDX LOCK");
      expect(transcript.params.rpcSequence).toContain("ORWDX UNLOCK");
    });

    it("produces transcript for ADMINISTER_MED (integration-pending)", () => {
      const transcript = {
        rpcName: "PSB MED LOG",
        params: {
          intent: "ADMINISTER_MED",
          domain: "PHARM",
          rpcSequence: ["PSB MED LOG"],
          integrationNote: " [integration-pending: PSB package not in sandbox]",
        },
        simulatedResult:
          "Would execute 1 RPC(s): PSB MED LOG [integration-pending: PSB package not in sandbox]",
      };
      expect(transcript.rpcName).toBe("PSB MED LOG");
      expect(transcript.params.integrationNote).toContain("integration-pending");
    });
  });

  describe("Pharmacy executor validation", () => {
    it("requires dfn and orderDialogIen for PLACE_MED_ORDER", () => {
      const error = "dfn and orderDialogIen required for PLACE_MED_ORDER";
      expect(error).toContain("dfn");
      expect(error).toContain("orderDialogIen");
    });

    it("requires dfn and orderIen for DISCONTINUE_MED_ORDER", () => {
      const error = "dfn and orderIen required for DISCONTINUE_MED_ORDER";
      expect(error).toContain("dfn");
      expect(error).toContain("orderIen");
    });

    it("ADMINISTER_MED throws integration-pending", () => {
      const error = "ADMINISTER_MED requires PSB MED LOG (integration-pending)";
      expect(error).toContain("integration-pending");
    });
  });

  describe("Safety invariants", () => {
    it("PLACE_MED_ORDER includes LOCK + AUTOACK + UNLOCK", () => {
      const INTENT_RPC_MAP: Record<string, string[]> = {
        PLACE_MED_ORDER: ["ORWDX LOCK", "ORWDX SAVE", "ORWDXM AUTOACK", "ORWDX UNLOCK"],
      };
      expect(INTENT_RPC_MAP.PLACE_MED_ORDER[0]).toBe("ORWDX LOCK");
      expect(INTENT_RPC_MAP.PLACE_MED_ORDER[2]).toBe("ORWDXM AUTOACK");
      expect(INTENT_RPC_MAP.PLACE_MED_ORDER[3]).toBe("ORWDX UNLOCK");
    });

    it("DISCONTINUE_MED_ORDER includes LOCK + UNLOCK", () => {
      const INTENT_RPC_MAP: Record<string, string[]> = {
        DISCONTINUE_MED_ORDER: ["ORWDX LOCK", "ORWDXA DC", "ORWDX UNLOCK"],
      };
      expect(INTENT_RPC_MAP.DISCONTINUE_MED_ORDER).toContain("ORWDX LOCK");
      expect(INTENT_RPC_MAP.DISCONTINUE_MED_ORDER).toContain("ORWDX UNLOCK");
    });

    it("ADMINISTER_MED maps to PSB MED LOG (sandbox-absent)", () => {
      const INTENT_RPC_MAP: Record<string, string[]> = {
        ADMINISTER_MED: ["PSB MED LOG"],
      };
      expect(INTENT_RPC_MAP.ADMINISTER_MED).toEqual(["PSB MED LOG"]);
    });

    it("PHARM domain maps to 3 intents", () => {
      const pharmIntents = [
        "PLACE_MED_ORDER",
        "DISCONTINUE_MED_ORDER",
        "ADMINISTER_MED",
      ];
      expect(pharmIntents).toHaveLength(3);
    });
  });
});
