import { Nav } from '../components/Nav';
import { Footer } from '../components/Footer';

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      <Nav />

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

      {/* How It Works */}
      <section style={{ padding: '4rem 2rem', maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ color: 'white', textAlign: 'center', fontSize: '2rem', marginBottom: '3rem' }}>
          How It Works
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', textAlign: 'center' }}>
          {[
            { step: '1', title: 'Sign Up', desc: 'Choose your plan and tell us about your organization. Takes under 2 minutes.' },
            { step: '2', title: 'Configure', desc: 'We provision your tenant with modules tailored to your specialty and size.' },
            { step: '3', title: 'Connect VistA', desc: 'Point to your existing VistA instance or use our managed sandbox to get started.' },
            { step: '4', title: 'Go Live', desc: 'Train your staff, migrate data, and start delivering care with modern tools.' },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#2563eb', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.25rem', marginBottom: '1rem' }}>
                {s.step}
              </div>
              <h3 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '0.5rem' }}>{s.title}</h3>
              <p style={{ color: '#94a3b8', lineHeight: 1.6, margin: 0, fontSize: '0.95rem' }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: '4rem 2rem', maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ color: 'white', textAlign: 'center', fontSize: '2rem', marginBottom: '3rem' }}>
          Trusted by Healthcare Organizations
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {[
            { quote: 'Migrating from legacy CPRS to VistA Evolved gave our clinicians a modern interface without losing the clinical logic they trust.', author: 'Dr. Sarah Chen', role: 'CMIO, Regional Medical Center' },
            { quote: 'The multi-tenant architecture lets us onboard new clinics in hours instead of weeks. Revenue cycle management was a game-changer.', author: 'James Rivera', role: 'CTO, Pacific Health Network' },
            { quote: 'FHIR R4 interoperability and the patient portal finally connected our patients to their own health data securely.', author: 'Maria Santos', role: 'Director of IT, Metro Community Health' },
          ].map((t, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ color: '#cbd5e1', lineHeight: 1.7, margin: '0 0 1.5rem', fontStyle: 'italic' }}>
                &ldquo;{t.quote}&rdquo;
              </p>
              <div style={{ color: 'white', fontWeight: 600 }}>{t.author}</div>
              <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{t.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ color: 'white', textAlign: 'center', fontSize: '2rem', marginBottom: '3rem' }}>
          Frequently Asked Questions
        </h2>
        {[
          { q: 'What is VistA and why does it matter?', a: 'VistA (Veterans Information Systems and Technology Architecture) is a proven EHR system used by the VA to serve millions of patients. VistA Evolved modernizes the clinical logic with a web-based interface while keeping the battle-tested data engine.' },
          { q: 'Do I need an existing VistA instance?', a: 'No. VistA Evolved includes a managed sandbox for evaluation and testing. For production, you can connect to your existing VistA system or we can provision one for you.' },
          { q: 'Is VistA Evolved HIPAA compliant?', a: 'Yes. VistA Evolved includes hash-chained audit trails, PHI redaction, RBAC/ABAC access control, encrypted data at rest, and break-glass emergency access -- all designed for HIPAA compliance.' },
          { q: 'How does pricing work?', a: 'Plans are based on organization type and provider count. All plans include a 30-day free trial. See our pricing page for details.' },
          { q: 'Can I migrate from another EHR?', a: 'Yes. VistA Evolved supports FHIR R4 Bulk Data Import, HL7v2 message ingestion, and custom migration tooling. Our team assists with data migration planning.' },
          { q: 'What support is included?', a: 'All plans include email support. Professional and Enterprise plans include priority support with dedicated account managers and SLA guarantees.' },
        ].map((faq, i) => (
          <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '1.5rem 0' }}>
            <h3 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '0.75rem' }}>{faq.q}</h3>
            <p style={{ color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{faq.a}</p>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section id="demo" style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ color: 'white', fontSize: '2rem', marginBottom: '1rem' }}>
          Ready to Modernize Your EHR?
        </h2>
        <p style={{ color: '#94a3b8', marginBottom: '2rem', lineHeight: 1.6 }}>
          Start your 30-day free trial or schedule a personalized demo with our clinical informatics team.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/signup" style={{ background: '#2563eb', color: 'white', padding: '1rem 2.5rem', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '1.1rem' }}>
            Start Free Trial
          </a>
          <a href="mailto:sales@vistaevolved.com" style={{ background: 'transparent', color: 'white', padding: '1rem 2.5rem', borderRadius: '10px', textDecoration: 'none', fontWeight: 600, fontSize: '1.1rem', border: '2px solid #475569' }}>
            Request a Demo
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
