'use client';

/**
 * VistA Terminal -- embeddable VT100-style terminal for VistA MUMPS interaction
 *
 * Wraps the xterm.js WebSocket console with a VistA-specific toolbar of common
 * roll-and-scroll commands. Designed to be embedded inline in admin panels
 * as a modal or slide-over.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { WS_BASE } from '@/lib/api-config';

let TerminalClass: typeof import('@xterm/xterm').Terminal | null = null;
let FitAddonClass: typeof import('@xterm/addon-fit').FitAddon | null = null;

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

const QUICK_COMMANDS = [
  { label: 'Programmer', cmd: 'D ^ZU', title: 'Programmer menu' },
  { label: 'FileMan', cmd: 'D Q^DI', title: 'VA FileMan Query' },
  { label: 'TaskMan', cmd: 'D ^ZTMCHK', title: 'TaskMan status check' },
  { label: 'Kernel', cmd: 'D ^XUP', title: 'Kernel menu' },
  { label: 'RPC List', cmd: 'D ^XWB2TEST', title: 'RPC Broker test' },
  { label: 'System', cmd: 'D ^%SS', title: 'System status' },
  { label: 'Lock Table', cmd: 'D ^ZTLCKM', title: 'Lock table manager' },
  { label: 'Error Trap', cmd: 'D ^XTER', title: 'Error trap viewer' },
];

interface VistaTerminalProps {
  onClose?: () => void;
  height?: number | string;
}

export default function VistaTerminal({ onClose, height = 420 }: VistaTerminalProps) {
  const termRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const terminalRef = useRef<InstanceType<typeof import('@xterm/xterm').Terminal> | null>(null);
  const fitAddonRef = useRef<InstanceType<typeof import('@xterm/addon-fit').FitAddon> | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const reconnectAttempts = useRef(0);

  const effectiveWsUrl =
    typeof window !== 'undefined'
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:3001/ws/console`
      : `${WS_BASE}/ws/console`;

  const connect = useCallback(async () => {
    if (!termRef.current) return;

    if (!TerminalClass) {
      const xtermMod = await import('@xterm/xterm');
      TerminalClass = xtermMod.Terminal;
    }
    if (!FitAddonClass) {
      const fitMod = await import('@xterm/addon-fit');
      FitAddonClass = fitMod.FitAddon;
    }

    if (!terminalRef.current) {
      const fitAddon = new FitAddonClass();
      fitAddonRef.current = fitAddon;

      const terminal = new TerminalClass({
        cursorBlink: true,
        fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
        fontSize: 13,
        lineHeight: 1.2,
        theme: {
          background: '#0a0e14',
          foreground: '#33ff33',
          cursor: '#33ff33',
          selectionBackground: '#1a4a1a',
          black: '#0a0e14',
          red: '#ff5555',
          green: '#33ff33',
          yellow: '#ffff55',
          blue: '#5555ff',
          magenta: '#ff55ff',
          cyan: '#55ffff',
          white: '#bbbbbb',
        },
      });
      terminal.loadAddon(fitAddon);
      terminal.open(termRef.current);
      fitAddon.fit();
      terminalRef.current = terminal;
    }

    setStatus('connecting');
    const ws = new WebSocket(effectiveWsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (evt) => {
      if (terminalRef.current && typeof evt.data === 'string') {
        terminalRef.current.write(evt.data);
      }
    };

    ws.onerror = () => setStatus('error');

    ws.onclose = () => {
      setStatus('disconnected');
      if (reconnectAttempts.current < 3) {
        reconnectAttempts.current++;
        setTimeout(() => connect(), 2000 * reconnectAttempts.current);
      }
    };

    terminalRef.current.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    });
  }, [effectiveWsUrl]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      terminalRef.current?.dispose();
      terminalRef.current = null;
    };
  }, [connect]);

  useEffect(() => {
    const onResize = () => fitAddonRef.current?.fit();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const sendCommand = (cmd: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(cmd + '\r');
    }
  };

  const statusColors: Record<ConnectionStatus, string> = {
    disconnected: '#ef4444',
    connecting: '#f59e0b',
    connected: '#22c55e',
    error: '#ef4444',
  };

  return (
    <div
      style={{
        background: '#0a0e14',
        borderRadius: 8,
        border: '1px solid #1e3a1e',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '6px 10px',
          background: '#0f1a0f',
          borderBottom: '1px solid #1e3a1e',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: statusColors[status],
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 11, color: '#33ff33', marginRight: 8, fontFamily: 'monospace' }}>
          VistA Terminal
        </span>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', flex: 1 }}>
          {QUICK_COMMANDS.map((qc) => (
            <button
              key={qc.cmd}
              onClick={() => sendCommand(qc.cmd)}
              title={qc.title}
              style={{
                padding: '2px 8px',
                fontSize: 10,
                fontFamily: 'monospace',
                background: '#1a2e1a',
                color: '#33ff33',
                border: '1px solid #2a4a2a',
                borderRadius: 3,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {qc.label}
            </button>
          ))}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: 16,
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Terminal area */}
      <div ref={termRef} style={{ height, minHeight: 200 }} />
    </div>
  );
}
