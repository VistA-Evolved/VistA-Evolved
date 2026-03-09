export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 4rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ color: 'white', fontSize: '1.5rem', fontWeight: 700 }}>
          VistA <span style={{ color: '#38bdf8' }}>Evolved</span>
        </div>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <a href="#features" style={{ color: '#94a3b8', textDecoration: 'none' }}>Features</a>
          <a href="/pricing" style={{ color: '#94a3b8', textDecoration: 'none' }}>Pricing</a>
          <a href="#contact" style={{ color: '#94a3b8', textDecoration: 'none' }}>Contact</a>
          <a href="/signup" style={{ background: '#2563eb', color: 'white', padding: '0.5rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
            Get Started
          </a>
        </div>
      </nav>

      <section style={{ textAlign: 'center', padding: '6rem 2rem 4rem' }}>
        <h1 style={{ color: 'white', fontSize: '3.5rem', fontWeight: 800, lineHeight: 1.1, maxWidth: '800px', margin: '0 auto 1.5rem' }}>
          The Modern EHR Built on{' '}
          <span style={{ color: '#38bdf8' }}>Proven VistA Clinical Logic</span>
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
          Enterprise-grade electronic health records for clinics, hospitals, and health systems.
          Real VistA RPC integration. No mock data. Production-ready.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <a href="/signup" style={{ background: '#2563eb', color: 'white', padding: '1rem 2.5rem', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '1.1rem' }}>
            Start Free Trial
          </a>
          <a href="#demo" style={{ background: 'transparent', color: 'white', padding: '1rem 2.5rem', borderRadius: '10px', textDecoration: 'none', fontWeight: 600, fontSize: '1.1rem', border: '2px solid #475569' }}>
            Watch Demo
          </a>
        </div>
      </section>

      <section id="features" style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ color: 'white', textAlign: 'center', fontSize: '2rem', marginBottom: '3rem' }}>
          Everything Your Organization Needs
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {[
            { title: 'Clinical Workflows', desc: 'Patient search, allergies, vitals, meds, notes, labs, orders, consults -- all backed by real VistA RPCs.' },
            { title: '12 Admin Domains', desc: 'Users, facilities, clinics, wards, pharmacy, lab, radiology, billing, inventory, workforce, quality, clinical apps.' },
            { title: 'Revenue Cycle Management', desc: '9-state claim lifecycle, X12 EDI 5010, PhilHealth eClaims, multi-country support.' },
            { title: 'Patient Portal', desc: '25+ pages with independent auth, kiosk mode, secure messaging, and identity-verified record access.' },
            { title: 'FHIR R4 Interoperability', desc: '9 US Core resources, HL7v2 engine, Bulk Data Access, FHIR Subscriptions.' },
            { title: 'Enterprise Security', desc: 'OIDC, RBAC, ABAC, MFA, hash-chained audit trails, PHI redaction, break-glass access.' },
          ].map((f, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ color: '#38bdf8', fontSize: '1.2rem', marginBottom: '0.75rem' }}>{f.title}</h3>
              <p style={{ color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="demo" style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ color: 'white', fontSize: '2rem', marginBottom: '1rem' }}>
          See VistA Evolved in Action
        </h2>
        <p style={{ color: '#94a3b8', marginBottom: '2rem', lineHeight: 1.6 }}>
          Schedule a personalized demo with our team. We will walk through clinical workflows,
          admin configuration, and how VistA Evolved integrates with your existing systems.
        </p>
        <a href="/signup" style={{ display: 'inline-block', background: '#2563eb', color: 'white', padding: '1rem 2.5rem', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '1.1rem' }}>
          Request a Demo
        </a>
      </section>

      <section id="contact" style={{ padding: '4rem 2rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <h2 style={{ color: 'white', fontSize: '1.75rem', marginBottom: '1rem' }}>
          Contact Us
        </h2>
        <p style={{ color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Questions about pricing, implementation, or technical requirements?
        </p>
        <div style={{ color: '#94a3b8', lineHeight: 2 }}>
          <div>Email: <a href="mailto:sales@vistaevolved.com" style={{ color: '#38bdf8', textDecoration: 'none' }}>sales@vistaevolved.com</a></div>
          <div>Support: <a href="mailto:support@vistaevolved.com" style={{ color: '#38bdf8', textDecoration: 'none' }}>support@vistaevolved.com</a></div>
        </div>
      </section>

      <footer style={{ padding: '2rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          VistA Evolved -- Modern healthcare on proven foundations
        </p>
      </footer>
    </div>
  );
}
