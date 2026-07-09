'use client';

import Link from 'next/link';

export default function HomePage() {
  const primaryColor = '#0f172a'; // slate-900
  const accentColor = '#0891b2'; // cyan-600
  const ctaColor = '#ea580c'; // orange-600
  const lightBg = '#f0f9ff'; // blue-50

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: '1rem',
        }}
      >
        <div
          style={{
            maxWidth: '80rem',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingLeft: '1rem',
            paddingRight: '1rem',
          }}
        >
          <div>
            <img src="assets/dailyagile_logo.png" alt="DailyAgile" style={{ height: '48px', width: 'auto' }} />
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <a href="#features" style={{ color: accentColor, fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none' }}>
              Why Us
            </a>
            <a href="#pricing" style={{ color: accentColor, fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none' }}>
              Pricing
            </a>
            <a href="#reviews" style={{ color: accentColor, fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none' }}>
              Reviews
            </a>
            <a
              href="#pricing"
              style={{
                background: `linear-gradient(to right, ${accentColor}, ${ctaColor})`,
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: 'bold',
                textDecoration: 'none',
              }}
            >
              Get Started
            </a>
            <Link
              href="/auth/login"
              style={{
                backgroundColor: primaryColor,
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: 'bold',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              🧪 Test Platform
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ background: `linear-gradient(135deg, ${lightBg}, #ecfdf5, #cffafe)`, padding: '5rem 1rem' }}>
        <div style={{ maxWidth: '56rem', margin: '0 auto', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-block',
              background: `linear-gradient(to right, ${accentColor}, ${ctaColor})`,
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '9999px',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              marginBottom: '1.5rem',
            }}
          >
            ✨ Trusted by 800+ Professionals
          </div>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 'bold', color: primaryColor, marginBottom: '1.5rem', fontFamily: 'Cambria, serif' }}>
            Accelerate Business Agility
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#374151', marginBottom: '2rem', maxWidth: '42rem', margin: '0 auto 2rem' }}>
            Master AI and Agile skills in real-time. Learn theory in minutes, apply insights immediately. Get certified and credibility that employers actually recognize.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="#pricing"
              style={{
                backgroundColor: ctaColor,
                color: 'white',
                padding: '0.75rem 2rem',
                borderRadius: '9999px',
                fontWeight: 'bold',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Explore Courses
            </a>
            <a
              href="#reviews"
              style={{
                border: `2px solid ${primaryColor}`,
                color: primaryColor,
                padding: '0.75rem 2rem',
                borderRadius: '9999px',
                fontWeight: 'bold',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              See What Others Say
            </a>
          </div>

          {/* Hero Images */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '3rem' }}>
            <div style={{ borderRadius: '0.75rem', overflow: 'hidden', height: '256px', backgroundColor: '#e5e7eb' }}>
              <img src="assets/hero-professionals.png" alt="Professionals Learning" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ borderRadius: '0.75rem', overflow: 'hidden', height: '256px', backgroundColor: '#e5e7eb' }}>
              <img src="assets/hero-robots.png" alt="AI Robots Teaching" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section style={{ backgroundColor: '#ffffff', padding: '4rem 1rem', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginBottom: '3rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.25rem', fontWeight: 'bold', color: accentColor, marginBottom: '0.5rem' }}>800+</div>
              <p style={{ color: '#374151' }}>Professionals Trained</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>⭐⭐⭐⭐⭐</div>
              <p style={{ color: '#374151' }}>5-Star Rating</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.25rem', fontWeight: 'bold', color: accentColor, marginBottom: '0.5rem' }}>100%</div>
              <p style={{ color: '#374151' }}>Learn at Your Pace</p>
            </div>
          </div>

          {/* Student Avatars */}
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: primaryColor, textAlign: 'center', marginBottom: '2rem', fontFamily: 'Cambria, serif' }}>
            Meet Our Certified Professionals
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '0.75rem', marginBottom: '3rem', justifyItems: 'center' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <div
                key={i}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid white',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  backgroundColor: '#e5e7eb',
                }}
              >
                <img src={`assets/student-${i}.png`} alt={`Student ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>

          {/* Testimonials */}
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: primaryColor, textAlign: 'center', marginBottom: '1.5rem', fontFamily: 'Cambria, serif' }}>
            What Students Are Saying
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {[
              { quote: '"Applied the prompt engineering techniques in our sprint planning. Team productivity jumped 40% in two weeks. Game-changer."', name: 'Sarah Chen', title: 'Product Manager, TechCorp' },
              { quote: '"Built a RAG pipeline using what I learned. Now the entire data team uses it. Best investment in my professional development."', name: 'Marcus Johnson', title: 'Senior Engineer, DataFlow Inc' },
              { quote: '"My manager noticed the change immediately. Got promoted within 3 months. The Agile + AI combo is exactly what leadership needed."', name: 'Jennifer Park', title: 'Scrum Master, CloudFirst' },
            ].map((testimonial, i) => (
              <div
                key={i}
                style={{
                  background: `linear-gradient(135deg, ${lightBg}, #ecfdf5)`,
                  padding: '1.5rem',
                  borderRadius: '0.5rem',
                  borderTop: `4px solid ${accentColor}`,
                }}
              >
                <div style={{ color: ctaColor, marginBottom: '0.5rem' }}>⭐⭐⭐⭐⭐</div>
                <p style={{ color: '#374151', fontStyle: 'italic', marginBottom: '1rem' }}>{testimonial.quote}</p>
                <p style={{ fontWeight: 'bold', color: primaryColor }}>{testimonial.name}</p>
                <p style={{ fontSize: '0.875rem', color: '#4b5563' }}>{testimonial.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ background: `linear-gradient(to bottom, ${lightBg}, white)`, padding: '4rem 1rem' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: primaryColor, textAlign: 'center', marginBottom: '1rem', fontFamily: 'Cambria, serif' }}>
            Why Choose DailyAgile?
          </h2>
          <p style={{ textAlign: 'center', color: '#374151', marginBottom: '3rem', maxWidth: '42rem', margin: '0 auto 3rem' }}>
            Self-paced learning with real outcomes. From theory to practice in days, not months.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {[
              { icon: '🎯', title: 'Real-World Use Cases', desc: 'Learn frameworks you can apply immediately.' },
              { icon: '🏆', title: 'Credly Certificates', desc: 'Earn verified badges employers recognize.' },
              { icon: '🚀', title: 'Interactive AI Classroom', desc: 'Learn from multiple AI experts.' },
              { icon: '🔍', title: '15-Min Free Preview', desc: 'See the full module outline. No credit card.' },
              { icon: '⏱️', title: 'Learn at Your Pace', desc: 'Lifetime access. Your schedule, your speed.' },
              { icon: '💼', title: 'Proven Results', desc: '800+ professionals transformed their careers.' },
            ].map((feature, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: 'white',
                  padding: '1.5rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{feature.icon}</div>
                <h3 style={{ fontWeight: 'bold', color: primaryColor, marginBottom: '0.5rem' }}>{feature.title}</h3>
                <p style={{ fontSize: '0.875rem', color: '#374151' }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ backgroundColor: 'white', padding: '4rem 1rem' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: primaryColor, textAlign: 'center', marginBottom: '1rem', fontFamily: 'Cambria, serif' }}>
            Simple, Transparent Pricing
          </h2>
          <p style={{ textAlign: 'center', color: '#374151', marginBottom: '3rem' }}>
            Choose the track that fits your goals. All courses include lifetime access and Credly badge.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {[
              { title: 'Track A: Business', subtitle: 'For non-technical professionals', price: '£299', modules: '6 modules' },
              { title: 'Track B: Engineering', subtitle: 'For developers & technical teams', price: '£599', modules: '8 modules + labs', featured: true },
              { title: 'Full Bundle', subtitle: 'Both tracks + bonus', price: '£799', modules: 'Save £99' },
            ].map((plan, i) => (
              <div
                key={i}
                style={{
                  padding: '1.5rem',
                  borderRadius: '0.5rem',
                  border: `2px solid ${plan.featured ? ctaColor : '#e5e7eb'}`,
                  backgroundColor: plan.featured ? '#fef3c7' : 'white',
                  transform: plan.featured ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                {plan.featured && (
                  <div
                    style={{
                      textAlign: 'center',
                      marginBottom: '0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      color: 'white',
                      backgroundColor: ctaColor,
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      display: 'inline-block',
                      width: '100%',
                    }}
                  >
                    ⭐ POPULAR
                  </div>
                )}
                <h3 style={{ fontWeight: 'bold', color: primaryColor, marginBottom: '0.25rem' }}>{plan.title}</h3>
                <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.75rem' }}>{plan.subtitle}</p>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', background: `linear-gradient(to right, ${accentColor}, ${ctaColor})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.25rem' }}>
                  {plan.price}
                </div>
                <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '1rem' }}>{plan.modules}</p>
                <button
                  style={{
                    width: '100%',
                    backgroundColor: ctaColor,
                    color: 'white',
                    padding: '0.5rem',
                    borderRadius: '9999px',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Start Learning
                </button>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '3rem', padding: '1.5rem', backgroundColor: lightBg, borderRadius: '0.5rem', maxWidth: '42rem', margin: '3rem auto 0' }}>
            <p style={{ color: '#374151' }}>
              💡 <strong>Try Before You Buy:</strong> Preview the first 15 minutes of any course for free. No credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section
        style={{
          background: `linear-gradient(to right, ${primaryColor}, ${accentColor}, #06b6d4)`,
          color: 'white',
          padding: '4rem 1rem',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '42rem', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '1rem', fontFamily: 'Cambria, serif' }}>
            Ready to Accelerate Your Career?
          </h2>
          <p style={{ marginBottom: '2rem', fontSize: '1.125rem' }}>
            Join 800+ professionals who transformed their skills and got promoted.
          </p>
          <a
            href="#pricing"
            style={{
              display: 'inline-block',
              backgroundColor: ctaColor,
              color: 'white',
              padding: '0.75rem 2rem',
              borderRadius: '9999px',
              fontWeight: 'bold',
              textDecoration: 'none',
            }}
          >
            Explore Pricing
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: `linear-gradient(to right, ${primaryColor}, #1e293b)`, color: 'white', padding: '2rem 1rem', textAlign: 'center', fontSize: '0.875rem' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
            <a href="#pricing" style={{ color: '#22d3ee', textDecoration: 'none' }}>
              Pricing
            </a>
            <a href="#features" style={{ color: '#22d3ee', textDecoration: 'none' }}>
              Features
            </a>
            <a href="#reviews" style={{ color: '#22d3ee', textDecoration: 'none' }}>
              Reviews
            </a>
            <a href="mailto:support@dailyagile.com" style={{ color: '#22d3ee', textDecoration: 'none' }}>
              Contact
            </a>
          </div>
          <p>© 2026 DailyAgile. All rights reserved. | Accelerate Business Agility</p>
        </div>
      </footer>
    </div>
  );
}
