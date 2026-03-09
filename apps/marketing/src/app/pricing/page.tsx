'use client';

const tiers = [
  {
    name: 'Starter',
    entity: 'Solo / Small Clinic',
    price: '$99 - 299',
    period: '/month',
    features: [
      'Up to 5 providers',
      'Clinical workflows (CPRS)',
      'Patient scheduling',
      'Patient portal',
      'Analytics dashboard',
      'Email support',
    ],
    cta: 'Start Free Trial',
    highlight: false,
  },
  {
    name: 'Professional',
    entity: 'Multi-Location Practice',
    price: '$499 - 999',
    period: '/month',
    features: [
      'Up to 50 providers',
      'Everything in Starter',
      'Revenue cycle management',
      'FHIR R4 interoperability',
      'Telehealth integration',
      'AI-assisted intake',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    highlight: true,
  },
  {
    name: 'Specialty',
    entity: 'Specialty Center / ASC',
    price: '$399 - 799',
    period: '/month',
    features: [
      'Up to 25 providers',
      'Everything in Starter',
      'PACS/Imaging integration',
      'Revenue cycle management',
      'Procedure-focused workflows',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    highlight: false,
  },
  {
    name: 'Enterprise',
    entity: 'Hospital / Medical Center',
    price: '$2,000 - 5,000',
    period: '/month',
    features: [
      'Up to 500 providers',
      'Everything in Professional',
      'PACS/Imaging integration',
      'Multi-department support',
      'Identity & access management',
      'Custom FHIR profiles',
      'Dedicated support manager',
    ],
    cta: 'Contact Sales',
    highlight: false,
  },
  {
    name: 'Health System',
    entity: 'Multi-Facility Network',
    price: 'Custom',
    period: '',
    features: [
      'Unlimited providers',
      'Everything in Enterprise',
      'Multi-facility data sharing',
      'Health information exchange',
      'Custom integrations',
      'On-premise deployment option',
      'SLA guarantee',
    ],
    cta: 'Contact Sales',
    highlight: false,
  },
];

const addOns = [
  { name: 'Additional Users', price: '$5 - 15/user/month' },
  { name: 'Additional Clinics', price: '$25 - 50/clinic/month' },
  { name: 'PhilHealth eClaims Module', price: '$199/month' },
  { name: 'AI Clinical Support', price: '$299/month' },
  { name: 'Advanced FHIR Interop', price: '$499/month' },
  { name: 'Telehealth Premium', price: '$149/month' },
];

export default function PricingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 4rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <a href="/" style={{ color: 'white', fontSize: '1.5rem', fontWeight: 700, textDecoration: 'none' }}>
          VistA <span style={{ color: '#38bdf8' }}>Evolved</span>
        </a>
        <a href="/signup" style={{ background: '#2563eb', color: 'white', padding: '0.5rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
          Get Started
        </a>
      </nav>

      <section style={{ textAlign: 'center', padding: '4rem 2rem 2rem' }}>
        <h1 style={{ color: 'white', fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>
          Simple, Transparent Pricing
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto' }}>
          Choose the plan that matches your organization. All plans include a 30-day free trial.
        </p>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {tiers.map((tier, i) => (
          <div key={i} style={{
            background: tier.highlight ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.05)',
            borderRadius: '16px',
            padding: '2rem',
            border: tier.highlight ? '2px solid #2563eb' : '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ color: '#38bdf8', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              {tier.entity}
            </div>
            <h3 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem' }}>{tier.name}</h3>
            <div style={{ color: 'white', fontSize: '2rem', fontWeight: 800, marginBottom: '1.5rem' }}>
              {tier.price}<span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 400 }}>{tier.period}</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', flex: 1 }}>
              {tier.features.map((f, j) => (
                <li key={j} style={{ color: '#cbd5e1', padding: '0.4rem 0', fontSize: '0.95rem' }}>
                  &#10003; {f}
                </li>
              ))}
            </ul>
            <a href={tier.cta.includes('Contact') ? '/#contact' : '/signup'} style={{
              background: tier.highlight ? '#2563eb' : 'rgba(255,255,255,0.1)',
              color: 'white',
              padding: '0.75rem',
              borderRadius: '8px',
              textDecoration: 'none',
              textAlign: 'center',
              fontWeight: 600,
            }}>
              {tier.cta}
            </a>
          </div>
        ))}
      </section>

      <section style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ color: 'white', textAlign: 'center', fontSize: '1.75rem', marginBottom: '2rem' }}>Add-On Modules</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {addOns.map((a, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: '#cbd5e1', fontWeight: 600, marginBottom: '0.25rem' }}>{a.name}</div>
              <div style={{ color: '#38bdf8', fontWeight: 700 }}>{a.price}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '2rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>All prices in USD. Volume discounts available for health systems.</p>
      </section>
    </div>
  );
}
