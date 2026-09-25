'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <img
              src="/assets/dailyagile_logo.png"
              alt="DailyAgile"
              className="h-12 w-auto"
            />
          </div>
          <nav className="flex items-center gap-6">
            <a href="#features" className="text-teal-600 hover:text-orange-600 text-sm font-medium">
              Why Us
            </a>
            <a href="#pricing" className="text-teal-600 hover:text-orange-600 text-sm font-medium">
              Pricing
            </a>
            <a href="#reviews" className="text-teal-600 hover:text-orange-600 text-sm font-medium">
              Reviews
            </a>
            <a
              href="#pricing"
              className="bg-gradient-to-r from-teal-600 to-orange-600 text-white px-4 py-2 rounded-full text-sm font-bold hover:shadow-lg transition"
            >
              Get Started
            </a>
            <Link
              href="/classroom"
              className="bg-navy-700 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-navy-800 transition"
            >
              🧪 Test Platform
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-gradient-to-r from-teal-600 to-orange-600 text-white px-4 py-2 rounded-full text-sm font-bold mb-6">
            ✨ Trusted by 800+ Professionals
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-navy-700 mb-6" style={{ fontFamily: 'Cambria, serif' }}>
            Accelerate Business Agility
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Master AI and Agile skills in real-time. Learn theory in minutes, apply insights immediately. Get certified and credibility that employers actually recognize.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="#pricing"
              className="bg-orange-600 text-white px-8 py-3 rounded-3xl font-bold hover:bg-orange-700 transition"
            >
              Explore Courses
            </a>
            <a
              href="#reviews"
              className="border-2 border-navy-700 text-navy-700 px-8 py-3 rounded-3xl font-bold hover:bg-navy-700 hover:text-white transition"
            >
              See What Others Say
            </a>
          </div>

          {/* Hero Images */}
          <div className="grid grid-cols-2 gap-6 mt-12">
            <div className="rounded-xl overflow-hidden h-64 bg-gray-200">
              <img
                src="/assets/hero-professionals.png"
                alt="Professionals Learning"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="rounded-xl overflow-hidden h-64 bg-gray-200">
              <img
                src="/assets/hero-robots.png"
                alt="AI Robots Teaching"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="bg-white px-4 py-16 border-t border-gray-200">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="text-4xl font-bold text-teal-600 mb-2">800+</div>
              <p className="text-gray-700">Professionals Trained</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">⭐⭐⭐⭐⭐</div>
              <p className="text-gray-700">5-Star Rating</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-teal-600 mb-2">100%</div>
              <p className="text-gray-700">Learn at Your Pace</p>
            </div>
          </div>

          {/* Student Avatars */}
          <h2 className="text-2xl font-bold text-navy-700 text-center mb-8" style={{ fontFamily: 'Cambria, serif' }}>
            Meet Our Certified Professionals
          </h2>
          <div className="grid grid-cols-12 gap-3 mb-12 justify-items-center">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <div key={i} className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-md bg-gray-200">
                <img
                  src={`/assets/student-${i}.png`}
                  alt={`Student ${i}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>

          {/* Testimonials */}
          <h2 className="text-2xl font-bold text-navy-700 text-center mb-8" style={{ fontFamily: 'Cambria, serif' }}>
            What Students Are Saying
          </h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-lg border-t-4 border-teal-600">
              <div className="text-orange-600 mb-2">⭐⭐⭐⭐⭐</div>
              <p className="text-gray-700 italic mb-4">
                "Applied the prompt engineering techniques in our sprint planning. Team productivity jumped 40% in two weeks. Game-changer."
              </p>
              <p className="font-bold text-navy-700">Sarah Chen</p>
              <p className="text-sm text-gray-600">Product Manager, TechCorp</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-lg border-t-4 border-teal-600">
              <div className="text-orange-600 mb-2">⭐⭐⭐⭐⭐</div>
              <p className="text-gray-700 italic mb-4">
                "Built a RAG pipeline using what I learned. Now the entire data team uses it. Best investment in my professional development."
              </p>
              <p className="font-bold text-navy-700">Marcus Johnson</p>
              <p className="text-sm text-gray-600">Senior Engineer, DataFlow Inc</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-lg border-t-4 border-teal-600">
              <div className="text-orange-600 mb-2">⭐⭐⭐⭐⭐</div>
              <p className="text-gray-700 italic mb-4">
                "My manager noticed the change immediately. Got promoted within 3 months. The Agile + AI combo is exactly what leadership needed."
              </p>
              <p className="font-bold text-navy-700">Jennifer Park</p>
              <p className="text-sm text-gray-600">Scrum Master, CloudFirst</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-gradient-to-b from-blue-50 to-white px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-navy-700 text-center mb-4" style={{ fontFamily: 'Cambria, serif' }}>
            Why Choose DailyAgile?
          </h2>
          <p className="text-center text-gray-700 mb-12 max-w-2xl mx-auto">
            Self-paced learning with real outcomes. From theory to practice in days, not months.
          </p>

          <div className="grid grid-cols-3 gap-6">
            {[
              { icon: '🎯', title: 'Real-World Use Cases', desc: 'Learn frameworks you can apply immediately.' },
              { icon: '🏆', title: 'Credly Certificates', desc: 'Earn verified badges employers recognize.' },
              { icon: '🚀', title: 'Interactive AI Classroom', desc: 'Learn from multiple AI experts.' },
              { icon: '🔍', title: '15-Min Free Preview', desc: 'See the full module outline. No credit card.' },
              { icon: '⏱️', title: 'Learn at Your Pace', desc: 'Lifetime access. Your schedule, your speed.' },
              { icon: '💼', title: 'Proven Results', desc: '800+ professionals transformed their careers.' },
            ].map((feature, i) => (
              <div key={i} className="bg-white p-6 rounded-lg border border-gray-200 hover:border-teal-600 hover:shadow-lg transition text-center">
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="font-bold text-navy-700 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-700">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-white px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-navy-700 text-center mb-4" style={{ fontFamily: 'Cambria, serif' }}>
            Simple, Transparent Pricing
          </h2>
          <p className="text-center text-gray-700 mb-12">
            Choose the track that fits your goals. All courses include lifetime access and Credly badge.
          </p>

          <div className="grid grid-cols-3 gap-6">
            {[
              { title: 'Track A: Business', subtitle: 'For non-technical professionals', price: '£299', modules: '6 modules' },
              { title: 'Track B: Engineering', subtitle: 'For developers & technical teams', price: '£599', modules: '8 modules + labs', featured: true },
              { title: 'Full Bundle', subtitle: 'Both tracks + bonus', price: '£799', modules: 'Save £99' },
            ].map((card, i) => (
              <div
                key={i}
                className={`p-6 rounded-lg border-2 transition ${
                  card.featured
                    ? 'border-orange-600 bg-gradient-to-br from-white to-orange-50 scale-105'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {card.featured && (
                  <div className="text-center mb-3 text-xs font-bold text-white bg-orange-600 px-3 py-1 rounded-full inline-block w-full">
                    ⭐ POPULAR
                  </div>
                )}
                <h3 className="font-bold text-navy-700 mb-1">{card.title}</h3>
                <p className="text-sm text-gray-700 mb-3">{card.subtitle}</p>
                <div className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-orange-600 bg-clip-text text-transparent mb-1">
                  {card.price}
                </div>
                <p className="text-sm text-gray-700 mb-4">{card.modules}</p>
                <button className="w-full bg-orange-600 text-white py-2 rounded-3xl font-bold hover:bg-orange-700 transition">
                  Start Learning
                </button>
              </div>
            ))}
          </div>

          <div className="text-center mt-12 p-6 bg-blue-50 rounded-lg max-w-2xl mx-auto">
            <p className="text-gray-700">
              💡 <strong>Try Before You Buy:</strong> Preview the first 15 minutes of any course for free. No credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-navy-700 via-teal-600 to-teal-500 text-white px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Cambria, serif' }}>
            Ready to Accelerate Your Career?
          </h2>
          <p className="mb-8 text-lg">
            Join 800+ professionals who transformed their skills and got promoted.
          </p>
          <a
            href="#pricing"
            className="inline-block bg-orange-600 text-white px-8 py-3 rounded-3xl font-bold hover:bg-orange-700 transition"
          >
            Explore Pricing
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-navy-700 to-navy-800 text-white px-4 py-8">
        <div className="max-w-6xl mx-auto text-center text-sm">
          <div className="flex justify-center gap-6 mb-4">
            <a href="#pricing" className="text-teal-400 hover:text-orange-400">Pricing</a>
            <a href="#features" className="text-teal-400 hover:text-orange-400">Features</a>
            <a href="#reviews" className="text-teal-400 hover:text-orange-400">Reviews</a>
            <a href="mailto:support@dailyagile.com" className="text-teal-400 hover:text-orange-400">Contact</a>
          </div>
          <p>&copy; 2026 DailyAgile. All rights reserved. | Accelerate Business Agility</p>
        </div>
      </footer>
    </div>
  );
}
