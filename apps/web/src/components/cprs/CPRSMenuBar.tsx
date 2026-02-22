'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cleanCaption, sanitizeLabel } from '@/lib/contracts/loader';
import { useCPRSUI } from '@/stores/cprs-ui-state';
import { usePatient } from '@/stores/patient-context';
import { useSession } from '@/stores/session-context';
import styles from './cprs.module.css';

/* ------------------------------------------------------------------ */
/* Canonical menu structure (CPRS fFrame-derived)                      */
/* ------------------------------------------------------------------ */

interface MenuAction {
  label: string;
  shortcut?: string;
  action: string;
  enabled?: boolean;
  children?: MenuAction[];
  separator?: boolean;
}

function buildMenus(): Record<string, MenuAction[]> {
  return {
    File: [
      { label: 'Select Patient...', shortcut: 'Ctrl+O', action: 'selectPatient' },
      { label: 'Refresh Patient Data', shortcut: 'F5', action: 'refresh' },
      { separator: true, label: '', action: '' },
      { label: 'Inbox / Notifications', shortcut: 'Ctrl+I', action: 'inbox' },
      { label: 'Order Sets...', action: 'orderSets' },
      { separator: true, label: '', action: '' },
      { label: 'Print...', shortcut: 'Ctrl+P', action: 'print' },
      { label: 'Print Setup...', action: 'printSetup' },
      { separator: true, label: '', action: '' },
      { label: 'Sign Out', action: 'signOut' },
      { label: 'Exit', action: 'exit' },
    ],
    Edit: [
      { label: 'Copy', shortcut: 'Ctrl+C', action: 'copy' },
      { label: 'Paste', shortcut: 'Ctrl+V', action: 'paste' },
      { separator: true, label: '', action: '' },
      { label: 'Preferences...', action: 'preferences' },
    ],
    View: [
      {
        label: 'Chart Tab', action: 'chartTab', children: [
          { label: 'Cover Sheet', shortcut: 'Shift+S', action: 'tab:cover' },
          { label: 'Problem List', shortcut: 'Shift+P', action: 'tab:problems' },
          { label: 'Medications', shortcut: 'Shift+M', action: 'tab:meds' },
          { label: 'Orders', shortcut: 'Shift+O', action: 'tab:orders' },
          { label: 'Progress Notes', shortcut: 'Shift+N', action: 'tab:notes' },
          { label: 'Consults', shortcut: 'Shift+T', action: 'tab:consults' },
          { label: 'Surgery', shortcut: 'Shift+U', action: 'tab:surgery' },
          { label: 'Discharge Summaries', shortcut: 'Shift+D', action: 'tab:dcsumm' },
          { label: 'Laboratory', shortcut: 'Shift+L', action: 'tab:labs' },
          { label: 'Reports', shortcut: 'Shift+R', action: 'tab:reports' },
        ]
      },
      { separator: true, label: '', action: '' },
      { label: 'Theme: Light', action: 'theme:light' },
      { label: 'Theme: Dark', action: 'theme:dark' },
      { separator: true, label: '', action: '' },
      { label: 'Density: Comfortable', action: 'density:comfortable' },
      { label: 'Density: Compact', action: 'density:compact' },
      { label: 'Density: Balanced', action: 'density:balanced' },
      { label: 'Density: Dense', action: 'density:dense' },
      { separator: true, label: '', action: '' },
      { label: 'Layout: Classic CPRS', action: 'layout:cprs' },
      { label: 'Layout: Modern', action: 'layout:modern' },
    ],
    Tools: [
      { label: 'Graphing...', action: 'graphing' },
      { label: 'Legacy Console', action: 'legacyConsole' },
      { separator: true, label: '', action: '' },
      { label: 'Inpatient Operations', action: 'inpatient' },
      { label: 'Nursing Documentation', action: 'nursing' },
      { separator: true, label: '', action: '' },
      { label: 'Remote Data Viewer (Page)', action: 'remoteDataPage' },
      { label: 'Remote Data Viewer (Modal)', action: 'remoteData' },
    ],
    Help: [
      { label: 'Keyboard Shortcuts', shortcut: 'F1', action: 'keyboardShortcuts' },
      { separator: true, label: '', action: '' },
      { label: 'About', action: 'about' },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function CPRSMenuBar({ dfn }: { dfn?: string }) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { updatePreferences, openModal } = useCPRSUI();
  const patient = usePatient();
  const { logout } = useSession();
  const menus = buildMenus();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleAction(action: string) {
    setOpenMenu(null);
    const currentDfn = dfn || patient.dfn || '1';

    if (action.startsWith('tab:')) {
      const slug = action.replace('tab:', '');
      router.push(`/cprs/chart/${currentDfn}/${slug}`);
    } else if (action === 'selectPatient') {
      router.push('/cprs/patient-search');
    } else if (action === 'refresh') {
      window.location.reload();
    } else if (action === 'exit') {
      router.push('/cprs/login');
    } else if (action === 'signOut') {
      logout().then(() => router.push('/cprs/login'));
    } else if (action === 'inbox') {
      router.push('/cprs/inbox');
    } else if (action === 'orderSets') {
      router.push('/cprs/order-sets');
    } else if (action === 'preferences') {
      router.push('/cprs/settings/preferences');
    } else if (action === 'print') {
      openModal('print');
    } else if (action === 'printSetup') {
      openModal('printSetup');
    } else if (action === 'copy') {
      // Copy selected text to clipboard (modern API with legacy fallback)
      const sel = window.getSelection()?.toString();
      if (sel && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(sel);
      } else {
        document.execCommand('copy');
      }
    } else if (action === 'paste') {
      // Paste clipboard text into the currently focused input/textarea
      if (navigator.clipboard?.readText) {
        navigator.clipboard.readText().then((text) => {
          const el = document.activeElement;
          if (el && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
            const start = el.selectionStart ?? el.value.length;
            const end = el.selectionEnd ?? el.value.length;
            el.setRangeText(text, start, end, 'end');
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
        });
      }
    } else if (action.startsWith('theme:')) {
      const theme = action.replace('theme:', '') as 'light' | 'dark';
      updatePreferences({ theme });
    } else if (action.startsWith('density:')) {
      const density = action.replace('density:', '') as 'comfortable' | 'compact' | 'balanced' | 'dense';
      updatePreferences({ density });
    } else if (action.startsWith('layout:')) {
      const layoutMode = action.replace('layout:', '') as 'cprs' | 'modern';
      updatePreferences({ layoutMode });
    } else if (action === 'graphing') {
      openModal('graphing');
    } else if (action === 'legacyConsole') {
      openModal('legacyConsole');
    } else if (action === 'remoteData') {
      openModal('remoteData');
    } else if (action === 'remoteDataPage') {
      router.push('/cprs/remote-data-viewer');
    } else if (action === 'inpatient') {
      router.push('/cprs/inpatient');
    } else if (action === 'nursing') {
      router.push('/cprs/nursing');
    } else if (action === 'keyboardShortcuts') {
      openModal('keyboardShortcuts');
    } else if (action === 'about') {
      openModal('about');
    }
  }

  function renderItems(items: MenuAction[]): React.ReactNode {
    return items.map((item, i) => {
      if (item.separator) {
        return <div key={`sep-${i}`} className={styles.menuSeparator} />;
      }
      const hasChildren = item.children && item.children.length > 0;
      const label = sanitizeLabel(cleanCaption(item.label));
      return (
        <div key={item.action} className={hasChildren ? styles.submenuWrapper : undefined}>
          <button
            className={`${styles.menuItem} ${item.enabled === false ? styles.disabled : ''}`}
            onClick={() => { if (!hasChildren) handleAction(item.action); }}
            disabled={item.enabled === false}
          >
            <span>{label}</span>
            {item.shortcut && <span className={styles.shortcut}>{item.shortcut}</span>}
            {hasChildren && <span className={styles.arrow}>&#9656;</span>}
          </button>
          {hasChildren && (
            <div className={styles.submenu}>{renderItems(item.children!)}</div>
          )}
        </div>
      );
    });
  }

  const menuNames = Object.keys(menus);

  return (
    <div className={styles.menuBar} ref={barRef}>
      {menuNames.map((name) => (
        <div key={name} style={{ position: 'relative' }}>
          <button
            className={`${styles.menuTrigger} ${openMenu === name ? styles.open : ''}`}
            onClick={() => setOpenMenu(openMenu === name ? null : name)}
            onMouseEnter={() => { if (openMenu) setOpenMenu(name); }}
          >
            {name}
          </button>
          {openMenu === name && (
            <div className={styles.menuDropdown}>
              {renderItems(menus[name])}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
