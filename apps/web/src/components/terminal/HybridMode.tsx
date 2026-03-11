'use client';

/**
 * Smart Hybrid Mode
 *
 * Split-screen view: left panel shows the Roll-and-Scroll terminal,
 * right panel shows detected prompts as modern form fields.
 * Edits sync both ways -- filling a form field sends the value to the
 * terminal, and terminal prompts appear as form fields.
 */

import { useState, useCallback, useRef } from 'react';
import { createStreamParser, formValueToTerminalInput, type ParsedPrompt } from '@/lib/rs-stream-parser';
import dynamic from 'next/dynamic';

const VistaSshTerminal = dynamic(
  () => import('./VistaSshTerminal'),
  { ssr: false, loading: () => <div className="animate-pulse p-4">Loading terminal...</div> }
);

interface HybridModeProps {
  onPromptDetected?: (prompt: ParsedPrompt) => void;
}

export default function HybridMode({ onPromptDetected }: HybridModeProps) {
  const [prompts, setPrompts] = useState<ParsedPrompt[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [connected, setConnected] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);
  const parserRef = useRef(createStreamParser());
  const sendToTerminal = useRef<((data: string) => void) | null>(null);

  const handleTerminalData = useCallback((data: string) => {
    const newPrompts = parserRef.current.feed(data);
    if (newPrompts.length > 0) {
      setPrompts(prev => [...prev, ...newPrompts].slice(-50));
      newPrompts.forEach(p => onPromptDetected?.(p));
    }
  }, [onPromptDetected]);

  const handleFormSubmit = useCallback((promptId: string, value: string) => {
    const prompt = prompts.find(p => p.id === promptId);
    if (!prompt) return;

    const termInput = formValueToTerminalInput(prompt, value);
    sendToTerminal.current?.(termInput);

    setFormValues(prev => ({ ...prev, [promptId]: value }));
  }, [prompts]);

  const handleConnectionChange = useCallback((conn: boolean) => {
    setConnected(conn);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-muted border-b">
        <h2 className="font-semibold text-sm">Hybrid Mode</h2>
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-muted-foreground">{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <div className="flex-1" />
        <button
          className="text-xs px-2 py-1 rounded bg-secondary hover:bg-secondary/80"
          onClick={() => setShowTerminal(!showTerminal)}
        >
          {showTerminal ? 'Hide Terminal' : 'Show Terminal'}
        </button>
        <button
          className="text-xs px-2 py-1 rounded bg-secondary hover:bg-secondary/80"
          onClick={() => { setPrompts([]); setFormValues({}); parserRef.current.reset(); }}
        >
          Clear Form
        </button>
      </div>

      {/* Split view */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Terminal */}
        {showTerminal && (
          <div className="w-1/2 border-r min-h-0">
            <VistaSshTerminal
              showToolbar={false}
              theme="dark"
              onConnectionChange={handleConnectionChange}
              onOutput={handleTerminalData}
              sendRef={sendToTerminal}
            />
          </div>
        )}

        {/* Right: Form Fields */}
        <div className={`${showTerminal ? 'w-1/2' : 'w-full'} overflow-y-auto p-4 space-y-4`}>
          <div className="text-sm text-muted-foreground mb-2">
            {prompts.length === 0
              ? 'Waiting for terminal prompts... Navigate the terminal to see prompts appear as form fields.'
              : `${prompts.length} prompt(s) detected`}
          </div>

          {prompts.map((prompt) => (
            <div key={prompt.id} className="border rounded-lg p-3 space-y-2 bg-card">
              <label className="block text-sm font-medium">
                {prompt.label}
                {prompt.required && <span className="text-red-500 ml-1">*</span>}
              </label>

              {prompt.helpText && (
                <p className="text-xs text-muted-foreground">{prompt.helpText}</p>
              )}

              {prompt.type === 'yes-no' ? (
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => handleFormSubmit(prompt.id, 'Y')}
                  >
                    Yes
                  </button>
                  <button
                    className="px-3 py-1 text-sm rounded bg-secondary hover:bg-secondary/80"
                    onClick={() => handleFormSubmit(prompt.id, 'N')}
                  >
                    No
                  </button>
                </div>
              ) : prompt.type === 'date' ? (
                <input
                  type="date"
                  className="block w-full px-3 py-1.5 text-sm border rounded"
                  defaultValue={prompt.defaultValue}
                  onChange={(e) => setFormValues(prev => ({ ...prev, [prompt.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleFormSubmit(prompt.id, formValues[prompt.id] || '')}
                />
              ) : prompt.type === 'pointer-lookup' ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-1.5 text-sm border rounded"
                    placeholder={`Search ${prompt.label}...`}
                    defaultValue={prompt.defaultValue}
                    onChange={(e) => setFormValues(prev => ({ ...prev, [prompt.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleFormSubmit(prompt.id, formValues[prompt.id] || '')}
                  />
                  <button
                    className="px-3 py-1 text-sm rounded bg-primary text-primary-foreground"
                    onClick={() => handleFormSubmit(prompt.id, formValues[prompt.id] || '')}
                  >
                    Submit
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type={prompt.type === 'numeric' ? 'number' : 'text'}
                    className="flex-1 px-3 py-1.5 text-sm border rounded"
                    defaultValue={prompt.defaultValue}
                    placeholder={`Enter ${prompt.label.toLowerCase()}`}
                    onChange={(e) => setFormValues(prev => ({ ...prev, [prompt.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleFormSubmit(prompt.id, formValues[prompt.id] || '')}
                  />
                  <button
                    className="px-3 py-1 text-sm rounded bg-primary text-primary-foreground"
                    onClick={() => handleFormSubmit(prompt.id, formValues[prompt.id] || '')}
                  >
                    Submit
                  </button>
                </div>
              )}

              {formValues[prompt.id] && (
                <div className="text-xs text-green-600">
                  Submitted: {formValues[prompt.id]}
                </div>
              )}

              <div className="text-xs text-muted-foreground font-mono">
                Raw: {prompt.rawLine}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
