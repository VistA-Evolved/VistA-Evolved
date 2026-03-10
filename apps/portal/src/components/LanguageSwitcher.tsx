'use client';

/**
 * LanguageSwitcher -- Phase 132: Compact locale selector for the portal.
 *
 * Shows a globe icon + current language code. Click to expand dropdown.
 * Used in the portal nav sidebar footer.
 */

import { useState, useRef, useEffect } from 'react';
import { useLocale } from '@/components/I18nProvider';
import { SUPPORTED_LOCALES, LOCALE_LABELS } from '@/lib/i18n';

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'transparent',
          border: '1px solid #475569',
          borderRadius: 6,
          color: '#94a3b8',
          cursor: 'pointer',
          padding: '6px 12px',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          width: '100%',
        }}
        title="Switch Language"
        aria-label="Switch Language"
      >
        <span style={{ fontSize: '16px' }}>🌐</span>
        <span>{LOCALE_LABELS[locale]}</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            marginBottom: 4,
            background: '#1e293b',
            border: '1px solid #475569',
            borderRadius: 6,
            overflow: 'hidden',
            zIndex: 9999,
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
                padding: '8px 12px',
                border: 'none',
                background: locale === loc ? '#334155' : 'transparent',
                color: locale === loc ? '#f1f5f9' : '#94a3b8',
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
