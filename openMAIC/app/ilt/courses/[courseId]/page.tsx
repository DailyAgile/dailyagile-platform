'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import * as React from 'react';

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

// Mock course data
const COURSES: Record<string, any> = {
  'ai-business': {
    id: 'ai-business',
    title: 'AI for Business Professionals',
    icon: '👥',
    description: 'Master AI concepts without coding. Learn how to leverage AI tools in your business workflow.',
    objectives: [
      'Understand AI fundamentals and business applications',
      'Learn prompt engineering for real-world use cases',
      'Discover AI tools that boost productivity',
      'Develop an AI strategy for your organization',
      'Navigate ethical AI and data privacy considerations',
    ],
    overview: 'This intensive course prepares business professionals to lead AI adoption in their organizations. Through live instruction and real-world case studies, participants learn both technical foundations and practical applications without requiring coding experience.',
    prerequisites: [
      'No coding experience required',
      'Basic familiarity with business tools (Excel, email, etc.)',
      'Willingness to explore new technologies',
    ],
    certification: {
      available: true,
      name: 'Professional AI Certificate',
      format: '60 multiple-choice questions',
      duration: '90 minutes',
      passingScore: '70%',
      timingWindow: 'Within 30 days of course completion',
      cost: 'Included with course',
    },
  },
};

// Mock instructor data
const INSTRUCTORS: Record<string, any> = {
  'sarah-chen': {
    id: 'sarah-chen',
    name: 'Sarah Chen',
    title: 'AI Strategist',
    experience: '15+ years in enterprise AI implementation',
    bio: 'Sarah has led AI adoption initiatives for Fortune 500 companies. She specializes in helping non-technical teams understand and implement AI solutions.',
    rating: 4.9,
    reviews: 87,
    certifications: ['IBM AI Certifications', 'AWS Machine Learning Specialist'],
  },
};

