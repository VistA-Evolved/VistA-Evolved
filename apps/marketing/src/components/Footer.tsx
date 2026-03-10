import type { JSX } from 'react';

export function Footer(): JSX.Element {
  return (
    <footer id="contact" style={{ padding: '3rem 2rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
        <div>
          <div style={{ color: 'white', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
            VistA <span style={{ color: '#38bdf8' }}>Evolved</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Modern healthcare on proven foundations.
          </p>
        </div>
        <div>
          <div style={{ color: '#cbd5e1', fontWeight: 600, marginBottom: '0.75rem' }}>Product</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <a href="/#features" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem' }}>Features</a>
            <a href="/pricing" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem' }}>Pricing</a>
            <a href="/signup" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem' }}>Get Started</a>
            <a href="/#faq" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem' }}>FAQ</a>
          </div>
        </div>
        <div>
          <div style={{ color: '#cbd5e1', fontWeight: 600, marginBottom: '0.75rem' }}>Contact</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <a href="mailto:sales@vistaevolved.com" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem' }}>sales@vistaevolved.com</a>
            <a href="mailto:support@vistaevolved.com" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem' }}>support@vistaevolved.com</a>
          </div>
        </div>
        <div>
          <div style={{ color: '#cbd5e1', fontWeight: 600, marginBottom: '0.75rem' }}>Legal</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Privacy Policy</span>
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Terms of Service</span>
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>HIPAA Notice</span>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: '1200px', margin: '2rem auto 0', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
        <p style={{ color: '#475569', fontSize: '0.8rem' }}>
          &copy; {new Date().getFullYear()} VistA Evolved. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
