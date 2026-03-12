'use client';

/**
 * VistA SSH Terminal -- Pure Roll-and-Scroll terminal via xterm.js + SSH proxy
 *
 * Connects to /ws/terminal which bridges to VistA's SSH daemon.
 * Provides the full VT220 terminal experience: D ^ZU, menu navigation,
 * FileMan editing, and all Roll-and-Scroll workflows.
 *
 * Features:
 *   - Full VT220 emulation via xterm.js
 *   - Auto-resize on window/panel resize
 *   - Copy/paste support
 *   - Search in scrollback
 *   - Connection status indicator
 *   - Session reconnection
 *   - Theme support (dark/light/retro green)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { WS_BASE } from '@/lib/api-config';
import type { IDisposable } from '@xterm/xterm';

let TerminalClass: typeof import('@xterm/xterm').Terminal | null = null;
let FitAddonClass: typeof import('@xterm/addon-fit').FitAddon | null = null;

interface VistaSshTerminalProps {
  wsUrl?: string;
  showToolbar?: boolean;
  theme?: 'dark' | 'light' | 'retro';
  onConnectionChange?: (connected: boolean) => void;
  onOutput?: (data: string) => void;
  sendRef?: React.MutableRefObject<((data: string) => void) | null>;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

const THEMES = {
  dark: {
    background: '#1a1a2e',
    foreground: '#e0e0e0',
    cursor: '#00ff41',
    cursorAccent: '#1a1a2e',
    selectionBackground: '#44475a',
    black: '#21222c', red: '#ff5555', green: '#50fa7b', yellow: '#f1fa8c',
    blue: '#bd93f9', magenta: '#ff79c6', cyan: '#8be9fd', white: '#f8f8f2',
  },
  light: {
    background: '#fafafa',
    foreground: '#383a42',
    cursor: '#526eff',
    cursorAccent: '#fafafa',
    selectionBackground: '#d0d0d0',
    black: '#383a42', red: '#e45649', green: '#50a14f', yellow: '#c18401',
    blue: '#4078f2', magenta: '#a626a4', cyan: '#0184bc', white: '#fafafa',
  },
  retro: {
    background: '#0a0a0a',
    foreground: '#00ff41',
    cursor: '#00ff41',
    cursorAccent: '#0a0a0a',
    selectionBackground: '#003300',
    black: '#0a0a0a', red: '#ff0000', green: '#00ff41', yellow: '#ffff00',
    blue: '#0066ff', magenta: '#ff00ff', cyan: '#00ffff', white: '#00ff41',
  },
};

export default function VistaSshTerminal({
  wsUrl,
  showToolbar = true,
  theme = 'dark',
  onConnectionChange,
  onOutput,
  sendRef,
}: VistaSshTerminalProps) {
  const termRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const terminalRef = useRef<InstanceType<typeof import('@xterm/xterm').Terminal> | null>(null);
  const fitAddonRef = useRef<InstanceType<typeof import('@xterm/addon-fit').FitAddon> | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const shouldReconnectRef = useRef(true);
  const connectInFlightRef = useRef(false);
  const dataListenerRef = useRef<IDisposable | null>(null);
  const MAX_RECONNECT = 5;

  const effectiveWsUrl = wsUrl ??
    (typeof window !== 'undefined'
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:3001/ws/terminal`
      : `${WS_BASE}/ws/terminal`);

  const connect = useCallback(async () => {
    if (!termRef.current || connectInFlightRef.current) return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    connectInFlightRef.current = true;
    shouldReconnectRef.current = true;

    // Load xterm modules dynamically (no SSR)
    if (!TerminalClass) {
      const xterm = await import('@xterm/xterm');
      // @ts-expect-error CSS import handled by bundler
      await import('@xterm/xterm/css/xterm.css');
      TerminalClass = xterm.Terminal;
    }
    if (!FitAddonClass) {
      const fit = await import('@xterm/addon-fit');
      FitAddonClass = fit.FitAddon;
    }

    // Create terminal
    if (!terminalRef.current) {
      const fitAddon = new FitAddonClass!();
      fitAddonRef.current = fitAddon;

      const terminal = new TerminalClass!({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        scrollback: 10000,
        theme: THEMES[theme],
        allowProposedApi: true,
      });

      terminal.loadAddon(fitAddon);
      terminal.open(termRef.current);
      fitAddon.fit();
      terminalRef.current = terminal;

      terminal.writeln('\x1b[1;32mVistA-Evolved Terminal\x1b[0m');
      terminal.writeln('Connecting to VistA SSH...\r\n');
    }

    // Connect WebSocket
    setStatus('connecting');
    const ws = new WebSocket(effectiveWsUrl);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connecting');
      reconnectAttempts.current = 0;
      connectInFlightRef.current = false;
    };

    if (sendRef) {
      sendRef.current = (data: string) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(data);
      };
    }

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        const text = new TextDecoder().decode(event.data);
        terminalRef.current?.write(text);
        onOutput?.(text);
      } else {
        // JSON control message
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'connected') {
            setStatus('connected');
            setSessionId(msg.sessionId);
            onConnectionChange?.(true);
            terminalRef.current?.writeln('\x1b[1;32mConnected to VistA\x1b[0m\r\n');

            // Send initial resize
            if (fitAddonRef.current) {
              const dims = fitAddonRef.current.proposeDimensions();
              if (dims) {
                ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
              }
            }
          } else if (msg.type === 'disconnected') {
            setStatus('disconnected');
            onConnectionChange?.(false);
            terminalRef.current?.writeln(`\r\n\x1b[1;31mDisconnected: ${msg.reason}\x1b[0m`);
          } else if (msg.type === 'error') {
            setStatus('error');
            terminalRef.current?.writeln(`\r\n\x1b[1;31mError: ${msg.message}\x1b[0m`);
          }
        } catch {
          terminalRef.current?.write(event.data);
          onOutput?.(event.data);
        }
      }
    };

    ws.onclose = () => {
      connectInFlightRef.current = false;
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      setStatus('disconnected');
      onConnectionChange?.(false);

      if (shouldReconnectRef.current && reconnectAttempts.current < MAX_RECONNECT) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current++;
        terminalRef.current?.writeln(`\r\n\x1b[33mReconnecting in ${delay / 1000}s... (${reconnectAttempts.current}/${MAX_RECONNECT})\x1b[0m`);
        reconnectTimer.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      setStatus('error');
      connectInFlightRef.current = false;
    };

    // Forward keystrokes from terminal to WebSocket
    dataListenerRef.current?.dispose();
    dataListenerRef.current = terminalRef.current?.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }) || null;
  }, [effectiveWsUrl, theme, onConnectionChange]);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
      dataListenerRef.current?.dispose();
      dataListenerRef.current = null;
      if (wsRef.current) wsRef.current.close();
      if (terminalRef.current) terminalRef.current.dispose();
      terminalRef.current = null;
      wsRef.current = null;
      connectInFlightRef.current = false;
    };
  }, [connect]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
        const dims = fitAddonRef.current.proposeDimensions();
        if (dims && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
        }
      }
    };

    window.addEventListener('resize', handleResize);
    const observer = new ResizeObserver(handleResize);
    if (termRef.current) observer.observe(termRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, []);

  const statusColor = {
    disconnected: '#ef4444',
    connecting: '#f59e0b',
    connected: '#22c55e',
    error: '#ef4444',
  }[status];

  return (
    <div className="flex flex-col h-full bg-background rounded-lg border overflow-hidden">
      {showToolbar && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-muted border-b text-sm">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: statusColor }}
            />
            <span className="font-medium">VistA Terminal</span>
            <span className="text-muted-foreground text-xs">{status}</span>
          </div>
          <div className="flex items-center gap-2">
            {sessionId && (
              <span className="text-muted-foreground text-xs font-mono">{sessionId}</span>
            )}
            <button
              className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
              onClick={() => {
                shouldReconnectRef.current = true;
                reconnectAttempts.current = 0;
                if (reconnectTimer.current) {
                  clearTimeout(reconnectTimer.current);
                  reconnectTimer.current = null;
                }
                if (wsRef.current) wsRef.current.close();
                connect();
              }}
            >
              Reconnect
            </button>
          </div>
        </div>
      )}
      <div ref={termRef} className="flex-1 min-h-0" />
    </div>
  );
}
