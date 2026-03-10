import type { JSX } from 'react';

export function Nav({ showCta = true }: { showCta?: boolean }): JSX.Element {
  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 4rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
      <a href="/" style={{ color: 'white', fontSize: '1.5rem', fontWeight: 700, textDecoration: 'none' }}>
        VistA <span style={{ color: '#38bdf8' }}>Evolved</span>
      </a>
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
        <a href="/#features" style={{ color: '#94a3b8', textDecoration: 'none' }}>Features</a>
        <a href="/pricing" style={{ color: '#94a3b8', textDecoration: 'none' }}>Pricing</a>
        <a href="/#faq" style={{ color: '#94a3b8', textDecoration: 'none' }}>FAQ</a>
        <a href="/#contact" style={{ color: '#94a3b8', textDecoration: 'none' }}>Contact</a>
        {showCta && (
          <a href="/signup" style={{ background: '#2563eb', color: 'white', padding: '0.5rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
            Get Started
          </a>
        )}
      </div>
    </nav>
  );
}
