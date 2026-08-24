'use client';

import Link from 'next/link';

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  light: '#F0F7FA',
};

interface Subject {
  id: string;
  name: string;
  description: string;
  icon: string;
  price: string;
  status: 'Live' | 'Planned';
}

const SUBJECTS: Subject[] = [
  {
    id: 'ai-business',
    name: 'AI for Business Professionals',
    description: 'Learn AI fundamentals for business roles',
    icon: '💼',
    price: '£49–£299',
    status: 'Live',
  },
  {
    id: 'ai-engineer',
    name: 'AI Engineer Course',
    description: 'Production-ready AI engineering skills',
    icon: '💻',
    price: '£399–£599',
    status: 'Live',
  },
  {
    id: 'mlops',
    name: 'MLOps/Operations',
    description: 'Deploy and operate AI/ML systems',
    icon: '⚙️',
    price: '£299–£499',
    status: 'Live',
  },
  {
    id: 'project-management',
    name: 'Project Management with AI',
    description: 'AI tools for project delivery',
    icon: '📊',
    price: 'Coming Soon',
    status: 'Planned',
  },
  {
    id: 'cyber-security',
    name: 'Cyber Security with AI',
    description: 'AI applications in cybersecurity',
    icon: '🔐',
    price: 'Coming Soon',
    status: 'Planned',
  },
  {
    id: 'data-governance',
    name: 'AI Data Governance',
    description: 'Data governance and compliance with AI',
    icon: '📋',
    price: 'Coming Soon',
    status: 'Planned',
  },
];

export default function SelfPacedPage() {
  return (
    <div style={{ minHeight: '100vh', background: BRAND_COLORS.light, padding: '40px 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Link
          href="/academy"
          style={{
            display: 'inline-block',
            marginBottom: '20px',
            color: BRAND_COLORS.teal,
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          ← Back to Academy
        </Link>

        <h1
          style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: BRAND_COLORS.navy,
            marginBottom: '12px',
          }}
        >
          📚 Self-Paced Courses
        </h1>
        <p
          style={{
            fontSize: '16px',
            color: BRAND_COLORS.gray,
            marginBottom: '40px',
          }}
        >
          Learn at your own pace with our comprehensive course catalog across multiple subjects.
        </p>

        {/* Subjects Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '24px',
          }}
        >
          {SUBJECTS.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SubjectCard({ subject }: { subject: Subject }) {
  const isLive = subject.status === 'Live';

  return (
    <div
      style={{
        background: BRAND_COLORS.white,
        borderRadius: '12px',
        border: `1px solid ${BRAND_COLORS.border}`,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s',
        opacity: isLive ? 1 : 0.7,
        cursor: isLive ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => {
        if (isLive) {
          e.currentTarget.style.borderColor = BRAND_COLORS.teal;
          e.currentTarget.style.boxShadow = `0 12px 24px rgba(8, 145, 178, 0.1)`;
          e.currentTarget.style.transform = 'translateY(-4px)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = BRAND_COLORS.border;
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div
        style={{
          fontSize: '36px',
          marginBottom: '12px',
        }}
      >
        {subject.icon}
      </div>

      <h3
        style={{
          fontSize: '18px',
          fontWeight: '600',
          color: BRAND_COLORS.navy,
          margin: '0 0 8px 0',
        }}
      >
        {subject.name}
      </h3>

      <p
        style={{
          fontSize: '14px',
          color: BRAND_COLORS.gray,
          margin: '0 0 16px 0',
          flex: 1,
          lineHeight: '1.6',
        }}
      >
        {subject.description}
      </p>

      <div
        style={{
          borderTop: `1px solid ${BRAND_COLORS.border}`,
          paddingTop: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: '600',
              color: BRAND_COLORS.teal,
            }}
          >
            {subject.price}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: BRAND_COLORS.gray,
              marginTop: '4px',
            }}
          >
            {subject.status === 'Live' ? (
              <span style={{ color: '#16a34a' }}>● Live</span>
            ) : (
              <span style={{ color: BRAND_COLORS.gray }}>● Coming Soon</span>
            )}
          </div>
        </div>
        {isLive && (
          <div
            style={{
              color: BRAND_COLORS.teal,
              fontSize: '20px',
            }}
          >
            →
          </div>
        )}
      </div>
    </div>
  );
}
