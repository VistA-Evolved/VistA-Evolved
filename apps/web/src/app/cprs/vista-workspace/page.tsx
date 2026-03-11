'use client';

/**
 * VistA Workspace -- Unified Three-Mode Interface
 *
 * Combines:
 *   1. Modern GUI -- React-based panels per VistA module
 *   2. Hybrid Mode -- Split terminal + form fields
 *   3. Pure Terminal -- Full Roll-and-Scroll SSH terminal
 *
 * Plus contextual help, guided tours, and module navigation.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { HelpPanel, TourRunner } from '@/components/help/ContextualHelp';
import '@/components/help/tier1-help-content';
import {
  VISTA_PANEL_REGISTRY,
  CATEGORIES,
  type VistaPanelEntry,
} from '@/lib/vista-panel-registry';

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://127.0.0.1:3001';

const VistaSshTerminal = dynamic(
  () => import('@/components/terminal/VistaSshTerminal'),
  { ssr: false, loading: () => <div className="animate-pulse p-8 text-center">Loading terminal...</div> }
);

const HybridMode = dynamic(
  () => import('@/components/terminal/HybridMode'),
  { ssr: false, loading: () => <div className="animate-pulse p-8 text-center">Loading hybrid mode...</div> }
);

type ViewMode = 'gui' | 'hybrid' | 'terminal';

const MODE_LABELS: Record<ViewMode, string> = {
  gui: 'Modern GUI',
  hybrid: 'Hybrid',
  terminal: 'Terminal',
};

interface PatientEntry {
  dfn: string;
  name: string;
}

export default function VistaWorkspacePage() {
  const [mode, setMode] = useState<ViewMode>('gui');
  const [selectedModule, setSelectedModule] = useState<VistaPanelEntry>(VISTA_PANEL_REGISTRY[0]);
  const [helpOpen, setHelpOpen] = useState(false);
  const [activeTour, setActiveTour] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tierFilter, setTierFilter] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [patientDfn, setPatientDfn] = useState('46');
  const [patientName, setPatientName] = useState('');
  const [patients, setPatients] = useState<PatientEntry[]>([]);
  const [patientPickerOpen, setPatientPickerOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/vista/default-patient-list`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.results) {
          setPatients(d.results);
          const match = d.results.find((p: PatientEntry) => p.dfn === patientDfn);
          if (match) setPatientName(match.name);
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleShowInTerminal = useCallback((_command: string) => {
    setMode('terminal');
  }, []);

  const filteredModules = useMemo(() => {
    let mods = VISTA_PANEL_REGISTRY;
    if (tierFilter) mods = mods.filter(m => m.tier === tierFilter);
    if (search) {
      const q = search.toLowerCase();
      mods = mods.filter(m => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q));
    }
    return mods;
  }, [tierFilter, search]);

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar - Module Navigation */}
      {sidebarOpen && (
        <aside className="w-72 border-r bg-muted/30 flex flex-col">
          <div className="p-4 border-b">
            <h1 className="font-bold text-lg">VistA Workspace</h1>
            <p className="text-xs text-muted-foreground mt-1">{VISTA_PANEL_REGISTRY.length} Packages &middot; All Modes</p>
            <input
              type="text"
              placeholder="Search modules..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="mt-2 w-full px-2 py-1 text-xs border rounded bg-background"
            />
            <div className="flex gap-1 mt-2">
              <button
                className={`px-2 py-0.5 text-xs rounded ${!tierFilter ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}
                onClick={() => setTierFilter(null)}
              >All</button>
              {[1,2,3,4,5].map(t => (
                <button
                  key={t}
                  className={`px-2 py-0.5 text-xs rounded ${tierFilter === t ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}
                  onClick={() => setTierFilter(t)}
                >T{t}</button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {CATEGORIES.map(cat => {
              const catMods = filteredModules.filter(m => m.category === cat);
              if (catMods.length === 0) return null;
              return (
                <div key={cat}>
                  <div className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {cat} ({catMods.length})
                  </div>
                  {catMods.map(mod => (
                    <button
                      key={mod.id}
                      className={`w-full text-left px-4 py-1.5 text-sm hover:bg-muted/50 transition-colors flex items-center gap-2 ${
                        selectedModule.id === mod.id ? 'bg-primary/10 text-primary font-medium' : ''
                      }`}
                      onClick={() => setSelectedModule(mod)}
                    >
                      <span className="w-10 text-xs font-mono text-muted-foreground">{mod.id.toUpperCase()}</span>
                      <span className="truncate flex-1">{mod.name}</span>
                      <span className="text-xs text-muted-foreground">T{mod.tier}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          <div className="p-3 border-t text-xs text-muted-foreground">
            Showing {filteredModules.length} / {VISTA_PANEL_REGISTRY.length} packages
          </div>
        </aside>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 py-2 border-b bg-card">
          <button
            className="text-sm px-2 py-1 hover:bg-muted rounded"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? '\u25C0' : '\u25B6'}
          </button>

          <div className="font-semibold">
            {selectedModule.id.toUpperCase()}: {selectedModule.name}
          </div>

          <div className="flex items-center gap-2 ml-4 relative">
            <span className="text-xs text-muted-foreground">Patient:</span>
            <button
              onClick={() => setPatientPickerOpen(!patientPickerOpen)}
              className="text-xs px-2 py-1 border rounded bg-background hover:bg-muted flex items-center gap-1 min-w-[180px]"
            >
              <span className="font-mono">{patientDfn}</span>
              {patientName && <span className="truncate text-muted-foreground">- {patientName}</span>}
              <span className="ml-auto">&#x25BC;</span>
            </button>
            {patientPickerOpen && (
              <div className="absolute top-full left-0 mt-1 w-72 max-h-60 overflow-y-auto bg-popover border rounded-lg shadow-lg z-50">
                {patients.map(p => (
                  <button
                    key={p.dfn}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${
                      p.dfn === patientDfn ? 'bg-primary/10 font-medium' : ''
                    }`}
                    onClick={() => {
                      setPatientDfn(p.dfn);
                      setPatientName(p.name);
                      setPatientPickerOpen(false);
                    }}
                  >
                    <span className="font-mono mr-2">{p.dfn}</span>
                    {p.name}
                  </button>
                ))}
                {patients.length === 0 && (
                  <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                    Login required to load patient list
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Mode toggle */}
          <div className="flex rounded-lg border overflow-hidden">
            {(['gui', 'hybrid', 'terminal'] as ViewMode[]).map(m => (
              <button
                key={m}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  mode === m ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
                onClick={() => setMode(m)}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>

          <button
            className="text-xs px-3 py-1 rounded border hover:bg-muted"
            onClick={() => setHelpOpen(!helpOpen)}
          >
            Help
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 min-h-0 relative">
          {mode === 'gui' && (
            <div className="h-full overflow-y-auto p-6">
              <ModuleGUI module={selectedModule} dfn={patientDfn} onShowInTerminal={handleShowInTerminal} />
            </div>
          )}

          {mode === 'hybrid' && (
            <HybridMode />
          )}

          {mode === 'terminal' && (
            <VistaSshTerminal theme="dark" />
          )}
        </main>
      </div>

      {/* Help panel */}
      <HelpPanel
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        moduleId={selectedModule.id}
        onShowInTerminal={handleShowInTerminal}
        onStartTour={(id) => { setActiveTour(id); setHelpOpen(false); }}
      />

      {/* Tour runner */}
      {activeTour && (
        <TourRunner
          tourId={activeTour}
          onComplete={() => setActiveTour(null)}
          onShowInTerminal={handleShowInTerminal}
        />
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PANEL_LOADERS: Record<string, React.ComponentType<any>> = {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDynamicPanel(moduleId: string): React.ComponentType<any> {
  if (!PANEL_LOADERS[moduleId]) {
    const entry = VISTA_PANEL_REGISTRY.find(p => p.id === moduleId);
    if (!entry) {
      PANEL_LOADERS[moduleId] = () => <div className="p-8 text-muted-foreground">Unknown module: {moduleId}</div>;
    } else {
      PANEL_LOADERS[moduleId] = dynamic(
        () => import(`@/components/vista/${moduleId}/${entry.component}`).catch(() => ({
          default: () => (
            <div className="p-8 text-center text-muted-foreground">
              Panel for {entry.name} ({entry.id.toUpperCase()}) loading failed. Check component exists.
            </div>
          ),
        })),
        {
          ssr: false,
          loading: () => <div className="animate-pulse p-8 text-center">Loading {entry.name} panel...</div>,
        }
      );
    }
  }
  return PANEL_LOADERS[moduleId];
}

function ModuleGUI({ module, dfn, onShowInTerminal }: { module: VistaPanelEntry; dfn: string; onShowInTerminal: (cmd: string) => void }) {
  const PanelComponent = getDynamicPanel(module.id);

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{module.name}</h2>
          <p className="text-muted-foreground text-sm">
            {module.id.toUpperCase()} &middot; Tier {module.tier} &middot; {module.category}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="px-3 py-1.5 text-xs rounded border hover:bg-muted"
            onClick={() => onShowInTerminal(`D ^${module.id.toUpperCase()}MENU`)}
          >
            Open in R&amp;S Terminal
          </button>
          <a
            href={`/docs/modules/${module.id}/README.md`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 text-xs rounded border hover:bg-muted"
          >
            Documentation
          </a>
        </div>
      </div>

      <PanelComponent dfn={dfn} />
    </div>
  );
}
