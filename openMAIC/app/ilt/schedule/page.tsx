'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import SessionCard from '@/components/ilt/SessionCard';
import SessionFilters from '@/components/ilt/SessionFilters';

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

const styles = `
  @media (max-width: 768px) {
    .schedule-header { padding: 12px 16px !important; }
    .schedule-logo { height: 45px !important; }
    .schedule-breadcrumb { font-size: 12px !important; }
    .schedule-sign-in { padding: 8px 12px !important; font-size: 12px !important; }
    .schedule-main-title { font-size: 24px !important; }
    .schedule-main-description { font-size: 14px !important; }
    .schedule-container { gap: 16px !important; flex-direction: column !important; }
    .schedule-sidebar { width: 100% !important; position: relative !important; }
    .schedule-timeline { width: 100% !important; }
    .schedule-month-title { font-size: 18px !important; }
    .schedule-results { font-size: 13px !important; }
  }

  @media (max-width: 480px) {
    .schedule-header { padding: 10px 12px !important; }
    .schedule-logo { height: 40px !important; }
    .schedule-main-title { font-size: 20px !important; }
    .schedule-main-description { font-size: 13px !important; }
  }

  .schedule-drawer-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
  }

  .schedule-drawer {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 280px;
    background: white;
    z-index: 1000;
    overflow-y: auto;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  }

  .schedule-hamburger {
    display: none;
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #1E3A5F;
    padding: 8px;
  }

  @media (max-width: 768px) {
    .schedule-hamburger {
      display: block;
    }
  }
`;

