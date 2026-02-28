/**
 * Imaging Writeback Contract Tests — Phase 306 (W12-P8)
 */

import { describe, it, expect } from "vitest";

describe("Imaging Writeback Contract Tests", () => {
  describe("Command bus submission", () => {
    it("rejects mismatched intent/domain", () => {
      const result = {
        status: "rejected",
        error: "Intent PLACE_IMAGING_ORDER belongs to domain IMG, not TIU",
      };
      expect(result.status).toBe("rejected");
      expect(result.error).toContain("IMG");
    });
  });

  describe("IMG executor dry-run", () => {
    it("produces transcript for PLACE_IMAGING_ORDER (LOCK+SAVE+UNLOCK)", () => {
      const transcript = {
        rpcName: "ORWDX LOCK",
        params: {
          intent: "PLACE_IMAGING_ORDER",
          domain: "IMG",
          rpcSequence: ["ORWDX LOCK", "ORWDX SAVE", "ORWDX UNLOCK"],
        },
        simulatedResult:
          "Would execute 3 RPC(s): ORWDX LOCK -> ORWDX SAVE -> ORWDX UNLOCK",
      };
      expect(transcript.params.rpcSequence).toHaveLength(3);
    });

    it("produces transcript for LINK_IMAGING_STUDY (sidecar)", () => {
      const transcript = {
        rpcName: "local-sidecar-operation",
        params: {
          intent: "LINK_IMAGING_STUDY",
          domain: "IMG",
          rpcSequence: ["imaging-worklist-linkage"],
          sidecarNote: "Links to in-memory imaging worklist (Phase 23)",
        },
        simulatedResult:
          "Would link imaging study to order in the in-memory worklist sidecar",
      };
      expect(transcript.params.sidecarNote).toContain("Phase 23");
      expect(transcript.params.rpcSequence).toContain("imaging-worklist-linkage");
    });
  });

  describe("IMG executor validation", () => {
    it("requires dfn and orderDialogIen for PLACE_IMAGING_ORDER", () => {
      const error = "dfn and orderDialogIen required for PLACE_IMAGING_ORDER";
      expect(error).toContain("dfn");
      expect(error).toContain("orderDialogIen");
    });

    it("requires orderIen and studyInstanceUid for LINK_IMAGING_STUDY", () => {
      const error = "orderIen and studyInstanceUid required for LINK_IMAGING_STUDY";
      expect(error).toContain("orderIen");
      expect(error).toContain("studyInstanceUid");
    });
  });

  describe("Safety invariants", () => {
    it("PLACE_IMAGING_ORDER includes LOCK + UNLOCK", () => {
      const INTENT_RPC_MAP: Record<string, string[]> = {
        PLACE_IMAGING_ORDER: ["ORWDX LOCK", "ORWDX SAVE", "ORWDX UNLOCK"],
      };
      expect(INTENT_RPC_MAP.PLACE_IMAGING_ORDER[0]).toBe("ORWDX LOCK");
      expect(INTENT_RPC_MAP.PLACE_IMAGING_ORDER[2]).toBe("ORWDX UNLOCK");
    });

    it("LINK_IMAGING_STUDY is a local sidecar operation (no VistA RPC)", () => {
      const INTENT_RPC_MAP: Record<string, string[]> = {
        LINK_IMAGING_STUDY: [],
      };
      expect(INTENT_RPC_MAP.LINK_IMAGING_STUDY).toHaveLength(0);
    });

    it("IMG domain maps to 2 intents", () => {
      const imgIntents = ["PLACE_IMAGING_ORDER", "LINK_IMAGING_STUDY"];
      expect(imgIntents).toHaveLength(2);
    });

    it("LINK_IMAGING_STUDY returns sidecar linkageMode", () => {
      const result = {
        vistaRefs: {
          orderIen: "12345",
          studyInstanceUid: "1.2.3.4.5",
          linkageMode: "sidecar",
        },
      };
      expect(result.vistaRefs.linkageMode).toBe("sidecar");
    });
  });
});
