'use client';

/**
 * Contextual Help System
 *
 * Provides in-app help with:
 *   - Tooltips for any VistA field with FileMan metadata
 *   - Guided tours for module workflows
 *   - "Show in Terminal" button that opens the R&S equivalent
 *   - AI assistant integration point
 */

import { useState, type ReactNode } from 'react';

export interface HelpTopic {
  id: string;
  title: string;
  summary: string;
  rsCommand?: string;
  menuPath?: string;
  fileNumber?: number;
  fieldNumber?: number;
  relatedTopics?: string[];
  category: 'field' | 'workflow' | 'navigation' | 'concept';
}

export interface GuidedTourStep {
  target: string; // CSS selector
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  rsEquivalent?: string;
}

export interface GuidedTour {
  id: string;
  name: string;
  module: string;
  steps: GuidedTourStep[];
}

// --- Help Registry ---
// Modules register their help topics here at import time
const helpTopics = new Map<string, HelpTopic>();
const guidedTours = new Map<string, GuidedTour>();

export function registerHelpTopic(topic: HelpTopic) {
  helpTopics.set(topic.id, topic);
}

export function registerGuidedTour(tour: GuidedTour) {
  guidedTours.set(tour.id, tour);
}

export function getHelpTopic(id: string): HelpTopic | undefined {
  return helpTopics.get(id);
}

export function getAllToursForModule(module: string): GuidedTour[] {
  return Array.from(guidedTours.values()).filter(t => t.module === module);
}

// --- Tooltip Component ---
interface TooltipProps {
  topicId: string;
  children: ReactNode;
  onShowInTerminal?: (command: string) => void;
}

export function HelpTooltip({ topicId, children, onShowInTerminal }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const topic = helpTopics.get(topicId);

  if (!topic) return <>{children}</>;

  return (
    <span className="relative inline-block">
      <span
        className="cursor-help border-b border-dashed border-muted-foreground/50"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {children}
      </span>
      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-popover text-popover-foreground border rounded-lg shadow-lg text-xs">
          <div className="font-semibold mb-1">{topic.title}</div>
          <p className="text-muted-foreground mb-2">{topic.summary}</p>
          {topic.fileNumber && (
            <div className="text-muted-foreground/70">
              FileMan: File #{topic.fileNumber}
              {topic.fieldNumber ? `, Field #${topic.fieldNumber}` : ''}
            </div>
          )}
          {topic.menuPath && (
            <div className="text-muted-foreground/70 mt-1">
              Menu: {topic.menuPath}
            </div>
          )}
          {topic.rsCommand && onShowInTerminal && (
            <button
              className="mt-2 px-2 py-1 text-xs bg-secondary rounded hover:bg-secondary/80 w-full text-center"
              onClick={(e) => { e.stopPropagation(); onShowInTerminal(topic.rsCommand!); }}
            >
              Show in Terminal
            </button>
          )}
        </div>
      )}
    </span>
  );
}

// --- Tour Runner Component ---
interface TourRunnerProps {
  tourId: string;
  onComplete?: () => void;
  onShowInTerminal?: (command: string) => void;
}

export function TourRunner({ tourId, onComplete, onShowInTerminal }: TourRunnerProps) {
  const [step, setStep] = useState(0);
  const tour = guidedTours.get(tourId);

  if (!tour) return null;

  const current = tour.steps[step];
  const isLast = step === tour.steps.length - 1;

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-96 bg-card border rounded-xl shadow-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">{tour.name}</h3>
        <span className="text-xs text-muted-foreground">{step + 1} / {tour.steps.length}</span>
      </div>

      <div className="mb-3">
        <div className="font-medium text-sm mb-1">{current.title}</div>
        <p className="text-xs text-muted-foreground">{current.content}</p>
      </div>

      {current.rsEquivalent && (
        <div className="bg-muted rounded p-2 mb-3">
          <div className="text-xs text-muted-foreground mb-1">Roll &amp; Scroll equivalent:</div>
          <code className="text-xs font-mono">{current.rsEquivalent}</code>
          {onShowInTerminal && (
            <button
              className="ml-2 text-xs text-primary underline"
              onClick={() => onShowInTerminal(current.rsEquivalent!)}
            >
              Try it
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          className="text-xs px-3 py-1 rounded bg-secondary hover:bg-secondary/80"
          onClick={() => { if (step > 0) setStep(step - 1); }}
          disabled={step === 0}
        >
          Back
        </button>
        <div className="flex gap-2">
          <button
            className="text-xs px-3 py-1 rounded text-muted-foreground hover:text-foreground"
            onClick={onComplete}
          >
            Skip
          </button>
          <button
            className="text-xs px-3 py-1 rounded bg-primary text-primary-foreground"
            onClick={() => {
              if (isLast) onComplete?.();
              else setStep(step + 1);
            }}
          >
            {isLast ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Help Panel (side drawer) ---
interface HelpPanelProps {
  open: boolean;
  onClose: () => void;
  moduleId?: string;
  onShowInTerminal?: (command: string) => void;
  onStartTour?: (tourId: string) => void;
}

export function HelpPanel({ open, onClose, moduleId, onShowInTerminal, onStartTour }: HelpPanelProps) {
  const [search, setSearch] = useState('');

  const topics = Array.from(helpTopics.values())
    .filter(t => {
      if (search) return t.title.toLowerCase().includes(search.toLowerCase()) || t.summary.toLowerCase().includes(search.toLowerCase());
      return true;
    })
    .slice(0, 50);

  const tours = moduleId ? getAllToursForModule(moduleId) : Array.from(guidedTours.values());

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-background border-l shadow-2xl z-[90] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Help &amp; Training</h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg">&times;</button>
      </div>

      <div className="p-4">
        <input
          type="search"
          className="w-full px-3 py-2 text-sm border rounded"
          placeholder="Search help topics..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {tours.length > 0 && (
        <div className="px-4 pb-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Guided Tours</h3>
          <div className="space-y-2">
            {tours.map(tour => (
              <button
                key={tour.id}
                className="w-full text-left p-2 rounded bg-primary/10 hover:bg-primary/20 text-sm"
                onClick={() => onStartTour?.(tour.id)}
              >
                <div className="font-medium">{tour.name}</div>
                <div className="text-xs text-muted-foreground">{tour.steps.length} steps</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Topics</h3>
        {topics.map(topic => (
          <div key={topic.id} className="border rounded p-2">
            <div className="font-medium text-sm">{topic.title}</div>
            <p className="text-xs text-muted-foreground mt-1">{topic.summary}</p>
            {topic.rsCommand && onShowInTerminal && (
              <button
                className="mt-1 text-xs text-primary underline"
                onClick={() => onShowInTerminal(topic.rsCommand!)}
              >
                Show in Terminal
              </button>
            )}
          </div>
        ))}
        {topics.length === 0 && (
          <p className="text-sm text-muted-foreground">No help topics found.</p>
        )}
      </div>
    </div>
  );
}
