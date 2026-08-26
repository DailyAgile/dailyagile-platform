'use client';

import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';

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

interface Currency {
  code: string;
  symbol: string;
  name: string;
}

interface Certification {
  available: boolean;
  name: string;
  format: string;
  duration: string;
  passingScore: string;
  timingWindow: string;
  cost: string;
}

interface Course {
  id: string;
  title: string;
  icon: string;
  description: string;
  objectives: string[];
  overview: string;
  prerequisites: string[];
  certification: Certification;
}

interface Instructor {
  id: string;
  name: string;
  title: string;
  experience: string;
  bio: string;
  rating: number;
  reviews: number;
  certifications: string[];
}

interface Session {
  id: number;
  courseId: string;
  instructor: string;
  format: string;
  dates: string;
  schedule: string;
  times: string;
  regular: number;
  sale: number | null;
  discount: string | null;
  available: number;
  waitlist: boolean;
}

interface FilterSectionProps {
  formatFilter: string[];
  setFormatFilter: (filters: string[]) => void;
  scheduleFilter: string[];
  setScheduleFilter: (filters: string[]) => void;
  timeFilter: string[];
  setTimeFilter: (filters: string[]) => void;
  priceRange: [number, number];
  setPriceRange: (range: [number, number]) => void;
  hideUnavailable: boolean;
  setHideUnavailable: (hidden: boolean) => void;
  sortBy: 'date' | 'price' | 'availability';
  setSortBy: (sort: 'date' | 'price' | 'availability') => void;
  resultsCount: number;
  totalCount: number;
}

interface SoldOutSessionsSectionProps {
  sessions: Session[];
  currency: Currency;
  conversionRate: number;
}

interface SessionsTableProps {
  sessions: Session[];
  course: Course;
  currency: Currency;
  conversionRate: number;
  courseId: string;
}

type AccordionSection =
  | { id: 'objectives'; title: string; content: string[] }
  | { id: 'overview'; title: string; content: string }
  | { id: 'prerequisites'; title: string; content: string[] }
  | { id: 'certification'; title: string; content: Certification };

export default function CourseDetailClient({ course, instructor, allSessions, courseId }: { course: Course; instructor: Instructor; allSessions: Session[]; courseId: string }) {
  // Currency state
  const [currency, setCurrency] = useState<Currency>({ code: 'GBP', symbol: '£', name: 'British Pound' });
  const [conversionRate, setConversionRate] = useState(1.0);

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

  // Filter state
  const [formatFilter, setFormatFilter] = useState<string[]>([]);
  const [scheduleFilter, setScheduleFilter] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000]);
  const [hideUnavailable, setHideUnavailable] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'availability'>('date');

  // Filter and sort sessions
  const filteredSessions = useMemo(() => {
    const filtered = allSessions.filter(session => {
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
        <SessionsTable sessions={availableSessions} course={course} currency={currency} conversionRate={conversionRate} courseId={courseId} />
      </main>
    </div>
  );
}

function CourseDetailsAccordion({ course }: { course: Course }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const sections: AccordionSection[] = [
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
              ) : section.id === 'overview' ? (
                <p style={{ margin: 0, color: BRAND_COLORS.darkGray, lineHeight: '1.6' }}>
                  {section.content}
                </p>
              ) : null}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CertificationDetails({ cert }: { cert: Certification }) {
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

function InstructorCard({ instructor }: { instructor: Instructor }) {
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

function SoldOutSessionsSection({ sessions, currency: _currency, conversionRate: _conversionRate }: SoldOutSessionsSectionProps) {
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
  timeFilter: _timeFilter,
  setTimeFilter: _setTimeFilter,
  priceRange: _priceRange,
  setPriceRange: _setPriceRange,
  hideUnavailable,
  setHideUnavailable,
  sortBy,
  setSortBy,
  resultsCount,
  totalCount,
}: FilterSectionProps) {
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
              { value: 'date' as const, label: '📅 Date' },
              { value: 'price' as const, label: '💰 Price' },
              { value: 'availability' as const, label: '🪑 Availability' },
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

function SessionsTable({ sessions, course: _course, currency, conversionRate, courseId }: SessionsTableProps) {
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
                    onClick={() => (window.location.href = `/auth/login?redirect=/ilt/courses/${courseId}/enroll/${session.id}`)}
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