// Mock sessions data aggregating from multiple courses (20 sessions)
const ALL_SESSIONS = [
  // AI for Business Professionals - Sarah Chen (10 sessions)
  { id: 1, courseId: 'ai-business', courseName: 'AI for Business Professionals', instructor: 'Sarah Chen', format: '2-day', dates: 'Sep 15-16, 2026', startDate: new Date('2026-09-15'), dayOfWeek: 'Mon', times: '9:00 AM - 5:00 PM', duration: '2 days', schedule: 'Weekday', regular: 349, sale: 299, available: 3, waitlist: false, image: '👥' },
  { id: 2, courseId: 'ai-business', courseName: 'AI for Business Professionals', instructor: 'Sarah Chen', format: '3-day', dates: 'Sep 20-22, 2026', startDate: new Date('2026-09-20'), dayOfWeek: 'Fri', times: '7:30 AM - 1:00 PM', duration: '3 days', schedule: 'Weekend', regular: 349, sale: 279, available: 8, waitlist: false, image: '👥' },
  { id: 3, courseId: 'ai-business', courseName: 'AI for Business Professionals', instructor: 'Sarah Chen', format: '2-day', dates: 'Oct 1-2, 2026', startDate: new Date('2026-10-01'), dayOfWeek: 'Wed', times: '9:00 AM - 5:00 PM', duration: '2 days', schedule: 'Weekday', regular: 349, sale: null, available: 12, waitlist: false, image: '👥' },
  { id: 4, courseId: 'ai-business', courseName: 'AI for Business Professionals', instructor: 'Sarah Chen', format: '3-day', dates: 'Oct 10-12, 2026', startDate: new Date('2026-10-10'), dayOfWeek: 'Fri', times: '7:30 AM - 1:00 PM', duration: '3 days', schedule: 'Weekend', regular: 349, sale: 329, available: 0, waitlist: true, image: '👥' },
  { id: 5, courseId: 'ai-business', courseName: 'AI for Business Professionals', instructor: 'Sarah Chen', format: '2-day', dates: 'Nov 1-2, 2026', startDate: new Date('2026-11-01'), dayOfWeek: 'Sun', times: '1:00 PM - 9:00 PM', duration: '2 days', schedule: 'Weekend', regular: 349, sale: 299, available: 7, waitlist: false, image: '👥' },
  { id: 6, courseId: 'ai-business', courseName: 'AI for Business Professionals', instructor: 'Sarah Chen', format: '3-day', dates: 'Nov 15-17, 2026', startDate: new Date('2026-11-15'), dayOfWeek: 'Sun', times: '7:30 AM - 1:00 PM', duration: '3 days', schedule: 'Weekend', regular: 349, sale: 319, available: 4, waitlist: false, image: '👥' },
  { id: 7, courseId: 'ai-business', courseName: 'AI for Business Professionals', instructor: 'Sarah Chen', format: '2-day', dates: 'Dec 2-3, 2026', startDate: new Date('2026-12-02'), dayOfWeek: 'Wed', times: '9:00 AM - 5:00 PM', duration: '2 days', schedule: 'Weekday', regular: 399, sale: 349, available: 10, waitlist: false, image: '👥' },
  { id: 8, courseId: 'ai-business', courseName: 'AI for Business Professionals', instructor: 'Sarah Chen', format: '3-day', dates: 'Jan 15-17, 2027', startDate: new Date('2027-01-15'), dayOfWeek: 'Fri', times: '7:30 AM - 1:00 PM', duration: '3 days', schedule: 'Weekend', regular: 349, sale: 299, available: 6, waitlist: false, image: '👥' },
  { id: 9, courseId: 'ai-business', courseName: 'AI for Business Professionals', instructor: 'Sarah Chen', format: '2-day', dates: 'Feb 1-2, 2027', startDate: new Date('2027-02-01'), dayOfWeek: 'Mon', times: '9:00 AM - 5:00 PM', duration: '2 days', schedule: 'Weekday', regular: 349, sale: null, available: 11, waitlist: false, image: '👥' },
  { id: 10, courseId: 'ai-business', courseName: 'AI for Business Professionals', instructor: 'Sarah Chen', format: '3-day', dates: 'Mar 5-7, 2027', startDate: new Date('2027-03-05'), dayOfWeek: 'Fri', times: '7:30 AM - 1:00 PM', duration: '3 days', schedule: 'Weekend', regular: 349, sale: 309, available: 9, waitlist: false, image: '👥' },

  // AI Engineer Bootcamp - Marcus Johnson (5 sessions)
  { id: 11, courseId: 'ai-engineer', courseName: 'AI Engineer Bootcamp', instructor: 'Marcus Johnson', format: '4-day', dates: 'Sep 25-28, 2026', startDate: new Date('2026-09-25'), dayOfWeek: 'Fri', times: '10:00 AM - 6:00 PM', duration: '4 days', schedule: 'Weekday', regular: 699, sale: 599, available: 5, waitlist: false, image: '🚀' },
  { id: 12, courseId: 'ai-engineer', courseName: 'AI Engineer Bootcamp', instructor: 'Marcus Johnson', format: '4-day', dates: 'Oct 15-18, 2026', startDate: new Date('2026-10-15'), dayOfWeek: 'Wed', times: '10:00 AM - 6:00 PM', duration: '4 days', schedule: 'Weekday', regular: 699, sale: null, available: 8, waitlist: false, image: '🚀' },
  { id: 13, courseId: 'ai-engineer', courseName: 'AI Engineer Bootcamp', instructor: 'Marcus Johnson', format: '4-day', dates: 'Nov 20-23, 2026', startDate: new Date('2026-11-20'), dayOfWeek: 'Thu', times: '10:00 AM - 6:00 PM', duration: '4 days', schedule: 'Weekday', regular: 699, sale: 649, available: 0, waitlist: true, image: '🚀' },
  { id: 14, courseId: 'ai-engineer', courseName: 'AI Engineer Bootcamp', instructor: 'Marcus Johnson', format: '4-day', dates: 'Jan 10-13, 2027', startDate: new Date('2027-01-10'), dayOfWeek: 'Sat', times: '9:00 AM - 5:00 PM', duration: '4 days', schedule: 'Weekend', regular: 699, sale: 599, available: 3, waitlist: false, image: '🚀' },
  { id: 15, courseId: 'ai-engineer', courseName: 'AI Engineer Bootcamp', instructor: 'Marcus Johnson', format: '4-day', dates: 'Feb 15-18, 2027', startDate: new Date('2027-02-15'), dayOfWeek: 'Mon', times: '10:00 AM - 6:00 PM', duration: '4 days', schedule: 'Weekday', regular: 699, sale: 649, available: 7, waitlist: false, image: '🚀' },

  // Prompt Engineering Masterclass - Jennifer Park (5 sessions)
  { id: 16, courseId: 'prompt-engineering', courseName: 'Prompt Engineering Masterclass', instructor: 'Jennifer Park', format: '2-day', dates: 'Sep 18-19, 2026', startDate: new Date('2026-09-18'), dayOfWeek: 'Wed', times: '2:00 PM - 6:00 PM', duration: '2 days', schedule: 'Weekday', regular: 199, sale: 149, available: 15, waitlist: false, image: '⚡' },
  { id: 17, courseId: 'prompt-engineering', courseName: 'Prompt Engineering Masterclass', instructor: 'Jennifer Park', format: '2-day', dates: 'Oct 5-6, 2026', startDate: new Date('2026-10-05'), dayOfWeek: 'Sun', times: '1:00 PM - 5:00 PM', duration: '2 days', schedule: 'Weekend', regular: 199, sale: null, available: 20, waitlist: false, image: '⚡' },
  { id: 18, courseId: 'prompt-engineering', courseName: 'Prompt Engineering Masterclass', instructor: 'Jennifer Park', format: '2-day', dates: 'Nov 8-9, 2026', startDate: new Date('2026-11-08'), dayOfWeek: 'Sun', times: '2:00 PM - 6:00 PM', duration: '2 days', schedule: 'Weekend', regular: 199, sale: 159, available: 12, waitlist: false, image: '⚡' },
  { id: 19, courseId: 'prompt-engineering', courseName: 'Prompt Engineering Masterclass', instructor: 'Jennifer Park', format: '2-day', dates: 'Jan 25-26, 2027', startDate: new Date('2027-01-25'), dayOfWeek: 'Sun', times: '2:00 PM - 6:00 PM', duration: '2 days', schedule: 'Weekend', regular: 199, sale: 149, available: 14, waitlist: false, image: '⚡' },
  { id: 20, courseId: 'prompt-engineering', courseName: 'Prompt Engineering Masterclass', instructor: 'Jennifer Park', format: '2-day', dates: 'Mar 15-16, 2027', startDate: new Date('2027-03-15'), dayOfWeek: 'Mon', times: '2:00 PM - 6:00 PM', duration: '2 days', schedule: 'Weekday', regular: 199, sale: null, available: 18, waitlist: false, image: '⚡' },
];

