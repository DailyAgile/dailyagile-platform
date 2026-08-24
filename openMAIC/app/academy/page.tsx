'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Settings, User } from 'lucide-react';

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

interface UserInfo {
  email: string;
  role: 'instructor' | 'student' | null;
  name?: string;
}

export default function AcademyPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      try {
        // Check for instructor token
        const instructorToken =
          typeof window !== 'undefined'
            ? localStorage.getItem('instructorToken') ||
              localStorage.getItem('token') ||
              localStorage.getItem('auth_token')
            : null;

        const studentToken =
          typeof window !== 'undefined' ? localStorage.getItem('studentToken') : null;

        if (instructorToken) {
          setUser({
            email: localStorage.getItem('instructorEmail') || 'instructor@dailyagile.com',
            role: 'instructor',
            name: 'Instructor',
          });
        } else if (studentToken) {
          setUser({
            email: localStorage.getItem('studentEmail') || 'student@dailyagile.com',
            role: 'student',
            name: 'Student',
          });
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/auth/login';
  };

  const navigateTo = (path: string) => {
    router.push(path);
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: BRAND_COLORS.white,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontSize: '18px',
            color: BRAND_COLORS.gray,
            animation: 'pulse 2s infinite',
          }}
        >
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: BRAND_COLORS.light }}>
      {/* Header */}
      <header
        style={{
          background: BRAND_COLORS.white,
          borderBottom: `1px solid ${BRAND_COLORS.border}`,
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: BRAND_COLORS.navy,
              margin: 0,
            }}
          >
            DailyAgile Academy
          </h1>
          <p
            style={{
              fontSize: '13px',
              color: BRAND_COLORS.gray,
              margin: '4px 0 0 0',
            }}
          >
            {user?.role === 'instructor'
              ? 'Instructor Dashboard'
              : user?.role === 'student'
              ? 'Student Dashboard'
              : 'Learning Platform'}
          </p>
        </div>

        {/* User Menu */}
        <div style={{ position: 'relative' }}>
          {user ? (
            <button
              onClick={() => setShowMenu(!showMenu)}
              style={{
                background: BRAND_COLORS.teal,
                color: BRAND_COLORS.white,
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'background 0.3s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = BRAND_COLORS.orange)}
              onMouseLeave={(e) => (e.currentTarget.style.background = BRAND_COLORS.teal)}
            >
              <User size={18} />
              {user.email.split('@')[0]}
            </button>
          ) : (
            <Link
              href="/auth/login"
              style={{
                display: 'inline-block',
                background: BRAND_COLORS.teal,
                color: BRAND_COLORS.white,
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'background 0.3s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = BRAND_COLORS.orange)}
              onMouseLeave={(e) => (e.currentTarget.style.background = BRAND_COLORS.teal)}
            >
              Log In / Sign Up
            </Link>
          )}

          {showMenu && user && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                background: BRAND_COLORS.white,
                border: `1px solid ${BRAND_COLORS.border}`,
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                minWidth: '200px',
                zIndex: 1000,
              }}
            >
              <div style={{ padding: '12px' }}>
                <p
                  style={{
                    fontSize: '12px',
                    color: BRAND_COLORS.gray,
                    margin: '0 0 8px 0',
                  }}
                >
                  {user?.email}
                </p>
                <button
                  onClick={() => navigateTo('/settings')}
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    padding: '8px 12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    color: BRAND_COLORS.darkGray,
                    transition: 'background 0.2s',
                    marginBottom: '4px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = BRAND_COLORS.light)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <Settings size={16} />
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    padding: '8px 12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    color: BRAND_COLORS.red,
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#fee2e2')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <LogOut size={16} />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '40px 24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '40px' }}>
          <h2
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: BRAND_COLORS.navy,
              margin: '0 0 8px 0',
            }}
          >
            {user ? `Welcome back, ${user.name}!` : 'Welcome to DailyAgile Academy'}
          </h2>
          <p
            style={{
              fontSize: '16px',
              color: BRAND_COLORS.gray,
              margin: 0,
            }}
          >
            {user
              ? "Choose where you'd like to go."
              : 'Explore our learning products. No login required to browse ILT courses.'}
          </p>
        </div>

        {/* Product Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
            marginTop: '32px',
          }}
        >
          {/* ILT Card */}
          <ProductCard
            title="👥 ILT Cohorts"
            description="Instructor-led training with live instructors and scheduled cohorts. Browse courses and enroll without login."
            href="/academy/ilt"
            color={BRAND_COLORS.navy}
            icon="📅"
            stats="60+ Courses"
            badge={user ? undefined : 'Public'}
          />

          {/* Self-Paced Card */}
          <ProductCard
            title="📚 Self-Paced Courses"
            description={
              user
                ? 'Learn at your own pace with our comprehensive course catalog.'
                : 'Learn at your own pace. Sign up to browse and enroll in courses.'
            }
            href={user ? '/academy/self-paced' : '/auth/login?redirect=/academy/self-paced'}
            color={BRAND_COLORS.teal}
            icon="🎓"
            stats="Multiple Subjects"
            badge={user ? undefined : 'Login Required'}
          />

          {/* Quiz Card */}
          <ProductCard
            title="🎯 Quiz Tool"
            description={
              user?.role === 'instructor'
                ? 'Create, manage, and assign quizzes to students.'
                : user?.role === 'student'
                ? 'Take assigned quizzes and track your progress.'
                : 'A flexible assessment tool for instructors and students. Sign up to get started.'
            }
            href={user?.role === 'instructor' ? '/teach/quiz/management' : user ? '/academy/quiz/student' : '/auth/login?redirect=/academy/quiz'}
            color={BRAND_COLORS.orange}
            icon="✅"
            stats="Standalone Product"
            badge={user ? undefined : 'Login Required'}
          />
        </div>

        {/* Quick Links */}
        <div
          style={{
            marginTop: '60px',
            padding: '24px',
            background: BRAND_COLORS.white,
            borderRadius: '12px',
            border: `1px solid ${BRAND_COLORS.border}`,
          }}
        >
          <h3
            style={{
              fontSize: '18px',
              fontWeight: '600',
              color: BRAND_COLORS.navy,
              margin: '0 0 16px 0',
            }}
          >
            Quick Links
          </h3>
          <div
            style={{
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <QuickLink
              href="/settings"
              label="Account Settings"
            />
            <QuickLink
              href="/help"
              label="Help & Support"
            />
            <QuickLink
              href="https://dailyagile.com"
              label="Visit Website"
              external
            />
          </div>
        </div>
      </main>
    </div>
  );
}

interface ProductCardProps {
  title: string;
  description: string;
  href: string;
  color: string;
  icon: string;
  stats: string;
  badge?: string;
}

function ProductCard({ title, description, href, color, icon, stats, badge }: ProductCardProps) {
  const [hovering, setHovering] = useState(false);

  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: BRAND_COLORS.white,
          border: `2px solid ${hovering ? color : BRAND_COLORS.border}`,
          borderRadius: '12px',
          padding: '28px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          transform: hovering ? 'translateY(-4px)' : 'translateY(0)',
          boxShadow: hovering
            ? `0 12px 24px rgba(${hexToRgb(color)}, 0.15)`
            : '0 1px 3px rgba(0,0,0,0.05)',
        }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              fontSize: '40px',
            }}
          >
            {icon}
          </div>
          {badge && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: '600',
                color: color,
                background: `${color}15`,
                padding: '4px 8px',
                borderRadius: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <h3
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: BRAND_COLORS.navy,
            margin: '0 0 12px 0',
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontSize: '14px',
            color: BRAND_COLORS.gray,
            margin: '0 0 16px 0',
            lineHeight: '1.6',
          }}
        >
          {description}
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '16px',
            borderTop: `1px solid ${BRAND_COLORS.border}`,
          }}
        >
          <span
            style={{
              fontSize: '12px',
              color: color,
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {stats}
          </span>
          <span
            style={{
              fontSize: '20px',
              color: color,
            }}
          >
            →
          </span>
        </div>
      </div>
    </Link>
  );
}

interface QuickLinkProps {
  href: string;
  label: string;
  external?: boolean;
}

function QuickLink({ href, label, external }: QuickLinkProps) {
  return (
    <Link
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      style={{
        display: 'inline-block',
        padding: '10px 16px',
        background: BRAND_COLORS.light,
        color: BRAND_COLORS.teal,
        borderRadius: '6px',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.2s',
        border: `1px solid ${BRAND_COLORS.border}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = BRAND_COLORS.teal;
        e.currentTarget.style.color = BRAND_COLORS.white;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = BRAND_COLORS.light;
        e.currentTarget.style.color = BRAND_COLORS.teal;
      }}
    >
      {label}
    </Link>
  );
}

// Helper function to convert hex to RGB for shadow
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '0, 0, 0';
}