// Mock sessions data - 15 different schedules
const SESSIONS = [
  { id: 101, courseId: 'ai-business', instructor: 'sarah-chen', format: '2-day', dates: 'Sep 15-16, 2026', schedule: 'Weekday (M-Tu)', times: '9:00 AM - 5:00 PM EDT', regular: 349, sale: 299, discount: '20% off', available: 3, waitlist: false },
  { id: 102, courseId: 'ai-business', instructor: 'sarah-chen', format: '3-day', dates: 'Sep 20-22, 2026', schedule: 'Weekend (Fri-Sun)', times: '7:30 AM - 1:00 PM EDT', regular: 349, sale: 279, discount: '20% off', available: 8, waitlist: false },
  { id: 103, courseId: 'ai-business', instructor: 'sarah-chen', format: '2-day', dates: 'Oct 1-2, 2026', schedule: 'Weekday (W-Th)', times: '9:00 AM - 5:00 PM EDT', regular: 349, sale: null, discount: null, available: 12, waitlist: false },
  { id: 104, courseId: 'ai-business', instructor: 'sarah-chen', format: '3-day', dates: 'Oct 10-12, 2026', schedule: 'Weekend (Fri-Sun)', times: '7:30 AM - 1:00 PM EDT', regular: 349, sale: 329, discount: '5% off', available: 5, waitlist: false },
  { id: 105, courseId: 'ai-business', instructor: 'sarah-chen', format: '2-day', dates: 'Oct 20-21, 2026', schedule: 'Weekday (M-Tu)', times: '9:00 AM - 5:00 PM EDT', regular: 349, sale: null, discount: null, available: 15, waitlist: false },
  { id: 106, courseId: 'ai-business', instructor: 'sarah-chen', format: '3-day', dates: 'Nov 1-3, 2026', schedule: 'Weekend (Fri-Sun)', times: '7:30 AM - 1:00 PM EDT', regular: 349, sale: 299, discount: '15% off', available: 0, waitlist: true },
  { id: 107, courseId: 'ai-business', instructor: 'sarah-chen', format: '2-day', dates: 'Nov 10-11, 2026', schedule: 'Weekday (M-Tu)', times: '9:00 AM - 5:00 PM EDT', regular: 349, sale: null, discount: null, available: 7, waitlist: false },
  { id: 108, courseId: 'ai-business', instructor: 'sarah-chen', format: '3-day', dates: 'Nov 15-17, 2026', schedule: 'Weekend (Fri-Sun)', times: '7:30 AM - 1:00 PM EDT', regular: 349, sale: 319, discount: '8% off', available: 4, waitlist: false },
  { id: 109, courseId: 'ai-business', instructor: 'sarah-chen', format: '2-day', dates: 'Dec 2-3, 2026', schedule: 'Weekday (Tu-W)', times: '9:00 AM - 5:00 PM EDT', regular: 399, sale: 349, discount: '12% off', available: 10, waitlist: false },
  { id: 110, courseId: 'ai-business', instructor: 'sarah-chen', format: '3-day', dates: 'Dec 10-12, 2026', schedule: 'Weekend (Fri-Sun)', times: '7:30 AM - 1:00 PM EDT', regular: 399, sale: 359, discount: '10% off', available: 0, waitlist: true },
  { id: 111, courseId: 'ai-business', instructor: 'sarah-chen', format: '2-day', dates: 'Jan 12-13, 2027', schedule: 'Weekday (M-Tu)', times: '9:00 AM - 5:00 PM EST', regular: 349, sale: null, discount: null, available: 18, waitlist: false },
  { id: 112, courseId: 'ai-business', instructor: 'sarah-chen', format: '3-day', dates: 'Jan 20-22, 2027', schedule: 'Weekend (Fri-Sun)', times: '7:30 AM - 1:00 PM EST', regular: 349, sale: 299, discount: '14% off', available: 6, waitlist: false },
  { id: 113, courseId: 'ai-business', instructor: 'sarah-chen', format: '2-day', dates: 'Feb 1-2, 2027', schedule: 'Weekday (M-Tu)', times: '9:00 AM - 5:00 PM EST', regular: 349, sale: null, discount: null, available: 11, waitlist: false },
  { id: 114, courseId: 'ai-business', instructor: 'sarah-chen', format: '3-day', dates: 'Feb 12-14, 2027', schedule: 'Weekend (Fri-Sun)', times: '7:30 AM - 1:00 PM EST', regular: 349, sale: 309, discount: '11% off', available: 9, waitlist: false },
  { id: 115, courseId: 'ai-business', instructor: 'sarah-chen', format: '2-day', dates: 'Mar 1-2, 2027', schedule: 'Weekday (M-Tu)', times: '9:00 AM - 5:00 PM EST', regular: 349, sale: null, discount: null, available: 14, waitlist: false },
];