interface FilterState {
  dateRange: [Date, Date];
  timeOfDay: string[];
  duration: string[];
  format: string[];
  priceRange: [number, number];
  onlyAvailable: boolean;
}

export default function SchedulePage() {
  const [currency, setCurrency] = useState<any>({ code: 'GBP', symbol: '£', name: 'British Pound' });
  const [conversionRate, setConversionRate] = useState(1.0);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    dateRange: [new Date('2026-09-01'), new Date('2027-03-31')],
    timeOfDay: [],
    duration: [],
    format: [],
    priceRange: [0, 800],
    onlyAvailable: false,
  });

  // Fetch currency on mount
  useEffect(() => {
    const fetchCurrency = async () => {
      try {
        const res = await fetch('/api/geo/currency');
        const data = await res.json();
        setCurrency(data.currency);
        setConversionRate(data.conversionRate);
      } catch (error) {
        console.error('Failed to fetch currency:', error);
      }
    };
    fetchCurrency();
  }, []);

  // Helper to convert GBP prices
  const convertPrice = (gbpPrice: number): number => {
    return Math.round(gbpPrice * conversionRate * 100) / 100;
  };

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return ALL_SESSIONS.filter(session => {
      // Date range filter
      if (session.startDate < filters.dateRange[0] || session.startDate > filters.dateRange[1]) return false;

      // Time of day filter
      if (filters.timeOfDay.length > 0) {
        const hour = parseInt(session.times.split(':')[0]);
        const hasMatchingTime = filters.timeOfDay.some(time => {
          if (time === 'morning' && hour < 12) return true;
          if (time === 'afternoon' && hour >= 12 && hour < 17) return true;
          if (time === 'evening' && hour >= 17) return true;
          return false;
        });
        if (!hasMatchingTime) return false;
      }

      // Duration filter
      if (filters.duration.length > 0 && !filters.duration.includes(session.format)) return false;

      // Format filter
      if (filters.format.length > 0 && !filters.format.includes(session.schedule)) return false;

      // Price range filter
      const price = session.sale || session.regular;
      if (price < filters.priceRange[0] || price > filters.priceRange[1]) return false;

      // Only available filter
      if (filters.onlyAvailable && session.available === 0) return false;

      return true;
    }).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [filters]);

  // Group sessions by month
  const sessionsByMonth = useMemo(() => {
    const grouped: Record<string, typeof ALL_SESSIONS> = {};
    filteredSessions.forEach(session => {
      const monthKey = session.startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      if (!grouped[monthKey]) grouped[monthKey] = [];
      grouped[monthKey].push(session);
    });
    return grouped;
  }, [filteredSessions]);

  const handleUpdateFilters = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  return (
    <div style={{ minHeight: '100vh', background: BRAND_COLORS.light }}>
      <style>{styles}</style>

      {/* Header */}
      <header
        className="schedule-header"
        style={{
          background: BRAND_COLORS.white,
          borderBottom: `1px solid ${BRAND_COLORS.border}`,
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
          <button
            className="schedule-hamburger"
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            title={mobileDrawerOpen ? 'Close filters' : 'Open filters'}
          >
            {mobileDrawerOpen ? '✕' : '☰'}
          </button>
          <Link
            href="/"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Back to DailyAgile home"
          >
            <img className="schedule-logo" src="/assets/dailyagile_logo.png" alt="DailyAgile" style={{ height: '55px', width: 'auto' }} />
          </Link>
          <div className="schedule-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: BRAND_COLORS.gray }}>
            <Link href="/" style={{ textDecoration: 'none', color: BRAND_COLORS.teal }}>Home</Link>
            <span>/</span>
            <Link href="/ilt" style={{ textDecoration: 'none', color: BRAND_COLORS.teal }}>Live Courses</Link>
            <span>/</span>
            <span style={{ color: BRAND_COLORS.navy, fontWeight: '600' }}>Session Browser</span>
          </div>
        </div>

        <Link
          className="schedule-sign-in"
          href="/auth/login"
          style={{
            background: BRAND_COLORS.teal,
            color: BRAND_COLORS.white,
            padding: '10px 16px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = BRAND_COLORS.orange)}
          onMouseLeave={(e) => (e.currentTarget.style.background = BRAND_COLORS.teal)}
        >
          Sign In / Enroll
        </Link>
      </header>

      {/* Mobile drawer overlay */}
      {mobileDrawerOpen && (
        <div
          className="schedule-drawer-overlay"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      {mobileDrawerOpen && (
        <div className="schedule-drawer">
          <div style={{ padding: '20px', borderBottom: `1px solid ${BRAND_COLORS.border}` }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: BRAND_COLORS.navy, margin: 0 }}>
              Filters
            </h3>
            <button
              onClick={() => setMobileDrawerOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: BRAND_COLORS.navy,
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ padding: '20px' }}>
            <SessionFilters filters={filters} onUpdateFilters={handleUpdateFilters} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1
            className="schedule-main-title"
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: BRAND_COLORS.navy,
              margin: '0 0 12px 0',
            }}
          >
            🗓️ Session Browser
          </h1>
          <p
            className="schedule-main-description"
            style={{
              fontSize: '16px',
              color: BRAND_COLORS.gray,
              margin: 0,
              maxWidth: '600px',
              lineHeight: '1.6',
            }}
          >
            Browse all upcoming live training sessions across our courses. Filter by date, time, duration, and price to find the perfect session for you.
          </p>
        </div>

        {/* Filters + Timeline Container */}
        <div
          className="schedule-container"
          style={{
            display: 'flex',
            gap: '24px',
            alignItems: 'flex-start',
          }}
        >
          {/* Sidebar Filters (Desktop only) */}
          <div
            className="schedule-sidebar"
            style={{
              width: '280px',
              display: 'none',
              '@media (min-width: 768px)': {
                display: 'block',
              },
            }}
          >
            <style>
              {`
                @media (min-width: 769px) {
                  .schedule-sidebar {
                    display: block !important;
                    position: sticky;
                    top: 100px;
                  }
                }
              `}
            </style>
            <SessionFilters filters={filters} onUpdateFilters={handleUpdateFilters} />
          </div>

          {/* Timeline */}
          <div
            className="schedule-timeline"
            style={{
              flex: 1,
              minWidth: 0,
            }}
          >
            {/* Results Counter */}
            <div
              className="schedule-results"
              style={{
                marginBottom: '24px',
                padding: '12px 16px',
                background: BRAND_COLORS.white,
                borderRadius: '8px',
                border: `1px solid ${BRAND_COLORS.border}`,
                fontSize: '14px',
                color: BRAND_COLORS.gray,
              }}
            >
              <span style={{ fontWeight: '600', color: BRAND_COLORS.navy }}>
                {filteredSessions.length}
              </span>
              {' '}sessions found (out of {ALL_SESSIONS.length})
            </div>

            {filteredSessions.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 24px',
                  background: BRAND_COLORS.white,
                  borderRadius: '12px',
                  border: `1px solid ${BRAND_COLORS.border}`,
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: '0 0 8px 0' }}>
                  No sessions match your filters
                </h3>
                <p style={{ fontSize: '14px', color: BRAND_COLORS.gray, margin: 0 }}>
                  Try adjusting your filters to find available sessions.
                </p>
              </div>
            ) : (
              Object.entries(sessionsByMonth).map(([month, sessions]) => (
                <div key={month} style={{ marginBottom: '36px' }}>
                  {/* Month Header */}
                  <h2
                    className="schedule-month-title"
                    style={{
                      fontSize: '20px',
                      fontWeight: 'bold',
                      color: BRAND_COLORS.navy,
                      margin: '0 0 16px 0',
                      paddingBottom: '8px',
                      borderBottom: `2px solid ${BRAND_COLORS.teal}`,
                    }}
                  >
                    {month}
                  </h2>

                  {/* Sessions Grid for Month */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                      gap: '16px',
                    }}
                  >
                    {sessions.map(session => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        currency={currency}
                        conversionRate={conversionRate}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
