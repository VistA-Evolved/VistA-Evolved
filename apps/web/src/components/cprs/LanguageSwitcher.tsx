'use client';

/**
 * LanguageSwitcher -- Phase 132: Globe icon dropdown for locale selection.
 *
 * Renders in the CPRS header/toolbar area. Shows a globe icon with
 * the current locale code. Clicking reveals a dropdown with all
 * supported languages.
 */

import { useState, useRef, useEffect } from 'react';
import { useLocale } from '@/components/I18nProvider';
import { SUPPORTED_LOCALES, LOCALE_LABELS } from '@/lib/i18n';

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'transparent',
          border: '1px solid #555',
          borderRadius: 4,
          color: 'inherit',
          cursor: 'pointer',
          padding: '2px 8px',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
        title="Switch Language"
        aria-label="Switch Language"
      >
        <span style={{ fontSize: '14px' }}>🌐</span>
        <span>{locale.toUpperCase()}</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            minWidth: 140,
            zIndex: 9999,
            overflow: 'hidden',
          }}
        >
          {SUPPORTED_LOCALES.map((loc) => (
            <button
              key={loc}
              onClick={() => {
                setLocale(loc);
                setOpen(false);
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 14px',
                border: 'none',
                background: locale === loc ? '#e8f0fe' : 'transparent',
                color: '#333',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '13px',
                fontWeight: locale === loc ? 600 : 400,
              }}
            >
              {LOCALE_LABELS[loc]}
              {locale === loc && <span style={{ marginLeft: 6 }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
