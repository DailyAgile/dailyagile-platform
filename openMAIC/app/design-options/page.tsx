'use client';

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  darkGray: '#1E293B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  green: '#16a34a',
  red: '#dc2626',
};

export default function DesignOptionsPage() {
  return (
    <div style={{ minHeight: '100vh', background: BRAND_COLORS.light, padding: '40px 20px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ color: BRAND_COLORS.navy, fontSize: '32px', marginBottom: '10px' }}>
          ILT Design Options Comparison
        </h1>
        <p style={{ color: BRAND_COLORS.gray, marginBottom: '40px', fontSize: '16px' }}>
          Hub page (categories) + Category detail page (courses)
        </p>

        {/* HUB PAGE SECTION */}
        <div style={{ marginBottom: '60px' }}>
          <h2 style={{ color: BRAND_COLORS.navy, fontSize: '24px', fontWeight: '700', marginBottom: '30px', paddingBottom: '12px', borderBottom: `2px solid ${BRAND_COLORS.teal}` }}>
            Hub Page (/ilt) — How to Display 6 Categories
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
            {/* Option A */}
            <div style={{ background: BRAND_COLORS.white, borderRadius: '12px', padding: '24px', border: `1px solid ${BRAND_COLORS.border}` }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: BRAND_COLORS.navy, marginBottom: '16px', paddingBottom: '8px', borderBottom: `2px solid ${BRAND_COLORS.orange}` }}>
                Option A: Simple Text Links
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {['Artificial Intelligence', 'Scrum Alliance', 'Project Management', 'Scaled Agile (SAFe)', 'Cyber Security', 'Six Sigma'].map((cat) => (
                  <div
                    key={cat}
                    style={{
                      padding: '14px 16px',
                      background: BRAND_COLORS.light,
                      border: `1px solid ${BRAND_COLORS.border}`,
                      borderRadius: '8px',
                      color: BRAND_COLORS.navy,
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = BRAND_COLORS.teal;
                      e.currentTarget.style.color = BRAND_COLORS.white;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = BRAND_COLORS.light;
                      e.currentTarget.style.color = BRAND_COLORS.navy;
                    }}
                  >
                    {cat}
                  </div>
                ))}
              </div>

              <div style={{ background: BRAND_COLORS.light, padding: '16px', borderRadius: '8px', marginTop: '16px', fontSize: '13px' }}>
                <div style={{ color: BRAND_COLORS.green, marginBottom: '8px' }}>✅ Minimal, fast to load</div>
                <div style={{ color: BRAND_COLORS.green, marginBottom: '8px' }}>✅ Clean, no distractions</div>
                <div style={{ color: BRAND_COLORS.red, marginBottom: '8px' }}>❌ Not visual, feels bare</div>
                <div style={{ color: BRAND_COLORS.red }}>❌ Hard to scan 6 options</div>
              </div>
            </div>

            {/* Option B */}
            <div style={{ background: BRAND_COLORS.white, borderRadius: '12px', padding: '24px', border: `1px solid ${BRAND_COLORS.border}` }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: BRAND_COLORS.navy, marginBottom: '16px', paddingBottom: '8px', borderBottom: `2px solid ${BRAND_COLORS.orange}` }}>
                Option B: Cards with Icons
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                {[
                  { icon: '🤖', name: 'AI' },
                  { icon: '🎯', name: 'Scrum' },
                  { icon: '📊', name: 'PM' },
                  { icon: '📈', name: 'SAFe' },
                  { icon: '🔒', name: 'Security' },
                  { icon: '⚙️', name: 'Six Sigma' },
                ].map((cat) => (
                  <div
                    key={cat.name}
                    style={{
                      padding: '20px',
                      background: `linear-gradient(135deg, ${BRAND_COLORS.teal} 0%, #0a7a94 100%)`,
                      color: BRAND_COLORS.white,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontWeight: '700',
                      fontSize: '14px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 16px rgba(8, 145, 178, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ fontSize: '32px' }}>{cat.icon}</div>
                    <div>{cat.name}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: BRAND_COLORS.light, padding: '16px', borderRadius: '8px', fontSize: '13px' }}>
                <div style={{ color: BRAND_COLORS.green, marginBottom: '8px' }}>✅ Visual, easy to scan</div>
                <div style={{ color: BRAND_COLORS.green, marginBottom: '8px' }}>✅ Icons help memory</div>
                <div style={{ color: BRAND_COLORS.green, marginBottom: '8px' }}>✅ Inviting, modern feel</div>
                <div style={{ color: BRAND_COLORS.red }}>❌ Slightly slower to load</div>
              </div>
            </div>
          </div>
        </div>

        {/* CATEGORY PAGE SECTION */}
        <div style={{ marginBottom: '60px' }}>
          <h2 style={{ color: BRAND_COLORS.navy, fontSize: '24px', fontWeight: '700', marginBottom: '30px', paddingBottom: '12px', borderBottom: `2px solid ${BRAND_COLORS.teal}` }}>
            Category Detail Page (/ilt/[category]) — How to Display ~20 Courses
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            {/* List View */}
            <div style={{ background: BRAND_COLORS.white, borderRadius: '12px', padding: '24px', border: `1px solid ${BRAND_COLORS.border}` }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: BRAND_COLORS.navy, marginBottom: '16px', paddingBottom: '8px', borderBottom: `2px solid ${BRAND_COLORS.orange}` }}>
                List View with Pagination
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ background: BRAND_COLORS.light, borderBottom: `2px solid ${BRAND_COLORS.border}` }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: BRAND_COLORS.navy, fontSize: '12px' }}>Course</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: BRAND_COLORS.navy, fontSize: '12px' }}>Instructor</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: BRAND_COLORS.navy, fontSize: '12px' }}>Rating</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: BRAND_COLORS.navy, fontSize: '12px' }}>Price</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: BRAND_COLORS.navy, fontSize: '12px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'AI for Business', instructor: 'Sarah Chen', rating: '4.9/5', price: '£299' },
                    { name: 'AI Engineer Bootcamp', instructor: 'Marcus Johnson', rating: '4.8/5', price: '£599' },
                    { name: 'Prompt Engineering', instructor: 'Jennifer Park', rating: '4.7/5', price: '£149' },
                    { name: 'Advanced AI Systems', instructor: 'David Kumar', rating: '4.9/5', price: '£649' },
                    { name: 'AI Ethics & Governance', instructor: 'Lisa Wong', rating: '4.6/5', price: '£199' },
                  ].map((course, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${BRAND_COLORS.border}`, background: idx % 2 === 0 ? BRAND_COLORS.white : BRAND_COLORS.light }}>
                      <td style={{ padding: '12px', fontWeight: '700', color: BRAND_COLORS.navy }}>{course.name}</td>
                      <td style={{ padding: '12px', color: BRAND_COLORS.darkGray }}>{course.instructor}</td>
                      <td style={{ padding: '12px', color: BRAND_COLORS.orange, fontWeight: '600' }}>⭐ {course.rating}</td>
                      <td style={{ padding: '12px', fontWeight: '700', color: BRAND_COLORS.teal }}>{course.price}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button style={{ background: BRAND_COLORS.teal, color: BRAND_COLORS.white, border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', padding: '12px 0', borderTop: `1px solid ${BRAND_COLORS.border}` }}>
                {[1, 2, 3, 4].map((p) => (
                  <button
                    key={p}
                    style={{
                      width: '36px',
                      height: '36px',
                      border: `1px solid ${BRAND_COLORS.border}`,
                      background: p === 1 ? BRAND_COLORS.teal : BRAND_COLORS.white,
                      color: p === 1 ? BRAND_COLORS.white : BRAND_COLORS.navy,
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div style={{ background: BRAND_COLORS.light, padding: '16px', borderRadius: '8px', marginTop: '16px', fontSize: '13px' }}>
                <div style={{ color: BRAND_COLORS.green, marginBottom: '8px' }}>✅ Compact, shows 10 courses at once</div>
                <div style={{ color: BRAND_COLORS.green, marginBottom: '8px' }}>✅ Easy to compare side-by-side</div>
                <div style={{ color: BRAND_COLORS.green, marginBottom: '8px' }}>✅ Fast to load (pagination)</div>
                <div style={{ color: BRAND_COLORS.red, marginBottom: '8px' }}>❌ Requires clicking through pages</div>
                <div style={{ color: BRAND_COLORS.red }}>❌ Less visual, more text-heavy</div>
              </div>
            </div>

            {/* Card Grid */}
            <div style={{ background: BRAND_COLORS.white, borderRadius: '12px', padding: '24px', border: `1px solid ${BRAND_COLORS.border}` }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: BRAND_COLORS.navy, marginBottom: '16px', paddingBottom: '8px', borderBottom: `2px solid ${BRAND_COLORS.orange}` }}>
                Card Grid (3 columns)
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '16px' }}>
                {[
                  { emoji: '👥', name: 'AI for Business', instructor: 'Sarah Chen', rating: '4.9/5', price: '£299' },
                  { emoji: '🚀', name: 'AI Engineer Bootcamp', instructor: 'Marcus Johnson', rating: '4.8/5', price: '£599' },
                  { emoji: '⚡', name: 'Prompt Engineering', instructor: 'Jennifer Park', rating: '4.7/5', price: '£149' },
                ].map((course, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: BRAND_COLORS.white,
                      border: `2px solid ${BRAND_COLORS.teal}`,
                      borderRadius: '12px',
                      padding: '16px',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 12px 24px rgba(8, 145, 178, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>{course.emoji}</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: BRAND_COLORS.navy, marginBottom: '4px' }}>
                      {course.name}
                    </div>
                    <div style={{ fontSize: '12px', color: BRAND_COLORS.gray, marginBottom: '12px' }}>
                      Led by {course.instructor}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: `1px solid ${BRAND_COLORS.border}` }}>
                      <div style={{ fontSize: '12px', color: BRAND_COLORS.orange, fontWeight: '600' }}>⭐ {course.rating}</div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: BRAND_COLORS.teal }}>{course.price}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', padding: '12px 0', borderTop: `1px solid ${BRAND_COLORS.border}`, marginBottom: '16px' }}>
                {[1, 2, 3, 4].map((p) => (
                  <button
                    key={p}
                    style={{
                      width: '36px',
                      height: '36px',
                      border: `1px solid ${BRAND_COLORS.border}`,
                      background: p === 1 ? BRAND_COLORS.teal : BRAND_COLORS.white,
                      color: p === 1 ? BRAND_COLORS.white : BRAND_COLORS.navy,
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div style={{ background: BRAND_COLORS.light, padding: '16px', borderRadius: '8px', fontSize: '13px' }}>
                <div style={{ color: BRAND_COLORS.green, marginBottom: '8px' }}>✅ Visual, inviting, modern feel</div>
                <div style={{ color: BRAND_COLORS.green, marginBottom: '8px' }}>✅ Cards are scannable</div>
                <div style={{ color: BRAND_COLORS.green, marginBottom: '8px' }}>✅ Hover effects engaging</div>
                <div style={{ color: BRAND_COLORS.red, marginBottom: '8px' }}>❌ Uses more vertical space</div>
                <div style={{ color: BRAND_COLORS.red }}>❌ Slightly slower to load</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendation */}
        <div style={{ background: BRAND_COLORS.white, padding: '24px', borderRadius: '12px', borderLeft: `4px solid ${BRAND_COLORS.orange}`, marginBottom: '40px' }}>
          <h3 style={{ color: BRAND_COLORS.navy, marginBottom: '12px', fontSize: '16px', fontWeight: '700' }}>
            💡 My Recommendation (30-Year UX Veteran)
          </h3>
          <p style={{ color: BRAND_COLORS.darkGray, marginBottom: '12px', fontSize: '14px' }}>
            <strong>Hub Page:</strong> Option B (Cards with Icons) — visual, scans fast, inviting. Don't skimp on the entry point.
          </p>
          <p style={{ color: BRAND_COLORS.darkGray, fontSize: '14px' }}>
            <strong>Category Page:</strong> List View with Pagination — compact, performant, easy to scan 100 courses across 10 pages. Users know list view = browsing mode.
          </p>
        </div>
      </div>
    </div>
  );
}
