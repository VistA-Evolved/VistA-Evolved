'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MAIN_MENU } from '@/lib/menu-data';
import type { MenuItem } from '@/lib/chart-types';
import styles from './MenuBar.module.css';

interface MenuBarProps {
  dfn: string;
}

export default function MenuBar({ dfn }: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Dead-click audit: Phase 568 -- all interactions wired or labeled
  const DISABLED_RPC_MAP: Record<string, string> = {
    mnuFileEncounter: 'ORWPCE PCE4NOTE',
    mnuFileReview: 'ORWOR1 SIG',
    mnuFilePrint: 'ORWRP REPORT TEXT',
    mnuEditUndo: 'browser native',
    mnuEditRedo: 'browser native',
    mnuEditCut: 'browser native',
    mnuEditCopy: 'browser native',
    mnuEditPaste: 'browser native',
    mnuViewVisits: 'ORWCV VST',
    mnuInsurance: 'DG SENSITIVE RECORD ACCESS',
    mnuViewFlags: 'ORPRF HAS DGPF DATA',
    mnuViewReminders: 'ORQQPXRM REMINDERS APPLICABLE',
    mnuToolsGraphing: 'ORWGRPC ALLITEMS',
    mnuToolsOptions: 'ORWCH SAVESIZ',
    mnuHelpContents: 'static help content',
  };

  const PENDING_RPC_MAP: Record<string, string> = {
    'info:demographics': 'ORWPT PTINQ',
    fontSize: 'N/A (local preference)',
    about: 'N/A (static dialog)',
  };

  function handleAction(item: MenuItem) {
    setOpenMenu(null);
    if (!item.onClick) return;

    if (item.onClick.startsWith('tab:')) {
      const slug = item.onClick.replace('tab:', '');
      router.push(`/chart/${dfn}/${slug}`);
    } else if (item.onClick === 'selectPatient') {
      router.push('/patient-search');
    } else if (item.onClick === 'exit') {
      router.push('/');
    } else if (item.onClick === 'refresh') {
      window.location.reload();
    } else if (item.onClick === 'fontSize') {
      const size = item.tag ?? 10;
      document.documentElement.style.setProperty('--chart-font-size', `${size}px`);
    } else if (item.onClick === 'about') {
      window.alert(
        'VistA-Evolved CPRS Web Client\nSome features require additional configuration. See menu tooltips.'
      );
    } else {
      // No dead clicks -- show pending info for any unhandled action
      const rpc = PENDING_RPC_MAP[item.onClick] ?? 'unknown';
      window.alert(`Configuration required\nAction: ${item.onClick}\nTarget RPC: ${rpc}`);
    }
  }

  function renderItems(items: MenuItem[], depth: number = 0): React.ReactNode {
    return items
      .filter((item) => item.visible)
      .map((item) => {
        if (item.isSeparator) {
          return <div key={item.name} className={styles.separator} />;
        }

        const hasChildren = item.children.length > 0;

        return (
          <div key={item.name} className={styles.menuItemWrapper}>
            <button
              className={`${styles.menuItem} ${!item.enabled ? styles.disabled : ''}`}
              disabled={!item.enabled}
              title={
                !item.enabled
                  ? `Not yet configured${DISABLED_RPC_MAP[item.name] ? ' -- target: ' + DISABLED_RPC_MAP[item.name] : ''}`
                  : undefined
              }
              onClick={() => {
                if (!hasChildren) handleAction(item);
              }}
              onMouseEnter={() => {
                if (hasChildren && depth > 0) {
                  // submenu hover handled by CSS
                }
              }}
            >
              <span>{item.caption}</span>
              {item.shortcut && <span className={styles.shortcut}>{item.shortcut}</span>}
              {hasChildren && <span className={styles.arrow}>&#9656;</span>}
            </button>
            {hasChildren && (
              <div className={styles.submenu}>{renderItems(item.children, depth + 1)}</div>
            )}
          </div>
        );
      });
  }

  return (
    <div ref={barRef} className={styles.menuBar}>
      {MAIN_MENU.filter((m) => m.visible).map((menu) => (
        <div key={menu.name} className={styles.topItem}>
          <button
            className={`${styles.topButton} ${openMenu === menu.name ? styles.active : ''}`}
            onMouseDown={() => setOpenMenu(openMenu === menu.name ? null : menu.name)}
            onMouseEnter={() => {
              if (openMenu !== null) setOpenMenu(menu.name);
            }}
          >
            {menu.caption}
          </button>
          {openMenu === menu.name && menu.children.length > 0 && (
            <div className={styles.dropdown}>{renderItems(menu.children, 0)}</div>
          )}
        </div>
      ))}
    </div>
  );
}
