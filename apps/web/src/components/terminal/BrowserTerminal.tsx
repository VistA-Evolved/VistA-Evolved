"use client";

/**
 * Browser Terminal — xterm.js based terminal for VistA MUMPS interaction
 * Phase 534 (Wave 39 P4)
 *
 * Connects to the /ws/console WebSocket gateway. Admin-only.
 * RPC blocklist is enforced server-side (XUS AV CODE, XUS SET VISITOR blocked).
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { WS_BASE } from "@/lib/api-config";

// Dynamic imports for xterm (client-only, no SSR)
let TerminalClass: typeof import("@xterm/xterm").Terminal | null = null;
let FitAddonClass: typeof import("@xterm/addon-fit").FitAddon | null = null;

interface BrowserTerminalProps {
  wsUrl?: string;
  /** Show connection status bar */
  showStatus?: boolean;
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

const STATUS_COLORS: Record<ConnectionStatus, string> = {
  disconnected: "#ef4444",
  connecting: "#f59e0b",
  connected: "#22c55e",
  error: "#ef4444",
};

export default function BrowserTerminal({
  wsUrl,
  showStatus = true,
}: BrowserTerminalProps) {
  const termRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const terminalRef = useRef<InstanceType<typeof import("@xterm/xterm").Terminal> | null>(null);
  const fitAddonRef = useRef<InstanceType<typeof import("@xterm/addon-fit").FitAddon> | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const MAX_RECONNECT = 5;

  const effectiveWsUrl =
    wsUrl ??
    (typeof window !== "undefined"
      ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.hostname}:3001/ws/console`
      : `${WS_BASE}/ws/console`);

  const connect = useCallback(async () => {
    if (!termRef.current) return;

    // Lazily load xterm modules
    if (!TerminalClass) {
      const xtermMod = await import("@xterm/xterm");
      TerminalClass = xtermMod.Terminal;
    }
    if (!FitAddonClass) {
      const fitMod = await import("@xterm/addon-fit");
      FitAddonClass = fitMod.FitAddon;
    }

    // Create terminal if not already created
    if (!terminalRef.current) {
      const fitAddon = new FitAddonClass();
      fitAddonRef.current = fitAddon;

      const terminal = new TerminalClass({
        cursorBlink: true,
        fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
        fontSize: 14,
        theme: {
          background: "#0f172a",
          foreground: "#e2e8f0",
          cursor: "#3b82f6",
          selectionBackground: "#334155",
          black: "#0f172a",
          red: "#ef4444",
          green: "#22c55e",
          yellow: "#f59e0b",
          blue: "#3b82f6",
          magenta: "#a855f7",
          cyan: "#06b6d4",
          white: "#e2e8f0",
        },
      });
      terminal.loadAddon(fitAddon);
      terminal.open(termRef.current);
      fitAddon.fit();
      terminalRef.current = terminal;

      terminal.writeln("\x1b[36m=== VistA-Evolved Browser Terminal ===\x1b[0m");
      terminal.writeln(
        "\x1b[33mWarning: XUS AV CODE and XUS SET VISITOR RPCs are blocked.\x1b[0m"
      );
      terminal.writeln("");
    }

    setStatus("connecting");

    const ws = new WebSocket(effectiveWsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      reconnectAttempts.current = 0;
      terminalRef.current?.writeln(
        "\x1b[32m[Connected to VistA console]\x1b[0m"
      );
    };

    ws.onmessage = (ev) => {
      if (typeof ev.data === "string") {
        terminalRef.current?.write(ev.data);
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
      terminalRef.current?.writeln(
        "\x1b[31m[Disconnected]\x1b[0m"
      );
      // Auto-reconnect with backoff
      if (reconnectAttempts.current < MAX_RECONNECT) {
        const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 16000);
        reconnectAttempts.current++;
        terminalRef.current?.writeln(
          `\x1b[33m[Reconnecting in ${delay / 1000}s... (${reconnectAttempts.current}/${MAX_RECONNECT})]\x1b[0m`
        );
        reconnectTimer.current = setTimeout(() => connect(), delay);
      }
    };

    ws.onerror = () => {
      setStatus("error");
    };

    // Send terminal input to WebSocket
    terminalRef.current?.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });
  }, [effectiveWsUrl]);

  useEffect(() => {
    connect();

    const handleResize = () => {
      fitAddonRef.current?.fit();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      terminalRef.current?.dispose();
      terminalRef.current = null;
    };
  }, [connect]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {showStatus && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            background: "#1e293b",
            borderBottom: "1px solid #334155",
            fontSize: 12,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: STATUS_COLORS[status],
              display: "inline-block",
            }}
          />
          <span style={{ color: "#94a3b8" }}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
          <span style={{ color: "#475569", marginLeft: "auto" }}>
            {effectiveWsUrl}
          </span>
        </div>
      )}
      <div
        ref={termRef}
        style={{
          flex: 1,
          background: "#0f172a",
          padding: 4,
          minHeight: 400,
        }}
      />
    </div>
  );
}