export default function CourseDetailPage({ params }: { params: { courseId: string } }) {
  const course = COURSES[params.courseId];
  const instructor = INSTRUCTORS['sarah-chen'];
  const allSessions = SESSIONS.filter(s => s.courseId === params.courseId);

  // Currency state
  const [currency, setCurrency] = useState<any>({ code: 'GBP', symbol: '£', name: 'British Pound' });
  const [conversionRate, setConversionRate] = useState(1.0);

  // Fetch currency on mount
  React.useEffect(() => {
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

  // Filter state
  const [formatFilter, setFormatFilter] = useState<string[]>([]);
  const [scheduleFilter, setScheduleFilter] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000]);
  const [hideUnavailable, setHideUnavailable] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'availability'>('date');

  // Filter and sort sessions
  const filteredSessions = useMemo(() => {
    let filtered = allSessions.filter(session => {
      // Format filter
      if (formatFilter.length > 0 && !formatFilter.includes(session.format)) return false;
      // Schedule filter
      if (scheduleFilter.length > 0 && !scheduleFilter.includes(session.schedule.split(' ')[0])) return false;
      // Time filter
      if (timeFilter.length > 0 && !timeFilter.some(time => session.times.includes(time.split(' ')[0]))) return false;
      // Price range
      const price = session.sale || session.regular;
      if (price < priceRange[0] || price > priceRange[1]) return false;
      // Hide unavailable
      if (hideUnavailable && session.available === 0) return false;
      return true;
    });

    // Sort
    if (sortBy === 'date') {
      filtered.sort((a, b) => new Date(a.dates).getTime() - new Date(b.dates).getTime());
    } else if (sortBy === 'price') {
      filtered.sort((a, b) => (a.sale || a.regular) - (b.sale || b.regular));
    } else if (sortBy === 'availability') {
      filtered.sort((a, b) => b.available - a.available);
    }

    return filtered;
  }, [allSessions, formatFilter, scheduleFilter, timeFilter, priceRange, hideUnavailable, sortBy]);

  const soldOutSessions = allSessions.filter(s => s.available === 0);
  const availableSessions = filteredSessions.filter(s => s.available > 0);

  if (!course) {
    return (
      <div style={{ minHeight: '100vh', background: BRAND_COLORS.light, padding: '40px 24px', textAlign: 'center' }}>
        <h1 style={{ color: BRAND_COLORS.navy }}>Course not found</h1>
        <Link href="/ilt" style={{ color: BRAND_COLORS.teal }}>
          ← Back to Live Courses
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: BRAND_COLORS.light }}>
      {/* Header */}
      <header style={{ background: BRAND_COLORS.white, borderBottom: `1px solid ${BRAND_COLORS.border}`, padding: '16px 24px', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/ilt" style={{ color: BRAND_COLORS.teal, textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
            ← Back to Courses
          </Link>
          <Link href="/auth/login" style={{ background: BRAND_COLORS.teal, color: BRAND_COLORS.white, padding: '10px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
            Sign In / Enroll
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Course Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>{course.icon}</div>
          <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: '0 0 12px 0' }}>
            {course.title}
          </h1>
          <p style={{ fontSize: '16px', color: BRAND_COLORS.gray, margin: '0 0 24px 0', maxWidth: '700px', lineHeight: '1.6' }}>
            {course.description}
          </p>
        </div>

        {/* Course Details Accordion */}
        <CourseDetailsAccordion course={course} />

        {/* Instructor Profile */}
        <InstructorCard instructor={instructor} />

        {/* Sold Out Sessions */}
        {soldOutSessions.length > 0 && (
          <SoldOutSessionsSection sessions={soldOutSessions} currency={currency} conversionRate={conversionRate} />
        )}

        {/* Filters & Sort */}
        <FilterSection
          formatFilter={formatFilter}
          setFormatFilter={setFormatFilter}
          scheduleFilter={scheduleFilter}
          setScheduleFilter={setScheduleFilter}
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          priceRange={priceRange}
          setPriceRange={setPriceRange}
          hideUnavailable={hideUnavailable}
          setHideUnavailable={setHideUnavailable}
          sortBy={sortBy}
          setSortBy={setSortBy}
          resultsCount={availableSessions.length}
          totalCount={allSessions.length}
        />

        {/* Sessions Table */}
        <SessionsTable sessions={availableSessions} course={course} currency={currency} conversionRate={conversionRate} />
      </main>
    </div>
  );
}

function CourseDetailsAccordion({ course }: { course: any }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const sections = [
    { id: 'objectives', title: 'Course Objectives', content: course.objectives },
    { id: 'overview', title: 'Course Overview', content: course.overview },
    { id: 'prerequisites', title: 'Prerequisites', content: course.prerequisites },
    { id: 'certification', title: 'Certification', content: course.certification },
  ];

  return (
    <div style={{ marginBottom: '40px', background: BRAND_COLORS.white, borderRadius: '12px', border: `1px solid ${BRAND_COLORS.border}`, overflow: 'hidden' }}>
      {sections.map((section) => (
        <div key={section.id} style={{ borderBottom: `1px solid ${BRAND_COLORS.border}` }}>
          <button
            onClick={() => setExpanded(expanded === section.id ? null : section.id)}
            style={{
              width: '100%',
              padding: '20px 24px',
              background: BRAND_COLORS.white,
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'background 0.2s',
              fontSize: '16px',
              fontWeight: '600',
              color: BRAND_COLORS.navy,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = BRAND_COLORS.light)}
            onMouseLeave={(e) => (e.currentTarget.style.background = BRAND_COLORS.white)}
          >
            {section.title}
            <span style={{ fontSize: '20px' }}>{expanded === section.id ? '−' : '+'}</span>
          </button>
          {expanded === section.id && (
            <div style={{ padding: '0 24px 20px 24px', background: BRAND_COLORS.light }}>
              {Array.isArray(section.content) ? (
                section.id === 'certification' ? (
                  <CertificationDetails cert={section.content} />
                ) : (
                  <ul style={{ margin: 0, paddingLeft: '20px', color: BRAND_COLORS.darkGray }}>
                    {section.content.map((item: string, idx: number) => (
                      <li key={idx} style={{ marginBottom: '8px', lineHeight: '1.6' }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <p style={{ margin: 0, color: BRAND_COLORS.darkGray, lineHeight: '1.6' }}>
                  {section.content}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CertificationDetails({ cert }: { cert: any }) {
  if (!cert.available) {
    return <p style={{ margin: 0, color: BRAND_COLORS.gray }}>No certification for this course.</p>;
  }
  return (
    <div style={{ color: BRAND_COLORS.darkGray }}>
      <p style={{ margin: '0 0 12px 0', fontWeight: '600' }}>✅ {cert.name}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '12px', color: BRAND_COLORS.gray, textTransform: 'uppercase', fontWeight: '600' }}>Format</p>
          <p style={{ margin: '4px 0 0 0' }}>{cert.format}</p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '12px', color: BRAND_COLORS.gray, textTransform: 'uppercase', fontWeight: '600' }}>Duration</p>
          <p style={{ margin: '4px 0 0 0' }}>{cert.duration}</p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '12px', color: BRAND_COLORS.gray, textTransform: 'uppercase', fontWeight: '600' }}>Passing Score</p>
          <p style={{ margin: '4px 0 0 0' }}>{cert.passingScore}</p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '12px', color: BRAND_COLORS.gray, textTransform: 'uppercase', fontWeight: '600' }}>When to Take</p>
          <p style={{ margin: '4px 0 0 0' }}>{cert.timingWindow}</p>
        </div>
      </div>
      <p style={{ margin: '12px 0 0 0', fontSize: '14px', color: BRAND_COLORS.green, fontWeight: '600' }}>
        {cert.cost}
      </p>
    </div>
  );
}

function InstructorCard({ instructor }: { instructor: any }) {
  return (
    <div style={{ marginBottom: '40px', background: BRAND_COLORS.white, padding: '24px', borderRadius: '12px', border: `1px solid ${BRAND_COLORS.border}` }}>
      <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: '0 0 16px 0' }}>
        📌 Instructor Profile
      </h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px' }}>
        <div>
          <p style={{ fontSize: '18px', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: 0 }}>
            {instructor.name}
          </p>
          <p style={{ fontSize: '14px', color: BRAND_COLORS.teal, margin: '4px 0 0 0', fontWeight: '600' }}>
            {instructor.title}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0 0 0' }}>
            <span style={{ color: BRAND_COLORS.orange }}>⭐ {instructor.rating}/5</span>
            <span style={{ color: BRAND_COLORS.gray }}>({instructor.reviews} reviews)</span>
          </div>
          <p style={{ fontSize: '13px', color: BRAND_COLORS.gray, margin: '8px 0 0 0' }}>
            {instructor.experience}
          </p>
          <p style={{ fontSize: '14px', color: BRAND_COLORS.darkGray, margin: '12px 0 0 0', lineHeight: '1.6', maxWidth: '500px' }}>
            {instructor.bio}
          </p>
          <div style={{ marginTop: '12px' }}>
            {instructor.certifications.map((cert: string, idx: number) => (
              <span key={idx} style={{ display: 'inline-block', background: BRAND_COLORS.light, color: BRAND_COLORS.navy, padding: '4px 8px', borderRadius: '4px', fontSize: '12px', marginRight: '8px', marginBottom: '4px', fontWeight: '500' }}>
                ✓ {cert}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SoldOutSessionsSection({ sessions }: { sessions: any[] }) {
  return (
    <div style={{ marginBottom: '40px', background: '#fee2e2', border: `1px solid #fca5a5`, borderRadius: '12px', padding: '24px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#7f1d1d', margin: '0 0 16px 0' }}>
        🔴 HIGH DEMAND SESSIONS (Waiting List Available)
      </h2>
      <div style={{ display: 'grid', gap: '12px' }}>
        {sessions.map((session) => (
          <div key={session.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: BRAND_COLORS.white, padding: '12px 16px', borderRadius: '8px' }}>
            <div>
              <p style={{ margin: 0, fontWeight: '600', color: BRAND_COLORS.navy }}>
                {session.dates} ({session.format}, {session.schedule})
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: BRAND_COLORS.gray }}>
                {session.times} • {session.available === 0 ? '0 seats' : `${session.available} seats`} • {session.waitlist ? '⏳ Waiting list active' : ''}
              </p>
            </div>
            <button style={{ background: BRAND_COLORS.orange, color: BRAND_COLORS.white, border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
              Join Waiting List
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterSection({
  formatFilter,
  setFormatFilter,
  scheduleFilter,
  setScheduleFilter,
  timeFilter,
  setTimeFilter,
  priceRange,
  setPriceRange,
  hideUnavailable,
  setHideUnavailable,
  sortBy,
  setSortBy,
  resultsCount,
  totalCount,
}: any) {
  return (
    <div style={{ marginBottom: '32px', background: BRAND_COLORS.white, padding: '24px', borderRadius: '12px', border: `1px solid ${BRAND_COLORS.border}` }}>
      <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: '0 0 20px 0' }}>
        🔍 Filter & Sort Sessions
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        {/* Format Filter */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: BRAND_COLORS.navy, textTransform: 'uppercase', marginBottom: '8px' }}>
            Format
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['2-day', '3-day'].map((format) => (
              <button
                key={format}
                onClick={() => setFormatFilter(formatFilter.includes(format) ? formatFilter.filter((f: string) => f !== format) : [...formatFilter, format])}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${formatFilter.includes(format) ? BRAND_COLORS.teal : BRAND_COLORS.border}`,
                  background: formatFilter.includes(format) ? BRAND_COLORS.teal : BRAND_COLORS.white,
                  color: formatFilter.includes(format) ? BRAND_COLORS.white : BRAND_COLORS.navy,
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {format}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule Filter */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: BRAND_COLORS.navy, textTransform: 'uppercase', marginBottom: '8px' }}>
            Schedule
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['Weekday', 'Weekend'].map((schedule) => (
              <button
                key={schedule}
                onClick={() => setScheduleFilter(scheduleFilter.includes(schedule) ? scheduleFilter.filter((s: string) => s !== schedule) : [...scheduleFilter, schedule])}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${scheduleFilter.includes(schedule) ? BRAND_COLORS.teal : BRAND_COLORS.border}`,
                  background: scheduleFilter.includes(schedule) ? BRAND_COLORS.teal : BRAND_COLORS.white,
                  color: scheduleFilter.includes(schedule) ? BRAND_COLORS.white : BRAND_COLORS.navy,
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {schedule}
              </button>
            ))}
          </div>
        </div>

        {/* Sort Options */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: BRAND_COLORS.navy, textTransform: 'uppercase', marginBottom: '8px' }}>
            Sort By
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { value: 'date', label: '📅 Date' },
              { value: 'price', label: '💰 Price' },
              { value: 'availability', label: '🪑 Availability' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${sortBy === option.value ? BRAND_COLORS.orange : BRAND_COLORS.border}`,
                  background: sortBy === option.value ? BRAND_COLORS.orange : BRAND_COLORS.white,
                  color: sortBy === option.value ? BRAND_COLORS.white : BRAND_COLORS.navy,
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hide Unavailable Checkbox */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <input
          type="checkbox"
          checked={hideUnavailable}
          onChange={(e) => setHideUnavailable(e.target.checked)}
          style={{ cursor: 'pointer' }}
        />
        <label style={{ cursor: 'pointer', fontSize: '14px', color: BRAND_COLORS.darkGray }}>
          Show only available sessions
        </label>
      </div>

      {/* Results Count */}
      <div style={{ fontSize: '14px', color: BRAND_COLORS.gray, fontWeight: '600' }}>
        📊 Showing <span style={{ color: BRAND_COLORS.navy, fontWeight: 'bold' }}>{resultsCount}</span> of <span style={{ color: BRAND_COLORS.navy, fontWeight: 'bold' }}>{totalCount}</span> sessions
      </div>
    </div>
  );
}

function SessionsTable({ sessions, course, currency, conversionRate }: { sessions: any[]; course: any; currency: any; conversionRate: number }) {
  // Helper function to convert GBP price to target currency
  const convertPrice = (gbpPrice: number): number => {
    return Math.round(gbpPrice * conversionRate * 100) / 100;
  };

  // Helper function to format price with currency
  const formatPrice = (gbpPrice: number): string => {
    const converted = convertPrice(gbpPrice);
    if (currency.code === 'JPY' || currency.code === 'KRW') {
      return `${currency.symbol}${Math.round(converted)}`;
    }
    return `${currency.symbol}${converted.toFixed(2)}`;
  };

  if (sessions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 24px', background: BRAND_COLORS.white, borderRadius: '12px' }}>
        <p style={{ fontSize: '16px', color: BRAND_COLORS.gray }}>No sessions match your filters. Try adjusting your search.</p>
      </div>
    );
  }

  return (
    <div style={{ overflow: 'hidden', background: BRAND_COLORS.white, borderRadius: '12px', border: `1px solid ${BRAND_COLORS.border}` }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: BRAND_COLORS.light, borderBottom: `2px solid ${BRAND_COLORS.border}` }}>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: BRAND_COLORS.navy }}>Dates</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: BRAND_COLORS.navy }}>Format</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: BRAND_COLORS.navy }}>Schedule</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: BRAND_COLORS.navy }}>Times</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: BRAND_COLORS.navy }}>Price</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: BRAND_COLORS.navy }}>Seats</th>
              <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: BRAND_COLORS.navy }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session, idx) => (
              <tr
                key={session.id}
                style={{
                  borderBottom: `1px solid ${BRAND_COLORS.border}`,
                  background: idx % 2 === 0 ? BRAND_COLORS.white : BRAND_COLORS.light,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#e8f4f8')}
                onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? BRAND_COLORS.white : BRAND_COLORS.light)}
              >
                <td style={{ padding: '16px', color: BRAND_COLORS.navy, fontWeight: '600' }}>{session.dates}</td>
                <td style={{ padding: '16px', color: BRAND_COLORS.darkGray }}>{session.format}</td>
                <td style={{ padding: '16px', color: BRAND_COLORS.darkGray }}>
                  {session.schedule.includes('Weekday') ? '📅 Weekday' : '🏖️ Weekend'}
                </td>
                <td style={{ padding: '16px', color: BRAND_COLORS.darkGray, fontSize: '13px' }}>{session.times}</td>
                <td style={{ padding: '16px' }}>
                  <div>
                    {session.sale ? (
                      <>
                        <p style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: BRAND_COLORS.orange }}>
                          {formatPrice(session.sale)}
                        </p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', textDecoration: 'line-through', color: BRAND_COLORS.gray }}>
                          Regular: {formatPrice(session.regular)}
                        </p>
                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', fontWeight: '600', color: BRAND_COLORS.green }}>
                          💰 Save {formatPrice(session.regular - session.sale)} ({Math.round(((session.regular - session.sale) / session.regular) * 100)}%)
                        </p>
                      </>
                    ) : (
                      <p style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: BRAND_COLORS.teal }}>
                        {formatPrice(session.regular)}
                      </p>
                    )}
                  </div>
                </td>
                <td style={{ padding: '16px', color: session.available > 0 ? BRAND_COLORS.green : BRAND_COLORS.red, fontWeight: '600' }}>
                  {session.available > 0 ? `${session.available} left` : 'FULL'}
                </td>
                <td style={{ padding: '16px', textAlign: 'center' }}>
                  <button
                    onClick={() => (window.location.href = `/auth/login?redirect=/ilt/courses/${course.id}/enroll/${session.id}`)}
                    style={{
                      background: session.available > 0 ? BRAND_COLORS.teal : BRAND_COLORS.gray,
                      color: BRAND_COLORS.white,
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: session.available > 0 ? 'pointer' : 'not-allowed',
                      fontSize: '13px',
                      opacity: session.available > 0 ? 1 : 0.6,
                      transition: 'all 0.2s',
                    }}
                    disabled={session.available === 0}
                    onMouseEnter={(e) => {
                      if (session.available > 0) {
                        e.currentTarget.style.background = BRAND_COLORS.orange;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (session.available > 0) {
                        e.currentTarget.style.background = BRAND_COLORS.teal;
                      }
                    }}
                  >
                    {session.available > 0 ? 'Enroll' : 'Full'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
